"""
Nose Module - Web scraper for deal intelligence
Scrapes websites for deals using Playwright
"""

import asyncio
import json
import re
from datetime import datetime
from playwright.async_api import async_playwright
from typing import List, Dict, Optional
import os


class DealScraper:
    """Scrapes websites for deal information"""
    
    def __init__(self, headless: bool = True):
        self.headless = headless
        self.deals = []
        
    async def scrape_site(self, url: str, selectors: Dict[str, str]) -> List[Dict]:
        """
        Scrape a single site for deals
        
        Args:
            url: URL to scrape
            selectors: CSS selectors for deal elements
            
        Returns:
            List of deal dictionaries
        """
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=self.headless)
            page = await browser.new_page()
            
            try:
                await page.goto(url, timeout=30000)
                await page.wait_for_load_state('networkidle', timeout=10000)
                
                deals = []
                
                # Extract deal elements
                deal_elements = await page.query_selector_all(selectors.get('container', '.deal'))
                
                for element in deal_elements:
                    deal = await self._extract_deal_data(element, selectors)
                    if deal and self._is_valid_deal(deal):
                        deal['source_url'] = url
                        deal['scraped_at'] = datetime.utcnow().isoformat()
                        deals.append(deal)
                
                await browser.close()
                return deals
                
            except Exception as e:
                print(f"Error scraping {url}: {str(e)}")
                await browser.close()
                return []
    
    async def _extract_deal_data(self, element, selectors: Dict[str, str]) -> Optional[Dict]:
        """Extract deal data from an element"""
        try:
            title = await element.query_selector(selectors.get('title', '.title'))
            price = await element.query_selector(selectors.get('price', '.price'))
            discount = await element.query_selector(selectors.get('discount', '.discount'))
            link = await element.query_selector(selectors.get('link', 'a'))
            
            deal = {
                'title': await title.inner_text() if title else 'Unknown',
                'price': await price.inner_text() if price else 'N/A',
                'discount': await discount.inner_text() if discount else 'N/A',
                'link': await link.get_attribute('href') if link else '',
            }
            
            # Extract discount percentage
            discount_text = deal['discount']
            match = re.search(r'(\d+)%', discount_text)
            if match:
                deal['discount_percent'] = int(match.group(1))
            else:
                deal['discount_percent'] = 0
                
            return deal
            
        except Exception as e:
            print(f"Error extracting deal data: {str(e)}")
            return None
    
    def _is_valid_deal(self, deal: Dict) -> bool:
        """Validate if a deal meets minimum criteria"""
        return (
            deal.get('title') and 
            deal.get('title') != 'Unknown' and
            deal.get('discount_percent', 0) >= 10  # At least 10% off
        )
    
    async def scrape_multiple_sites(self, sites: List[Dict]) -> List[Dict]:
        """
        Scrape multiple sites concurrently
        
        Args:
            sites: List of site configurations with url and selectors
            
        Returns:
            Combined list of all deals found
        """
        tasks = []
        for site in sites:
            task = self.scrape_site(site['url'], site['selectors'])
            tasks.append(task)
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        all_deals = []
        for result in results:
            if isinstance(result, list):
                all_deals.extend(result)
        
        return all_deals
    
    def save_deals(self, deals: List[Dict], filepath: str = 'deals.json'):
        """Save deals to JSON file"""
        with open(filepath, 'w') as f:
            json.dump(deals, f, indent=2)
        print(f"Saved {len(deals)} deals to {filepath}")


async def main():
    """Example usage of the DealScraper"""
    scraper = DealScraper(headless=True)
    
    # Example site configurations
    sites = [
        {
            'url': 'https://example.com/deals',
            'selectors': {
                'container': '.deal-card',
                'title': '.deal-title',
                'price': '.deal-price',
                'discount': '.deal-discount',
                'link': 'a.deal-link'
            }
        }
    ]
    
    deals = await scraper.scrape_multiple_sites(sites)
    print(f"Found {len(deals)} deals")
    
    if deals:
        scraper.save_deals(deals)


if __name__ == '__main__':
    asyncio.run(main())
