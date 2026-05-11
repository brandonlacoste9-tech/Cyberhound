import requests
import time
import os
import subprocess
from dotenv import load_dotenv

load_dotenv()

SITE_URL = os.getenv("NEXT_PUBLIC_SITE_URL", "http://localhost:3002")

def run_bee_cycle():
    print("[SOVEREIGN] Initiating Neural Pulse...", flush=True)
    
    try:
        # 1. THE HUNT (Auto-Research)
        print("[SOVEREIGN] Releasing Scouts...", flush=True)
        requests.get(f"{SITE_URL}/api/cron/hunt", timeout=60)
        
        # 2. THE HARVEST (Auto-Scrape)
        print("[SOVEREIGN] Harvesting Global Leads...", flush=True)
        requests.post(f"{SITE_URL}/api/analyst", json={"mode": "all", "limit": 20}, timeout=120)
        
        # 3. THE ENRICHMENT (Auto-Apollo)
        print("[SOVEREIGN] Enriching Neural Data...", flush=True)
        leads_res = requests.get(f"{SITE_URL}/api/analyst?status=new&limit=50", timeout=30)
        leads = leads_res.json().get("leads", [])
        if leads:
            requests.post(f"{SITE_URL}/api/enrich", json={"leads": leads}, timeout=180)
        
        # 4. THE STRIKE (Auto-Closer)
        print("[SOVEREIGN] Firing Closer Swarm...", flush=True)
        enriched_res = requests.get(f"{SITE_URL}/api/analyst?status=enriched&limit=50", timeout=30)
        enriched = enriched_res.json().get("leads", [])
        for lead in enriched:
            requests.post(f"{SITE_URL}/api/closer", json={"action": "from_lead", "lead_id": lead["id"]}, timeout=60)
            time.sleep(2) 
            
        # 5. THE AUDIT (Auto-Treasurer)
        print("[SOVEREIGN] Syncing Vault...", flush=True)
        requests.get(f"{SITE_URL}/api/treasurer", timeout=30)
        
        print("SUCCESS: [SOVEREIGN] Cycle Complete. Empire is stable.", flush=True)
        
    except Exception as e:
        print(f"GLITCH: [SOVEREIGN] Neural Glitch: {e}", flush=True)

def watchdog():
    print("[SOVEREIGN] Watchdog Active. Monitoring Neural Nodes...", flush=True)
    while True:
        check = subprocess.run(["tasklist", "/FI", 'IMAGENAME eq python.exe'], capture_output=True, text=True)
        if "python.exe" not in check.stdout:
            print("REBOOT: [SOVEREIGN] Hermes node down. Rebooting...", flush=True)
            subprocess.Popen(["python", "hermes_worker.py"])
        
        run_bee_cycle()
        
        print("REST: [SOVEREIGN] Hive resting for 120s...", flush=True)
        time.sleep(120)

if __name__ == "__main__":
    watchdog()
