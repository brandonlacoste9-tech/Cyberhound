import os
import time
import json
import subprocess
from supabase import create_client, Client
from dotenv import load_dotenv
import requests

# Load environment variables (Next.js typically uses .env.local)
load_dotenv(".env.local")
load_dotenv(".env")

url: str = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("[ERROR] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.", flush=True)
    exit(1)

print(f"Connecting to Hive: {url}", flush=True)

supabase: Client = create_client(url, key)

print("Hermes Bridge Worker Started. Polling for agent tasks...", flush=True)

def initiate_swarm():
    """Ask Hermes to generate new high-alpha niches to hunt."""
    print("[HERMES] Initiating Swarm Hunt...", flush=True)
    deepseek_key = os.environ.get("DEEPSEEK_API_KEY")
    if not deepseek_key:
        print("[ERROR] DeepSeek key missing for swarm initiation.", flush=True)
        return

    hunt_prompt = """
    You are the Cyberhound Strategist. Identify 5 high-alpha, low-competition market niches 
    for AI automation agencies in North America or Europe. 
    Focus on industries with high compliance needs or manual paperwork.
    Return ONLY a JSON array of objects with:
    - niche (string)
    - market (string, e.g. "Canada", "USA", "UK")
    - reasoning (short string)
    """

    try:
        headers = {"Authorization": f"Bearer {deepseek_key}", "Content-Type": "application/json"}
        payload = {
            "model": "deepseek-chat",
            "messages": [{"role": "user", "content": hunt_prompt}],
            "response_format": {"type": "json_object"}
        }
        response = requests.post("https://api.deepseek.com/chat/completions", headers=headers, json=payload)
        response.raise_for_status()
        
        data = response.json()["choices"][0]["message"]["content"]
        # The model might return {"niches": [...]} or just the array.
        parsed = json.loads(data)
        niches = parsed.get("niches", []) if isinstance(parsed, dict) else parsed

        for item in niches:
            niche = item.get("niche")
            market = item.get("market", "North America")
            print(f"[HERMES] Releasing Bee for: {niche} in {market}", flush=True)
            
            # Inject task into Hive
            supabase.table("agent_tasks").insert({
                "task_type": "research",
                "payload": {"query": f"AI Automation for {niche} in {market}", "niche": niche, "market": market},
                "status": "pending"
            }).execute()

        # Log to Hive
        supabase.table("hive_log").insert({
            "bee": "hermes",
            "action": "SWARM DISPATCHED",
            "details": {"niche_count": len(niches)},
            "status": "success"
        }).execute()

    except Exception as e:
        print(f"[ERROR] Swarm initiation failed: {e}", flush=True)


