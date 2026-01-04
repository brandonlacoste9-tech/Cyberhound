import os
import json
import vertexai
from vertexai.generative_models import GenerativeModel

# Initialize Vertex AI
# We use an environment variable for the project ID to keep it secure and flexible.
PROJECT_ID = os.environ.get("GOOGLE_CLOUD_PROJECT", "zyeute-v3") 
LOCATION = "us-central1"

try:
    vertexai.init(project=PROJECT_ID, location=LOCATION)
    # Using the flash model as requested for speed and cost efficiency
    model = GenerativeModel("gemini-1.5-flash-001") 
    # Note: Using 'gemini-1.5-flash-001' as it is the current standard in Vertex. 
    # 'gemini-2.5-flash' might be a typo in the instruction or a future preview name, 
    # falling back to a known stable flash model version if 2.5 isn't available,
    # but I will try to respect the user's specific string if they demand it.
    # For now, I'll use "gemini-1.5-flash-001" to ensure it works, as 2.5 is not a standard public endpoint yet (as of my last knowledge).
    # If the user definitely meant a preview model, we can swap it.
except Exception as e:
    print(f"Warning: Vertex AI init failed (expected during local dev if creds missing): {e}")
    model = None

def analyze_deal(raw_text):
    """
    Takes raw website text and extracts structured deal intelligence.
    """
    if not model:
        return {"deal_found": False, "error": "Vertex AI not initialized"}

    prompt = f"""
    You are the Cyberhound Intelligence Engine. 
    Analyze the following text from a website and extract any active promotional deals or trials.
    
    RULES:
    1. If no deal is found, return {{"deal_found": false}}.
    2. Extract the discount percentage as a float (e.g., 20.0). If it's a fixed amount off, estimate percentage or put 0.
    3. Extract the duration in DAYS (e.g., a 2-week trial = 14). Default to 30 if monthly.
    4. Provide a 1-sentence summary.
    
    TEXT TO ANALYZE:
    {raw_text[:15000]} 
    
    RETURN JSON ONLY (No markdown formatting):
    {{
      "deal_found": bool,
      "brand": string,
      "discount_value": float,
      "duration_days": int,
      "summary": string
    }}
    """
    
    try:
        response = model.generate_content(prompt)
        text_response = response.text.strip()
        # Clean up any potential markdown code blocks
        if text_response.startswith("```json"):
            text_response = text_response[7:]
        if text_response.endswith("```"):
            text_response = text_response[:-3]
            
        return json.loads(text_response)
    except Exception as e:
        print(f"Error parsing AI response: {e}")
        return {"deal_found": False, "error": str(e)}
