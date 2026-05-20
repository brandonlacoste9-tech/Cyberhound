"""
HERMES AUTONOMY ENGINE v2 — CyberHound Full Autonomous Loop
===========================================================
Powered by Hermes (DeepSeek) AI instead of Gemini.

LOOP:
  1. Hermes Scout → finds high-opportunity niches/leads
  2. Hermes Enrich → scores each lead, extracts contact info
  3. Hermes Decide → pursue / watch / discard based on ICP
  4. AI Email Envoy → personalized Touch 1 for pursued leads
  5. Watchdog → monitors replies, Hermes auto-responds
  6. Sequence Scheduler → Touch 2 (Day 3), Touch 3 (Day 7)
  7. Hermes Retrospective → weekly outcome learning

Run:
  python autonomy_engine_v2.py             # Full autonomous loop
  python autonomy_engine_v2.py once        # Run one full cycle
  python autonomy_engine_v2.py daemon      # Run forever as daemon
"""

import asyncio
import json
import os
import sys
import time
import threading
import traceback
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional

# Add parent to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hermes_client import (
    chat, chat_json, deep_reason, score_lead,
    generate_email, analyze_reply, ping as hermes_ping,
)

# ── Config ──────────────────────────────────────────────────────────────────

SCOUT_INTERVAL_HOURS = int(os.getenv("SCOUT_INTERVAL_HOURS", 6))
SEQUENCE_INTERVAL_HOURS = int(os.getenv("SEQUENCE_INTERVAL_HOURS", 24))
WATCHDOG_INTERVAL_SEC = int(os.getenv("WATCHDOG_INTERVAL_SEC", 60))
MAX_DAILY_STRIKES = int(os.getenv("MAX_DAILY_STRIKES", 20))
LEADS_FILE = "PIPELINE_LEADS.json"
OUTCOMES_FILE = "OUTCOMES_LOG.json"

ICP_MIN_SCORE = int(os.getenv("ICP_MIN_SCORE", 60))  # Min score to pursue
AUTO_STRIKE_ENABLED = os.getenv("AUTO_STRIKE_ENABLED", "true").lower() == "true"
REVENUE_TRACKING_ENABLED = os.getenv("REVENUE_TRACKING_ENABLED", "true").lower() == "true"

# ── Lead Store ──────────────────────────────────────────────────────────────

def load_json(path: str) -> list:
    if not Path(path).exists():
        return []
    try:
        with open(path) as f:
            return json.load(f)
    except:
        return []

def save_json(path: str, data):
    with open(path, "w") as f:
        json.dump(data, f, indent=2, default=str)

def load_leads() -> list:
    return load_json(LEADS_FILE)

def save_leads(leads: list):
    save_json(LEADS_FILE, leads)

def add_lead(lead_data: dict) -> dict:
    leads = load_leads()
    existing = next(
        (l for l in leads
         if l.get("website", "").lower() == lead_data.get("website", "").lower()),
        None
    )
    if existing:
        existing.update({k: v for k, v in lead_data.items() if v})
        save_leads(leads)
        return existing

    lead = {
        "id": f"lead_{int(datetime.now().timestamp())}",
        "discovered_at": datetime.now().isoformat(),
        "pursued": False,
        "struck": False,
        "strike_at": None,
        "replies": [],
        "outcome": None,  # won / lost / ignored / bounced
        "revenue": None,
        **lead_data,
    }
    leads.append(lead)
    save_leads(leads)
    return lead

def update_lead(lead_id: str, updates: dict):
    leads = load_leads()
    for l in leads:
        if l["id"] == lead_id:
            l.update(updates)
            break
    save_leads(leads)

def get_leads_by_status(status: str) -> list:
    if status == "pending_enrichment":
        return [l for l in load_leads() if not l.get("icp_score")]
    if status == "ready_to_strike":
        return [
            l for l in load_leads()
            if l.get("pursued") and not l.get("struck") and l.get("email")
        ]
    if status == "pending_sequence":
        return [
            l for l in load_leads()
            if l.get("struck") and l.get("outcome") is None
        ]
    return []

# ── Outcome Store ───────────────────────────────────────────────────────────

