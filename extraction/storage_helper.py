from google.cloud import storage
import json
import os
import datetime

# Configuration
BUCKET_NAME = os.environ.get("CYBERHOUND_BUCKET", "cyberhound-raw-intel")

def upload_to_gcs(data, target_name):
    """
    Uploads the extraction results to Google Cloud Storage.
    Also updates the 'latest_deals.json' for the frontend proxy.
    """
    try:
        # Initialize Client
        storage_client = storage.Client()
        
        # Get/Create Bucket
        try:
            bucket = storage_client.get_bucket(BUCKET_NAME)
        except Exception:
            try:
                bucket = storage_client.create_bucket(BUCKET_NAME, location="US")
            except:
                print(f"[!] Bucket {BUCKET_NAME} access/creation failed.")
                return None

        # 1. Upload Timestamped Archive
        now = datetime.datetime.now()
        timestamp = now.strftime("%Y%m%d_%H%M%S")
        date_folder = now.strftime("%Y-%m-%d")
        
        blob_name = f"raw/{date_folder}/{target_name}_{timestamp}.json"
        blob = bucket.blob(blob_name)
        
        json_content = json.dumps(data, indent=2)
        
        blob.upload_from_string(
            json_content,
            content_type='application/json'
        )
        
        print(f"[+] Uploaded raw intel to gs://{BUCKET_NAME}/{blob_name}")

        # 2. Update 'latest_deals.json' (The "Hot List")
        # In a real scenario, this might need to be an aggregated list, 
        # but for now we replace it with the latest single scan or append to a list.
        # User requested "latest_deals.json" to be read by proxy.
        # To make the ticker work, this file should ideally contain an ARRAY of deals.
        # We will handle a simple append/update logic here if possible, 
        # or just overwrite if that's the simplified instruction.
        # Given the "Ticker" needs a list, let's try to maintain a list.
        
        latest_blob = bucket.blob('latest_deals.json')
        current_deals = []
        
        try:
            if latest_blob.exists():
                content = latest_blob.download_as_text()
                current_deals = json.loads(content)
                if not isinstance(current_deals, list):
                    current_deals = []
        except Exception as e:
            print(f"[*] Creating new latest_deals.json ({e})")
            
        # Add new data (simplified: data is one site scan)
        # We need to map the raw scan to the "Deal" format expected by Frontend 
        # OR the Bridge does this.
        # WAIT: The Bridge (`bridge.py`) is responsible for creating the 'Deals' from 'Raw'.
        # The 'Raw' goes to DB. 
        # The PROXY reads `latest_deals.json`.
        # This implies the BRIDGE should be writing `latest_deals.json` after processing, 
        # NOT the Nose (extraction). The Nose produces RAW.
        # However, the user instruction implies: "your cloud-hosted 'Nose' drops a JSON file... and your React app fetches it".
        # This skips the Brain/Bridge for the visual demo?
        # OR the User assumes the Nose result IS the deal.
        # Re-reading Step 10: "reads the `latest_deals.json` from your Google Cloud Bucket".
        # Re-reading prompt: "The Bridge... picks up unprocessed data from `deals.db`...".
        # If we are in Cloud Run without a persistent SQLite DB (deals.db is local file), 
        # the Bridge needs to run in Cloud too or connect to Cloud SQL.
        # For simplicity of this step ("Phase 5"), let's assume the NOSE writes the latest raw data 
        # and we display that, OR we update the Storage Helper to mock the 'processed' format 
        # so the Frontend has something to show.
        
        # Let's ensure the Frontend gets the format it expects (Deal[]).
        # We'll mock the 'intelligence' part here so the frontend works immediately 
        # with data from the Nose, even if it's "raw" interpreted as "deal".
        
        new_deal = {
            "id": int(timestamp.replace("_","")),
            "site_id": 0,
            "brand": target_name,
            "summary": f"Fresh scan from {target_name}. Analysis pending.",
            "value_score": 50.0, # Placeholder
            "discount_amount": 0,
            "duration_months": 1
        }
        
        # Prepend and limit to 20
        current_deals.insert(0, new_deal)
        current_deals = current_deals[:20]
        
        latest_blob.upload_from_string(
            json.dumps(current_deals, indent=2),
            content_type='application/json',
            cache_control='no-cache'
        )
        
        print(f"[+] Updated gs://{BUCKET_NAME}/latest_deals.json")
        return f"gs://{BUCKET_NAME}/{blob_name}"

    except Exception as e:
        print(f"[!] GCS Upload Failed: {e}")
        return None
