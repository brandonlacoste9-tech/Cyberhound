"""
Hermes Bridge Worker — AI task processor for Cyberhound swarm.

Polls Supabase for pending agent tasks and executes them using
the centralized Hermes AI client.

Task types handled:
  - scout_research    → Deep market research for a niche
  - score_lead        → ICP scoring and lead qualification
  - generate_email    → Personalized outreach email generation
  - analyze_reply     → Prospect reply sentiment analysis
  - deep_reason       → Heavy reasoning with MAX model

Env vars required:
  NEXT_PUBLIC_SUPABASE_URL    — Supabase project URL
  SUPABASE_SERVICE_ROLE_KEY   — Supabase service role key
  HERMES_API_KEY              — Hermes/DeepSeek API key
"""

import os
import sys
import time
import json
import traceback
from datetime import datetime
from dotenv import load_dotenv

from supabase import create_client, Client

# Add parent to path so we can import hermes_client
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hermes_client import (
    research_market,
    score_lead,
    generate_email,
    analyze_reply,
    deep_reason,
    ping as hermes_ping,
)

# ── Config ──────────────────────────────────────────────────────────────────

load_dotenv(".env.local")
load_dotenv(".env")

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ── Task Handlers ───────────────────────────────────────────────────────────

def handle_scout_research(task: dict):
    """Deep market research for a niche opportunity."""
    payload = task.get("payload", {})
    niche = payload.get("niche", "Unknown")
    market = payload.get("market", "North America")
    opp_id = payload.get("opportunity_id")

    print(f"🔍 [Scout] Researching: {niche} in {market}")

    try:
        result = research_market(niche, market)
        result["status"] = "pending_approval"
        result["researched_at"] = datetime.now().isoformat()

        # Update the opportunity in Supabase
        if opp_id:
            supabase.table("opportunities").update(result).eq("id", opp_id).execute()

        # Mark task as completed
        supabase.table("agent_tasks").update({
            "status": "completed",
            "result": result
        }).eq("id", task["id"]).execute()

        # Log to hive
        supabase.table("hive_log").insert({
            "bee": "scout",
            "action": f"Hermes completed deep research for {niche}",
            "details": result,
            "status": "success"
        }).execute()

        print(f"  ✅ Score: {result.get('score')}/100 | Competition: {result.get('competition_level')}")
        return result

    except Exception as e:
        _fail_task(task, e)
        return None


def handle_score_lead(task: dict):
    """ICP scoring for a lead."""
    payload = task.get("payload", {})
    company = payload.get("company_name", "Unknown")
    website = payload.get("website", "")
    industry = payload.get("industry", "")
    signals = payload.get("signals", [])
    lead_id = payload.get("lead_id")

    print(f"📊 [Score] Analyzing: {company}")

    try:
        result = score_lead(company, website, industry, signals)
        result["scored_at"] = datetime.now().isoformat()

        # Update the lead in Supabase
        if lead_id:
            supabase.table("leads").update({
                "icp_score": result.get("icp_score"),
                "risk_level": result.get("risk_level"),
                "ai_analysis": result
            }).eq("id", lead_id).execute()

        # Mark task as completed
        supabase.table("agent_tasks").update({
            "status": "completed",
            "result": result
        }).eq("id", task["id"]).execute()

        print(f"  ✅ ICP Score: {result.get('icp_score')}/100 | Risk: {result.get('risk_level')}")
        return result

    except Exception as e:
        _fail_task(task, e)
        return None


def handle_generate_email(task: dict):
    """Generate personalized outreach email."""
    payload = task.get("payload", {})
    to_name = payload.get("to_name", "There")
    company = payload.get("company_name", "")
    icp_score = payload.get("icp_score", 70)
    risk_level = payload.get("risk_level", "medium")
    selling_points = payload.get("selling_points", [])
    tone = payload.get("tone", "consultative")
    touch_number = payload.get("touch_number", 1)
    lead_id = payload.get("lead_id")

    print(f"✉️  [Email] Generating Touch {touch_number} for: {to_name} ({company})")

    try:
        result = generate_email(
            to_name=to_name,
            company_name=company,
            icp_score=icp_score,
            risk_level=risk_level,
            selling_points=selling_points,
            tone=tone,
            touch_number=touch_number,
        )
        result["generated_at"] = datetime.now().isoformat()
        result["touch_number"] = touch_number

        # Store the generated email
        if lead_id:
            supabase.table("leads").update({
                "generated_email_subject": result.get("subject"),
                "generated_email_body": result.get("body"),
                "last_email_generated_at": datetime.now().isoformat(),
            }).eq("id", lead_id).execute()

        # Mark task as completed
        supabase.table("agent_tasks").update({
            "status": "completed",
            "result": result
        }).eq("id", task["id"]).execute()

        print(f"  ✅ Subject: {result.get('subject', '')[:60]}")
        return result

    except Exception as e:
        _fail_task(task, e)
        return None


