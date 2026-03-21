"""
USA Stealth Scout - Testing yellowpages.com defenses
Multiple header strategies to bypass bot detection
"""
import requests
from bs4 import BeautifulSoup
import json
import re
import time

def try_stealth_scrape(city, strategy="standard"):
    """Try different stealth approaches"""
    
    city_slug = city.replace(' ', '-').lower()
    
    # Different URL patterns for yellowpages.com
    urls = [
        f"https://www.yellowpages.com/search?search_terms=new+business&geo_location_terms={city}",
        f"https://www.yellowpages.com/{city_slug}/new-business",
        f"https://www.yellowpages.com/search?search_terms=business&geo_location_terms={city_slug}",
    ]
    
    # Different header strategies
    header_sets = {
        "standard": {
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
        },
        "chrome": {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
        },
        "safari": {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
        },
        "mobile": {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
    }
    
    headers = header_sets.get(strategy, header_sets["standard"])
    
    results = []
    
    for url in urls:
        try:
            print(f"   🔍 Trying {strategy} strategy...")
            print(f"      URL: {url[:60]}...")
            
            response = requests.get(url, headers=headers, timeout=20, allow_redirects=True)
            
            print(f"      Status: {response.status_code}")
            print(f"      Content length: {len(response.text)} bytes")
            
            # Check if we got blocked
            if "captcha" in response.text.lower() or "robot" in response.text.lower():
                print(f"      ⚠️  Bot detection triggered!")
                continue
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Try multiple extraction methods
            leads = []
            
            # Method 1: info class (common in YP)
            listings = soup.find_all('div', class_=re.compile('info|result|listing'))
            for item in listings[:5]:
                # Business name
                name_elem = item.find(['a', 'h2', 'h3', 'span'], class_=re.compile('name|business|title'))
                if name_elem:
                    name = name_elem.get_text(strip=True)
                    if name and len(name) > 2 and name not in leads:
                        leads.append(name)
            
            # Method 2: JSON-LD
            if len(leads) < 3:
                scripts = soup.find_all('script', type='application/ld+json')
                for script in scripts:
                    try:
                        data = json.loads(script.string)
                        if isinstance(data, list):
                            for item in data:
                                if isinstance(item, dict) and 'name' in item:
                                    if item['name'] not in leads:
                                        leads.append(item['name'])
                        elif isinstance(data, dict) and 'name' in data:
                            if data['name'] not in leads:
                                leads.append(data['name'])
                    except:
                        pass
            
            # Method 3: Any link with business patterns
            if len(leads) < 3:
                links = soup.find_all('a', href=True)
                for link in links:
                    href = link.get('href', '')
                    if '/biz/' in href or '/business/' in href:
                        name = link.get_text(strip=True)
                        if name and len(name) > 3 and name not in leads:
                            leads.append(name)
            
            if leads:
                print(f"      ✅ SUCCESS! Found {len(leads)} leads")
                results.extend(leads)
                break
            else:
                print(f"      ❌ No leads extracted")
                
        except Exception as e:
            print(f"      ❌ Error: {str(e)[:50]}")
            continue
        
        time.sleep(1)  # Be polite
    
    return list(dict.fromkeys(results))[:5]  # Deduplicate

def test_usa_stealth():
    """Test all stealth strategies on USA cities"""
    print("⚡ 120 OS: USA STEALTH RECONNAISSANCE")
    print("=" * 60)
    
    cities = [
        ("New York", "NY"),
        ("Chicago", "IL"),
    ]
    
    strategies = ["standard", "chrome", "safari", "mobile"]
    
    all_results = {}
    
    for city, state in cities:
        print(f"\n🎯 TARGET: {city}, {state}")
        print("-" * 60)
        
        city_results = {}
        
        for strategy in strategies:
            leads = try_stealth_scrape(f"{city} {state}", strategy)
            if leads:
                city_results[strategy] = leads
                print(f"   🏆 Strategy '{strategy}' WON with {len(leads)} leads!")
                for i, lead in enumerate(leads, 1):
                    print(f"      {i}. {lead}")
                break  # Stop if we got results
            time.sleep(2)  # Cooldown between strategies
        
        if not city_results:
            print(f"   💀 All strategies failed for {city}")
        
        all_results[city] = city_results
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 RECONNAISSANCE SUMMARY")
    print("=" * 60)
    
    total_success = sum(len(v) for v in all_results.values())
    
    if total_success == 0:
        print("❌ USA sector locked down tight.")
        print("\n🔧 RECOMMENDATIONS:")
        print("   1. yellowpages.com requires JavaScript rendering")
        print("   2. Consider Playwright/Selenium for browser automation")
        print("   3. Or pivot to alternative data sources:")
        print("      - Yelp API (requires key)")
        print("      - Google Places API (requires key)")
        print("      - Manta.com (different scraping structure)")
    else:
        print(f"✅ Cracked {total_success} city defenses!")
        for city, results in all_results.items():
            if results:
                print(f"   • {city}: {len(results)} leads captured")
    
    # Save intel
    intel = {
        "operation": "usa_stealth_recon",
        "timestamp": str(__import__('datetime').datetime.now()),
        "results": all_results,
        "status": "BLOCKED" if total_success == 0 else "PARTIAL_SUCCESS"
    }
    
    with open('USA_RECON_INTEL.json', 'w') as f:
        json.dump(intel, f, indent=2)
    
    print(f"\n💾 Intel saved: USA_RECON_INTEL.json")

if __name__ == "__main__":
    test_usa_stealth()
