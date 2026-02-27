"""
Continental Ghost Hound - North American Strike Capability
Strikes any city in Canada or USA using lightweight llama3.2:1b
"""
import requests
from bs4 import BeautifulSoup
import json
import re
from datetime import datetime

def call_llama3_1b(prompt):
    """Talk to the lightweight 1B Scout model"""
    url = "http://localhost:11434/api/generate"
    payload = {
        "model": "llama3.2:1b",
        "prompt": prompt,
        "stream": False
    }
    try:
        response = requests.post(url, json=payload, timeout=60)
        result = response.json()
        if 'response' in result:
            try:
                return json.loads(result['response'])
            except:
                return {"analysis": result['response']}
        return {"error": "No response field"}
    except Exception as e:
        return {"error": str(e)}

def scrape_yellowpages(city, country="CA"):
    """Scrape Yellow Pages for any city"""
    domain = "yellowpages.ca" if country == "CA" else "yellowpages.com"
    city_slug = city.replace(' ', '+')
    
    urls = [
        f"https://www.{domain}/search/si/1/New+Business/{city_slug}",
        f"https://www.{domain}/search/si/1/Business/{city_slug}",
        f"https://www.{domain}/search/si/1/Startup/{city_slug}"
    ]
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    
    all_leads = []
    
    for url in urls:
        if len(all_leads) >= 5:
            break
            
        try:
            response = requests.get(url, headers=headers, timeout=30)
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Extract business names
            listings = soup.find_all('div', class_='listing__content__wrapper', limit=5)
            for item in listings:
                name_elem = item.find('a', class_='listing__name--link')
                if name_elem:
                    name = name_elem.get_text(strip=True)
                    if name and name not in all_leads:
                        all_leads.append(name)
            
            # Fallback: ypcdp links
            if len(all_leads) < 3:
                links = soup.find_all('a', href=re.compile('ypcdp'))
                for link in links:
                    name = link.get_text(strip=True)
                    if name and len(name) > 3 and name not in all_leads:
                        all_leads.append(name)
                        
        except Exception as e:
            print(f"   ⚠️  URL failed: {e}")
            continue
    
    return all_leads[:5]

def analyze_with_llama(leads, city, country):
    """Use llama3.2:1b to analyze the leads"""
    country_name = "Canada" if country == "CA" else "USA"
    
    prompt = f"""Analyze these businesses from {city}, {country_name}: {leads}

For each business:
1. Assess English-only risk (1-10)
2. Assign priority for localization (1-10)
3. Note if likely vulnerable to language laws

Return as JSON array with fields: name, english_risk, priority, notes"""

    return call_llama3_1b(prompt)

def strike_sector(city, country="CA"):
    """Execute a strike on any North American city"""
    country_name = "🇨🇦 CANADA" if country == "CA" else "🇺🇸 USA"
    
    print(f"\n{'='*60}")
    print(f"⚡ 120 OS: STRIKING {city.upper()}, {country_name}")
    print(f"{'='*60}")
    
    # Phase 1: Scraping
    print(f"\n🌐 Scraping Yellow Pages...")
    leads = scrape_yellowpages(city, country)
    
    if not leads:
        print(f"⚠️  No leads found for {city}")
        return None
    
    print(f"✓ Captured {len(leads)} leads:")
    for i, lead in enumerate(leads, 1):
        print(f"   {i}. {lead}")
    
    # Phase 2: LLM Analysis (if memory allows)
    print(f"\n🧠 Consulting Scout AI (llama3.2:1b)...")
    analysis = analyze_with_llama(leads, city, country)
    
    print(f"\n💰 BOOTY SECURED:")
    print(f"{'='*60}")
    print(json.dumps(analysis, indent=2))
    
    # Save to empire ledger
    booty = {
        "scout": "continental_ghost_hound",
        "target_city": city,
        "target_country": country,
        "timestamp": str(datetime.now()),
        "leads": leads,
        "analysis": analysis,
        "model": "llama3.2:1b"
    }
    
    filename = f"BUTIN_{city.replace(' ', '_').upper()}_{country}.json"
    with open(filename, 'w') as f:
        json.dump(booty, f, indent=2)
    
    print(f"\n💾 Saved to {filename}")
    
    return booty

def main():
    """Execute multi-city strike"""
    print("⚡ 120 OS: CONTINENTAL GHOST HOUND DEPLOYED")
    print("Model: llama3.2:1b (1.3GB - Fits in 1.5GB RAM)")
    
    # Strike Montreal (already have this)
    # strike_sector("Montreal", "CA")
    
    # Strike Toronto
    strike_sector("Toronto", "CA")
    
    # Strike Vancouver
    strike_sector("Vancouver", "CA")
    
    # Strike New York (USA)
    # strike_sector("New York", "US")
    
    print(f"\n{'='*60}")
    print("✅ CONTINENTAL SWEEP COMPLETE")
    print(f"{'='*60}")

if __name__ == "__main__":
    main()
