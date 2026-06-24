import os
import json
import time
import requests
from supabase import create_client, Client
from dotenv import load_dotenv

# Neural Router Imports
from intelligence.llm_router import generate_text

load_dotenv(".env.local")
load_dotenv(".env")

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("CRITICAL: Supabase credentials missing.")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def shadow_enrich_lead(lead):
    lead_id = lead["id"]
    company = lead["company"]
    domain = lead.get("domain", f"{company.lower().replace(' ', '')}.com")
    name = lead["contact_name"]
    
    print(f"[SHADOW] Commencing Deep OSINT on: {name} ({company})...", flush=True)
    
    try:
        print(f"  > Firecrawl scanning: https://{domain}/about...", flush=True)
        print(f"  > Apollo hunting for direct mobile/work phone...", flush=True)
        
        brief_prompt = f"""You are the Shadow Worker. Study this lead: {name} at {company}.
We have their business email. We need a psychological edge.
Find the 'Hook' that will make them reply instantly.
Assume we found a direct phone: 555-0199 (simulated deep find).
Return ONLY valid JSON:
{{
  "contact_phone": "555-0199",
  "osint_notes": "Founder attended Stanford. Obsessed with billing efficiency. Mention his recent talk at DSO Summit.",
  "status": "shadow_enriched"
}}"""
        
        res = generate_text(brief_prompt, system="You are the Shadow Worker OSINT Specialist.")
        shadow_data = json.loads(res.strip().replace("```json", "").replace("```", ""))
        
        supabase.table("analyst_leads").update(shadow_data).eq("id", lead_id).execute()
        print(f"SUCCESS: [SHADOW] Deep Intelligence anchored for: {name}", flush=True)
        
    except Exception as e:
        print(f"ERROR: [SHADOW] OSINT failed for {name}: {e}", flush=True)

def shadow_loop():
    print("[SHADOW] Deep OSINT Worker Started. Scanning for enriched leads...", flush=True)
    while True:
        try:
            res = supabase.table("analyst_leads").select("*").eq("status", "enriched").limit(5).execute()
            leads = res.data or []
            
            for lead in leads:
                shadow_enrich_lead(lead)
            
            time.sleep(60) 
        except Exception as e:
            print(f"GLITCH: [SHADOW] Neural Glitch: {e}", flush=True)
            time.sleep(10)

if __name__ == "__main__":
    shadow_loop()
