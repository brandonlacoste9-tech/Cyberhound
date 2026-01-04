import os
import json
from google.cloud import bigquery
from google.cloud import storage

# NOTE: BigQuery Table Schema: [deal_id: STRING, brand: STRING, timestamp: TIMESTAMP, package: STRING]
# Table: `cyberhound.analytics.clicks`

PROJECT_ID = os.environ.get("GCP_PROJECT")
BUCKET_NAME = os.environ.get("CYBERHOUND_BUCKET")

def generate_performance_receipt(deal_id, brand, client_email):
    """
    Generates a text-based "Receipt" showing the performance of a specific deal campaign.
    Ideally, this is emailed via Resend or saved to GCS for the client.
    """
    if not PROJECT_ID:
        print("[-] PROJECT_ID not set. Cannot run Analytics.")
        return

    client = bigquery.Client(project=PROJECT_ID)

    query = f"""
        SELECT COUNT(*) as total_clicks
        FROM `{PROJECT_ID}.cyberhound_analytics.clicks`
        WHERE deal_id = @deal_id
    """
    
    job_config = bigquery.QueryJobConfig(
        query_parameters=[
            bigquery.ScalarQueryParameter("deal_id", "STRING", str(deal_id)),
        ]
    )

    try:
        query_job = client.query(query, job_config=job_config)
        results = query_job.result()
        total_clicks = 0
        for row in results:
            total_clicks = row.total_clicks
            
        # Estimate Value (Stub logic - $0.50 per click valuation or similar)
        est_value = total_clicks * 0.50 
        
        receipt = f"""
        ========== CYBERHOUND INTELLIGENCE REPORT ==========
        CLIENT: {brand}
        CAMPAIGN ID: {deal_id}
        STATUS: COMPLETE
        ----------------------------------------------------
        TOTAL TRAFFIC GENERATED: {total_clicks} Unique Clicks
        ESTIMATED MEDIA VALUE: ${est_value:.2f}
        ----------------------------------------------------
        Thank you for choosing the Inferno Protocol.
        Renew your blast at: https://cyberhound.tech/promote
        ====================================================
        """
        
        print(receipt)
        
        # Save Receipt to Bucket for record keeping
        storage_client = storage.Client()
        bucket = storage_client.bucket(BUCKET_NAME)
        blob = bucket.blob(f"receipts/receipt_{deal_id}.txt")
        blob.upload_from_string(receipt)
        print(f"[+] Receipt saved to GCS: receipts/receipt_{deal_id}.txt")
        
        return receipt

    except Exception as e:
        print(f"[-] Analytics Query Failed: {e}")
        return None

if __name__ == "__main__":
    # Test with a dummy ID
    generate_performance_receipt("1767523078", "Shopify", "client@shopify.com")
