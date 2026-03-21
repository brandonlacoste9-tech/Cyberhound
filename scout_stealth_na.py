import requests
from bs4 import BeautifulSoup
import json
import time
import random

def stealth_strike(city, state):
    print(f"⚡ 120 OS: DEPLOYING STEALTH HOUND TO {city.upper()}, {state}...")
    
    # Target: USA Yellow Pages
    url = f"https://www.yellowpages.com/search?search_terms=New+Business&geo_location_terms={city}%2C+{state}"
    
    # Imperial Stealth Headers (Chrome 131 / MacOS)
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1'
    }

    try:
        # Randomized jitter to avoid detection
        time.sleep(random.uniform(2, 5))
        response = requests.get(url, headers=headers, timeout=15)
        
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, 'html.parser')
            listings = soup.find_all('a', class_='business-name', limit=5)
            
            leads = []
            for item in listings:
                name = item.text.strip()
                # Heuristic: Assign luxury potential for US targets
                leads.append({
                    "name": name,
                    "city": city,
                    "classification": "US_LUXURY_TARGET",
                    "priority": "HIGH",
                    "notes": "Imperial Branding potential for USD revenue."
                })
            
            print(f"💰 {city.upper()} BOOTY: {len(leads)} Leads Captured.")
            return leads
        else:
            print(f"⚠️ {city} Strike Failed: Status {response.status_code}")
            return []
            
    except Exception as e:
        print(f"⚠️ Error in {city} Sector: {e}")
        return []

if __name__ == "__main__":
    us_booty = []
    us_booty.extend(stealth_strike("New York", "NY"))
    us_booty.extend(stealth_strike("Chicago", "IL"))
    
    with open('BUTIN_USA_MASTER.json', 'w') as f:
        json.dump(us_booty, f, indent=2)
    print("\n📦 CONTINENTAL DATA UPDATED: BUTIN_USA_MASTER.json")
