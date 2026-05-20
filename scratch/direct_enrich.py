import os
import requests
from supabase import create_client

# Load Env
url = "https://avimvvlwrekhblubcutg.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2aW12dmx3cmVraGJsdWJjdXRnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzM4NzcyNywiZXhwIjoyMDg4OTYzNzI3fQ.sK_IwMLuJph9LiqXaqj2EyFVa_MNI_WD3B0EPoCCQGc"
apollo_key = "zELCCRPdKc-EBO0B6UPVEQ"
hunter_key = "9f2766336336e788c222c8336633663366336633" # Placeholder from .env if any

supabase = create_client(url, key)

def enrich_lead(company):
    print(f"Enriching: {company}...")
    # Apollo Search
    apollo_url = "https://api.apollo.io/api/v1/mixed_people/search"
    headers = {"Content-Type": "application/json", "X-Api-Key": apollo_key}
    body = {
        "api_key": apollo_key,
        "q_organization_name": company,
        "person_titles": ["CEO", "Founder", "Owner", "CTO"],
        "page": 1,
        "per_page": 1
    }
    try:
        res = requests.post(apollo_url, json=body)
        data = res.json()
        people = data.get("people", [])
        if people:
            p = people[0]
            return {
                "contact_name": p.get("name"),
                "contact_email": p.get("email"),
                "contact_title": p.get("title"),
                "contact_linkedin": p.get("linkedin_url"),
                "status": "enriched" if p.get("email") else "unresolvable"
            }
    except Exception as e:
        print(f"Error: {e}")
    return None

# Get leads
leads = supabase.table("analyst_leads").select("*").eq("status", "new").not_.ilike("company", "%unnamed%").order("created_at", desc=True).limit(5).execute().data

for lead in leads:
    result = enrich_lead(lead["company"])
    if result:
        print(f"Found: {result['contact_email']}")
        supabase.table("analyst_leads").update(result).eq("id", lead["id"]).execute()
    else:
        print(f"No contact found for {lead['company']}")

print("Done.")
