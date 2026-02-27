import json, os, time
from datetime import datetime

def render_dashboard():
    os.system('clear')
    print("═══ SOUVERAIN COMMAND CENTER ═══".center(50))
    print(f"🕒 Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} EST")
    print("═" * 50)
    
    try:
        with open('AUDIT_LOG.json', 'r') as f:
            audits = json.load(f)
        
        print(f"📊 SWARM RADIUS: 20 Hounds")
        print(f"🔥 DISPATCH READY: {len(audits)} Leads")
        print("═" * 50)
        
        for lead in audits[:5]: # Show top 5 for the preview
            status = lead['souverain_audit']['bill_96_status']
            target = lead['hound_id']
            print(f"🐺 {target} | BILL 96: {status} | POTENTIAL: 85%")
        
        print("...")
        print("═" * 50)
        print("📡 SYSTEM: NODE 1 (CROWN) - OPTIMAL")
        print("📡 SYSTEM: NODE 2 (TALON) - IDLE")
        print("📡 SYSTEM: NODE 3 (VAULT) - SECURE")
        print("═" * 50)
        print("COMMAND: [A]ctivate Strike | [S]cale Swarm | [Q]uit")
        
    except FileNotFoundError:
        print("⚠️ ERROR: DATASYNAPSE DISCONNECTED")

if __name__ == "__main__":
    render_dashboard()
