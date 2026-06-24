"""
AUTONOMY ENGINE — CyberHound Full Autonomous Loop
=================================================
This powers the classic lead-based autonomous revenue pipeline.

FULL LOOP:
  1. Scout (periodic) → discovers leads
  2. Enrich (periodic) → finds emails
  3. Strike (periodic) → fires first outreach (Touch 1)
  4. Watchdog (continuous thread) → detects replies → auto-responds
  5. Sequence (periodic) → fires follow-up drips
  6. (Web side) Stripe webhooks + Treasurer update revenue

Run autonomously:
  python cyberhound/run.py autonomous --loop     # Recommended continuous mode
  python -m cyberhound.task_runner --loop        # For Queen-dispatched tasks

Queen Bee (web chat) can inject work into `agent_tasks` table which the task_runner consumes.
"""
import asyncio
import json
import os
import re
import sys
import time
import threading
import logging
from datetime import datetime
from pathlib import Path

# Structured logging for autonomy
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s [autonomy] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger("cyberhound.autonomy")

# Unified LLM
from .llm import ask

# Supabase for shared state & hive_log (for autonomy)
try:
    from supabase import create_client, Client
    SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL")
    SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None
except Exception:
    supabase = None

def log_to_hive(bee: str, action: str, details: dict = None, status: str = "success"):
    if not supabase:
        print(f"[{bee}] {action} (no Supabase)")
        return
    try:
        supabase.table("hive_log").insert({
            "bee": bee,
            "action": action,
            "details": details or {},
            "status": status
        }).execute()
    except Exception as e:
        print(f"[hive_log error] {e}")

# ── Config ───────────────────────────────────────────────────
SCOUT_INTERVAL_HOURS = int(os.getenv("SCOUT_INTERVAL_HOURS", 6))
SEQUENCE_INTERVAL_HOURS = int(os.getenv("SEQUENCE_INTERVAL_HOURS", 24))
WATCHDOG_INTERVAL_SEC = int(os.getenv("WATCHDOG_INTERVAL_SEC", 60))
LEADS_FILE = "PIPELINE_LEADS.json"
MAX_DAILY_STRIKES = int(os.getenv("MAX_DAILY_STRIKES", 20))
# ─────────────────────────────────────────────────────────────


# ══════════════════════════════════════════════════════════════
# LEAD STORE
# ══════════════════════════════════════════════════════════════

def load_leads() -> list:
    """Load leads, preferring Supabase if available for shared state with web bees."""
    supabase_leads = []
    if supabase:
        try:
            # Use analyst_leads as shared leads table (populated by web analyst/hunt too)
            res = supabase.table("analyst_leads").select("*").execute()
            supabase_leads = res.data or []
            # Normalize to our format
            for l in supabase_leads:
                l["id"] = l.get("id")
                l["name"] = l.get("company") or l.get("title", "Unknown")
                l["website"] = l.get("url") or ""
                l["email"] = l.get("contact_email") or l.get("enriched_data", {}).get("email", "")
                l["risk_score"] = l.get("score", 7) or 7
                l["source"] = l.get("source", "supabase")
                l["struck"] = l.get("status") in ["sent", "replied"]
        except Exception as e:
            print(f"[Supabase leads load warn] {e}")

    # Load local as fallback/merge
    local_leads = []
    if not Path(LEADS_FILE).exists():
        local_leads = []
    else:
        with open(LEADS_FILE) as f:
            try:
                local_leads = json.load(f)
            except:
                local_leads = []

    # Merge, prefer Supabase data, dedup by website
    merged = {}
    for l in local_leads + supabase_leads:
        key = (l.get("website") or "").lower().strip()
        if key and key not in merged:
            merged[key] = l
        elif key in merged:
            # Merge email etc
            if not merged[key].get("email") and l.get("email"):
                merged[key]["email"] = l["email"]
            if l.get("struck"):
                merged[key]["struck"] = True

    return list(merged.values())

def save_leads(leads: list):
    with open(LEADS_FILE, "w") as f:
        json.dump(leads, f, indent=2)

    # Also persist key leads to Supabase analyst_leads for sharing with web
    if supabase:
        for lead in leads[-5:]:  # recent ones
            try:
                data = {
                    "source": lead.get("source", "python_scout"),
                    "title": lead.get("name"),
                    "url": lead.get("website"),
                    "contact_email": lead.get("email"),
                    "status": "sent" if lead.get("struck") else "new",
                    "score": lead.get("risk_score", 50),
                    "pain_point": "Autonomous scout lead",
                    "urgency": "medium",
                    "recommended_service": "CyberHound automation",
                    "personalization_hook": lead.get("name"),
                }
                supabase.table("analyst_leads").upsert(data, on_conflict="url").execute()
            except Exception as e:
                print(f"[Supabase lead sync warn] {e}")

