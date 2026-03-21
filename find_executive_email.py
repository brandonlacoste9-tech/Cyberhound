"""
Executive Email Hunter - Find decision-makers at target companies
Uses multiple strategies to locate verified contact information
"""
import requests
import re
from bs4 import BeautifulSoup
import json

class ExecutiveHunter:
    """Hunts for executive email addresses at target companies"""
    
    def __init__(self, company_name, domain):
        self.company = company_name
        self.domain = domain
        self.patterns = [
            'firstname.lastname@domain',
            'f.lastname@domain', 
            'firstname@domain',
            'flastname@domain',
            'lastname@domain',
            'firstname_lastname@domain'
        ]
        
    def search_linkedin_pattern(self, first_name, last_name):
        """Generate likely email patterns based on LinkedIn naming"""
        f = first_name.lower()
        l = last_name.lower()
        fi = f[0] if f else ''
        li = l[0] if l else ''
        
        return [
            f"{f}.{l}@{self.domain}",
            f"{fi}{l}@{self.domain}",
            f"{f}{l}@{self.domain}",
            f"{f}_{l}@{self.domain}",
            f"{f}@{self.domain}",
            f"{l}@{self.domain}",
            f"{fi}.{l}@{self.domain}",
        ]
    
    def check_website_contact(self):
        """Scrape contact page for emails"""
        print(f"🌐 Checking {self.domain} contact pages...")
        
        urls_to_try = [
            f"https://{self.domain}/contact",
            f"https://{self.domain}/contact-us",
            f"https://{self.domain}/about",
            f"https://www.{self.domain}/contact",
        ]
        
        found_emails = []
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        
        for url in urls_to_try:
            try:
                response = requests.get(url, headers=headers, timeout=10)
                if response.status_code == 200:
                    # Look for email patterns
                    email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
                    emails = re.findall(email_pattern, response.text)
                    
                    # Filter for company domain
                    company_emails = [e for e in emails if self.domain in e]
                    found_emails.extend(company_emails)
                    
                    # Also look for role indicators
                    soup = BeautifulSoup(response.text, 'html.parser')
                    text = soup.get_text()
                    
                    # Find marketing/compliance contacts
                    if 'marketing' in text.lower() or 'compliance' in text.lower():
                        print(f"   ✓ Found relevant page: {url}")
                        
            except:
                continue
        
        return list(set(found_emails))  # Deduplicate
    
    def guess_executive_emails(self):
        """Generate likely executive email patterns"""
        print(f"🎯 Generating executive patterns for {self.company}...")
        
        # Common executive names (would need real research)
        likely_roles = [
            ('marketing', ['marketing', 'cmo', 'brand']),
            ('compliance', ['compliance', 'legal', 'regulatory']),
            ('executive', ['ceo', 'cto', 'director', 'vp']),
            ('general', ['info', 'contact', 'hello'])
        ]
        
        suggestions = []
        
        for role_type, role_names in likely_roles:
            for role in role_names:
                email = f"{role}@{self.domain}"
                suggestions.append({
                    'role_type': role_type,
                    'role': role,
                    'email': email,
                    'likelihood': 'Medium' if role_type == 'general' else 'High'
                })
        
        return suggestions
    
    def research_stingray_specific(self):
        """Specific research for Stingray Digital"""
        print("🔍 Researching Stingray Digital Group...")
        
        # Known intel about Stingray
        intel = {
            'company': 'Stingray Digital Group Inc',
            'domain': 'stingray.com',
            'industry': 'Music / Digital Media',
            'location': 'Montreal',
            'employees': '500+',
            'relevant_roles': [
                {
                    'title': 'Chief Marketing Officer',
                    'priority': 'HIGHEST',
                    'rationale': 'Controls ad budget, cares about brand positioning'
                },
                {
                    'title': 'VP Marketing',
                    'priority': 'HIGHEST', 
                    'rationale': 'Direct decision maker for agency selection'
                },
                {
                    'title': 'General Counsel / Legal',
                    'priority': 'HIGH',
                    'rationale': 'Cares about Bill 96 compliance risk'
                },
                {
                    'title': 'Digital Marketing Director',
                    'priority': 'HIGH',
                    'rationale': 'Handles Meta/Google ad campaigns'
                }
            ],
            'suggested_approach': [
                'marketing@stingray.com',
                'info@stingray.com',
                'contact@stingray.com',
                'legal@stingray.com'
            ]
        }
        
        return intel
    
    def research_wm_group_specific(self):
        """Specific research for WM Group"""
        print("🔍 Researching WM Group Solutions...")
        
        intel = {
            'company': 'WM Group Solutions Inc.',
            'domain': 'wmgroupsolutions.com',
            'industry': 'Business Solutions',
            'location': 'Montreal',
            'relevant_roles': [
                {
                    'title': 'President / CEO',
                    'priority': 'HIGHEST',
                    'rationale': 'SMB owner, direct decision maker'
                },
                {
                    'title': 'Business Development',
                    'priority': 'HIGH',
                    'rationale': 'Growth-focused, open to new channels'
                }
            ],
            'suggested_approach': [
                'info@wmgroupsolutions.com',
                'contact@wmgroupsolutions.com',
                'admin@wmgroupsolutions.com'
            ]
        }
        
        return intel
    
    def generate_strike_package(self):
        """Generate complete strike package with recommendations"""
        print("="*60)
        print(f"⚡ EXECUTIVE EMAIL HUNTER: {self.company}")
        print("="*60)
        
        # Get specific intel
        if 'stingray' in self.company.lower():
            intel = self.research_stingray_specific()
        elif 'wm' in self.company.lower() or 'group' in self.company.lower():
            intel = self.research_wm_group_specific()
        else:
            intel = {'company': self.company, 'domain': self.domain}
        
        print(f"\n🏢 COMPANY INTEL:")
        print(f"   Name: {intel.get('company', self.company)}")
        print(f"   Domain: {intel.get('domain', self.domain)}")
        print(f"   Industry: {intel.get('industry', 'Unknown')}")
        
        # Try website scraping
        website_emails = self.check_website_contact()
        if website_emails:
            print(f"\n📧 EMAILS FOUND ON WEBSITE:")
            for email in website_emails[:5]:
                print(f"   • {email}")
        
        # Generate patterns
        print(f"\n🎯 SUGGESTED TARGETS (Priority Order):")
        
        if 'relevant_roles' in intel:
            for i, role in enumerate(intel['relevant_roles'][:4], 1):
                print(f"\n   {i}. {role['title']}")
                print(f"      Priority: {role['priority']}")
                print(f"      Why: {role['rationale']}")
        
        print(f"\n📬 RECOMMENDED EMAIL SEQUENCE:")
        suggestions = intel.get('suggested_approach', self.guess_executive_emails())
        
        if isinstance(suggestions, list) and suggestions and isinstance(suggestions[0], str):
            for i, email in enumerate(suggestions, 1):
                print(f"   {i}. {email}")
        
        print(f"\n⚔️ STRIKE RECOMMENDATION:")
        print(f"   Primary: {suggestions[0] if suggestions else 'Unknown'}")
        print(f"   Backup: {suggestions[1] if len(suggestions) > 1 else 'Unknown'}")
        
        print(f"\n📝 NEXT STEPS:")
        print(f"   1. Try primary email in email_envoy.py")
        print(f"   2. If bounce, try backup")
        print(f"   3. LinkedIn search: 'Stingray CMO' or 'WM Group CEO'")
        print(f"   4. Call reception: +1 (514) XXX-XXXX")
        
        return intel

def main():
    """Hunt for both Empire targets"""
    print("⚡ 120 OS: EXECUTIVE EMAIL HUNTER")
    print("Finding decision-makers for AdGenXai strike...")
    print()
    
    # Hunt Stingray
    stingray_hunter = ExecutiveHunter(
        "Stingray Digital Group Inc",
        "stingray.com"
    )
    stingray_intel = stingray_hunter.generate_strike_package()
    
    print("\n" + "="*60)
    print()
    
    # Hunt WM Group
    wm_hunter = ExecutiveHunter(
        "WM Group Solutions Inc",
        "wmgroupsolutions.com"
    )
    wm_intel = wm_hunter.generate_strike_package()
    
    # Save intel
    package = {
        'timestamp': str(datetime.now()),
        'targets': [stingray_intel, wm_intel],
        'notes': 'Verify emails before strike. Use LinkedIn for confirmation.'
    }
    
    with open('EXECUTIVE_INTEL.json', 'w') as f:
        json.dump(package, f, indent=2)
    
    print("\n" + "="*60)
    print("💾 Saved to: EXECUTIVE_INTEL.json")

if __name__ == "__main__":
    from datetime import datetime
    main()
