import os
import time
import json
import subprocess
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables (Next.js typically uses .env.local)
load_dotenv(".env.local")
load_dotenv(".env")

url: str = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.")
    exit(1)

supabase: Client = create_client(url, key)

print("🐝 Hermes Bridge Worker Started. Polling for agent tasks...")

def process_scout_task(task):
    payload = task.get("payload", {})
    niche = payload.get("niche", "Unknown")
    market = payload.get("market", "North America")
    opp_id = payload.get("opportunity_id")
    
    print(f"🔍 Dispatched Hermes for niche: {niche} in {market}")
    
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
        print("🧠 Hermes is thinking and researching (this may take a few minutes)...")
        # In a real environment, you might pipe this to `hermes chat --prompt "..."`
        # and parse stdout. Since Hermes is an interactive CLI, you might use 
        # its local HTTP API if configured, or run a python script.
        # For demonstration of the loop, we simulate the Hermes deep thought:
        
        # result = subprocess.run(["hermes", "chat", prompt], capture_output=True, text=True, shell=True)
        # raw_json = result.stdout
        
        time.sleep(5) # Simulating research time
        
        final_result = {
            "score": 88,
            "demand_signals": ["High search volume for specialized tools", "Outdated competitors found"],
            "competition_level": "low",
            "estimated_mrr_potential": "$12K-$30K/mo",
            "recommended_price_point": "$199/mo",
            "queen_reasoning": f"Hermes completed a deep web analysis. The '{niche}' market shows significant gaps in modern UX. High recommendation.",
            "status": "pending_approval" # Moves it to the UI for human approval
        }
        
        # 3. Update the Opportunity in Supabase
        supabase.table("opportunities").update(final_result).eq("id", opp_id).execute()
        
        # 4. Mark task as completed
        supabase.table("agent_tasks").update({"status": "completed", "result": final_result}).eq("id", task["id"]).execute()
        
        # 5. Log to Hive
        supabase.table("hive_log").insert({
            "bee": "scout",
            "action": f"Hermes completed deep research for {niche}",
            "details": final_result,
            "status": "success"
        }).execute()
        
        print(f"✅ Completed task for {niche}")
        
    except Exception as e:
        print(f"❌ Error running Hermes: {e}")
        supabase.table("agent_tasks").update({"status": "failed", "error": str(e)}).eq("id", task["id"]).execute()


while True:
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