def log_outcome(lead_id: str, outcome: str, revenue: float = None, notes: str = ""):
    outcomes = load_json(OUTCOMES_FILE)
    outcomes.append({
        "lead_id": lead_id,
        "outcome": outcome,
        "revenue": revenue,
        "notes": notes,
        "logged_at": datetime.now().isoformat(),
    })
    save_json(OUTCOMES_FILE, outcomes)

    # Update the lead
    update_lead(lead_id, {"outcome": outcome, "revenue": revenue})


# ═══════════════════════════════════════════════════════════════════════════════
# PHASE 1: HERMES SCOUT — AI-powered niche/lead discovery
# ═══════════════════════════════════════════════════════════════════════════════

async def hermes_scout() -> List[Dict]:
    """Use Hermes to discover high-opportunity B2B leads."""
    print(f"\n🔍 [{_ts()}] HERMES SCOUT — Hunting for opportunities...")

    try:
        prompt = """
        You are an autonomous B2B lead generation agent. Search for high-growth 
        SaaS, AI, and automation opportunities in North America.

        Focus on companies that:
        - Have between 10-200 employees (reachable decision makers)
        - Are in growing sectors: AI, logistics, fintech, healthtech, devtools
        - Show signals of needing automation/compliance services
        - Have English-only websites operating in Quebec/French markets (high risk)

        Return ONLY a valid JSON array with this exact schema:
        [{
          "name": "Company Name",
          "website": "https://company.com",
          "industry": "SaaS | Fintech | Healthtech | etc",
          "risk_score": 85,
          "revenue_signal": "recent funding | growing team | new product launch",
          "why_target": "Brief reason this company is a good prospect"
        }]

        Return 5-10 leads. Risk score = opportunity score (0-100, higher = better target).
        """

        result = chat_json(
            prompt=prompt,
            system="You are an expert B2B lead generation and market research agent.",
            temperature=0.7,
            max_tokens=3000,
        )

        new_leads = []
        if isinstance(result, list):
            for item in result:
                lead = add_lead({
                    "name": item.get("name", "Unknown"),
                    "website": item.get("website", ""),
                    "industry": item.get("industry", ""),
                    "risk_score": item.get("risk_score", 70),
                    "source": "hermes_scout",
                    "scout_notes": {
                        "revenue_signal": item.get("revenue_signal", ""),
                        "why_target": item.get("why_target", ""),
                    },
                })
                new_leads.append(lead)
        elif isinstance(result, dict) and "leads" in result:
            for item in result["leads"]:
                lead = add_lead({
                    "name": item.get("name", "Unknown"),
                    "website": item.get("website", ""),
                    "industry": item.get("industry", ""),
                    "risk_score": item.get("risk_score", 70),
                    "source": "hermes_scout",
                })
                new_leads.append(lead)

        print(f"  ✅ Hermes Scout found {len(new_leads)} new leads")
        return new_leads

    except Exception as e:
        print(f"  ❌ Hermes Scout error: {e}")
        traceback.print_exc()
        return []


# ═══════════════════════════════════════════════════════════════════════════════
# PHASE 2: HERMES ENRICH + DECIDE — Score, enrich, and decide per lead
# ═══════════════════════════════════════════════════════════════════════════════

