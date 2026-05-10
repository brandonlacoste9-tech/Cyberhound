"""
AUTONOMY ENGINE — CyberHound Full Loop
======================================
This is the single process that runs everything.

LOOP:
  1. Scout runs every N hours → finds leads (name + website)
  2. Enricher extracts contact email from each lead
  3. Touch 1 fires automatically if lead not already in pipeline
  4. Watchdog runs continuously → detects replies → auto-responds
  5. Sequence scheduler fires Touch 2 (Day 3) + Touch 3 (Day 7)
  6. Stripe webhook marks CLOSED_WON when payment lands

Run:
  python3 autonomy_engine.py            # Full loop
  python3 autonomy_engine.py scout      # Scout only
  python3 autonomy_engine.py enrich     # Enrich leads only
  python3 autonomy_engine.py strike     # Fire pending touches
  python3 autonomy_engine.py watchdog   # Watchdog only
"""
import asyncio
import json
import os
import re
import sys
import time
import threading
from datetime import datetime
from pathlib import Path

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
    if not Path(LEADS_FILE).exists():
        return []
    with open(LEADS_FILE) as f:
        try:
            return json.load(f)
        except:
            return []

def save_leads(leads: list):
    with open(LEADS_FILE, "w") as f:
        json.dump(leads, f, indent=2)

def add_lead(name: str, website: str, email: str = "", risk_score: int = 7,
             source: str = "scout") -> dict:
    leads = load_leads()
    existing = next((l for l in leads if l.get("website", "").lower() == website.lower()), None)
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
    print(f"\n🔍 [{_ts()}] SCOUT — Running...")
    
    try:
        import os
        from google import genai
        from google.genai import types

        client = genai.Client(
            api_key=os.environ.get("VERTEX_API_KEY", ""),
            vertexai=True,
            project=os.environ.get("VERTEX_PROJECT_ID", ""),
            location="us-central1"
        )

        prompt = (
            "Search Yellowpages.ca and Google for recently registered or active businesses "
            "in Montreal and Quebec City, Quebec, Canada. Focus on: digital agencies, "
            "software companies, e-commerce brands, financial services, real estate agencies. "
            "Find 10 businesses that have English-only websites (high Bill 96 risk). "
            "For each, return ONLY a JSON array with this exact schema:\n"
            '[{"name": "Company Name", "website": "https://...", "city": "Montreal", "risk_score": 7}]\n'
            "Return ONLY the JSON array, no other text."
        )

        response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=prompt,
            config=types.GenerateContentConfig(
                tools=[types.Tool(google_search=types.GoogleSearch())]
            )
        )

        raw = response.text.strip()
        # Extract JSON from response
        match = re.search(r'\[.*\]', raw, re.DOTALL)
        if not match:
            print(f"  ⚠️  Scout: Could not parse JSON from response")
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

        print(f"  ✅ Scout found {len(new_leads)} leads")
        return new_leads

    except Exception as e:
        print(f"  ❌ Scout error: {e}")
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
        from google import genai
        from google.genai import types

        client = genai.Client(
            api_key=os.environ.get("VERTEX_API_KEY", ""),
            vertexai=True,
            project=os.environ.get("VERTEX_PROJECT_ID", ""),
            location="us-central1"
        )

        prompt = (
            f"Visit {website} and find the best contact email address for the marketing "
            f"director, CMO, or general manager of {lead['name']}. "
            f"Check the Contact, About, and Team pages. "
            f"Return ONLY the email address as plain text. "
            f"If no email found, return: NOT_FOUND"
        )

        response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=prompt,
            config=types.GenerateContentConfig(
                tools=[types.Tool(google_search=types.GoogleSearch())]
            )
        )

        result = response.text.strip()
        email_match = re.search(r'[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}', result)
        if email_match:
            email = email_match.group()
            # Update lead record
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
        print(f"    ❌ Enrichment error: {e}")
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
    from sequence_scheduler import run_sequence as _run
    print(f"\n📅 [{_ts()}] SEQUENCE — Running drip schedule")
    _run()


# ══════════════════════════════════════════════════════════════
# MAIN LOOP
# ══════════════════════════════════════════════════════════════

def _ts():
    return datetime.now().strftime("%H:%M:%S")

async def main_loop():
    """The full autonomous loop"""
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
    print()

    # Start watchdog in background thread
    watchdog_thread = threading.Thread(target=run_watchdog_thread, daemon=True)
    watchdog_thread.start()

    last_scout = 0
    last_sequence = 0
    scout_interval_sec = SCOUT_INTERVAL_HOURS * 3600
    sequence_interval_sec = SEQUENCE_INTERVAL_HOURS * 3600

    while True:
        now = time.time()

        # ── Scout cycle ──────────────────────────────────────
        if now - last_scout >= scout_interval_sec:
            await run_scout()
            await enrich_all_leads()
            await run_striker()
            last_scout = time.time()

        # ── Sequence cycle ───────────────────────────────────
        if now - last_sequence >= sequence_interval_sec:
            await run_sequence()
            last_sequence = time.time()

        # ── Heartbeat ────────────────────────────────────────
        print(f"  💓 [{_ts()}] Alive — next scout in "
              f"{max(0, int((scout_interval_sec - (time.time() - last_scout)) / 60))}m")
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
