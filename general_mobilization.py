import requests
import time
import os
from dotenv import load_dotenv

load_dotenv()

SITE_URL = os.getenv("NEXT_PUBLIC_SITE_URL", "http://localhost:3002")

def mobilize():
    print("🌑🦾 CYBERHOUND GENERAL MOBILIZATION INITIATED")
    print("="*60)
    
    while True:
        try:
            # 1. Trigger the Hunt (Scout + Hermes)
            # This ensures fresh niches are always being researched
            print("[GENERAL] Triggering Swarm Hunt...", flush=True)
            requests.get(f"{SITE_URL}/api/cron/hunt", timeout=30)
            
            # 2. Trigger Lead Enrichment (Analyst Bee)
            # This finds decision-makers for our live campaigns
            print("[GENERAL] Triggering Lead Enrichment...", flush=True)
            requests.post(f"{SITE_URL}/api/analyst", json={"mode": "all", "limit": 10}, timeout=60)
            
            # 3. Trigger Outreach (Closer Bee)
            # This fires the sequences for any new enriched leads
            print("[GENERAL] Triggering Outreach Swarm...", flush=True)
            requests.get(f"{SITE_URL}/api/cron/scheduler", timeout=60) # Hits the follow-up scheduler
            
            # 4. Trigger Treasurer Audit
            print("[GENERAL] Triggering Revenue Sync...", flush=True)
            requests.get(f"{SITE_URL}/api/treasurer", timeout=30)
            
            print("="*60)
            print("✅ Cycle Complete. Swarm is persistent. Sleeping for 10 mins...", flush=True)
            time.sleep(600) # Run full cycle every 10 mins
            
        except Exception as e:
            print(f"[ERROR] Mobilization glitch: {e}", flush=True)
            time.sleep(60)

if __name__ == "__main__":
    mobilize()
