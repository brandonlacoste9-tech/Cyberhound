import os
import json
import time
import requests
from supabase import create_client, Client
from dotenv import load_dotenv

# Neural Router Imports
from intelligence.llm_router import generate_text, moonshot_generate

load_dotenv(".env.local")
load_dotenv(".env")

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("CRITICAL: Supabase credentials missing.")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def generate_campaign_content(campaign):
    campaign_id = campaign["id"]
    name = campaign["name"]
    niche = campaign["niche"]
    
    print(f"[CONTENT BEE] Studying campaign: {name} ({niche})...", flush=True)
    
    study_prompt = f"""You are the CMO of CyberHound. Study this SaaS niche: "{niche}".
Manifest 3 blog post titles + bodies and 1 social media thread (5 tweets).
Focus on the pain points and ROI for the target audience.
Return ONLY a valid JSON object:
{{
  "blog_posts": [
    {{ "title": "...", "body": "...", "type": "blog" }},
    {{ "title": "...", "body": "...", "type": "blog" }},
    {{ "title": "...", "body": "...", "type": "blog" }}
  ],
  "social_thread": {{ "title": "Social Thread", "body": "1. ... \n2. ...", "type": "social" }}
}}"""

    try:
        print(f"  > Manifesting assets via DeepSeek Core...", flush=True)
        res = generate_text(study_prompt, system="You are the CMO Bee. Expert in B2B SaaS marketing and SEO.")
        assets = json.loads(res.strip().replace("```json", "").replace("```", ""))
        
        for post in assets["blog_posts"]:
            supabase.table("content_assets").insert({
                "campaign_id": campaign_id,
                "type": "blog",
                "title": post["title"],
                "body": post["body"],
                "status": "published"
            }).execute()
            
        supabase.table("content_assets").insert({
            "campaign_id": campaign_id,
            "type": "social",
            "title": assets["social_thread"]["title"],
            "body": assets["social_thread"]["body"],
            "status": "published"
        }).execute()
        
        print(f"SUCCESS: [CONTENT BEE] Manifested 4 assets for: {name}", flush=True)
        
    except Exception as e:
        print(f"ERROR: [CONTENT BEE] Manifestation failed for {name}: {e}", flush=True)

def content_loop():
    print("[CONTENT BEE] CMO Worker Started. Monitoring Hive for live campaigns...", flush=True)
    while True:
        try:
            res = supabase.table("campaigns").select("id, name, niche").eq("status", "live").execute()
            campaigns = res.data or []
            
            for camp in campaigns:
                check = supabase.table("content_assets").select("id").eq("campaign_id", camp["id"]).limit(1).execute()
                if not (check.data and len(check.data) > 0):
                    generate_campaign_content(camp)
            
            time.sleep(60) 
        except Exception as e:
            print(f"GLITCH: [CONTENT BEE] Heartbeat glitch: {e}", flush=True)
            time.sleep(10)

if __name__ == "__main__":
    content_loop()
