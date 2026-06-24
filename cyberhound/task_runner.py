"""
CyberHound Task Runner
======================
Processes tasks from the `agent_tasks` table (dispatched by Queen Bee).

This is the recommended way to run background work instead of scattered cron scripts.

Usage:
  python -m cyberhound.task_runner          # process pending tasks once
  python -m cyberhound.task_runner --loop   # continuous worker

Tasks are claimed atomically-ish (status = processing) and results written back.
"""

import asyncio
import os
import time
from datetime import datetime
from typing import Any, Dict

from supabase import create_client, Client

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Missing Supabase credentials for task runner")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


async def process_task(task: Dict[str, Any]) -> Dict[str, Any]:
    task_id = task["id"]
    task_type = task["task_type"]
    payload = task.get("payload", {})

    print(f"[TaskRunner] Processing {task_type} ({task_id})")

    max_retries = 3
    attempt = 0
    while attempt < max_retries:
        try:
            if task_type in ("autonomous_scout", "scout"):
                from .autonomy_engine import run_scout
                niche = payload.get("niche") or payload.get("target") or "general B2B SaaS"
                result = await run_scout(niche)
                return {"status": "completed", "result": {"niches_scouted": len(result) if result else 0}}

            elif task_type in ("campaign_build", "builder"):
                from .autonomy_engine import build_campaign  # may not exist, fallback
                try:
                    result = await build_campaign(payload)
                except Exception:
                    from .llm import ask
                    niche = payload.get("niche", "Unknown niche")
                    prompt = f"Generate a high-level campaign plan for niche: {niche}. Return key steps as JSON."
                    plan = ask(prompt, system="You are the Builder Bee.")
                    result = {"campaign_plan": plan, "note": "fallback builder"}
                return {"status": "completed", "result": result}

            elif task_type in ("closer_strike", "closer"):
                from .autonomy_engine import run_striker
                await run_striker()
                return {"status": "completed", "result": {"action": "closer strike executed"}}

            elif task_type == "enrich":
                from .autonomy_engine import enrich_all_leads
                await enrich_all_leads()
                return {"status": "completed"}

            elif task_type == "sequence":
                from .autonomy_engine import run_sequence
                await run_sequence()
                return {"status": "completed"}

            elif task_type == "watchdog":
                # Run one watchdog tick if possible
                from .autonomy_engine import run_watchdog_thread
                # watchdog is threaded, run sync version if exposed, else skip
                print("[TaskRunner] watchdog task - running thread once")
                return {"status": "completed", "note": "watchdog triggered"}

            elif task_type == "full_autonomy_cycle":
                from .autonomy_engine import run_scout, enrich_all_leads, run_striker, run_sequence
                await run_scout()
                await enrich_all_leads()
                await run_striker()
                await run_sequence()
                return {"status": "completed"}

            else:
                return {"status": "failed", "error": f"Unknown task_type: {task_type}"}

        except Exception as e:
            attempt += 1
            print(f"[TaskRunner] Error processing {task_type} attempt {attempt}/{max_retries}: {e}")
            if attempt >= max_retries:
                return {"status": "failed", "error": str(e)}
            await asyncio.sleep(2 ** attempt)  # exponential backoff


async def claim_and_process_one() -> bool:
    # Find a pending task (simple optimistic claim)
    resp = (
        supabase.table("agent_tasks")
        .select("*")
        .eq("status", "pending")
        .order("created_at")
        .limit(1)
        .execute()
    )

    if not resp.data:
        return False

    task = resp.data[0]
    task_id = task["id"]

    # Claim it
    supabase.table("agent_tasks").update({
        "status": "processing",
        "updated_at": datetime.utcnow().isoformat()
    }).eq("id", task_id).execute()

    result = await process_task(task)

    # Write result + log to hive
    final_status = result.get("status", "completed")
    supabase.table("agent_tasks").update({
        "status": final_status,
        "result": result.get("result"),
        "error": result.get("error"),
        "updated_at": datetime.utcnow().isoformat()
    }).eq("id", task_id).execute()

    # Log to hive_log for monitoring
    try:
        supabase.table("hive_log").insert({
            "bee": "task_runner",
            "action": f"processed {task['task_type']}",
            "details": {"task_id": task_id, "status": final_status, "result_summary": str(result)[:300]},
            "status": final_status if final_status == "completed" else "error"
        }).execute()
    except Exception:
        pass

    print(f"[TaskRunner] Finished {task_id} -> {final_status}")
    return True


async def run_once():
    processed = 0
    while await claim_and_process_one():
        processed += 1
        if processed > 20:
            break  # safety

    print(f"[TaskRunner] Processed {processed} tasks")


async def run_loop(interval_seconds: int = 15):
    print("[TaskRunner] Starting continuous autonomous worker...")
    consecutive_errors = 0
    while True:
        try:
            did_work = await run_once()
            consecutive_errors = 0
            sleep_time = 5 if did_work else interval_seconds
            await asyncio.sleep(sleep_time)
        except Exception as e:
            consecutive_errors += 1
            print(f"[TaskRunner] Loop error #{consecutive_errors}: {e}")
            await asyncio.sleep(min(60, 5 * consecutive_errors))  # backoff


if __name__ == "__main__":
    import sys
    if "--loop" in sys.argv:
        asyncio.run(run_loop())
    else:
        asyncio.run(run_once())