import requests
import json

def ignite_express_strike():
    # 1. The Artery: Vertex Express Mode Endpoint
    # This specific URL accepts the AQ key format directly
    api_key = "AQ.Ab8RN6-WS4b-hQUjNbLwEqpsBWck21-0g2E0lIzBOb3Fu_MnA"
    url = f"https://aiplatform.googleapis.com/v1/publishers/google/models/gemini-2.5-flash-lite:streamGenerateContent?key={api_key}"

    # 2. The Payload: Montreal Business Hunt
    payload = {
        "contents": [{
            "role": "user",
            "parts": [{"text": "Search Yellowpages.ca for 'New Businesses' in 'Montreal'. Return a JSON list of Name and Website for the first 3. Identify English-only sites."}]
        }]
    }

    # 3. The Strike
    print("⚡ 120 OS: EXECUTING EXPRESS STRIKE ON ZYEUTE ARTERY...")
    response = requests.post(url, json=payload)
    
    if response.status_code == 200:
        print("\n💰 BOOTY SECURED (CREDIT FUNDED):")
        # Stream processing for the 'lite' model
        for line in response.text.splitlines():
            if '"text":' in line:
                # Basic parsing to extract the actual model response
                clean_text = line.split('"text": "')[1].split('"')[0].replace('\\n', '\n')
                print(clean_text, end='')
        print("\n")
    else:
        print(f"⚠️ Strike Failed: {response.status_code} - {response.text}")

if __name__ == "__main__":
    ignite_express_strike()
