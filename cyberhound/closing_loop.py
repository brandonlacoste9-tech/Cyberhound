"""
CLOSING LOOP — Master Command Center
The unified interface for the entire CyberHound sales engine.

COMMANDS:
  python3 closing_loop.py pipeline          — View full deal pipeline
  python3 closing_loop.py strike <email> <name> [risk_score]  — Fire Touch 1
  python3 closing_loop.py sequence          — Run drip sequence (Touch 2/3)
  python3 closing_loop.py watch             — Start reply watchdog (auto-respond)
  python3 closing_loop.py postcall <email> <name> [retainer|audit]  — Post-call payment link
  python3 closing_loop.py won <email> <name> [amount]  — Mark closed won
  python3 closing_loop.py lost <email> <name> [reason] — Mark lost
  python3 closing_loop.py add <email> <name>  — Add deal manually
"""
import sys
from cyberhound.deal_tracker import print_pipeline, upsert_deal, Stage
from cyberhound.email_envoy_v2 import (
    fire_touch_1, fire_touch_2, fire_touch_3,
    fire_reply_autoresponse, fire_post_call,
    mark_closed_won, mark_closed_lost
)
from cyberhound.sequence_scheduler import run_sequence

def cmd_pipeline():
    print_pipeline()

def cmd_strike(args):
    if len(args) < 2:
        print("Usage: python3 closing_loop.py strike <email> <name> [risk_score]")
        return
    email = args[0]
    name = args[1]
    risk = int(args[2]) if len(args) > 2 else 7
    print(f"🎯 Firing Touch 1 → {name} <{email}> | Risk: {risk}/10")
    fire_touch_1(email, name, risk)

def cmd_sequence():
    run_sequence()

def cmd_watch():
    from response_tracker_v2 import EmpireWatchdogV2
    from config import check_config
    if not check_config():
        return
    watchdog = EmpireWatchdogV2(auto_respond=True)
    watchdog.watch(interval=30)

def cmd_postcall(args):
    if len(args) < 2:
        print("Usage: python3 closing_loop.py postcall <email> <name> [retainer|audit]")
        return
    email = args[0]
    name = args[1]
    use_retainer = True
    offer = "Imperial Growth Retainer — $3,500 CAD/mo"
    if len(args) > 2 and args[2].lower() == "audit":
        use_retainer = False
        offer = "Imperial Compliance Audit — $750 CAD"
    fire_post_call(email, name, offer, use_retainer)

def cmd_won(args):
    if len(args) < 2:
        print("Usage: python3 closing_loop.py won <email> <name> [amount]")
        return
    amount = args[2] if len(args) > 2 else ""
    mark_closed_won(args[0], args[1], amount)

def cmd_lost(args):
    if len(args) < 2:
        print("Usage: python3 closing_loop.py lost <email> <name> [reason]")
        return
    reason = args[2] if len(args) > 2 else ""
    mark_closed_lost(args[0], args[1], reason)

def cmd_add(args):
    if len(args) < 2:
        print("Usage: python3 closing_loop.py add <email> <name>")
        return
    upsert_deal(args[0], args[1], Stage.PROSPECT, notes="Manually added")
    print(f"✅ Deal added: {args[1]} <{args[0]}>")

def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return

    cmd = sys.argv[1].lower()
    args = sys.argv[2:]

    commands = {
        "pipeline": lambda: cmd_pipeline(),
        "strike":   lambda: cmd_strike(args),
        "sequence": lambda: cmd_sequence(),
        "watch":    lambda: cmd_watch(),
        "postcall": lambda: cmd_postcall(args),
        "won":      lambda: cmd_won(args),
        "lost":     lambda: cmd_lost(args),
        "add":      lambda: cmd_add(args),
    }

    if cmd in commands:
        commands[cmd]()
    else:
        print(f"❌ Unknown command: {cmd}")
        print(__doc__)

if __name__ == "__main__":
    main()
