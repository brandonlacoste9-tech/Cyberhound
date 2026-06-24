import os
from supabase import create_client

url = 'https://avimvvlwrekhblubcutg.supabase.co'
key = os.getenv('SUPABASE_SERVICE_ROLE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2aW12dmx3cmVraGJsdWJjdXRnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzM4NzcyNywiZXhwIjoyMDg4OTYzNzI3fQ.sK_IwMLuJph9LiqXaqj2EyFVa_MNI_WD3B0EPoCCQGc')
db = create_client(url, key)

res = db.table('outreach_log').select('*').order('created_at', desc=True).limit(10).execute()

print("RECENT OUTREACH LOGS:")
for l in res.data:
    print(f"[{l['created_at']}] To: {l['recipient_email']} - {l['status']}")
    print(f"   Subject: {l['subject']}")
    print(f"   Provider ID: {l['resend_id']}")
    print("-" * 20)
