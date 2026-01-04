import asyncio
from playwright.async_api import async_playwright
import datetime
import os
import json
from storage_helper import upload_to_gcs

# Configuration
TARGETS = [
    {"name": "Adobe", "url": "https://www.adobe.com/creativecloud/plans.html"},
    {"name": "Shopify", "url": "https://www.shopify.com/pricing"},
    {"name": "OpenAI", "url": "https://openai.com/api/pricing/"}
    # Add remaining 17 targets
]

async def check_site(page, target):
    print(f"[*] Sniffing {target['name']} at {target['url']}...")
    try:
        await page.goto(target['url'])
        
        # Simple wait for network idle to ensure content loads
        try:
            await page.wait_for_load_state("networkidle", timeout=10000)
        except:
            pass # Proceed even if network not fully idle
        
        # Text extraction
        text_content = await page.evaluate("document.body.innerText")
        
        if text_content:
            data_packet = {
                "target_name": target['name'],
                "url": target['url'],
                "scanned_at": datetime.datetime.now().isoformat(),
                "raw_text": text_content
            }
            
            # Save to Cloud Storage
            upload_to_gcs(data_packet, target['name'])
            
            print(f"[+] Successfully sniffed and uploaded {target['name']}")
        
        return text_content
    except Exception as e:
        print(f"[!] Error sniffing {target['name']}: {e}")
        return None

async def main():
    print("=== Cyberhound Extraction Layer (Cloud Mode) Initialized ===")
    
    # Verify environment
    if not os.environ.get("CYBERHOUND_BUCKET"):
         print("⚠️  Warning: CYBERHOUND_BUCKET env var not set. Using default 'cyberhound-raw-intel'.")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        for target in TARGETS:
            await check_site(page, target)
            
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