def add_lead(name: str, website: str, email: str = "", risk_score: int = 7,
             source: str = "scout") -> dict:
    leads = load_leads()
    existing = next((l for l in leads if (l.get("website") or "").lower() == website.lower()), None)
    if existing:
        return existing  # Already known

    lead = {
        "id": f"lead_{int(datetime.now().timestamp())}",
        "name": name,
        "website": website,
        "email": email,
        "risk_score": risk_score,
        "source": source,
        "discovered_at": str(datetime.now()),
        "struck": False,
        "strike_at": None,
    }
    leads.append(lead)
    save_leads(leads)
    print(f"  📋 Lead added: {name} | {website}")
    return lead

def mark_lead_struck(lead_id: str):
    leads = load_leads()
    for l in leads:
        if l["id"] == lead_id:
            l["struck"] = True
            l["strike_at"] = str(datetime.now())
            break
    save_leads(leads)

def get_unstrucked_leads() -> list:
    return [l for l in load_leads() if not l.get("struck") and l.get("email")]


# ══════════════════════════════════════════════════════════════
# SCOUT — finds leads via Gemini grounded search
# ══════════════════════════════════════════════════════════════

async def run_scout() -> list:
    """Run the imperial scout to discover new Quebec leads"""
    logger.info("SCOUT — Running...")
    
    try:
        prompt = (
            "Search for high-growth B2B SaaS opportunities and underserved niches in North America. "
            "Focus on: workflow automation, AI-driven logistics, specialized CRM tools, and automated "
            "financial reporting for SMEs. Identify 10 high-potential sectors with low competition. "
            "For each, return ONLY a JSON array with this exact schema:\n"
            '[{"name": "Niche/Sector Name", "website": "https://example.com/potential-targets", "city": "N/A", "risk_score": 85}]\n'
            "Note: risk_score here represents Revenue Opportunity Score (0-100)."
            "Return ONLY the JSON array, no other text."
        )

        raw = ask(prompt, system="You are the Scout Bee for CyberHound. Return strict JSON only.")
        match = re.search(r'\[.*\]', raw, re.DOTALL)
        if not match:
            logger.warning("Scout: Could not parse JSON from response")
            log_to_hive("scout", "scout_failed", {"reason": "parse_error"})
            return []

        leads_raw = json.loads(match.group())
        new_leads = []
        for l in leads_raw:
            lead = add_lead(
                name=l.get("name", "Unknown"),
                website=l.get("website", ""),
                risk_score=l.get("risk_score", 7),
                source="imperial_scout"
            )
            new_leads.append(lead)

        logger.info(f"Scout found {len(new_leads)} leads")
        return new_leads

    except Exception as e:
        logger.error(f"Scout error: {e}")
        return []


# ══════════════════════════════════════════════════════════════
# ENRICHER — extracts contact email from website
# ══════════════════════════════════════════════════════════════

async def enrich_lead(lead: dict) -> str:
    """Try to find a contact email for a lead"""
    if lead.get("email"):
        return lead["email"]

    website = lead.get("website", "")
    if not website:
        return ""

    print(f"  🔎 Enriching: {lead['name']} ({website})")

    try:
        prompt = (
            f"Visit {website} and find the best contact email address for the marketing "
            f"director, CMO, or general manager of {lead['name']}. "
            f"Check the Contact, About, and Team pages. "
            f"Return ONLY the email address as plain text. "
            f"If no email found, return: NOT_FOUND"
        )

        result = ask(prompt, system="You are a helpful research assistant. Return only the email or NOT_FOUND.")

        email_match = re.search(r'[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}', result)
        if email_match:
            email = email_match.group()
            leads = load_leads()
            for l in leads:
                if l["id"] == lead["id"]:
                    l["email"] = email
                    break
            save_leads(leads)
            print(f"    ✅ Email found: {email}")
            return email
        else:
            print(f"    ⚠️  No email found")
            return ""

    except Exception as e:
        logger.error(f"Enrichment error: {e}")
        return ""


async def enrich_all_leads():
    """Enrich all leads that are missing emails"""
    leads = load_leads()
    unenriched = [l for l in leads if not l.get("email")]
    print(f"\n📧 [{_ts()}] ENRICHER — {len(unenriched)} leads need emails")
    for lead in unenriched:
        await enrich_lead(lead)
        await asyncio.sleep(2)  # Rate limit


# ══════════════════════════════════════════════════════════════
# STRIKER — fires Touch 1 for all enriched, unstrucked leads
# ══════════════════════════════════════════════════════════════

async def run_striker():
    """Fire Touch 1 for all pending leads"""
    from email_envoy_v2 import fire_touch_1
    from deal_tracker import get_deal

    pending = get_unstrucked_leads()
    print(f"\n⚡ [{_ts()}] STRIKER — {len(pending)} leads ready to strike")

    struck = 0
    for lead in pending:
        if struck >= MAX_DAILY_STRIKES:
            print(f"  🛑 Daily strike limit ({MAX_DAILY_STRIKES}) reached")
            break

        email = lead["email"]
        name = lead["name"]

        # Skip if already in deal pipeline
        existing = get_deal(email)
        if existing:
            print(f"  ⏭️  {name} already in pipeline at {existing['stage']}")
            mark_lead_struck(lead["id"])
            continue

        print(f"  🎯 Striking: {name} <{email}>")
        success = fire_touch_1(email, name, lead.get("risk_score", 7))
        if success:
            mark_lead_struck(lead["id"])
            struck += 1
            await asyncio.sleep(5)  # Rate limit between sends

    print(f"  ✅ Striker done: {struck} emails sent")