async def hermes_enrich_and_decide(lead: dict) -> dict:
    """Score a lead and decide: pursue, watch, or discard."""
    name = lead.get("name", "Unknown")
    website = lead.get("website", "")
    print(f"  📊 [{_ts()}] Hermes scoring: {name}")

    try:
        # Score the lead
        score = score_lead(
            company_name=name,
            website=website,
            industry=lead.get("industry", ""),
        )

        icp_score = score.get("icp_score", 50)
        risk_level = score.get("risk_level", "medium")

        # Decide
        if icp_score >= ICP_MIN_SCORE:
            decision = "pursue"
            decision_reason = f"ICP score {icp_score}/100 meets threshold ({ICP_MIN_SCORE})"
        elif icp_score >= 40:
            decision = "watch"
            decision_reason = f"ICP score {icp_score}/100 below threshold, monitoring"
        else:
            decision = "discard"
            decision_reason = f"ICP score {icp_score}/100 too low"

        # Try to find email for pursued leads
        email = ""
        if decision == "pursue":
            email = await hermes_find_email(name, website)

        # Update lead
        updates = {
            "icp_score": icp_score,
            "risk_level": risk_level,
            "decision": decision,
            "decision_reason": decision_reason,
            "key_selling_points": score.get("key_selling_points", []),
            "recommended_tone": score.get("recommended_tone", "consultative"),
            "email": email or lead.get("email", ""),
            "pursued": decision == "pursue",
            "scored_at": datetime.now().isoformat(),
        }
        update_lead(lead["id"], updates)

        emoji = {"pursue": "🎯", "watch": "👁️", "discard": "🗑️"}
        print(f"    {emoji.get(decision, '?')} {decision.upper()} | ICP: {icp_score}/100 | {decision_reason}")
        return updates

    except Exception as e:
        print(f"    ❌ Scoring error: {e}")
        return {"decision": "watch", "error": str(e)}


async def hermes_find_email(company_name: str, website: str) -> str:
    """Use Hermes to suggest contact email patterns."""
    if not website:
        return ""

    try:
        domain = website.replace("https://", "").replace("http://", "").rstrip("/")
        prompt = f"""
        Find the most likely business contact email for {company_name} at {domain}.
        Check common patterns: info@, contact@, hello@, or first name patterns.
        Return ONLY the email address as plain text, or NOT_FOUND if none found.
        """
        result = chat(prompt, max_tokens=100, temperature=0.2)
        if "@" in result and "NOT_FOUND" not in result:
            return result.strip()
        return ""
    except:
        return ""


async def enrich_all_pending():
    """Score and decide on all unenriched leads."""
    pending = get_leads_by_status("pending_enrichment")
    print(f"\n📊 [{_ts()}] HERMES ENRICHER — {len(pending)} leads to score")

    for lead in pending:
        await hermes_enrich_and_decide(lead)
        await asyncio.sleep(1)  # Rate limit


# ═══════════════════════════════════════════════════════════════════════════════
# PHASE 3: AI EMAIL STRIKER — Personalized outreach
# ═══════════════════════════════════════════════════════════════════════════════

async def hermes_striker():
    """Fire AI-personalized Touch 1 for pursued, unstruck leads."""
    from email_envoy_v2 import _send_html
    from deal_tracker import get_deal, upsert_deal, Stage

    ready = get_leads_by_status("ready_to_strike")
    print(f"\n⚡ [{_ts()}] AI STRIKER — {len(ready)} leads ready")

    struck = 0
    for lead in ready:
        if struck >= MAX_DAILY_STRIKES:
            print(f"  🛑 Daily limit ({MAX_DAILY_STRIKES}) reached")
            break

        email = lead.get("email", "")
        name = lead.get("name", "Unknown")
        if not email:
            continue

        # Skip if already in pipeline
        existing = get_deal(email)
        if existing:
            update_lead(lead["id"], {"struck": True, "strike_at": datetime.now().isoformat()})
            continue

        print(f"  ✉️  Generating AI email for: {name}")

        try:
            # Generate AI-personalized email
            ai_email = generate_email(
                to_name=name,
                company_name=name,
                icp_score=lead.get("icp_score", 70),
                risk_level=lead.get("risk_level", "medium"),
                selling_points=lead.get("key_selling_points", []),
                tone=lead.get("recommended_tone", "consultative"),
                touch_number=1,
            )

            subject = ai_email.get("subject", f"Strategic Advisory: {name}")
            body = ai_email.get("body", "")
            body_html = (
                f"<html><body style='font-family:Georgia,serif;color:#e8e0d0;"
                f"max-width:600px;'><pre style='white-space:pre-wrap;"
                f"font-family:Georgia,serif;font-size:14px;"
                f"line-height:1.6;'>{body}</pre></body></html>"
            )

            if AUTO_STRIKE_ENABLED:
                success = _send_html(email, name, subject, body_html)
                if success:
                    update_lead(lead["id"], {
                        "struck": True,
                        "strike_at": datetime.now().isoformat(),
                        "strike_subject": subject,
                    })
                    upsert_deal(email, name, Stage.PROSPECT,
                                notes=f"AI Touch 1 sent {datetime.now().strftime('%Y-%m-%d')} | ICP: {lead.get('icp_score')}")
                    struck += 1
                    print(f"    ✅ Sent: {subject[:60]}")
                    await asyncio.sleep(3)  # Rate limit
            else:
                print(f"    📝 Drafted (auto-send disabled): {subject[:60]}")

        except Exception as e:
            print(f"    ❌ Strike error: {e}")

    print(f"  ✅ Striker done: {struck} emails sent")


