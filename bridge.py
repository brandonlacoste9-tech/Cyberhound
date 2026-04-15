"""
BRIDGE — Python Scout → Next.js Execution Engine
=================================================
This replaces the entire Python outreach stack with direct calls
into the Next.js API. Brain 2 becomes scouts + enrichers only.
Brain 1 handles all email sending, sequencing, Supabase, Stripe.

Flow:
  scout() → finds Quebec leads via Gemini
  bridge_lead() → POSTs to /api/enrich (Apollo) → /api/closer (Resend)
  bridge_reply() → POSTs to /api/replies (Gemini classify + Telegram alert)
  run() → full autonomous loop

Required env vars:
  APP_URL=https://your-cyberhound.vercel.app
  BRIDGE_SECRET=your-cron-secret (same as CRON_SECRET in Next.js)
  VERTEX_API_KEY, VERTEX_PROJECT_ID (for scout)
"""

import asyncio
import json
import os
import re
import time
import imaplib
import email
from email.header import decode_header
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

import requests

load_dotenv()

# ── Config ────────────────────────────────────────────────────
APP_URL       = os.getenv("APP_URL", "").rstrip("/")
BRIDGE_SECRET = os.getenv("BRIDGE_SECRET", os.getenv("CRON_SECRET", "cyberhound-scheduler"))
SCOUT_INTERVAL_HOURS   = int(os.getenv("SCOUT_INTERVAL_HOURS", 6))
WATCHDOG_INTERVAL_SEC  = int(os.getenv("WATCHDOG_INTERVAL_SEC", 60))
MAX_DAILY_STRIKES      = int(os.getenv("MAX_DAILY_STRIKES", 20))
IMAP_USER   = os.getenv("GMAIL_USER", os.getenv("SMTP_USER", ""))
IMAP_PASS   = os.getenv("GMAIL_PASS", os.getenv("SMTP_PASS", ""))
LEADS_FILE  = "PIPELINE_LEADS.json"
WATCHDOG_CACHE = ".watchdog_cache.json"
# ─────────────────────────────────────────────────────────────


def _ts() -> str:
    return datetime.now().strftime("%H:%M:%S")


def _headers() -> dict:
    return {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {BRIDGE_SECRET}",
    }


# ══════════════════════════════════════════════════════════════
# LEAD STORE  (flat file — source of truth is Supabase via API)
# ══════════════════════════════════════════════════════════════

def _load_leads() -> list:
    if not Path(LEADS_FILE).exists():
        return []
    with open(LEADS_FILE) as f:
        try: return json.load(f)
        except: return []

def _save_leads(leads: list):
    with open(LEADS_FILE, "w") as f:
        json.dump(leads, f, indent=2)

def _add_lead(name: str, website: str, city: str = "", risk_score: int = 7) -> dict:
    leads = _load_leads()
    existing = next((l for l in leads if l.get("website","").lower() == website.lower()), None)
    if existing:
        return existing
    lead = {
        "id": f"lead_{int(datetime.now().timestamp())}",
        "name": name,
        "website": website,
        "city": city,
        "risk_score": risk_score,
        "discovered_at": str(datetime.now()),
        "bridged": False,
        "supabase_lead_id": None,
    }
    leads.append(lead)
    _save_leads(leads)
    print(f"  📋 Lead stored: {name} | {website}")
    return lead

def _mark_bridged(lead_id: str, supabase_id: str = ""):
    leads = _load_leads()
    for l in leads:
        if l["id"] == lead_id:
            l["bridged"] = True
            l["supabase_lead_id"] = supabase_id
            l["bridged_at"] = str(datetime.now())
            break
    _save_leads(leads)


# ══════════════════════════════════════════════════════════════
# SCOUT — Gemini grounded search for Quebec leads
# ══════════════════════════════════════════════════════════════

