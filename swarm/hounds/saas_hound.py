"""
SaaSHound - Specialized agent for hunting SaaS lifetime deals and discounts
"""

import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional

from .base_hound import BaseHound
from ..opportunity_schema import (
    infer_tags,
    normalize_opportunity,
    price_pair_from_text,
)
from ..live_sources import firecrawl


class SaaSHound(BaseHound):
    """
    The SaaS Deal Hunter
    
    Hunts for:
    - Lifetime deals (AppSumo, StackSocial)
    - Discount codes
    - Free tier upgrades
    - Black Friday / special sales
    """
    
    def __init__(self, config: Dict = None):
        config = config or {}
        super().__init__(
            name="SaaSHound",
            category="saas",
            config=config
        )
        self.deals_cache: List[Dict] = []
        self.sources = [
            "appsumo",
            "stacksocial",
            "producthunt",
            "reddit_deals",
        ]
        self.live_sources = set(config.get('live_sources', ['appsumo']))
        self.min_discount_percent = config.get('min_discount', 30)
        
    async def hunt(self, filters: Optional[Dict] = None) -> List[Dict]:
        """
        Hunt for SaaS deals across multiple sources
        
        Returns list of deal opportunities
        """
        self.status = "HUNTING"
        self.last_hunt = datetime.now()
        
        all_deals = []
        
        # Hunt each source
        for source in self.sources:
            try:
                deals = await self._hunt_source(source, filters)
                all_deals.extend(deals)
                await asyncio.sleep(0.5)  # Be nice to APIs
            except Exception as e:
                print(f"  ⚠️  {self.name}: Error hunting {source}: {e}")
        
        # Filter and score
        filtered = self._filter_deals(all_deals, filters)
        scored = self._score_deals(filtered)
        
        # Update cache
        self.deals_cache = scored[:20]  # Keep top 20
        self.bounties_found += len(scored)
        
        self.status = "RESTING"
        return scored
    
    async def _hunt_source(self, source: str, filters: Dict) -> List[Dict]:
        """Hunt a specific deal source"""
        hunters = {
            'appsumo': self._hunt_appsumo,
            'stacksocial': self._hunt_stacksocial,
            'producthunt': self._hunt_producthunt,
            'reddit_deals': self._hunt_reddit,
        }
        
        hunter = hunters.get(source)
        if hunter:
            return await hunter(filters)
        return []
    
    async def _hunt_appsumo(self, filters: Dict) -> List[Dict]:
        """Hunt AppSumo for lifetime deals."""
        if 'appsumo' in self.live_sources:
            try:
                from extraction.scrapers.appsumo import hunt_appsumo

                live_packets = await hunt_appsumo()
                live_deals: List[Dict] = []

                for packet in live_packets:
                    original_price, deal_price = price_pair_from_text(
                        packet.get('summary', '')
                    )
                    discount_percent = 0
                    if original_price and deal_price and original_price > 0:
                        discount_percent = round(
                            ((original_price - deal_price) / original_price) * 100,
                            1,
                        )

                    tags = infer_tags(packet.get('brand'), packet.get('summary'))
                    live_deals.append(
                        normalize_opportunity(
                            {
                                'id': f"appsumo_live_{packet.get('id')}",
                                'title': packet.get('brand') or 'AppSumo Deal',
                                'description': packet.get('summary')
                                or 'Live AppSumo opportunity intercepted.',
                                'platform': 'AppSumo',
                                'original_price': original_price,
                                'deal_price': deal_price,
                                'discount_percent': discount_percent,
                                'deal_type': 'lifetime' if 'lifetime' in str(packet.get('summary', '')).lower() else 'discount',
                                'url': packet.get('url', '#'),
                                'image': packet.get('image'),
                                'category': 'saas',
                                'tags': tags,
                                'metadata': {
                                    'verdict': packet.get('verdict'),
                                    'value_score': packet.get('value_score'),
                                    'scraper': 'playwright-appsumo',
                                },
                            },
                            category='saas',
                            platform='AppSumo',
                            source_kind='live_scrape',
                            verified=True,
                        )
                    )

                if live_deals:
                    return live_deals
            except Exception as e:
                print(f"[WARN] {self.name}: live AppSumo scrape failed, trying Firecrawl: {e}")

        if firecrawl.enabled:
            try:
                results = firecrawl.search(
                    "site:appsumo.com/browse software lifetime deals",
                    limit=5,
                )
                firecrawl_deals = []
                for idx, result in enumerate(results):
                    original_price, deal_price = price_pair_from_text(
                        result.get('description', '')
                    )
                    discount_percent = 0
                    if original_price and deal_price and original_price > 0:
                        discount_percent = round(
                            ((original_price - deal_price) / original_price) * 100,
                            1,
                        )
                    firecrawl_deals.append(
                        normalize_opportunity(
                            {
                                'id': f'appsumo_firecrawl_{idx}',
                                'title': result.get('title') or 'AppSumo deal',
                                'description': result.get('description') or '',
                                'url': result.get('url', '#'),
                                'original_price': original_price,
                                'deal_price': deal_price,
                                'discount_percent': discount_percent,
                                'deal_type': 'lifetime' if 'lifetime' in str(result.get('description', '')).lower() else 'discount',
                                'tags': infer_tags(result.get('title'), result.get('description')),
                            },
                            category='saas',
                            platform='AppSumo',
                            source_kind='firecrawl_search',
                            verified=True,
                        )
                    )
                if firecrawl_deals:
                    return firecrawl_deals
            except Exception as e:
                print(f"[WARN] {self.name}: Firecrawl AppSumo search failed: {e}")

        return self._mock_appsumo_deals()

    def _mock_appsumo_deals(self) -> List[Dict]:
        """Fallback data when live scraping is unavailable."""
        rows = [
            {
                'id': 'appsumo_001',
                'title': 'Vercel Pro - 50% off first year',
                'description': 'Deploy React/Next.js with premium features',
                'platform': 'AppSumo',
                'original_price': 240,
                'deal_price': 120,
                'discount_percent': 50,
                'deal_type': 'discount',
                'url': 'https://appsumo.com/vercel',
                'expires': (datetime.now() + timedelta(days=3)).isoformat(),
                'category': 'hosting',
                'tags': ['nextjs', 'react', 'deployment'],
                'verified': False,
            },
            {
                'id': 'appsumo_002',
                'title': 'Supabase Pro - Lifetime Deal',
                'description': 'PostgreSQL backend as a service, unlimited projects',
                'platform': 'AppSumo',
                'original_price': 600,
                'deal_price': 99,
                'discount_percent': 83,
                'deal_type': 'lifetime',
                'url': 'https://appsumo.com/supabase',
                'expires': (datetime.now() + timedelta(days=7)).isoformat(),
                'category': 'database',
                'tags': ['postgresql', 'backend', 'api'],
                'verified': False,
            },
            {
                'id': 'appsumo_003',
                'title': 'Notion AI - 3 months free',
                'description': 'AI-powered notes and documentation',
                'platform': 'AppSumo',
                'original_price': 30,
                'deal_price': 0,
                'discount_percent': 100,
                'deal_type': 'free_tier',
                'url': 'https://appsumo.com/notion',
                'expires': (datetime.now() + timedelta(days=14)).isoformat(),
                'category': 'productivity',
                'tags': ['notes', 'ai', 'documentation'],
                'verified': False,
            },
        ]
        return [
            normalize_opportunity(
                row,
                category='saas',
                platform='AppSumo',
                source_kind='fallback_mock',
                verified=False,
            )
            for row in rows
        ]
    
    async def _hunt_stacksocial(self, filters: Dict) -> List[Dict]:
        """Hunt StackSocial for deals"""
        if firecrawl.enabled:
            try:
                results = firecrawl.search(
                    "site:stacksocial.com software deal lifetime OR discount",
                    limit=3,
                )
                live = [
                    normalize_opportunity(
                        {
                            'id': f'ss_live_{idx}',
                            'title': item.get('title') or 'StackSocial deal',
                            'description': item.get('description') or '',
                            'url': item.get('url', '#'),
                            'original_price': price_pair_from_text(item.get('description', ''))[0],
                            'deal_price': price_pair_from_text(item.get('description', ''))[1],
                            'discount_percent': 0,
                            'deal_type': 'discount',
                            'tags': infer_tags(item.get('title'), item.get('description')),
                        },
                        category='saas',
                        platform='StackSocial',
                        source_kind='firecrawl_search',
                        verified=True,
                    )
                    for idx, item in enumerate(results)
                ]
                if live:
                    return live
            except Exception as e:
                print(f"[WARN] {self.name}: Firecrawl StackSocial search failed: {e}")

        return [
            normalize_opportunity(
                {
                    'id': 'ss_001',
                    'title': 'GitHub Copilot - 6 months free',
                    'description': 'AI pair programmer for your IDE',
                    'platform': 'StackSocial',
                    'original_price': 120,
                    'deal_price': 0,
                    'discount_percent': 100,
                    'deal_type': 'free_tier',
                    'url': 'https://stacksocial.com/github-copilot',
                    'expires': (datetime.now() + timedelta(days=5)).isoformat(),
                    'category': 'developer_tools',
                    'tags': ['ai', 'coding', 'productivity'],
                },
                category='saas',
                platform='StackSocial',
                source_kind='fallback_mock',
            )
        ]
    
    async def _hunt_producthunt(self, filters: Dict) -> List[Dict]:
        """Hunt Product Hunt for launches with deals"""
        if firecrawl.enabled:
            try:
                results = firecrawl.search(
                    "site:producthunt.com/posts software launch discount deal",
                    limit=3,
                )
                live = [
                    normalize_opportunity(
                        {
                            'id': f'ph_live_{idx}',
                            'title': item.get('title') or 'Product Hunt launch',
                            'description': item.get('description') or '',
                            'url': item.get('url', '#'),
                            'deal_type': 'launch_signal',
                            'tags': infer_tags(item.get('title'), item.get('description')),
                        },
                        category='saas',
                        platform='ProductHunt',
                        source_kind='firecrawl_search',
                        verified=True,
                    )
                    for idx, item in enumerate(results)
                ]
                if live:
                    return live
            except Exception as e:
                print(f"[WARN] {self.name}: Firecrawl Product Hunt search failed: {e}")

        return [
            normalize_opportunity(
                {
                    'id': 'ph_001',
                    'title': 'New AI Code Review Tool - 70% off',
                    'description': 'Automated PR reviews and bug detection',
                    'platform': 'ProductHunt',
                    'original_price': 50,
                    'deal_price': 15,
                    'discount_percent': 70,
                    'deal_type': 'launch_discount',
                    'url': 'https://producthunt.com/posts/ai-code-review',
                    'expires': (datetime.now() + timedelta(hours=48)).isoformat(),
                    'category': 'developer_tools',
                    'tags': ['ai', 'code_review', 'github'],
                },
                category='saas',
                platform='ProductHunt',
                source_kind='fallback_mock',
            )
        ]
    
    async def _hunt_reddit(self, filters: Dict) -> List[Dict]:
        """Hunt Reddit for deal posts"""
        if firecrawl.enabled:
            try:
                results = firecrawl.search(
                    "site:reddit.com SaaS lifetime deal OR promo code software",
                    limit=3,
                )
                live = [
                    normalize_opportunity(
                        {
                            'id': f'reddit_live_{idx}',
                            'title': item.get('title') or 'Reddit SaaS mention',
                            'description': item.get('description') or '',
                            'url': item.get('url', '#'),
                            'deal_type': 'community_signal',
                            'tags': infer_tags(item.get('title'), item.get('description')),
                        },
                        category='saas',
                        platform='Reddit',
                        source_kind='firecrawl_search',
                        verified=True,
                    )
                    for idx, item in enumerate(results)
                ]
                if live:
                    return live
            except Exception as e:
                print(f"[WARN] {self.name}: Firecrawl Reddit search failed: {e}")

        return [
            normalize_opportunity(
                {
                    'id': 'reddit_001',
                    'title': 'DigitalOcean - $200 free credit',
                    'description': 'Cloud hosting credits for 60 days',
                    'platform': 'Reddit r/webdev',
                    'original_price': 200,
                    'deal_price': 0,
                    'discount_percent': 100,
                    'deal_type': 'credits',
                    'url': 'https://digitalocean.com/try',
                    'expires': (datetime.now() + timedelta(days=30)).isoformat(),
                    'category': 'hosting',
                    'tags': ['cloud', 'vps', 'hosting'],
                },
                category='saas',
                platform='Reddit',
                source_kind='fallback_mock',
            )
        ]
    
    def _filter_deals(self, deals: List[Dict], filters: Dict) -> List[Dict]:
        """Filter deals based on criteria"""
        filtered = []
        
        for deal in deals:
            # Minimum discount filter
            if deal.get('discount_percent', 0) < self.min_discount_percent:
                continue
            
            # Category filter
            if filters and 'category' in filters:
                if deal.get('category') != filters['category']:
                    continue
            
            # Tag filter
            if filters and 'tags' in filters:
                deal_tags = set(deal.get('tags', []))
                required_tags = set(filters['tags'])
                if not required_tags.intersection(deal_tags):
                    continue
            
            filtered.append(deal)
        
        return filtered
    
    def _score_deals(self, deals: List[Dict]) -> List[Dict]:
        """Score and rank deals by value"""
        for deal in deals:
            score = 0
            
            # Discount percentage (0-40 points)
            score += min(deal.get('discount_percent', 0) * 0.4, 40)
            
            # Absolute savings (0-30 points)
            savings = deal.get('original_price', 0) - deal.get('deal_price', 0)
            score += min(savings * 0.1, 30)
            
            # Urgency (0-20 points) - closer to expiry = higher
            try:
                expires = datetime.fromisoformat(deal.get('expires', ''))
                hours_left = (expires - datetime.now()).total_seconds() / 3600
                if hours_left < 24:
                    score += 20
                elif hours_left < 72:
                    score += 10
            except:
                pass
            
            # Lifetime deals get bonus (10 points)
            if deal.get('deal_type') == 'lifetime':
                score += 10
            
            deal['score'] = round(score, 1)
            deal['hot_deal'] = score >= 70
        
        # Sort by score
        return sorted(deals, key=lambda x: x.get('score', 0), reverse=True)
    
    def get_hot_deals(self, count: int = 5) -> List[Dict]:
        """Get top hot deals"""
        hot = [d for d in self.deals_cache if d.get('hot_deal')]
        return hot[:count]
    
    def get_stats(self) -> Dict:
        """Get hound statistics"""
        return {
            'name': self.name,
            'status': self.status,
            'bounties_found': self.bounties_found,
            'deals_cached': len(self.deals_cache),
            'hot_deals': len([d for d in self.deals_cache if d.get('hot_deal')]),
            'last_hunt': self.last_hunt.isoformat() if self.last_hunt else None
        }