def handle_analyze_reply(task: dict):
    """Analyze prospect reply sentiment."""
    payload = task.get("payload", {})
    reply_text = payload.get("reply_text", "")
    original_context = payload.get("original_context", "")
    lead_id = payload.get("lead_id")

    print(f"📨 [Reply] Analyzing reply")

    try:
        result = analyze_reply(reply_text, original_context)
        result["analyzed_at"] = datetime.now().isoformat()

        # Update lead with analysis
        if lead_id:
            supabase.table("leads").update({
                "reply_sentiment": result.get("sentiment"),
                "reply_intent": result.get("intent"),
                "reply_analysis": result,
            }).eq("id", lead_id).execute()

        supabase.table("agent_tasks").update({
            "status": "completed",
            "result": result
        }).eq("id", task["id"]).execute()

        print(f"  ✅ Sentiment: {result.get('sentiment')} | Should respond: {result.get('should_respond')}")
        return result

    except Exception as e:
        _fail_task(task, e)
        return None


def handle_deep_reason(task: dict):
    """Heavy reasoning with MAX model."""
    payload = task.get("payload", {})
    prompt = payload.get("prompt", "")
    context = payload.get("context", "")

    print(f"🧠 [Reason] Deep analysis")

    try:
        full_prompt = f"{context}\n\n{prompt}" if context else prompt
        result_text = deep_reason(full_prompt)

        result = {
            "reasoning": result_text,
            "completed_at": datetime.now().isoformat(),
        }

        supabase.table("agent_tasks").update({
            "status": "completed",
            "result": result
        }).eq("id", task["id"]).execute()

        print(f"  ✅ Reasoning complete ({len(result_text)} chars)")
        return result

    except Exception as e:
        _fail_task(task, e)
        return None


# ── Task Router ─────────────────────────────────────────────────────────────

TASK_HANDLERS = {
    "scout_research": handle_scout_research,
    "score_lead": handle_score_lead,
    "generate_email": handle_generate_email,
    "analyze_reply": handle_analyze_reply,
    "deep_reason": handle_deep_reason,
}


def process_task(task: dict):
    """Route a task to the appropriate handler."""
    task_type = task.get("task_type", "scout_research")

    handler = TASK_HANDLERS.get(task_type)
    if not handler:
        print(f"  ⚠️  Unknown task type: {task_type}")
        supabase.table("agent_tasks").update({
            "status": "failed",
            "error": f"Unknown task type: {task_type}"
        }).eq("id", task["id"]).execute()
        return

    # Mark as processing
    supabase.table("agent_tasks").update({
        "status": "processing",
        "started_at": datetime.now().isoformat(),
    }).eq("id", task["id"]).execute()

    return handler(task)


def _fail_task(task: dict, error: Exception):
    """Mark a task as failed with error details."""
    error_msg = str(error)
    print(f"  ❌ Failed: {error_msg}")
    traceback.print_exc()

    supabase.table("agent_tasks").update({
        "status": "failed",
        "error": error_msg,
    }).eq("id", task["id"]).execute()


# ── Main Loop ───────────────────────────────────────────────────────────────

def main():
    print("🐺 Hermes Bridge Worker Started")
    print(f"   Endpoint: {os.getenv('HERMES_BASE_URL', 'https://api.deepseek.com/v1')}")
    print(f"   Polling Supabase for agent tasks...")

    # Health check
    ping_result = hermes_ping()
    if ping_result["ok"]:
        print(f"   ✅ Hermes connected ({ping_result['model']}, {ping_result['latency_ms']}ms)")
    else:
        print(f"   ⚠️  Hermes ping failed: {ping_result.get('error')}")

    # Also watch for email_reply events in inbound_emails table
    last_email_check = datetime.now()

    while True:
        try:
            # ── Poll for pending tasks ─────────────────────────────────────
            response = (
                supabase.table("agent_tasks")
                .select("*")
                .eq("status", "pending")
                .order("created_at")
                .limit(5)
                .execute()
            )
            tasks = response.data or []

            for task in tasks:
                print(f"\n📋 Processing task: {task.get('task_type', 'unknown')}")
                process_task(task)

            # ── Check for unprocessed inbound replies ──────────────────────
            if (datetime.now() - last_email_check).seconds > 30:
                last_email_check = datetime.now()
                _check_inbound_replies()

        except Exception as e:
            # Ignore transient network errors during idle polling
            if "timeout" not in str(e).lower() and "connection" not in str(e).lower():
                print(f"⚠️  Poll error: {e}")

        time.sleep(5)


def _check_inbound_replies():
    """Find unprocessed inbound emails and create analyze_reply tasks."""
    try:
        response = (
            supabase.table("inbound_emails")
            .select("*")
            .eq("requires_hitl", False)
            .is_("processed_at", "null")
            .limit(5)
            .execute()
        )
        emails = response.data or []

        for email in emails:
            # Create an analyze_reply task
            supabase.table("agent_tasks").insert({
                "task_type": "analyze_reply",
                "status": "pending",
                "payload": {
                    "reply_text": email.get("raw_body", email.get("snippet", "")),
                    "original_context": f"Outreach to {email.get('sender_email', 'unknown')}",
                    "lead_id": email.get("lead_id"),
                    "email_id": email.get("id"),
                },
            }).execute()

            # Mark email as processed
            supabase.table("inbound_emails").update({
                "processed_at": datetime.now().isoformat(),
            }).eq("id", email["id"]).execute()

            print(f"  📨 Queued reply analysis for {email.get('sender_email')}")
    except Exception:
        pass  # Non-critical


if __name__ == "__main__":
    main()
