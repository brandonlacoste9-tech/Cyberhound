import os
from google import genai
from google.genai import types

def unleash_imperial_envoy():
    # 1. The Express Configuration
    # We explicitly tell the client to use Vertex with an API Key
    # The SDK handles the header translation to avoid the "Token Type" error
    client = genai.Client(
        api_key=os.environ.get("VERTEX_API_KEY", ""),
        vertexai=True,
        project=os.environ.get('VERTEX_PROJECT_ID', 'gen-lang-client-0092649281'),
        location='us-central1'
    )

    # 2. The Mission
    # 2.5 Flash-Lite is the sector champion for speed and credit efficiency
    prompt = (
        "Search Yellowpages.ca for 'New Business' in 'Montreal, QC'. "
        "Return the top 3 results in a JSON list (Name, Website). "
        "Flag businesses with only English websites (High Priority)."
    )

    print("⚡ 120 OS: EXECUTING EXPRESS STRIKE ON ZYEUTE SECTOR...")

    # 3. Grounded Generation (Using your $1,367.95 credits)
    response = client.models.generate_content(
        model='gemini-2.5-flash-lite', 
        contents=prompt,
        config=types.GenerateContentConfig(
            tools=[types.Tool(google_search=types.GoogleSearch())]
        )
    )

    print("\n💰 BOOTY SECURED (FROM ZYEUTE CREDITS):")
    print("=" * 60)
    print(response.text)
    print("=" * 60)
    
    # Save the booty
    import json
    from datetime import datetime
    booty = {
        "scout": "imperial_envoy_express",
        "project": os.environ.get("VERTEX_PROJECT_ID", "gen-lang-client-0092649281"),
        "model": "gemini-2.5-flash-lite",
        "target": "yellowpages.ca",
        "location": "Montreal, QC",
        "data": response.text,
        "timestamp": str(datetime.now())
    }
    with open('BUTIN_REEL.json', 'w') as f:
        json.dump(booty, f, indent=2)
    print("\n💾 Booty saved to BUTIN_REEL.json")

if __name__ == "__main__":
    unleash_imperial_envoy()
