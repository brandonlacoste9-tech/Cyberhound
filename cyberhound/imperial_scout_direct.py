"""
Imperial Scout - Direct Vertex AI API
Uses raw HTTP requests with your Express Mode API Key
Bypasses all SDK authentication issues
"""
import os
import json
import base64
from datetime import datetime

def unleash_envoy_direct():
    api_key = os.environ.get("VERTEX_API_KEY", "")
    project_id = os.environ.get("VERTEX_PROJECT_ID", "gen-lang-client-0092649281")
    location = "us-central1"
    
    # Vertex AI API endpoint for Gemini
    url = f"https://{location}-aiplatform.googleapis.com/v1/projects/{project_id}/locations/{location}/publishers/google/models/gemini-2.0-flash:generateContent"
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "contents": [{
            "role": "user",
            "parts": [{
                "text": (
                    "Search Yellowpages.ca for 'New Business' in 'Montreal, QC'. "
                    "List the first 3 businesses with Name and Website. "
                    "Format as JSON."
                )
            }]
        }],
        "tools": [{
            "googleSearchRetrieval": {
                "dynamicRetrievalConfig": {
                    "mode": "MODE_DYNAMIC",
                    "dynamicThreshold": 0.5
                }
            }
        }]
    }
    
    print("⚡ 120 OS: EXECUTING DIRECT VERTEX STRIKE...")
    print(f"🔗 Target: {url}")
    
    try:
        import httpx
        
        response = httpx.post(url, headers=headers, json=payload, timeout=60.0)
        
        if response.status_code == 200:
            result = response.json()
            
            # Extract the generated text
            if "candidates" in result and len(result["candidates"]) > 0:
                content = result["candidates"][0]["content"]
                if "parts" in content and len(content["parts"]) > 0:
                    generated_text = content["parts"][0].get("text", "")
                    
                    print("\n💰 BOOTY SECURED (DIRECT VERTEX API):")
                    print("=" * 60)
                    print(generated_text)
                    print("=" * 60)
                    
                    # Save booty
                    booty = {
                        "scout": "imperial_envoy_direct",
                        "method": "direct_http",
                        "project": project_id,
                        "model": "gemini-2.0-flash",
                        "target": "yellowpages.ca",
                        "data": generated_text,
                        "timestamp": str(datetime.now()),
                        "raw_response": result
                    }
                    with open('BUTIN_REEL.json', 'w') as f:
                        json.dump(booty, f, indent=2)
                    print("\n💾 Booty saved to BUTIN_REEL.json")
                else:
                    print("⚠️  No text in response parts")
                    print(json.dumps(result, indent=2))
            else:
                print("⚠️  No candidates in response")
                print(json.dumps(result, indent=2))
        else:
            print(f"❌ HTTP Error {response.status_code}:")
            print(response.text)
            
    except ImportError:
        print("❌ httpx not installed. Run: pip install httpx")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    unleash_envoy_direct()
