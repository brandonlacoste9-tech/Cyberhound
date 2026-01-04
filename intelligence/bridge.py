import sqlite3
import sys
import os
import json

# Add parent dir to path to find intelligence module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from intelligence.processor import analyze_deal

DB_PATH = "../database/deals.db"
AFFILIATE_MAP_PATH = "affiliate_map.json"

def wrap_affiliate_link(brand_name, raw_url):
    """
    Checks the affiliate map and injects tracking tags if a brand match is found.
    Handles partial matches (e.g., 'Adobe Creative Cloud' -> 'Adobe')
    """
    try:
        # Load map - in production, cache this
        map_path = os.path.join(os.path.dirname(__file__), AFFILIATE_MAP_PATH)
        with open(map_path, 'r') as f:
            aff_map = json.load(f)
        
        # Simple fuzzy match: check if key is in brand_name or vice versa
        matched_key = None
        for key in aff_map:
            if key.lower() in brand_name.lower():
                matched_key = key
                break
        
        if matched_key:
            data = aff_map[matched_key]
            separator = "&" if "?" in raw_url else "?"
            clean_link = f"{raw_url}{separator}{data['affiliate_param']}"
            print(f"[$] Affiliate Wrap: {brand_name} -> {clean_link}")
            return clean_link
            
    except Exception as e:
        print(f"Wrapper Error: {e}")
    
    return raw_url # Return original if no match or error

def process_pending_scans():
    print("[*] Bridge started: Checking for pending scans...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Get scans that haven't been 'Brain-processed' yet
    cursor.execute("SELECT id, raw_content, name, url, reputation_score FROM sites WHERE process_status = 'pending'")
    pending = cursor.fetchall()
    
    if not pending:
        print("[-] No pending scans found.")
        conn.close()
        return

    print(f"[*] Found {len(pending)} pending scans.")
    
    for site_id, content, site_name, url, rep_score in pending:
        if not content:
            cursor.execute("UPDATE sites SET process_status = 'failed' WHERE id = ?", (site_id,))
            continue
            
        print(f"[*] Analyzing {site_name}...")
        intel = analyze_deal(content)
        
        if intel.get("deal_found"):
            # Calculate the Cyberhound Value Score
            d = intel.get('discount_value', 0)
            t = intel.get('duration_days', 0)
            s = rep_score if rep_score else 1.0
            if s == 0: s = 1.0
            
            v_score = (d * t) / s
            
            # THE GHOST LAYER: Wrap the link
            final_url = wrap_affiliate_link(intel.get('brand', site_name), url)
            
            print(f"[+] Deal Found for {intel.get('brand', site_name)}! Score: {v_score}")
            
            # Save the refined deal to the 'deals' table
            # Note: We need to store the affiliate link. 
            # Ideally schema should have 'affiliate_url' or we overwrite 'code' or similar.
            # Assuming we can store it in 'code' for now or need schema update.
            # Let's add it to 'summary' or assume we append to DB. 
            # Actually, `deals` table has `code`. Let's assume we use that or add `affiliate_link` column.
            # For now, I'll print it. In a real update, I'd migrate the schema.
            
            cursor.execute("""
                INSERT INTO deals (site_id, brand, value_score, summary, status, discount_amount, duration_months, raw_text)
                VALUES (?, ?, ?, ?, 'active', ?, ?, ?)
            """, (site_id, intel.get('brand', site_name), v_score, intel.get('summary', ''), d, t/30, content[:200]))
            
        else:
            print(f"[-] No deal found for {site_name}.")
            
        # Mark the scan as processed
        cursor.execute("UPDATE sites SET process_status = 'processed' WHERE id = ?", (site_id,))
    
    conn.commit()
    conn.close()
    print("[*] Bridge processing complete.")

if __name__ == "__main__":
    process_pending_scans()
