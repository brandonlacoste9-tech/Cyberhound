"""
Lightweight scout using HTTP requests (no browser needed)
Faster but may hit anti-bot measures
"""
import asyncio
import json
import os

async def execute_strike():
    try:
        import httpx
    except ImportError:
        print("Installing httpx...")
        os.system("pip install httpx -q")
        import httpx

    print("🌐 Striking Yellow Pages via HTTP...")
    
    async with httpx.AsyncClient(
        headers={
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.0'
        },
        follow_redirects=True,
        timeout=30.0
    ) as client:
        # Search Yellow Pages
        url = "https://www.yellowpages.ca/search/si/1/New+Business/Montreal+QC"
        
        try:
            resp = await client.get(url)
            print(f"Status: {resp.status_code}")
            
            # Extract business listings (basic regex approach)
            import re
            
            # Look for business names
            names = re.findall(r'"name"\s*:\s*"([^"]{3,50})"', resp.text)
            # Look for websites
            sites = re.findall(r'https?://[^\s\"<>]+\.(?:ca|com)', resp.text)
            
            # Deduplicate
            unique_names = list(dict.fromkeys(names))[:5]
            unique_sites = list(dict.fromkeys(sites))[:5]
            
            booty = {
                "names": unique_names,
                "sites": unique_sites,
                "raw_sample": resp.text[:500] if len(resp.text) > 500 else resp.text
            }
            
            print(f"\n💰 BOOTY SECURED:")
            print(json.dumps(booty, indent=2))
            
            # Save to file
            with open('BUTIN_REEL.json', 'w') as f:
                json.dump(booty, f, indent=2)
            print(f"\n💾 Saved to BUTIN_REEL.json")
            
        except Exception as e:
            print(f"❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(execute_strike())
