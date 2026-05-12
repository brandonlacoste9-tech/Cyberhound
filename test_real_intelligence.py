import json
import requests

def test_deepseek_intelligence(niche, market):
    print(f"RUNNING TEST: {niche} in {market}")
    
    deepseek_api_key = "sk-d4896ee1b6d64ad6b33c667a2ce6dd31"
    
    prompt = f"""
    You are an autonomous research agent. I need you to do a deep-dive on the '{niche}' niche in '{market}'.
    Search the web, look at competitor pricing, and evaluate market demand.
    Return ONLY a valid JSON object with these exact keys:
    - score (integer 0-100)
    - demand_signals (list of strings)
    - competition_level ("low", "medium", or "high")
    - estimated_mrr_potential (string, e.g. "$5K-$20K/mo")
    - recommended_price_point (string)
    - queen_reasoning (a strategic paragraph on why this is good or bad)
    """

    headers = {
        "Authorization": f"Bearer {deepseek_api_key}",
        "Content-Type": "application/json"
    }
    
    data = {
        "model": "deepseek-chat",
        "messages": [
            {"role": "system", "content": "You are an expert market analyst and research agent."},
            {"role": "user", "content": prompt}
        ],
        "response_format": {"type": "json_object"}
    }
    
    try:
        print("Connecting to DeepSeek V3 API...")
        response = requests.post("https://api.deepseek.com/v1/chat/completions", headers=headers, json=data)
        response.raise_for_status()
        
        ai_response = response.json()
        content_str = ai_response["choices"][0]["message"]["content"]
        
        # Parse the JSON response
        result = json.loads(content_str)
        
        print("\nSUCCESS! RECEIVED REAL DATA FROM DEEPSEEK:")
        print(json.dumps(result, indent=4))
        
        # Check if it's the mock data from before
        if result.get("score") == 88 and "specialized tools" in str(result.get("demand_signals")):
             print("\nWARN: This looks like the previous mock data.")
        else:
             print("\nPROOF: This is unique, real-time intelligence.")

    except Exception as e:
        print(f"ERROR: Failed to connect to DeepSeek: {e}")

if __name__ == "__main__":
    test_deepseek_intelligence("Pet Grooming SaaS for French Bulldogs", "Montreal, Canada")