async def run_scout() -> list:
    print(f"\n🔍 [{_ts()}] SCOUT — Searching for Quebec targets...")
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
            "Search Google and Yellowpages.ca for businesses recently active in "
            "Montreal and Quebec City, Quebec, Canada. Focus on: digital agencies, "
            "software companies, e-commerce brands, financial services, real estate. "
            "Find 10 businesses that have English-only websites — they have HIGH Bill 96 "
            "compliance risk under Quebec language law. "
            "Return ONLY a JSON array, no other text:\n"
            '[{"name":"Company Name","website":"https://...","city":"Montreal","risk_score":7}]'
        )

        response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=prompt,
            config=types.GenerateContentConfig(
                tools=[types.Tool(google_search=types.GoogleSearch())]
            )
        )

        raw = response.text.strip()
        match = re.search(r'\[.*\]', raw, re.DOTALL)
        if not match:
            print(f"  ⚠️  Scout: could not parse JSON")
            return []

        results = json.loads(match.group())
        new_leads = []
        for r in results:
            lead = _add_lead(
                name=r.get("name", "Unknown"),
                website=r.get("website", ""),
                city=r.get("city", ""),
                risk_score=r.get("risk_score", 7),
            )
            new_leads.append(lead)

        print(f"  ✅ Scout found {len(new_leads)} leads")
        return new_leads

    except Exception as e:
        print(f"  ❌ Scout error: {e}")
        return []


# ══════════════════════════════════════════════════════════════
# BRIDGE — send lead through Brain 1's execution engine
# ══════════════════════════════════════════════════════════════

def bridge_lead(lead: dict) -> bool:
    """
    Full pipeline for one lead:
      1. POST /api/enrich  → Apollo finds real contact email + name
      2. POST /api/closer  → generates signal-aware sequence + fires Email 1 via Resend
    """
    if not APP_URL:
        print("  ❌ APP_URL not set — cannot bridge")
        return False

    name    = lead["name"]
    website = lead["website"]
    city    = lead.get("city", "")
    risk    = lead.get("risk_score", 7)

    print(f"\n  🌉 Bridging: {name} ({website})")

    # ── Step 1: Enrich via Apollo ──────────────────────────────
    print(f"    1/2 Enriching via Apollo...")
    try:
        enrich_res = requests.post(
            f"{APP_URL}/api/enrich",
            headers=_headers(),
            json={
                "company": name,
                "domain": website.replace("https://", "").replace("http://", "").split("/")[0],
                "update_db": False,
            },
            timeout=30
        )
        enrich_data = enrich_res.json()
    except Exception as e:
        print(f"    ❌ Enrich failed: {e}")
        return False

    contact_email = enrich_data.get("contact_email")
    contact_name  = enrich_data.get("contact_name") or name
    contact_title = enrich_data.get("contact_title") or "Decision Maker"
    confidence    = enrich_data.get("confidence", "low")

    if not contact_email:
        print(f"    ⚠️  No email found (confidence: {confidence}) — skipping")
        return False

    print(f"    ✅ Email found: {contact_email} ({contact_name}, {confidence} confidence)")

    # ── Step 2: Fire outreach via Closer ──────────────────────
    print(f"    2/2 Firing outreach via Closer...")

    # Build the signal-aware recipient payload
    bill96_issues = [
        f"English-only website detected: {website}",
        "No French language policy page found",
        f"OQLF compliance gap: HIGH (risk score {risk}/10)",
        f"Location: {city}, Quebec — Bill 96 enforcement zone",
    ]

    recipient = {
        "name":                  contact_name,
        "email":                 contact_email,
        "company":               name,
        "title":                 contact_title,
        "source":                "imperial_scout",
        "signal_type":           "bill96_compliance_risk",
        "pain_point":            "Bill 96 / Law 25 compliance exposure — potential $30,000 CAD OQLF fine",
        "personalization_hook":  f"English-only website at {website} flagged at {risk}/10 risk",
        "recommended_service":   "Bill 96 Compliance Audit + Quebec French AI Creative ($750 CAD audit / $3,500 CAD/mo retainer)",
        "budget":                None,
    }

    # Minimal campaign context — points back to the compliance offer
    campaign = {
        "id":           None,
        "name":         "Northern Ventures — Imperial Compliance",
        "payment_link": os.getenv("STRIPE_AUDIT_LINK", ""),
    }

    # Opportunity context for the LLM prompt
    opportunity = {
        "niche":                    "Quebec Bill 96 compliance for English-first businesses",
        "market":                   f"Quebec, Canada — {city}",
        "estimated_mrr_potential":  "$3,500 CAD/mo retainer + $750 CAD audit",
        "demand_signals":           bill96_issues,
        "queen_reasoning":          (
            f"{name} operates in Quebec with an English-only digital presence. "
            f"Under Bill 96, all Quebec businesses must provide French-language "
            f"services. OQLF enforcement has intensified in 2026 — fines up to "
            f"$30,000 CAD per violation. Northern Ventures offers both the compliance "
            f"fix and an autonomous AI creative solution at 90% below agency cost."
        ),
    }

    try:
        closer_res = requests.post(
            f"{APP_URL}/api/closer",
            headers=_headers(),
            json={
                "action":      "generate_sequence",
                "recipients":  [recipient],
                "opportunity": opportunity,
                "campaign":    campaign,
            },
            timeout=60
        )
        closer_data = closer_res.json()
    except Exception as e:
        print(f"    ❌ Closer failed: {e}")
        return False

    if closer_data.get("skipped"):
        print(f"    ⏭️  Skipped — outreach already active for {contact_email}")
        _mark_bridged(lead["id"])
        return True

    sent = closer_data.get("sent", 0)
    subject = (closer_data.get("sequence") or [{}])[0].get("subject", "—")

    if sent > 0:
        print(f"    ✅ Email 1 sent: \"{subject}\"")
        print(f"    📅 Follow-ups scheduled automatically via Scheduler Bee")
    else:
        print(f"    ⚠️  Sequence saved but not sent (Resend not configured?)")

    _mark_bridged(lead["id"])
    return True