# ═══════════════════════════════════════════════════════════════════════════════
# PHASE 4: HERMES WATCHDOG — Monitor replies, auto-respond
# ═══════════════════════════════════════════════════════════════════════════════

async def hermes_watchdog_cycle():
    """Check for replies and auto-respond using Hermes."""
    from config import check_config, IMAP_SERVER, IMAP_USER, IMAP_PASS, SMTP_USER
    from email_envoy_v2 import _send_html
    from deal_tracker import get_deal, upsert_deal, Stage

    if not check_config():
        return

    try:
        import imaplib
        import email as email_lib

        mail = imaplib.IMAP4_SSL(IMAP_SERVER)
        mail.login(IMAP_USER, IMAP_PASS)
        mail.select("inbox")

        # Search for unseen replies from tracked domains
        status, messages = mail.search(None, "(UNSEEN)")
        if not messages[0]:
            return

        for num in messages[0].split()[-5:]:  # Last 5 unread
            status, data = mail.fetch(num, "(RFC822)")
            raw_email = data[0][1]
            msg = email_lib.message_from_bytes(raw_email)

            sender = msg["From"]
            subject = msg.get("Subject", "")
            body = ""

            if msg.is_multipart():
                for part in msg.walk():
                    if part.get_content_type() == "text/plain":
                        body = part.get_payload(decode=True).decode(errors="ignore")
                        break
            else:
                body = msg.get_payload(decode=True).decode(errors="ignore")

            if not body:
                continue

            print(f"  📨 Reply from: {sender}")

            # Hermes analyzes the reply
            analysis = analyze_reply(body)
            sentiment = analysis.get("sentiment", "neutral")
            should_respond = analysis.get("should_respond", False)

            print(f"    Sentiment: {sentiment} | Respond: {should_respond}")

            if should_respond and AUTO_STRIKE_ENABLED:
                # Generate response
                response_email = generate_email(
                    to_name=sender.split("@")[0],
                    company_name="",
                    touch_number=4,
                    previous_reply=body,
                )
                response_body = response_email.get("body", "Thank you for your reply.")
                response_html = (
                    f"<html><body style='font-family:Georgia;color:#e8e0d0;'>"
                    f"<pre style='white-space:pre-wrap;'>{response_body}</pre>"
                    f"</body></html>"
                )
                _send_html(sender, sender, f"Re: {subject}", response_html)
                print(f"    ✅ Auto-response sent")

        mail.close()
        mail.logout()

    except Exception as e:
        print(f"  ⚠️  Watchdog error: {e}")


# ═══════════════════════════════════════════════════════════════════════════════
# PHASE 5: SEQUENCE SCHEDULER
# ═══════════════════════════════════════════════════════════════════════════════

async def run_sequence_drip():
    """Fire Touch 2/3 for leads past their drip dates."""
    from email_envoy_v2 import fire_touch_2, fire_touch_3
    from deal_tracker import get_deal, Stage

    leads = get_leads_by_status("pending_sequence")
    if not leads:
        return

    print(f"\n📅 [{_ts()}] SEQUENCE — Checking {len(leads)} leads for drip...")

    for lead in leads:
        struck_at = lead.get("strike_at", "")
        if not struck_at:
            continue

        try:
            days_since = (datetime.now() - datetime.fromisoformat(struck_at)).days
        except:
            continue

        email = lead.get("email", "")
        name = lead.get("name", "Unknown")
        deal = get_deal(email)

        if deal and deal.get("stage") in [Stage.REPLIED, Stage.CALLED, Stage.CLOSED_WON]:
            continue

        if days_since >= 7 and AUTO_STRIKE_ENABLED:
            print(f"  📧 Touch 3 (Final) → {name} ({days_since}d)")
            fire_touch_3(email, name)
        elif days_since >= 3 and AUTO_STRIKE_ENABLED:
            print(f"  📧 Touch 2 → {name} ({days_since}d)")
            fire_touch_2(email, name)

        await asyncio.sleep(1)


