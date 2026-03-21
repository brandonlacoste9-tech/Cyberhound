import requests
from bs4 import BeautifulSoup
import json
import re
from datetime import datetime

def local_hound_strike():
    print("⚡ 120 OS: INITIATING LOCAL HOUND (SOVEREIGN STRIKE)...")
    print("=" * 60)
    
    search_url = "https://www.yellowpages.ca/search/si/1/New+Business/Montreal+QC"
    headers = {'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'}
    
    try:
        print("🌐 Scraping Yellow Pages...")
        page = requests.get(search_url, headers=headers, timeout=30)
        soup = BeautifulSoup(page.text, 'html.parser')
        
        raw_leads = []
        
        # Try multiple selector strategies for robustness
        # Strategy 1: Standard listing class
        listings = soup.find_all('div', class_='listing__content__wrapper', limit=10)
        
        # Strategy 2: Alternative selectors if first fails
        if not listings:
            listings = soup.find_all('article', class_=re.compile('listing|result'), limit=10)
        
        # Strategy 3: Generic h3 or a tags with business names
        if not listings:
            links = soup.find_all('a', href=re.compile('.*ypcdp.*'), limit=10)
            for link in links:
                name = link.get_text(strip=True)
                if name and len(name) > 2:
                    raw_leads.append(name)
        
        # Extract from listings if found
        for item in listings:
            # Try to find business name
            name_elem = item.find('a', class_=re.compile('listing__name|business-name'))
            if name_elem:
                name = name_elem.get_text(strip=True)
                if name:
                    raw_leads.append(name)
        
        # Deduplicate
        raw_leads = list(dict.fromkeys(raw_leads))
        
        print(f"\n🛰️ RAW LEADS CAPTURED ({len(raw_leads)}):")
        for i, lead in enumerate(raw_leads[:5], 1):
            print(f"   {i}. {lead}")

        # Simple heuristic analysis (no LLM needed)
        print("\n🧠 Running Heuristic Analysis...")
        analysis = []
        for lead in raw_leads[:5]:
            # Check for English-only indicators
            english_indicators = ['Inc', 'Corp', 'Ltd', 'LLC', 'Group', 'Digital', 'Solutions', 'Tech']
            risk_score = 0
            for indicator in english_indicators:
                if indicator.lower() in lead.lower():
                    risk_score += 2
            
            # Check for French words (lowers risk)
            french_words = ['Les', 'Des', 'Du', 'Et', 'En', 'Quebec', 'Montreal']
            for word in french_words:
                if word.lower() in lead.lower():
                    risk_score -= 2
            
            risk_score = max(0, min(10, risk_score))  # Clamp 0-10
            
            analysis.append({
                "name": lead,
                "english_only_risk": risk_score,
                "priority_score": 10 - risk_score if risk_score > 5 else risk_score,
                "note": "Likely English-only" if risk_score > 5 else "May have French presence"
            })
        
        print("\n" + "=" * 60)
        print("💰 BOOTY SECURED (HEURISTIC ANALYSIS):")
        print("=" * 60)
        print(json.dumps(analysis, indent=2))
        
        # Save booty
        booty = {
            "scout": "ghost_hound_local",
            "method": "heuristic_analysis",
            "target": "yellowpages.ca",
            "location": "Montreal, QC",
            "raw_leads": raw_leads,
            "analysis": analysis,
            "sovereign": True,
            "timestamp": str(datetime.now()),
            "note": "Llama 3 disabled - insufficient RAM (1.5GB available, 4.6GB needed)"
        }
        with open('BUTIN_REEL.json', 'w') as f:
            json.dump(booty, f, indent=2)
        print("\n💾 Booty saved to BUTIN_REEL.json")
        
        # Empire Summary
        high_priority = [a for a in analysis if a['priority_score'] >= 7]
        if high_priority:
            print(f"\n🎯 HIGH PRIORITY TARGETS ({len(high_priority)}):")
            for target in high_priority:
                print(f"   ⚔️  {target['name']} (Risk: {target['english_only_risk']}/10)")
            
    except Exception as e:
        print(f"⚠️ Hound Interrupted: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    local_hound_strike()
