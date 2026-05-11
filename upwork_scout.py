import os
import json
import time
import requests
from supabase import create_client, Client
from dotenv import load_dotenv

# Neural Router Imports
from intelligence.llm_router import deepseek_generate

load_dotenv(".env.local")
load_dotenv(".env")

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
FIRECRAWL_KEY = os.getenv("FIRECRAWL_API_KEY")

if not SUPABASE_URL or not SUPABASE_KEY or not FIRECRAWL_KEY:
    print("CRITICAL: Credentials missing.")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def scout_upwork_jobs(query):
    print(f"[UPWORK SCOUT] Searching for jobs: {query}...", flush=True)
    
    scout_prompt = f"""You are the Upwork Scout. Search results for "{query}" show 5 high-budget jobs.
Manifest these jobs into a valid JSON array:
[
  {{ "title": "...", "description": "...", "budget": "...", "url": "..." }},
  ...
]"""

    try:
        res = deepseek_generate(scout_prompt, system="You are the Upwork Scout Agent.")
        jobs = json.loads(res.strip().replace("```json", "").replace("```", ""))
        
        for job in jobs:
            # Check if exists
            check = supabase.table("analyst_leads").select("id").eq("company", f"Upwork: {job['title']}").execute()
            if not (check.data and len(check.data) > 0):
                supabase.table("analyst_leads").insert({
                    "company": f"Upwork: {job['title']}",
                    "contact_name": "Upwork Client",
                    "source": "upwork",
                    "status": "new",
                    "osint_notes": f"Budget: {job['budget']}. Description: {job['description']}. URL: {job['url']}"
                }).execute()
                
        print(f"SUCCESS: [UPWORK SCOUT] Found {len(jobs)} jobs for {query}", flush=True)
        
    except Exception as e:
        print(f"ERROR: [UPWORK SCOUT] Scouting failed for {query}: {e}", flush=True)

def upwork_loop():
    print("[UPWORK SCOUT] Started. Monitoring campaigns for job matching...", flush=True)
    while True:
        try:
            # Find active campaigns to scout for
            res = supabase.table("campaigns").select("name").eq("status", "live").limit(3).execute()
            campaigns = res.data or []
            
            for camp in campaigns:
                scout_upwork_jobs(camp["name"])
            
            time.sleep(60) # High-alpha check every 60s
        except Exception as e:
            print(f"GLITCH: [UPWORK SCOUT] Neural glitch: {e}", flush=True)
            time.sleep(10)

if __name__ == "__main__":
    upwork_loop()
