"""
Imperial Scout - Gemini API Edition
Uses standard Gemini API with Google Search Grounding
No Vertex AI / gcloud required
"""
import os
from google import genai
from google.genai import types

def unleash_imperial_envoy():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("⚠️  Set GEMINI_API_KEY environment variable")
        print("   Get one at: https://aistudio.google.com/app/apikey")
        return
    
    # 1. Arm with Gemini API Key
    client = genai.Client(api_key=api_key)

    # 2. The Montreal Strike
    prompt = (
        "Search Yellowpages.ca for 'New Business' in 'Montreal, QC'. "
        "List the first 3 businesses. Provide Name and Website. "
        "Note if they appear to be English-only."
    )

    print("⚡ 120 OS: EXECUTING GEMINI STRIKE ON MONTREAL SECTOR...")
    
    # 3. Strike with Grounding
    response = client.models.generate_content(
        model='gemini-2.0-flash', 
        contents=prompt,
        config=types.GenerateContentConfig(
            tools=[types.Tool(google_search=types.GoogleSearch())],
            temperature=1.0
        )
    )

    print("\n💰 BOOTY SECURED:")
    print("=" * 60)
    print(response.text)
    print("=" * 60)
    
    # Save the booty
    import json
    from datetime import datetime
    booty = {
        "scout": "imperial_envoy_gemini",
        "model": "gemini-2.0-flash",
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
