import functions_framework
from google.cloud import storage
import vertexai
from vertexai.generative_models import GenerativeModel
import json
import os
import datetime

# Initialization
PROJECT_ID = os.environ.get("GCP_PROJECT")
LOCATION = "us-central1"

# Affiliate Map (Hardcoded or loaded from file for Cloud Function)
AFFILIATE_MAP = {
  "Shopify": { "base_url": "shopify.com", "affiliate_param": "ref=cyberhound_hq" },
  "Adobe": { "base_url": "adobe.com", "affiliate_param": "mv=affiliate&mv2=cyberhound_hq" },
  "DigitalOcean": { "base_url": "digitalocean.com", "affiliate_param": "refid=cyberhound_node" },
  "NordVPN": { "base_url": "nordvpn.com", "affiliate_param": "coupon=cyberhound" }
}

try:
    if PROJECT_ID:
        vertexai.init(project=PROJECT_ID, location=LOCATION)
        model = GenerativeModel("gemini-1.5-flash-001")
    else:
        model = None
except Exception:
    model = None

storage_client = storage.Client()

def wrap_link(brand_name, raw_url):
    for key, data in AFFILIATE_MAP.items():
        if key.lower() in brand_name.lower():
            separator = "&" if "?" in raw_url else "?"
            return f"{raw_url}{separator}{data['affiliate_param']}"
    return raw_url

def analyze_content(raw_text):
    if not model: return None
        
    prompt = f"""
    Analyze the following text from a website and extract any active promotional deals.
    TEXT: {raw_text[:15000]}
    RETURN JSON ONLY: {{ "deal_found": bool, "brand": string, "discount_value": float, "duration_days": int, "summary": string }}
    """
    try:
        response = model.generate_content(prompt)
        text = response.text.replace('```json', '').replace('```', '').strip()
        return json.loads(text)
    except: return None

@functions_framework.cloud_event
def process_new_scan(cloud_event):
    data = cloud_event.data
    bucket_name = data["bucket"]
    file_name = data["name"]

    if not file_name.startswith("raw/") or file_name.endswith("latest_deals.json"): return

    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(file_name)
    
    try:
        content = blob.download_as_text()
        scan_data = json.loads(content)
        raw_text = scan_data.get("raw_text", "")
        target_name = scan_data.get("target_name", "Unknown")
        target_url = scan_data.get("url", "") # We need this from scanner
        
        # 1. Brain Analysis
        intel = analyze_content(raw_text)
        
        if intel and intel.get("deal_found"):
            brand = intel.get("brand", target_name)
            
            # 2. Ghost Layer (Affiliate Wrap)
            monetized_url = wrap_link(brand, target_url)
            
            # 3. Value Calculation
            d = intel.get('discount_value', 0)
            t = intel.get('duration_days', 30)
            v_score = (d * t) / 1.0
            
            new_deal = {
                "id": int(datetime.datetime.now().timestamp()),
                "brand": brand,
                "summary": intel.get("summary", "New deal detected."),
                "value_score": v_score,
                "discount_amount": d,
                "duration_months": round(t/30, 1),
                "detected_at": datetime.datetime.now().isoformat(),
                "url": monetized_url # THE MONEY LINK
            }
            
            # 4. Update Hot List
            deals_blob = bucket.blob("latest_deals.json")
            details_blob = bucket.blob(f"processed/{new_deal['id']}.json") # Save individual record
            
            current_deals = []
            if deals_blob.exists():
                try: current_deals = json.loads(deals_blob.download_as_text())
                except: pass
            
            current_deals.insert(0, new_deal)
            current_deals = current_deals[:20]
            
            deals_blob.upload_from_string(json.dumps(current_deals, indent=2), content_type='application/json', cache_control='no-cache')
            details_blob.upload_from_string(json.dumps(new_deal, indent=2), content_type='application/json')
            
            print(f"Deal processed and monetized for {brand}")
            
    except Exception as e:
        print(f"Error processing: {e}")