# ═══════════════════════════════════════════════════════════════════════════════
# PHASE 6: HERMES RETROSPECTIVE — Weekly outcome learning
# ═══════════════════════════════════════════════════════════════════════════════

async def hermes_retrospective():
    """Weekly review: what worked, what didn't, adjust strategy."""
    outcomes = load_json(OUTCOMES_FILE)
    leads = load_leads()

    if not outcomes:
        return

    # Only run if we have enough data (at least 5 outcomes or 7 days)
    if len(outcomes) < 5:
        return

    print(f"\n🧠 [{_ts()}] HERMES RETROSPECTIVE — Analyzing {len(outcomes)} outcomes...")

    try:
        won = [o for o in outcomes if o.get("outcome") == "won"]
        lost = [o for o in outcomes if o.get("outcome") == "lost"]
        total_revenue = sum(o.get("revenue", 0) or 0 for o in won)

        summary = {
            "total_outcomes": len(outcomes),
            "won": len(won),
            "lost": len(lost),
            "win_rate": f"{(len(won)/max(len(outcomes),1))*100:.1f}%",
            "total_revenue": f"${total_revenue:,.2f}",
        }

        prompt = f"""
        You are a strategic sales analyst. Review these outcomes and extract learnings:

        PERIOD OUTCOMES:
        {json.dumps([{
            'outcome': o['outcome'],
            'revenue': o.get('revenue'),
            'notes': o.get('notes', '')
        } for o in outcomes[-20:]], indent=2)}

        CURRENT LEADS (sample):
        {json.dumps([{
            'name': l.get('name'),
            'icp_score': l.get('icp_score'),
            'industry': l.get('industry'),
            'decision': l.get('decision'),
            'outcome': l.get('outcome')
        } for l in leads[-10:]], indent=2)}

        SUMMARY: {json.dumps(summary)}

        Return JSON with:
        - insights (list): 3-5 patterns that led to wins or losses
        - strategy_shifts (list): 2-3 recommended changes to the ICP or outreach
        - best_performing_industry (string): which industry closes best
        - recommended_icp_threshold (int): suggested minimum ICP score
        """

        result = chat_json(prompt, max_tokens=1500)
        print(f"  📊 Insights: {json.dumps(result.get('insights', []), indent=2)}")
        print(f"  🎯 Strategy shifts: {json.dumps(result.get('strategy_shifts', []), indent=2)}")

        # Save retrospective
        save_json("RETROSPECTIVE_LATEST.json", {
            "ran_at": datetime.now().isoformat(),
            "summary": summary,
            "insights": result,
        })

    except Exception as e:
        print(f"  ⚠️  Retrospective error: {e}")


# ═══════════════════════════════════════════════════════════════════════════════
# PHASE 7: SYSTEM HEALTH — Self-healing monitor
# ═══════════════════════════════════════════════════════════════════════════════

async def system_health_check():
    """Check all systems and report status."""
    checks = {}

    # Hermes connectivity
    ping = hermes_ping()
    checks["hermes"] = ping

    # SMTP check
    from config import check_config
    checks["smtp"] = check_config()

    # File integrity
    checks["leads_file"] = Path(LEADS_FILE).exists()
    checks["lead_count"] = len(load_leads())

    # Print health
    status_emoji = "✅" if ping["ok"] else "❌"
    print(f"  {status_emoji} Hermes: {ping.get('model', '?')} ({ping.get('latency_ms', '?')}ms)")
    print(f"  {'✅' if checks['smtp'] else '⚠️ '} SMTP: {'configured' if checks['smtp'] else 'missing'}")
    print(f"  📋 Leads: {checks['lead_count']} in pipeline")

    return checks


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN DAEMON LOOP
# ═══════════════════════════════════════════════════════════════════════════════

