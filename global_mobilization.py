import os
import json
import time
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

def manifest_global_workforce():
    print("GLOBAL MOBILIZATION: Initiating High-Alpha Niche Harvest...", flush=True)
    
    mobilization_prompt = """You are the Overlord Strategist. Identify 50 high-ticket B2B SaaS niches that are currently underserved and perfect for AI automation.
Focus on:
1. DSO/Medical Billing
2. Compliance (OSHA, HIPAA, GDPR)
3. Logistics & Supply Chain
4. Specialized Legal (Patent, Contract)
5. Fintech Reconciliation

Return ONLY a valid JSON array of objects:
[
  { "name": "...", "niche": "...", "mrr_potential": 10000 },
  ...
]"""

    try:
        print("  > Neural Engine generating 50 strike points...", flush=True)
        res = generate_text(mobilization_prompt, system="You are the Global Mobilization Strategist.")
        # Clean potential markdown
        clean_res = res.strip().replace("```json", "").replace("```", "")
        niches = json.loads(clean_res)
        
        print(f"  > Injecting {len(niches)} niches into the Sovereign Pipeline...", flush=True)
        
        for niche in niches:
            # Anchor in campaigns as 'building'
            supabase.table("campaigns").insert({
                "name": niche["name"],
                "niche": niche["niche"],
                "status": "building"
            }).execute()
            
            # Log in Hive
            supabase.table("hive_log").insert({
                "bee": "overlord",
                "action": f"GLOBAL MOBILIZATION: Injected {niche['name']}",
                "status": "success"
            }).execute()
            
        print(f"SUCCESS: Global Mobilization Complete. {len(niches)} strike points live.", flush=True)
        
    except Exception as e:
        print(f"ERROR: Global Mobilization failed: {e}", flush=True)

if __name__ == "__main__":
    manifest_global_workforce()
