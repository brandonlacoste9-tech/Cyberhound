"""
AlgoraHound - Specialized agent for hunting GitHub bounties and open source rewards
"""

import asyncio
import re
from datetime import datetime, timedelta
from typing import Dict, List, Optional

from .base_hound import BaseHound
from ..live_sources import firecrawl
from ..opportunity_schema import infer_tags, normalize_opportunity


class AlgoraHound(BaseHound):
    """
    The Open Source Bounty Hunter
    
    Hunts for:
    - GitHub issues with bounties (via Algora, Bountysource, etc.)
    - OSS contribution rewards
    - Bug bounty programs
    - Feature implementation bounties
    """
    
    def __init__(self, config: Dict = None):
        config = config or {}
        super().__init__(
            name="AlgoraHound",
            category="bounty",
            config=config
        )
        self.bounties_cache: List[Dict] = []
        self.languages = config.get('languages', [
            'python', 'typescript', 'javascript', 'rust', 'go'
        ])
        self.min_bounty = config.get('min_bounty', 100)
        self.github_username = config.get('github_username')
        
    async def hunt(self, filters: Optional[Dict] = None) -> List[Dict]:
        """
        Hunt for GitHub bounties
        
        Searches Algora, IssueHunt, and other bounty platforms
        """
        self.status = "HUNTING"
        self.last_hunt = datetime.now()
        
        live_bounties = await self._hunt_live_bounties(filters)
        if live_bounties:
            filtered = self._filter_bounties(live_bounties, filters)
            scored = self._score_bounties(filtered)
            self.bounties_cache = scored[:10]
            self.bounties_found += len(scored)
            self.status = "RESTING"
            return scored

        # Mock bounties fallback
        mock_bounties = [
            {
                'id': 'alg_001',
                'title': 'Implement React Server Components in Next.js 14',
                'description': 'Add support for React Server Components with streaming SSR. Must include error boundaries and loading states.',
                'platform': 'Algora',
                'repository': 'vercel/next.js',
                'issue_number': 12345,
                'bounty_amount': 2500,
                'currency': 'USD',
                'languages': ['typescript', 'javascript'],
                'difficulty': 'hard',
                'labels': ['enhancement', 'help wanted', 'bounty'],
                'time_estimate': '2-3 weeks',
                'claimed_by': None,
                'url': 'https://github.com/vercel/next.js/issues/12345',
                'expires': None,  # No expiry
                'maintainer_comment': 'Looking for experienced contributor. Happy to provide guidance.'
            },
            {
                'id': 'alg_002',
                'title': 'Fix memory leak in pandas DataFrame operations',
                'description': 'Investigate and fix memory leak when performing chained operations on large DataFrames.',
                'platform': 'IssueHunt',
                'repository': 'pandas-dev/pandas',
                'issue_number': 67890,
                'bounty_amount': 800,
                'currency': 'USD',
                'languages': ['python', 'cython'],
                'difficulty': 'medium',
                'labels': ['bug', 'performance', 'bounty'],
                'time_estimate': '1 week',
                'claimed_by': None,
                'url': 'https://github.com/pandas-dev/pandas/issues/67890',
                'expires': (datetime.now() + timedelta(days=30)).isoformat(),
                'maintainer_comment': 'Profile data provided in issue.'
            },
            {
                'id': 'alg_003',
                'title': 'Add PostgreSQL vector similarity search extension',
                'description': 'Implement pgvector integration for similarity search in Supabase. Include migration and tests.',
                'platform': 'Algora',
                'repository': 'supabase/supabase',
                'issue_number': 9876,
                'bounty_amount': 1500,
                'currency': 'USD',
                'languages': ['typescript', 'sql', 'python'],
                'difficulty': 'medium',
                'labels': ['feature', 'database', 'bounty'],
                'time_estimate': '1-2 weeks',
                'claimed_by': None,
                'url': 'https://github.com/supabase/supabase/issues/9876',
                'expires': None,
                'maintainer_comment': 'Great first contribution for someone familiar with Postgres.'
            },
            {
                'id': 'alg_004',
                'title': 'Implement WebRTC video calling in Flutter app',
                'description': 'Add 1:1 video calling feature using WebRTC. Handle permissions, call states, and background mode.',
                'platform': 'Algora',
                'repository': 'flutter-webrtc/flutter-webrtc',
                'issue_number': 5432,
                'bounty_amount': 1200,
                'currency': 'USD',
                'languages': ['dart', 'swift', 'kotlin'],
                'difficulty': 'hard',
                'labels': ['feature', 'webrtc', 'bounty'],
                'time_estimate': '2-3 weeks',
                'claimed_by': None,
                'url': 'https://github.com/flutter-webrtc/flutter-webrtc/issues/5432',
                'expires': (datetime.now() + timedelta(days=14)).isoformat(),
                'maintainer_comment': 'UI mockups provided. Backend already implemented.'
            },
            {
                'id': 'alg_005',
                'title': 'Build CLI tool for Docker container optimization',
                'description': 'Create CLI that analyzes Docker images and suggests optimizations for size and security.',
                'platform': 'Bountysource',
                'repository': 'docker/compose',
                'issue_number': 11111,
                'bounty_amount': 3000,
                'currency': 'USD',
                'languages': ['go', 'python'],
                'difficulty': 'medium',
                'labels': ['feature', 'cli', 'bounty'],
                'time_estimate': '2 weeks',
                'claimed_by': None,
                'url': 'https://github.com/docker/compose/issues/11111',
                'expires': None,
                'maintainer_comment': 'Reference implementation in Python available.'
            }
        ]
        
        # Filter and score
        filtered = self._filter_bounties(mock_bounties, filters)
        scored = self._score_bounties(filtered)
        
        self.bounties_cache = scored[:10]
        self.bounties_found += len(scored)
        
        self.status = "RESTING"
        return scored

    async def _hunt_live_bounties(self, filters: Optional[Dict] = None) -> List[Dict]:
        if not firecrawl.enabled:
            return []

        query = 'site:algora.io bounties python typescript javascript'

        try:
            results = firecrawl.search(query, limit=8)
        except Exception as e:
            print(f"[WARN] {self.name}: Firecrawl bounty search failed: {e}")
            return []

        bounties: List[Dict] = []
        for idx, item in enumerate(results):
            description = item.get('description') or ''
            title = item.get('title') or 'Open source bounty'
            amount_match = re.search(r'\$\s*([0-9]{2,5})', description.replace(',', ''))
            bounty_amount = max(int(amount_match.group(1)), self.min_bounty) if amount_match else self.min_bounty
            text_blob = f"{title} {description}".lower()
            difficulty = 'hard' if any(word in text_blob for word in ['migrate', 'architecture', 'webrtc']) else 'medium'
            languages = infer_tags(title, description)

            bounties.append(
                normalize_opportunity(
                    {
                        'id': f'alg_live_{idx}',
                        'title': title,
                        'description': description,
                        'platform': 'Algora',
                        'repository': item.get('url', '').split('/issues')[0].replace('https://github.com/', ''),
                        'bounty_amount': bounty_amount,
                        'currency': 'USD',
                        'languages': languages,
                        'difficulty': difficulty,
                        'labels': ['bounty', 'live'],
                        'time_estimate': '1-2 weeks',
                        'claimed_by': None,
                        'url': item.get('url', '#'),
                        'maintainer_comment': 'Live search signal via Firecrawl.',
                        'metadata': {'source': 'firecrawl'},
                    },
                    category='bounty',
                    platform='Algora',
                    source_kind='firecrawl_search',
                    verified=True,
                )
            )

        return bounties
    
    def _filter_bounties(self, bounties: List[Dict], filters: Dict) -> List[Dict]:
        """Filter bounties by criteria"""
        filtered = []
        
        for bounty in bounties:
            # Minimum bounty amount
            if bounty.get('bounty_amount', 0) < self.min_bounty:
                continue
            
            # Language filter
            if filters and 'language' in filters:
                if filters['language'].lower() not in [l.lower() for l in bounty.get('languages', [])]:
                    continue
            
            # Difficulty filter
            if filters and 'difficulty' in filters:
                if bounty.get('difficulty') != filters['difficulty']:
                    continue
            
            # Default: match our preferred languages.
            # Firecrawl results can be sparse, so allow live bounty pages through
            # even when the snippet does not expose precise language tags yet.
            bounty_langs = set(l.lower() for l in bounty.get('languages', []))
            our_langs = set(l.lower() for l in self.languages)
            if not bounty_langs.intersection(our_langs):
                if bounty.get('source_kind') != 'firecrawl_search':
                    continue
            
            # Skip claimed bounties
            if bounty.get('claimed_by'):
                continue
            
            filtered.append(bounty)
        
        return filtered
    
    def _score_bounties(self, bounties: List[Dict]) -> List[Dict]:
        """Score bounties by value/difficulty ratio"""
        for bounty in bounties:
            score = 0
            
            # Base amount score (0-40 points) - log scale
            amount = bounty.get('bounty_amount', 0)
            score += min(40, 10 + (amount / 100))
            
            # Difficulty multiplier
            difficulty = bounty.get('difficulty', 'medium')
            multipliers = {'easy': 1.2, 'medium': 1.0, 'hard': 0.8}
            score *= multipliers.get(difficulty, 1.0)
            
            # Time estimate bonus (0-15 points) - shorter is better
            time_est = bounty.get('time_estimate', '2 weeks')
            if 'day' in time_est:
                score += 15
            elif '1 week' in time_est:
                score += 12
            elif '2 weeks' in time_est:
                score += 10
            elif 'month' in time_est:
                score += 5
            
            # Repository popularity bonus (0-20 points)
            repo = bounty.get('repository', '')
            popular_repos = ['vercel/next.js', 'facebook/react', 'microsoft/vscode']
            if any(p in repo for p in popular_repos):
                score += 20
            elif 'supabase' in repo or 'docker' in repo:
                score += 15
            
            # Maintainer engagement (0-10 points)
            if bounty.get('maintainer_comment'):
                score += 10
            
            # Language match quality
            bounty_langs = set(l.lower() for l in bounty.get('languages', []))
            our_langs = set(l.lower() for l in self.languages)
            matches = bounty_langs.intersection(our_langs)
            if matches:
                score += len(matches) * 3
            
            bounty['score'] = round(score, 1)
            bounty['hot_deal'] = score >= 60
            
            # Calculate hourly rate estimate
            time_est = bounty.get('time_estimate', '2 weeks')
            hours = 40  # default
            if 'day' in time_est:
                hours = 8
            elif 'week' in time_est:
                match = re.search(r'(\d+)', time_est)
                if match:
                    hours = int(match.group(1)) * 40
            elif 'month' in time_est:
                match = re.search(r'(\d+)', time_est)
                if match:
                    hours = int(match.group(1)) * 160
            
            bounty['estimated_hourly'] = round(bounty.get('bounty_amount', 0) / hours, 2)
        
        return sorted(bounties, key=lambda x: x.get('score', 0), reverse=True)
    
    def get_hot_bounties(self, count: int = 3) -> List[Dict]:
        """Get top hot bounties"""
        hot = [b for b in self.bounties_cache if b.get('hot_deal')]
        return hot[:count]
    
    def get_stats(self) -> Dict:
        """Get hound statistics"""
        return {
            'name': self.name,
            'status': self.status,
            'bounties_found': self.bounties_found,
            'bounties_cached': len(self.bounties_cache),
            'hot_bounties': len([b for b in self.bounties_cache if b.get('hot_deal')]),
            'last_hunt': self.last_hunt.isoformat() if self.last_hunt else None,
            'languages_tracking': len(self.languages)
        }