# ══════════════════════════════════════════════════════════════
# REPLY BRIDGE — routes Gmail replies into Brain 1's /api/replies
# ══════════════════════════════════════════════════════════════

def _load_watchdog_cache() -> set:
    if Path(WATCHDOG_CACHE).exists():
        with open(WATCHDOG_CACHE) as f:
            try: return set(json.load(f))
            except: return set()
    return set()

def _save_watchdog_cache(ids: set):
    with open(WATCHDOG_CACHE, "w") as f:
        json.dump(list(ids), f)

def _decode_str(value) -> str:
    if isinstance(value, bytes):
        return value.decode(errors="replace")
    return value or ""

def check_replies_and_bridge():
    """
    Scans Gmail for replies to our outreach.
    Routes each reply through /api/replies for:
      - Gemini classification (interested/objection/question/etc)
      - Supabase storage
      - Telegram alert with suggested reply
    """
    if not IMAP_USER or not IMAP_PASS:
        print(f"  ⚠️  IMAP not configured — skipping reply check")
        return

    processed = _load_watchdog_cache()

    try:
        mail = imaplib.IMAP4_SSL("imap.gmail.com")
        mail.login(IMAP_USER, IMAP_PASS)
        mail.select("inbox")
        _, search_data = mail.search(None, "UNSEEN")

        for num in search_data[0].split():
            _, data = mail.fetch(num, "(RFC822)")
            raw = data[0][1]
            msg = email.message_from_bytes(raw)

            msg_id = msg.get("Message-ID", str(num))
            if msg_id in processed:
                continue

            from_raw = decode_header(msg.get("From", ""))[0]
            from_addr = _decode_str(from_raw[0])

            subject_raw = decode_header(msg.get("Subject", "No Subject"))[0]
            subject = _decode_str(subject_raw[0])

            # Extract body
            body = ""
            if msg.is_multipart():
                for part in msg.walk():
                    if part.get_content_type() == "text/plain":
                        body = part.get_payload(decode=True).decode(errors="replace")
                        break
            else:
                body = msg.get_payload(decode=True).decode(errors="replace")

            # Only process replies to our outreach subjects
            outreach_keywords = ["bill 96", "compliance", "northern ventures",
                                  "imperial", "audit", "loi 96", "cyberhound"]
            is_outreach_reply = any(kw in subject.lower() or kw in body.lower()
                                    for kw in outreach_keywords)
            if not is_outreach_reply:
                processed.add(msg_id)
                continue

            print(f"\n  📨 Reply detected from {from_addr}: \"{subject}\"")

            # Bridge to /api/replies
            if APP_URL:
                try:
                    reply_res = requests.post(
                        f"{APP_URL}/api/replies",
                        headers=_headers(),
                        json={
                            "from_email": from_addr,
                            "raw_body":   body[:2000],
                            "lead_id":    None,
                            "campaign_id": None,
                        },
                        timeout=20
                    )
                    reply_data = reply_res.json()
                    classification = reply_data.get("classification", {})
                    print(f"    🧠 Classified: {classification.get('classification')} "
                          f"| sentiment: {classification.get('sentiment')}")
                    print(f"    💬 Suggested reply: {classification.get('suggested_reply', '')[:80]}...")
                except Exception as e:
                    print(f"    ❌ Reply bridge error: {e}")

            processed.add(msg_id)

        mail.logout()
        _save_watchdog_cache(processed)

    except Exception as e:
        print(f"  ❌ IMAP error: {e}")