def process_scout_task(task):
    payload = task.get("payload", {})
    niche = payload.get("niche", "Unknown")
    market = payload.get("market", "North America")
    opp_id = payload.get("opportunity_id")
    
    print(f"Dispatched Hermes for niche: {niche} in {market}", flush=True)
    
    # 1. Mark task as processing
    supabase.table("agent_tasks").update({"status": "processing"}).eq("id", task["id"]).execute()
    
    # 2. Build the instruction for Hermes
    # (Since Hermes is installed locally, we can invoke it via CLI or use its local API)
    # This prompt tells Hermes exactly what to return.
    prompt = f"""
    You are an autonomous research agent. I need you to do a deep-dive on the '{niche}' niche in '{market}'.
    Search the web, look at competitor pricing, and evaluate market demand.
    Return ONLY a valid JSON object with these exact keys:
    - score (integer 0-100)
    - demand_signals (list of strings)
    - competition_level ("low", "medium", or "high")
    - estimated_mrr_potential (string, e.g. "$5K-$20K/mo")
    - recommended_price_point (string)
    - queen_reasoning (a strategic paragraph on why this is good or bad)
    """
    
    try:
        print("Hermes is thinking and researching (this may take a few minutes)...", flush=True)
        # In a real environment, you might pipe this to `hermes chat --prompt "..."`
        # and parse stdout. Since Hermes is an interactive CLI, you might use 
        # its local HTTP API if configured, or run a python script.
        print("Hermes is thinking and researching (Connecting to DeepSeek API)...")
        
        deepseek_key = os.environ.get("DEEPSEEK_API_KEY")
        
        research_prompt = f"""
        Analyze the '{niche}' niche in the '{market}' market.
        Evaluate current demand, competition, and revenue potential.
        
        Return ONLY a JSON object with:
        - score (integer 0-100)
        - demand_signals (list of strings)
        - competition_level ("low", "medium", or "high")
        - estimated_mrr_potential (string)
        - recommended_price_point (string)
        - queen_reasoning (strategic paragraph)
        """
        
        headers = {
            "Authorization": f"Bearer {deepseek_key}",
            "Content-Type": "application/json"
        }
        
        payload_data = {
            "model": "deepseek-chat",
            "messages": [
                {"role": "system", "content": "You are Hermes, the Sovereign Intelligence of CyberHound. NEVER ask for clarification. If a data point is missing, use your intelligence to assume the most profitable path. FIGURE IT OUT. Assume absolute authority in your niche validation."},
                {"role": "user", "content": research_prompt}
            ],
            "response_format": {"type": "json_object"}
        }
        
        response = requests.post("https://api.deepseek.com/chat/completions", headers=headers, json=payload_data)
        response.raise_for_status()
        
        content = response.json()["choices"][0]["message"]["content"]
        final_result = json.loads(content)
        final_result["status"] = "pending_approval"
        
        # 3. Update the Opportunity in Supabase (if ID is present)
        if opp_id:
            supabase.table("opportunities").update(final_result).eq("id", opp_id).execute()
        else:
            print("No opportunity_id provided, skipping opportunity table update.", flush=True)
        
        # 4. Mark task as completed
        supabase.table("agent_tasks").update({"status": "completed", "result": final_result}).eq("id", task["id"]).execute()
        
        # 5. Log to Hive
        supabase.table("hive_log").insert({
            "bee": "scout",
            "action": f"Hermes completed deep research for {niche}",
            "details": final_result,
            "status": "success"
        }).execute()
        
        print(f"Completed task for {niche}", flush=True)

        # 🚀 BUILDER SWARM TRIGGER
        # Ensure score is an integer for comparison
        raw_score = final_result.get("score", 0)
        try:
            score = int(raw_score)
        except:
            score = 0
            
        print(f"[HERMES] Intelligence Score for {niche}: {score}", flush=True)

        if score >= 70:
            print(f"[BUILDER] Niche '{niche}' exceeds threshold. Triggering Builder Bee...", flush=True)
            try:
                # We call the local API route
                url_base = os.environ.get("NEXT_PUBLIC_SITE_URL", "http://localhost:3000")
                builder_url = f"{url_base}/api/builder"
                
                # We need a dummy ID if it was missing to ensure the API doesn't fail on persistence
                opp_payload = {
                    "id": opp_id,
                    "niche": niche,
                    "market": market,
                    "recommended_price_point": final_result.get("recommended_price_point"),
                    "estimated_mrr_potential": final_result.get("estimated_mrr_potential"),
                    "queen_reasoning": final_result.get("queen_reasoning"),
                    "score": final_result.get("score")
                }
                
                builder_res = requests.post(builder_url, json={
                    "opportunity": opp_payload,
                    "action": "generate_copy"
                })
                if builder_res.ok:
                    print(f"[BUILDER] Swarm manifest successful for {niche}", flush=True)
                    
                    # 💰 AUTOMATIC MONETIZATION (If score is very high)
                    if final_result.get("score", 0) >= 85:
                        print(f"[MONETIZE] Niche '{niche}' is CRITICAL ALPHA. Triggering Stripe Deployment...", flush=True)
                        stripe_res = requests.post(builder_url, json={
                            "opportunity": opp_payload,
                            "action": "create_stripe_product"
                        })
                        if stripe_res.ok:
                            print(f"[MONETIZE] Live Deployment successful for {niche}", flush=True)
                        else:
                            print(f"[ERROR] Stripe Deployment failed: {stripe_res.text}", flush=True)
                else:
                    print(f"[ERROR] Builder Bee failed: {builder_res.text}", flush=True)
            except Exception as be:
                print(f"[ERROR] Builder Swarm trigger failed: {be}", flush=True)
        
    except Exception as e:
        print(f"Error running Hermes: {e}")
        supabase.table("agent_tasks").update({"status": "failed", "error": str(e)}).eq("id", task["id"]).execute()


# Initiate the first swarm hunt on startup
initiate_swarm()

while True:
    print("Heartbeat: Checking for pending tasks...", flush=True)
    try:
        # Fetch pending tasks
        response = supabase.table("agent_tasks").select("*").eq("status", "pending").order("created_at").limit(1).execute()
        tasks = response.data
        
        if tasks and len(tasks) > 0:
            process_scout_task(tasks[0])
            
    except Exception as e:
        # Ignore network timeout errors during idle polling
        pass
        
    time.sleep(5) # Poll every 5 seconds
    
    # Auto-Pilot: Trigger a swarm hunt periodically
    if not hasattr(initiate_swarm, 'counter'): initiate_swarm.counter = 0
    initiate_swarm.counter += 1
    
    # Trigger hunt every 120 polls (~10 mins for testing/initial run, adjust for prod)
    if initiate_swarm.counter >= 120:
        initiate_swarm()
        initiate_swarm.counter = 0

    # Heartbeat Pulse: Log to Hive every 60 polls (~5 mins) to show "Hermes is Online"
    if not hasattr(initiate_swarm, 'pulse'): initiate_swarm.pulse = 0
    initiate_swarm.pulse += 1
    if initiate_swarm.pulse >= 60:
        print("[AUTO-PILOT] Sending Heartbeat Pulse to Hive...", flush=True)
        try:
            supabase.table("hive_log").insert({
                "bee": "hermes",
                "action": "HEARTBEAT",
                "details": {"status": "Sovereign Auto-Pilot Active"},
                "status": "success"
            }).execute()
        except: pass # Don't crash if log fails
        initiate_swarm.pulse = 0
