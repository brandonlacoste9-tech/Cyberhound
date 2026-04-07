#!/usr/bin/env python3
"""
🐺 Cyberhound Swarm - 4 Agent Pack Runner

Quick commands:
    python run.py              # Interactive mode
    python run.py status       # Show pack status
    python run.py hunt         # Deploy all hounds
    python run.py hunt saas    # Deploy only SaaSHound
    python run.py hot          # Show hot deals
    python run.py repair       # Run system repair
    python run.py dashboard    # Launch live dashboard
"""

import sys
import asyncio

def main():
    """Main entry point with command routing"""
    from swarm.hound_manager import HoundManager
    
    manager = HoundManager()
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        args = sys.argv[2:]
        
        # Dashboard command
        if command == "dashboard":
            from swarm.command_center import CommandCenter
            center = CommandCenter(manager)
            try:
                asyncio.run(center.run_live(hunt_on_start="--hunt" in args))
            except KeyboardInterrupt:
                center.stop()
                print("\n👋 Goodbye!")
            return
        
        # Other commands handled by manager
        asyncio.run(manager.run_command(command, args))
    else:
        # Interactive mode
        asyncio.run(manager.interactive_mode())

if __name__ == "__main__":
    main()
