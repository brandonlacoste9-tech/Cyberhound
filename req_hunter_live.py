import asyncio, aiohttp, json
from bs4 import BeautifulSoup
async def hunt():
    headers = {"User-Agent": "Mozilla/5.0"}
    url = "https://www.google.com/search?q=site:pagesjaunes.ca+quebec+nouveau"
    async with aiohttp.ClientSession() as s:
        async with s.get(url, headers=headers) as r:
            soup = BeautifulSoup(await r.text(), 'html.parser')
            res = [{"name": h3.text, "link": h3.find_parent('a')['href']} for h3 in soup.find_all('h3') if h3.find_parent('a')]
            with open('BUTIN_REEL.json', 'w') as f: json.dump(res, f, indent=4)
            print(f"🔥 HUNT COMPLETE: {len(res)} REAL TARGETS LOADED.")
if __name__ == "__main__": asyncio.run(hunt())
