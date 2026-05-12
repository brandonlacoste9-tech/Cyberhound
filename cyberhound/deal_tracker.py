"""
Deal Tracker - CyberHound Closing Loop CRM
Tracks every prospect through: PROSPECT → REPLIED → CALLED → CLOSED
Persists to deals.json locally (Supabase outreach_log is source of truth)
"""
import json
import os
from datetime import datetime
from enum import Enum

DEALS_FILE = "deals.json"

class Stage(str, Enum):
    PROSPECT   = "PROSPECT"    # Email sent, no reply
    REPLIED    = "REPLIED"     # They responded
    CALLED     = "CALLED"      # Demo call completed
    CLOSED_WON = "CLOSED_WON" # Deal signed + paid
    CLOSED_LOST = "CLOSED_LOST" # Dead
    NURTURE    = "NURTURE"     # Long-term re-approach (6mo)

def _load() -> list:
    if not os.path.exists(DEALS_FILE):
        return []
    with open(DEALS_FILE, "r") as f:
        try:
            return json.load(f)
        except:
            return []

def _save(deals: list):
    with open(DEALS_FILE, "w") as f:
        json.dump(deals, f, indent=2)

def upsert_deal(email: str, name: str, stage: Stage, notes: str = "", 
    """Create or update a deal record"""
    deals = _load()
    now = str(datetime.now())

    # Find existing
    existing = next((d for d in deals if d["email"].lower() == email.lower()), None)

    if existing:
        prev_stage = existing["stage"]
        existing["stage"] = stage
        existing["updated_at"] = now
        if notes:
            existing["notes"] = notes
        if stripe_link:
            existing["stripe_link"] = stripe_link
        existing.setdefault("history", []).append({
            "from": prev_stage,
            "to": stage,
            "at": now,
            "notes": notes
        })
        deal = existing
        print(f"📊 DEAL UPDATED: {name} → {stage}")
    else:
        deal = {
            "id": f"deal_{int(datetime.now().timestamp())}",
            "email": email,
            "name": name,
            "stage": stage,
            "created_at": now,
            "updated_at": now,
            "notes": notes,
            "stripe_link": stripe_link,
            "history": [{"from": None, "to": stage, "at": now, "notes": notes}]
        }
        deals.append(deal)
        print(f"📊 DEAL CREATED: {name} → {stage}")

    _save(deals)
    return deal

def get_deal(email: str) -> dict | None:
    """Fetch a deal by email"""
    deals = _load()
    return next((d for d in deals if d["email"].lower() == email.lower()), None)

def list_deals(stage: Stage = None) -> list:
    """List all deals, optionally filtered by stage"""
    deals = _load()
    if stage:
        return [d for d in deals if d["stage"] == stage]
    return deals

def print_pipeline():
    """Print the full pipeline summary"""
    deals = _load()
    stages = [s.value for s in Stage]
    print("\n" + "="*60)
    print("⚜️  CYBERHOUND PIPELINE DASHBOARD")
    print("="*60)
    for stage in stages:
        bucket = [d for d in deals if d["stage"] == stage]
        if bucket:
            print(f"\n  [{stage}] ({len(bucket)})")
            for d in bucket:
                print(f"    • {d['name']} <{d['email']}> — {d['updated_at'][:10]}")
    total = len(deals)
    won = len([d for d in deals if d["stage"] == Stage.CLOSED_WON])
    print(f"\n  TOTAL: {total} deals | WON: {won}")
    print("="*60 + "\n")

if __name__ == "__main__":
    print_pipeline()
