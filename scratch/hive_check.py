import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

def diagnostic():
    url = os.environ.get('NEXT_PUBLIC_SUPABASE_URL')
    key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
    
    print(f"Targeting Hive: {url}")
    
    if not url or not key:
        print("CRITICAL: Missing API Configuration in .env")
        return

    supabase = create_client(url, key)
    
    try:
        res = supabase.table('agent_tasks').select('count').execute()
        print("HIVE ONLINE: Connection Successful")
    except Exception as e:
        print(f"HIVE ERROR: {e}")

if __name__ == "__main__":
    diagnostic()