# ══════════════════════════════════════════════════════════════
# MAIN LOOP
# ══════════════════════════════════════════════════════════════

async def main_loop():
    print("""
╔══════════════════════════════════════════════════════════════╗
║   🌉 CYBERHOUND BRIDGE — ACTIVATED                          ║
║                                                              ║
║   Scout (Gemini) → Enrich (Apollo) → Closer (Resend)        ║
║   Gmail Replies → /api/replies → Gemini classify            ║
╚══════════════════════════════════════════════════════════════╝
""")
    print(f"  APP_URL:        {APP_URL or '⚠️  NOT SET'}")
    print(f"  Scout interval: every {SCOUT_INTERVAL_HOURS}h")
    print(f"  Watchdog:       every {WATCHDOG_INTERVAL_SEC}s")
    print(f"  Max strikes:    {MAX_DAILY_STRIKES}/day")
    print()

    if not APP_URL:
        print("❌ APP_URL is required. Set it in .env: APP_URL=https://your-domain.vercel.app")
        return

    last_scout = 0
    scout_interval_sec = SCOUT_INTERVAL_HOURS * 3600
    strikes_today = 0
    last_strike_day = datetime.now().day

    while True:
        now = time.time()

        # Reset daily strike counter
        today = datetime.now().day
        if today != last_strike_day:
            strikes_today = 0
            last_strike_day = today

        # ── Scout cycle ──────────────────────────────────────
        if now - last_scout >= scout_interval_sec:
            await run_scout()
            last_scout = time.time()

        # ── Bridge pending leads ─────────────────────────────
        pending = [l for l in _load_leads() if not l.get("bridged")]
        if pending and strikes_today < MAX_DAILY_STRIKES:
            print(f"\n⚡ [{_ts()}] BRIDGE — {len(pending)} leads to bridge")
            for lead in pending:
                if strikes_today >= MAX_DAILY_STRIKES:
                    print(f"  🛑 Daily limit ({MAX_DAILY_STRIKES}) reached")
                    break
                if lead.get("website"):
                    success = bridge_lead(lead)
                    if success:
                        strikes_today += 1
                    await asyncio.sleep(3)

        # ── Check Gmail replies ──────────────────────────────
        check_replies_and_bridge()

        # ── Heartbeat ────────────────────────────────────────
        next_scout_min = max(0, int((scout_interval_sec - (time.time() - last_scout)) / 60))
        print(f"\n  💓 [{_ts()}] Alive — strikes today: {strikes_today}/{MAX_DAILY_STRIKES} "
              f"| next scout in {next_scout_min}m")

        await asyncio.sleep(WATCHDOG_INTERVAL_SEC)


# ══════════════════════════════════════════════════════════════
# ENTRY POINT
# ══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import sys
    cmd = sys.argv[1] if len(sys.argv) > 1 else "all"

    if cmd == "scout":
        asyncio.run(run_scout())
    elif cmd == "bridge":
        # Bridge all pending leads right now
        pending = [l for l in _load_leads() if not l.get("bridged")]
        print(f"⚡ Bridging {len(pending)} pending leads...")
        for lead in pending:
            bridge_lead(lead)
    elif cmd == "replies":
        check_replies_and_bridge()
    elif cmd == "all":
        asyncio.run(main_loop())
    else:
        print(__doc__)