def _ts():
    return datetime.now().strftime("%H:%M:%S")

async def run_once():
    """Run one full cycle of the autonomy engine."""
    print(f"\n{'='*60}")
    print(f"  🐺 HERMES AUTONOMY ENGINE — Single Cycle")
    print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}")

    # Health check
    await system_health_check()

    # Scout → Enrich → Strike
    await hermes_scout()
    await enrich_all_pending()
    await hermes_striker()

    # Sequence drip
    await run_sequence_drip()

    # Watchdog
    await hermes_watchdog_cycle()

    # Retrospective (only if enough data)
    await hermes_retrospective()

    print(f"\n  ✅ Cycle complete at {_ts()}")


async def run_daemon():
    """Run the autonomy engine as a continuous daemon."""
    print(f"""
╔══════════════════════════════════════════════════════════════╗
║   🐺 HERMES AUTONOMY ENGINE v2 — DAEMON MODE               ║
║                                                              ║
║   Scout → Enrich → Decide → Strike → Watch → Learn          ║
║                                                              ║
║   Powered by: DeepSeek via Hermes AI Client                 ║
╚══════════════════════════════════════════════════════════════╝
    Scout interval:    every {SCOUT_INTERVAL_HOURS}h
    Sequence interval: every {SEQUENCE_INTERVAL_HOURS}h
    Watchdog interval: every {WATCHDOG_INTERVAL_SEC}s
    Max daily strikes: {MAX_DAILY_STRIKES}
    Auto-strike:       {'ENABLED' if AUTO_STRIKE_ENABLED else 'DISABLED'}
    ICP threshold:     {ICP_MIN_SCORE}/100
    """)

    # Initial health check
    await system_health_check()

    last_scout = 0
    last_sequence = 0
    last_retrospective = 0
    scout_interval_sec = SCOUT_INTERVAL_HOURS * 3600
    sequence_interval_sec = SEQUENCE_INTERVAL_HOURS * 3600
    retrospective_interval_sec = 7 * 24 * 3600  # Weekly

    while True:
        now = time.time()

        # ── Scout + Enrich + Strike cycle ──────────────────
        if now - last_scout >= scout_interval_sec:
            try:
                await hermes_scout()
                await enrich_all_pending()
                await hermes_striker()
            except Exception as e:
                print(f"  ❌ Scout cycle error: {e}")
            last_scout = time.time()

        # ── Sequence drip cycle ────────────────────────────
        if now - last_sequence >= sequence_interval_sec:
            try:
                await run_sequence_drip()
            except Exception as e:
                print(f"  ❌ Sequence error: {e}")
            last_sequence = time.time()

        # ── Watchdog (runs more frequently) ────────────────
        try:
            await hermes_watchdog_cycle()
        except Exception as e:
            print(f"  ⚠️  Watchdog cycle error: {e}")

        # ── Weekly retrospective ───────────────────────────
        if now - last_retrospective >= retrospective_interval_sec:
            try:
                await hermes_retrospective()
            except Exception as e:
                print(f"  ⚠️  Retrospective error: {e}")
            last_retrospective = time.time()

        # ── Heartbeat ──────────────────────────────────────
        next_scout_m = max(0, int((scout_interval_sec - (time.time() - last_scout)) / 60))
        print(f"  💓 [{_ts()}] Alive — {len(load_leads())} leads | "
              f"Next scout in {next_scout_m}m")
        await asyncio.sleep(60)  # Heartbeat every minute


# ═══════════════════════════════════════════════════════════════════════════════
# ENTRY POINT
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "daemon"

    if cmd == "once":
        asyncio.run(run_once())
    elif cmd == "daemon":
        try:
            asyncio.run(run_daemon())
        except KeyboardInterrupt:
            print("\n👋 Autonomy engine stopped.")
    elif cmd == "scout":
        asyncio.run(hermes_scout())
    elif cmd == "enrich":
        asyncio.run(enrich_all_pending())
    elif cmd == "strike":
        asyncio.run(hermes_striker())
    elif cmd == "health":
        asyncio.run(system_health_check())
    elif cmd == "retro":
        asyncio.run(hermes_retrospective())
    else:
        print(__doc__)
