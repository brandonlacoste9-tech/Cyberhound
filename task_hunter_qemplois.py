"""
Q-emplois Task Hunter - Social Media Intelligence
Finds people asking for help in Montreal to invite to Q-emplois platform
"""
import requests
import json
import re
from datetime import datetime
from bs4 import BeautifulSoup
import time

class TaskHunter:
    """Hunts for task opportunities on social media and forums"""
    
    def __init__(self):
        self.montreal_keywords = [
            'montreal', 'montréal', 'mtl', 'quebec', 'québec',
            'laval', 'longueuil', 'brossard'
        ]
        
        self.task_keywords = [
            'need help', 'besoin d\'aide', 'looking for', 'cherche',
            'someone to', 'quelqu\'un pour', 'plumber', 'plombier',
            'electrician', 'électricien', 'moving', 'déménagement',
            'cleaning', 'ménage', 'repair', 'réparation',
            'assembly', 'montage', 'ikea', 'furniture', 'meuble',
            'delivery', 'livraison', 'painting', 'peinture',
            'yard work', 'travaux de jardin', 'snow removal', 'déneigement'
        ]
        
        self.leads = []
        
    def hunt_reddit(self, subreddits=['montreal', 'Quebec', 'mtl']):
        """Hunt Reddit for task requests (requires Reddit API or scraping)"""
        print("🐾 Hunting Reddit...")
        
        # Note: Reddit requires API key for real usage
        # This is a template for the structure
        found = []
        
        for sub in subreddits:
            url = f"https://www.reddit.com/r/{sub}/search.json"
            params = {
                'q': ' OR '.join(self.task_keywords[:5]),
                'sort': 'new',
                'limit': 25
            }
            headers = {'User-Agent': 'Q-emplois Task Hunter v1.0'}
            
            try:
                # Would need Reddit API credentials for real usage
                # response = requests.get(url, params=params, headers=headers)
                # data = response.json()
                # Process posts...
                pass
            except:
                pass
        
        return found
    
    def hunt_kijiji(self):
        """Hunt Kijiji Montreal services wanted"""
        print("🐾 Hunting Kijiji Services...")
        
        urls = [
            "https://www.kijiji.ca/b-services/montreal/c144l1700281",
            "https://www.kijiji.ca/b-services-wanted/montreal/c76l1700281",
        ]
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        leads = []
        
        for url in urls:
            try:
                response = requests.get(url, headers=headers, timeout=20)
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # Find listing titles
                listings = soup.find_all('div', class_='info-container', limit=10)
                
                for item in listings:
                    title_elem = item.find('a', class_='title')
                    if title_elem:
                        title = title_elem.get_text(strip=True)
                        link = title_elem.get('href', '')
                        
                        # Check if it matches task keywords
                        if any(kw.lower() in title.lower() for kw in self.task_keywords):
                            leads.append({
                                'source': 'Kijiji',
                                'title': title,
                                'link': f"https://www.kijiji.ca{link}" if link.startswith('/') else link,
                                'hunted_at': str(datetime.now()),
                                'platform': 'Q-emplois candidate'
                            })
                            
            except Exception as e:
                print(f"   ⚠️  Kijiji error: {e}")
                continue
            
            time.sleep(2)  # Be polite
        
        return leads
    
    def hunt_craigslist(self):
        """Hunt Craigslist Montreal gigs/services"""
        print("🐾 Hunting Craigslist...")
        
        # Craigslist sections to check
        sections = [
            'https://montreal.craigslist.org/search/ggg',  # Gigs
            'https://montreal.craigslist.org/search/hss',  # Household services
        ]
        
        headers = {'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64)'}
        leads = []
        
        for url in sections:
            try:
                response = requests.get(url, headers=headers, timeout=20)
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # Find result rows
                results = soup.find_all('li', class_='result-row', limit=15)
                
                for item in results:
                    title_elem = item.find('a', class_='result-title')
                    if title_elem:
                        title = title_elem.get_text(strip=True)
                        link = title_elem.get('href', '')
                        
                        # Filter for task-related posts
                        if any(kw.lower() in title.lower() for kw in self.task_keywords):
                            leads.append({
                                'source': 'Craigslist',
                                'title': title,
                                'link': link,
                                'hunted_at': str(datetime.now()),
                                'platform': 'Q-emplois candidate'
                            })
                            
            except Exception as e:
                print(f"   ⚠️  Craigslist error: {e}")
                continue
            
            time.sleep(2)
        
        return leads
    
    def hunt_facebook_groups(self):
        """
        Note: Facebook Groups require login/API access
        This is a template for future implementation
        """
        print("🐾 Facebook Groups hunting requires API key...")
        print("   Future integration: Facebook Graph API")
        return []
    
    def analyze_intent(self, lead):
        """Analyze the urgency/intent of a task lead"""
        title = lead.get('title', '').lower()
        
        # Urgency indicators
        urgent_words = ['asap', 'urgent', 'emergency', 'today', 'tomorrow', 'urgence']
        urgency_score = sum(1 for word in urgent_words if word in title)
        
        # Budget indicators
        budget_words = ['$', 'budget', 'pay', 'paiement', 'quote', 'devis']
        budget_mentioned = any(word in title for word in budget_words)
        
        # Task category classification
        categories = {
            'plumbing': ['plumber', 'plombier', 'leak', 'fuite', 'pipe'],
            'electrical': ['electrician', 'électricien', 'wiring', 'outlet'],
            'moving': ['moving', 'déménagement', 'mover', 'camion'],
            'cleaning': ['cleaning', 'ménage', 'maid', 'femme de ménage'],
            'assembly': ['assembly', 'montage', 'ikea', 'furniture', 'meuble'],
            'delivery': ['delivery', 'livraison', 'transport', 'move'],
            'outdoor': ['yard', 'garden', 'jardin', 'snow', 'déneigement', 'lawn'],
            'repair': ['repair', 'réparation', 'fix', 'broken']
        }
        
        detected_category = 'general'
        for cat, keywords in categories.items():
            if any(kw in title for kw in keywords):
                detected_category = cat
                break
        
        return {
            'urgency_score': urgency_score,
            'budget_mentioned': budget_mentioned,
            'category': detected_category,
            'priority': 'HIGH' if urgency_score >= 2 else 'MEDIUM' if urgency_score == 1 else 'LOW'
        }
    
    def execute_hunt(self):
        """Execute full hunting sweep"""
        print("⚡ 120 OS: Q-EMPLOIS TASK HUNTER")
        print("="*60)
        print(f"🎯 Target: Montreal area task seekers")
        print(f"🔍 Keywords: {len(self.task_keywords)} task types")
        print("="*60)
        
        all_leads = []
        
        # Hunt multiple sources
        all_leads.extend(self.hunt_kijiji())
        all_leads.extend(self.hunt_craigslist())
        # all_leads.extend(self.hunt_reddit())  # Requires API
        # all_leads.extend(self.hunt_facebook_groups())  # Requires API
        
        # Analyze and enrich leads
        print(f"\n🧠 Analyzing {len(all_leads)} leads...")
        for lead in all_leads:
            analysis = self.analyze_intent(lead)
            lead.update(analysis)
        
        # Sort by priority
        priority_order = {'HIGH': 0, 'MEDIUM': 1, 'LOW': 2}
        all_leads.sort(key=lambda x: priority_order.get(x.get('priority', 'LOW'), 2))
        
        # Display results
        print(f"\n💰 TASK LEADS CAPTURED: {len(all_leads)}")
        print("="*60)
        
        high_priority = [l for l in all_leads if l.get('priority') == 'HIGH']
        print(f"🚨 HIGH PRIORITY: {len(high_priority)}")
        for lead in high_priority[:3]:
            print(f"   [{lead['source']}] {lead['title'][:50]}...")
        
        # Save to Q-emplois database
        qemplois_db = {
            'hunt_timestamp': str(datetime.now()),
            'location': 'Montreal',
            'total_leads': len(all_leads),
            'high_priority': len(high_priority),
            'leads': all_leads
        }
        
        filename = f"QEMPLOIS_TASKS_{datetime.now().strftime('%Y%m%d')}.json"
        with open(filename, 'w') as f:
            json.dump(qemplois_db, f, indent=2)
        
        print(f"\n💾 Saved to: {filename}")
        print("\n🎯 NEXT: Invite these users to Q-emplois platform")
        print("   or match them with workers from your network")
        
        return qemplois_db

def main():
    hunter = TaskHunter()
    return hunter.execute_hunt()

if __name__ == "__main__":
    main()
