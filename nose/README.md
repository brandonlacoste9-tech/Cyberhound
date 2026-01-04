# Nose Module - Web Scraper

The Nose module is responsible for sniffing out deals across the internet using Playwright.

## Features

- Asynchronous web scraping with Playwright
- Concurrent scraping of multiple sites
- Configurable CSS selectors per site
- Deal validation and filtering
- JSON output for pipeline integration

## Installation

```bash
pip install -r requirements.txt
python -m playwright install chromium
```

## Usage

```python
from scraper import DealScraper

scraper = DealScraper(headless=True)
deals = await scraper.scrape_multiple_sites(sites)
scraper.save_deals(deals)
```

## Configuration

Configure sites in your scraping script with URL and CSS selectors:

```python
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
```
