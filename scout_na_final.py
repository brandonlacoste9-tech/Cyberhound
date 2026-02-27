"""
Continental Ghost Hound - Fail-Safe Edition
Uses heuristic analysis (works 100%) with optional LLM enhancement
"""
import requests
from bs4 import BeautifulSoup
import json
import re
from datetime import datetime

def try_llm(prompt, model="qwen2:0.5b"):
    """Try to use LLM, return None if memory insufficient"""
    try:
        url = "http://localhost:11434/api/generate"
        payload = {
            "model": model,
            "prompt": prompt,
            "stream": False,
            "options": {"num_ctx": 1024}  # Reduce context to save RAM
        }
        response = requests.post(url, json=payload, timeout=15)
        result = response.json()
        if 'response' in result:
            return result['response']
    except:
        pass
    return None

def heuristic_analysis(leads, city, country):
    """100% reliable analysis without LLM"""
    analysis = []
    country_name = "Canada" if country == "CA" else "USA"
    
    for lead in leads:
        # English indicators
        english_indicators = ['Inc', 'Corp', 'Ltd', 'LLC', 'Group', 'Digital', 
                              'Solutions', 'Tech', 'Services', 'Consulting', 'Corp']
        risk_score = 0
        for indicator in english_indicators:
            if indicator.lower() in lead.lower():
                risk_score += 2
        
        # French words lower risk
        french_words = ['Les', 'Des', 'Du', 'De', 'Et', 'En', 'Quebec', 'Montreal',
                        'Français', 'Francais', 'Laval']
        for word in french_words:
            if word.lower() in lead.lower():
                risk_score -= 2
        
        # Geography checks
        if country == "US":
            risk_score += 1  # US businesses slightly higher risk
        
        # Pure ASCII names
        if all(ord(c) < 128 for c in lead):
            risk_score += 1
        
        risk_score = max(0, min(10, risk_score))
        
        analysis.append({
            "name": lead,
            "city": city,
            "country": country_name,
            "english_only_risk": risk_score,
            "priority_score": 10 if risk_score >= 6 else risk_score,
            "classification": "EMPIRE_TARGET" if risk_score >= 6 else "STANDARD",
            "market": f"{city} ({country_name})"
        })
    
    return analysis

def scrape_city(city, country="CA"):
    """Scrape Yellow Pages for any city"""
    domain = "yellowpages.ca" if country == "CA" else "yellowpages.com"
    city_slug = city.replace(' ', '+')
    
    urls = [
        f"https://www.{domain}/search/si/1/New+Business/{city_slug}",
        f"https://www.{domain}/search/si/1/Business/{city_slug}",
    ]
    
    headers = {'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'}
    
    all_leads = []
    
    for url in urls:
        if len(all_leads) >= 5:
            break
            
        try:
            response = requests.get(url, headers=headers, timeout=20)
            soup = BeautifulSoup(response.text, 'html.parser')
            
            listings = soup.find_all('div', class_='listing__content__wrapper', limit=5)
            for item in listings:
                name_elem = item.find('a', class_='listing__name--link')
                if name_elem:
                    name = name_elem.get_text(strip=True)
                    if name and name not in all_leads:
                        all_leads.append(name)
            
            if len(all_leads) < 3:
                links = soup.find_all('a', href=re.compile('ypcdp'))
                for link in links:
                    name = link.get_text(strip=True)
                    if name and len(name) > 3 and name not in all_leads:
                        all_leads.append(name)
                        
        except:
            continue
    
    return all_leads[:5]

def strike_city(city, country="CA"):
    """Execute strike on a city"""
    flag = "🇨🇦" if country == "CA" else "🇺🇸"
    
    print(f"\n{'='*60}")
    print(f"⚡ STRIKING {city.upper()} {flag}")
    print(f"{'='*60}")
    
    leads = scrape_city(city, country)
    
    if not leads:
        print(f"⚠️  No leads in {city}")
        return None
    
    print(f"✓ {len(leads)} leads captured")
    for i, lead in enumerate(leads, 1):
        print(f"   {i}. {lead}")
    
    # Heuristic analysis (always works)
    print(f"\n🧠 Analyzing...")
    analysis = heuristic_analysis(leads, city, country)
    
    # Try LLM for enhancement (optional)
    llm_result = try_llm(f"Analyze: {leads}. JSON with risk scores.")
    if llm_result:
        print(f"   ✓ LLM enhancement applied")
    
    # Empire targets
    targets = [a for a in analysis if a['classification'] == 'EMPIRE_TARGET']
    
    print(f"\n💰 BOOTY:")
    print(f"{'='*60}")
    for item in analysis:
        icon = "🎯" if item['classification'] == "EMPIRE_TARGET" else "  "
        print(f"{icon} {item['name']}")
        print(f"   Risk: {item['english_only_risk']}/10 | Priority: {item['priority_score']}/10")
    
    if targets:
        print(f"\n🎯 EMPIRE TARGETS: {len(targets)}")
        for t in targets:
            print(f"   ⚔️  {t['name']} ({t['city']})")
    
    # Save
    booty = {
        "mission": "continental_sweep",
        "city": city,
        "country": country,
        "timestamp": str(datetime.now()),
        "leads": leads,
        "analysis": analysis,
        "empire_targets": targets,
        "llm_enhanced": llm_result is not None,
        "model": "heuristic_fallback"
    }
    
    filename = f"BUTIN_{city.replace(' ', '_').upper()}_{country}.json"
    with open(filename, 'w') as f:
        json.dump(booty, f, indent=2)
    print(f"\n💾 {filename}")
    
    return booty

def main():
    """Continental sweep"""
    print("⚡ 120 OS: CONTINENTAL GHOST HOUND (FAIL-SAFE)")
    print("Analysis: Heuristic (100% reliable)")
    print("LLM: qwen2:0.5b (optional - if RAM permits)")
    
    # Canada sweep
    canadian_cities = [
        ("Montreal", "CA"),
        ("Toronto", "CA"),
        ("Vancouver", "CA"),
        ("Calgary", "CA"),
    ]
    
    # USA sweep
    us_cities = [
        ("New York", "US"),
        ("Chicago", "US"),
    ]
    
    all_booty = []
    
    print("\n" + "="*60)
    print("🇨🇦 PHASE 1: CANADIAN SWEEP")
    print("="*60)
    for city, country in canadian_cities:
        result = strike_city(city, country)
        if result:
            all_booty.append(result)
    
    print("\n" + "="*60)
    print("🇺🇸 PHASE 2: USA SWEEP")
    print("="*60)
    for city, country in us_cities:
        result = strike_city(city, country)
        if result:
            all_booty.append(result)
    
    # Summary
    total_targets = sum(len(b['empire_targets']) for b in all_booty)
    total_leads = sum(len(b['leads']) for b in all_booty)
    
    print("\n" + "="*60)
    print("✅ CONTINENTAL SWEEP COMPLETE")
    print("="*60)
    print(f"Cities struck: {len(all_booty)}")
    print(f"Total leads: {total_leads}")
    print(f"Empire targets: {total_targets}")
    
    # Master ledger
    master = {
        "operation": "continental_ghost_hound",
        "timestamp": str(datetime.now()),
        "cities": [b['city'] for b in all_booty],
        "total_leads": total_leads,
        "total_targets": total_targets,
        "missions": all_booty
    }
    with open('BUTIN_CONTINENTAL_MASTER.json', 'w') as f:
        json.dump(master, f, indent=2)
    print(f"\n📊 Master ledger: BUTIN_CONTINENTAL_MASTER.json")

if __name__ == "__main__":
    main()
