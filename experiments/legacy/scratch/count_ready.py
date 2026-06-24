import os
from supabase import create_client

url = 'https://avimvvlwrekhblubcutg.supabase.co'
key = os.getenv('SUPABASE_SERVICE_ROLE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2aW12dmx3cmVraGJsdWJjdXRnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzM4NzcyNywiZXhwIjoyMDg4OTYzNzI3fQ.sK_IwMLuJph9LiqXaqj2EyFVa_MNI_WD3B0EPoCCQGc')
db = create_client(url, key)

res = db.table('analyst_leads').select('id', count='exact').eq('status', 'enriched').not_.is_('contact_email', 'null').execute()
print(f"TOTAL READY FOR OUTREACH: {res.count}")
