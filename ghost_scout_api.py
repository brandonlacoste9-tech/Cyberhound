"""
Ghost Scout - Using Gemini API Key (no gcloud/Vertex AI needed)
Get API key: https://aistudio.google.com/app/apikey
"""
import os
from google import genai
from google.genai import types

def ignite_ghost_scout():
    # 1. Connect via API Key
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        print("⚠️  Set GEMINI_API_KEY environment variable")
        print("   Get one at: https://aistudio.google.com/app/apikey")
        return
    
    client = genai.Client(api_key=api_key)

    # 2. Define the Target
    prompt = (
        "Search yellowpages.ca for 'New Business' in 'Montreal, QC'. "
        "Find the first 3 businesses. Provide their Name and Website. "
        "Format the output as a clean JSON list."
    )

    # 3. Unleash Gemini with Google Search Grounding
    try:
        response = client.models.generate_content(
            model='gemini-2.0-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                tools=[types.Tool(google_search_retrieval=types.GoogleSearchRetrieval())]
            )
        )

        print("⚡ 120 OS: GHOST SCOUT REPORTING...")
        print("=" * 50)
        print(response.text)
        print("=" * 50)
        
        # Save to file
        import json
        booty = {"scout": "ghost", "target": "yellowpages.ca", "data": response.text}
        with open('BUTIN_REEL.json', 'w') as f:
            json.dump(booty, f, indent=2)
        print("\n💾 Saved to BUTIN_REEL.json")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    ignite_ghost_scout()
