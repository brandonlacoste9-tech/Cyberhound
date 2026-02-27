"""
USA Scout - Playwright Edition
Uses real browser to bypass 403 blocks
"""
import json
from datetime import datetime

def usa_strike_playwright():
    """Use Playwright to scrape yellowpages.com"""
    try:
        from playwright.sync_api import sync_playwright
        
        print("⚡ 120 OS: LOADING PLAYWRIGHT BROWSER...")
        print("🌐 Target: yellowpages.com (New York)")
        
        with sync_playwright() as p:
            # Launch browser with stealth
            browser = p.chromium.launch(
                headless=True,
                args=['--no-sandbox', '--disable-setuid-sandbox']
            )
            
            context = browser.new_context(
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            )
            
            page = context.new_page()
            
            # Navigate with timeout
            url = "https://www.yellowpages.com/search?search_terms=new+business&geo_location_terms=New+York+NY"
            print(f"   🔍 Navigating to {url[:50]}...")
            
            page.goto(url, wait_until='networkidle', timeout=60000)
            
            # Wait for content to load
            page.wait_for_timeout(3000)
            
            # Extract business names
            leads = []
            
            # Try different selectors
            selectors = [
                'a.business-name',
                'h2.n',
                '.info h2 a',
                '[class*="business"]'
            ]
            
            for selector in selectors:
                elements = page.query_selector_all(selector)
                for elem in elements[:5]:
                    text = elem.inner_text()
                    if text and len(text) > 2 and text not in leads:
                        leads.append(text)
            
            browser.close()
            
            if leads:
                print(f"✅ SUCCESS! Captured {len(leads)} leads:")
                for i, lead in enumerate(leads, 1):
                    print(f"   {i}. {lead}")
                return leads
            else:
                print("❌ No leads extracted - site structure unknown")
                return []
                
    except ImportError:
        print("❌ Playwright not installed")
        print("   Install: pip install playwright")
        print("   Then: playwright install chromium")
        return []
    except Exception as e:
        print(f"❌ Browser failed: {e}")
        return []

if __name__ == "__main__":
    usa_strike_playwright()
