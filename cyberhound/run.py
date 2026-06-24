#!/usr/bin/env python3
"""
🐺 Cyberhound Swarm Runner

Hound Pack (marketplace hunters):
    python run.py status / hunt / hot / repair / dashboard

Full Autonomous Revenue Mode (bees + pipeline):
    python run.py autonomous          # Run the full Scout→Enrich→Strike→Sequence loop once
    python run.py autonomous --loop   # Continuous autonomous worker (recommended for VPS/Docker)

Task Queue Worker (for Queen dispatches):
    python -m cyberhound.task_runner --loop
"""

import sys
import asyncio

def main():
    """Main entry point with command routing"""
    cmd = sys.argv[1] if len(sys.argv) > 1 else "help"
    args = sys.argv[2:]

    if cmd in ("autonomous", "auto", "loop"):
        from cyberhound.autonomy_engine import main_loop, run_scout, enrich_all_leads, run_striker, run_sequence
        if "--loop" in args or cmd == "loop":
            print("🚀 Starting FULL AUTONOMOUS LOOP (Ctrl+C to stop)")
            asyncio.run(main_loop())
        else:
            print("🚀 Running one autonomous cycle...")
            asyncio.run(run_scout())
            asyncio.run(enrich_all_leads())
            asyncio.run(run_striker())
            asyncio.run(run_sequence())
            print("✅ Autonomous cycle complete.")
        return

    if cmd == "task-runner":
        from cyberhound.task_runner import run_once, run_loop
        if "--loop" in args:
            asyncio.run(run_loop())
        else:
            asyncio.run(run_once())
        return

    # Default to Hound pack
    from cyberhound.swarm.hound_manager import HoundManager
    
    manager = HoundManager()
    
    if cmd == "dashboard":
        from cyberhound.swarm.command_center import CommandCenter
        center = CommandCenter(manager)
        try:
            asyncio.run(center.run_live(hunt_on_start="--hunt" in args))
        except KeyboardInterrupt:
            center.stop()
            print("\n👋 Goodbye!")
        return
    
    if cmd in ("help", "--help", "h"):
        print(__doc__)
        return
    
    # Hound commands
    asyncio.run(manager.run_command(cmd, args))

if __name__ == "__main__":
    main()
