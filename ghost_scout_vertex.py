import os
from google import genai
from google.genai import types

def ignite_ghost_scout():
    project_id = os.environ.get("VERTEX_PROJECT_ID", "gen-lang-client-0092649281")
    location = "us-central1"
    api_key = os.environ.get("VERTEX_API_KEY", "")
    
    try:
        # Method: Use Vertex AI endpoint explicitly with API key
        # The key format suggests this is a Vertex AI-specific key
        client = genai.Client(
            vertexai=True,
            project=project_id,
            location=location,
            # Vertex AI uses different auth - API keys work differently
        )
        
        prompt = (
            "Search Yellowpages.ca for 'New Business' in 'Montreal, QC'. "
            "Find the first 3 businesses. Provide Name and Website. "
            "Note if they are English-only."
        )

        response = client.models.generate_content(
            model='gemini-2.0-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                tools=[types.Tool(google_search_retrieval=types.GoogleSearchRetrieval())]
            )
        )

        print("\n⚡ 120 OS: GHOST SCOUT REPORTING FROM VERTEX...")
        print("=" * 60)
        print(response.text)
        print("=" * 60)
        
        import json
        booty = {"scout": "ghost_vertex", "project": project_id, "data": response.text}
        with open('BUTIN_REEL.json', 'w') as f:
            json.dump(booty, f, indent=2)
        print("\n💾 Booty saved to BUTIN_REEL.json")
        
    except Exception as e:
        print(f"\n❌ Scout failed: {e}")
        print(f"\n🔧 Trying alternative authentication...")
        
        # Try without vertexai flag - maybe it's a Gemini API key after all
        try:
            client2 = genai.Client(api_key=api_key)
            response2 = client2.models.generate_content(
                model='gemini-2.0-flash',
                contents=prompt,
            )
            print("\n⚡ 120 OS: GHOST SCOUT REPORTING (fallback mode)...")
            print(response2.text)
        except Exception as e2:
            print(f"❌ Fallback also failed: {e2}")
            print("\n💡 SOLUTION:")
            print("   Your key appears to be a Vertex AI key but requires OAuth2.")
            print("   Either:")
            print("   1. Run: gcloud auth application-default login")
            print("   2. Get a Gemini API key: https://aistudio.google.com/app/apikey")

if __name__ == "__main__":
    ignite_ghost_scout()
