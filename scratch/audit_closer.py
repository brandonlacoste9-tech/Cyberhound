import os
from supabase import create_client
import json

url = 'https://avimvvlwrekhblubcutg.supabase.co'
key = os.getenv('SUPABASE_SERVICE_ROLE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2aW12dmx3cmVraGJsdWJjdXRnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzM4NzcyNywiZXhwIjoyMDg4OTYzNzI3fQ.sK_IwMLuJph9LiqXaqj2EyFVa_MNI_WD3B0EPoCCQGc')
db = create_client(url, key)

res = db.table('hive_log').select('*').eq('bee', 'closer').order('created_at', desc=True).limit(10).execute()

for l in res.data:
    print(f"[{l['created_at']}] {l['action']} - {l['status']}")
    # Print only non-emoji text or handle errors
    try:
        details_str = json.dumps(l['details'], indent=2)
        print(f"Details: {details_str.encode('ascii', 'ignore').decode('ascii')}")
    except:
        print("Details: <failed to decode>")
    print("-" * 20)