# ══════════════════════════════════════════════════════════════
# WATCHDOG — runs in background thread
# ══════════════════════════════════════════════════════════════

def run_watchdog_thread():
    """Run the reply watchdog in a background thread"""
    from config import check_config
    from response_tracker_v2 import EmpireWatchdogV2

    if not check_config():
        print("⚠️  Watchdog: missing email config — skipping")
        return

    print(f"\n👁️  [{_ts()}] WATCHDOG — Starting (interval: {WATCHDOG_INTERVAL_SEC}s)")
    watchdog = EmpireWatchdogV2(auto_respond=True)
    watchdog.watch(interval=WATCHDOG_INTERVAL_SEC)


# ══════════════════════════════════════════════════════════════
# SEQUENCE SCHEDULER — fires Touch 2/3 drip
# ══════════════════════════════════════════════════════════════

async def run_sequence():
    from cyberhound.sequence_scheduler import run_sequence as _run
    print(f"\n📅 [{_ts()}] SEQUENCE — Running drip schedule")
    _run()


# ══════════════════════════════════════════════════════════════
# MAIN LOOP
# ══════════════════════════════════════════════════════════════

def _ts():
    return datetime.now().strftime("%H:%M:%S")

async def main_loop():
    """The full autonomous loop — runs forever with resilience."""
    print("""
╔══════════════════════════════════════════════════════════════╗
║   🐾 CYBERHOUND — AUTONOMY ENGINE ACTIVATED                 ║
║                                                              ║
║   Scout  →  Enrich  →  Strike  →  Watch  →  Sequence       ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
""")
    print(f"  Scout interval:    every {SCOUT_INTERVAL_HOURS}h")
    print(f"  Sequence interval: every {SEQUENCE_INTERVAL_HOURS}h")
    print(f"  Watchdog interval: every {WATCHDOG_INTERVAL_SEC}s")
    print(f"  Max daily strikes: {MAX_DAILY_STRIKES}")
    print("  State: Using local JSON + Supabase hive_log when available")
    print()

    log_to_hive("system", "AUTONOMY_ENGINE_STARTED", {
        "scout_interval_h": SCOUT_INTERVAL_HOURS,
        "max_daily_strikes": MAX_DAILY_STRIKES
    })

    # Start watchdog in background thread
    watchdog_thread = threading.Thread(target=run_watchdog_thread, daemon=True)
    watchdog_thread.start()

    last_scout = 0
    last_sequence = 0
    scout_interval_sec = SCOUT_INTERVAL_HOURS * 3600
    sequence_interval_sec = SEQUENCE_INTERVAL_HOURS * 3600

    while True:
        try:
            now = time.time()

            # ── Scout cycle ──────────────────────────────────────
            if now - last_scout >= scout_interval_sec:
                try:
                    leads = await run_scout()
                    await enrich_all_leads()
                    await run_striker()
                    log_to_hive("scout", "full_cycle_complete", {"leads_found": len(leads) if leads else 0})
                except Exception as e:
                    print(f"  ❌ Scout cycle error: {e}")
                    log_to_hive("scout", "cycle_error", {"error": str(e)}, "error")
                last_scout = time.time()

            # ── Sequence cycle ───────────────────────────────────
            if now - last_sequence >= sequence_interval_sec:
                try:
                    await run_sequence()
                    log_to_hive("scheduler", "sequence_tick")
                except Exception as e:
                    print(f"  ❌ Sequence error: {e}")
                    log_to_hive("scheduler", "sequence_error", {"error": str(e)}, "error")
                last_sequence = time.time()

            # ── Heartbeat ────────────────────────────────────────
            mins_to_next = max(0, int((scout_interval_sec - (time.time() - last_scout)) / 60))
            print(f"  💓 [{_ts()}] Alive — next scout in {mins_to_next}m")
            log_to_hive("system", "heartbeat", {"next_scout_in_min": mins_to_next}, "idle")

        except Exception as loop_err:
            print(f"  🔥 Main loop error (recovering): {loop_err}")
            log_to_hive("system", "loop_error", {"error": str(loop_err)}, "error")

        await asyncio.sleep(300)  # Heartbeat every 5 min


# ══════════════════════════════════════════════════════════════
# ENTRY POINT
# ══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "all"

    if cmd == "scout":
        asyncio.run(run_scout())
    elif cmd == "enrich":
        asyncio.run(enrich_all_leads())
    elif cmd == "strike":
        asyncio.run(run_striker())
    elif cmd == "sequence":
        asyncio.run(run_sequence())
    elif cmd == "watchdog":
        run_watchdog_thread()
    elif cmd == "all":
        asyncio.run(main_loop())
    else:
        print(__doc__)
