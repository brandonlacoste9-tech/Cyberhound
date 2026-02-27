import os
from google import genai
from google.genai import types

def ignite_ghost_scout():
    # 1. Connect to the Google Artery
    # This uses your authenticated gcloud session
    client = genai.Client(vertexai=True, project='YOUR_PROJECT_ID', location='us-central1')

    # 2. Define the Target
    prompt = (
        "Go to yellowpages.ca and search for 'New Business' in 'Montreal, QC'. "
        "Find the first 3 businesses. Provide their Name and Website. "
        "Format the output as a clean JSON list."
    )

    # 3. Unleash Gemini with Google Search Grounding
    # This lets Gemini "browse" the live web for you
    response = client.models.generate_content(
        model='gemini-2.0-flash', # Or gemini-3-pro if available in your region
        contents=prompt,
        config=types.GenerateContentConfig(
            tools=[types.Tool(google_search_retrieval=types.GoogleSearchRetrieval())]
        )
    )

    print("⚡ 120 OS: GHOST SCOUT REPORTING...")
    print(response.text)

if __name__ == "__main__":
    ignite_ghost_scout()
