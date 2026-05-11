import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv(".env.local")
load_dotenv(".env")

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

print(f"Attempting connection to: {SUPABASE_URL}")
print(f"Using Service Role Key: {'Loaded' if SUPABASE_KEY else 'MISSING'}")

try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # Attempt manual injection
    test_asset = {
        "title": "NEURAL PROBE: REALITY CHECK",
        "body": "If you see this, the machine is capable of anchoring data to the vault.",
        "type": "blog",
        "status": "published"
    }
    
    print("Firing Neural Probe...")
    res = supabase.table("content_assets").insert(test_asset).execute()
    print(f"Probe Anchored: {res.data}")
    
except Exception as e:
    print(f"NEURAL PROBE FAILED: {e}")
