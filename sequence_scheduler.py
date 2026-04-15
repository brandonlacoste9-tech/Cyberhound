"""
Sequence Scheduler - Drip Engine
Run this daily (cron or Railway cron job).
Automatically fires Touch 2 (Day 3) and Touch 3 (Day 7)
for any PROSPECT who hasn't replied yet.
"""
import json
from datetime import datetime, timedelta
from deal_tracker import list_deals, Stage
from email_envoy_v2 import fire_touch_2, fire_touch_3

TOUCH_2_DELAY_DAYS = 3
TOUCH_3_DELAY_DAYS = 7

def _days_since(date_str: str) -> int:
    try:
        created = datetime.fromisoformat(date_str)
        return (datetime.now() - created).days
    except:
        return 0

def _already_sent_touch(deal: dict, touch_num: int) -> bool:
    """Check history to see if a given touch was already sent"""
    for h in deal.get("history", []):
        if f"Touch {touch_num} sent" in h.get("notes", ""):
            return True
    if f"Touch {touch_num} sent" in deal.get("notes", ""):
        return True
    return False

def run_sequence():
    print("⚡ SEQUENCE SCHEDULER — DRIP ENGINE")
    print("="*60)
    print(f"🕐 Running at {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print()

    prospects = list_deals(stage=Stage.PROSPECT)
    print(f"📋 Active PROSPECTS: {len(prospects)}")

    touch2_sent = 0
    touch3_sent = 0
    skipped = 0

    for deal in prospects:
        email = deal["email"]
        name = deal["name"]
        days = _days_since(deal["created_at"])

        print(f"\n  → {name} ({email}) — Day {days}")

        # Touch 3: Day 7+
        if days >= TOUCH_3_DELAY_DAYS:
            if not _already_sent_touch(deal, 3):
                print(f"     🔥 Firing Touch 3 (Day {days} — final push)")
                success = fire_touch_3(email, name)
                if success:
                    touch3_sent += 1
            else:
                print(f"     ⏭️  Touch 3 already sent")
                skipped += 1

        # Touch 2: Day 3+
        elif days >= TOUCH_2_DELAY_DAYS:
            if not _already_sent_touch(deal, 2):
                print(f"     📧 Firing Touch 2 (Day {days} — follow-up)")
                success = fire_touch_2(email, name)
                if success:
                    touch2_sent += 1
            else:
                print(f"     ⏭️  Touch 2 already sent")
                skipped += 1

        else:
            days_to_touch2 = TOUCH_2_DELAY_DAYS - days
            print(f"     ⏳ Touch 2 in {days_to_touch2} day(s)")

    print("\n" + "="*60)
    print(f"✅ SEQUENCE RUN COMPLETE")
    print(f"   Touch 2 sent: {touch2_sent}")
    print(f"   Touch 3 sent: {touch3_sent}")
    print(f"   Skipped:      {skipped}")
    print("="*60 + "\n")

if __name__ == "__main__":
    run_sequence()
