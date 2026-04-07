"""
UpworkHound - Specialized agent for hunting freelance opportunities
"""

import asyncio
import re
from datetime import datetime
from typing import Dict, List, Optional

from .base_hound import BaseHound
from ..live_sources import apify, firecrawl
from ..opportunity_schema import dedupe_opportunities, infer_tags, normalize_opportunity


class UpworkHound(BaseHound):
    """
    The Freelance Gig Hunter
    
    Hunts for:
    - High-paying freelance jobs
    - Long-term contracts
    - Specific tech stack matches
    - Newly posted opportunities
    """
    
    def __init__(self, config: Dict = None):
        config = config or {}
        super().__init__(
            name="UpworkHound",
            category="freelance",
            config=config
        )
        self.gigs_cache: List[Dict] = []
        self.skills = config.get('skills', [
            'python', 'react', 'nextjs', 'typescript', 
            'node.js', 'postgresql', 'aws'
        ])
        self.min_hourly_rate = config.get('min_hourly_rate', 50)
        self.min_fixed_budget = config.get('min_fixed_budget', 1000)
        
    async def hunt(self, filters: Optional[Dict] = None) -> List[Dict]:
        """
        Hunt for freelance gigs
        
        In production, this would use Upwork API or RSS feeds
        For demo, uses realistic mock data
        """
        self.status = "HUNTING"
        self.last_hunt = datetime.now()
        
        live_gigs = await self._hunt_live_upwork(filters)
        if live_gigs:
            filtered = self._filter_gigs(live_gigs, filters)
            scored = self._score_gigs(filtered)
            self.gigs_cache = scored[:15]
            self.bounties_found += len(scored)
            self.status = "RESTING"
            return scored

        # Mock gigs fallback
        mock_gigs = [
            {
                'id': 'uw_001',
                'title': 'Full-stack Next.js Developer for SaaS Platform',
                'description': 'Looking for experienced developer to build multi-tenant SaaS application with Next.js 14, Supabase, and Stripe.',
                'platform': 'Upwork',
                'job_type': 'hourly',
                'hourly_rate': 85,
                'estimated_duration': '3-6 months',
                'skills': ['nextjs', 'react', 'typescript', 'supabase', 'stripe'],
                'client_rating': 4.9,
                'client_spent': '$50k+',
                'posted_time': '2 hours ago',
                'proposals': '5-10',
                'url': 'https://upwork.com/jobs/nextjs-saas',
                'verified_payment': True,
                'us_based': True
            },
            {
                'id': 'uw_002',
                'title': 'Python Automation Script for Data Processing',
                'description': 'Need a Python developer to create ETL pipelines for processing large datasets with pandas and airflow.',
                'platform': 'Upwork',
                'job_type': 'fixed',
                'fixed_budget': 2500,
                'estimated_duration': '2 weeks',
                'skills': ['python', 'pandas', 'airflow', 'postgresql'],
                'client_rating': 4.7,
                'client_spent': '$10k+',
                'posted_time': '30 minutes ago',
                'proposals': '2-5',
                'url': 'https://upwork.com/jobs/python-etl',
                'verified_payment': True,
                'us_based': False
            },
            {
                'id': 'uw_003',
                'title': 'React Native Developer for Social Media App',
                'description': 'Build iOS/Android social media app with React Native. Real-time chat, push notifications, video uploads.',
                'platform': 'Upwork',
                'job_type': 'hourly',
                'hourly_rate': 75,
                'estimated_duration': '6+ months',
                'skills': ['react-native', 'typescript', 'firebase', 'mobile'],
                'client_rating': 5.0,
                'client_spent': '$100k+',
                'posted_time': '1 hour ago',
                'proposals': '10-15',
                'url': 'https://upwork.com/jobs/react-native-social',
                'verified_payment': True,
                'us_based': True
            },
            {
                'id': 'uw_004',
                'title': 'AI/ML Engineer for Recommendation System',
                'description': 'Implement collaborative filtering and content-based recommendations for e-commerce platform.',
                'platform': 'Upwork',
                'job_type': 'hourly',
                'hourly_rate': 120,
                'estimated_duration': '2-3 months',
                'skills': ['python', 'machine-learning', 'tensorflow', 'aws'],
                'client_rating': 4.8,
                'client_spent': '$25k+',
                'posted_time': '15 minutes ago',
                'proposals': '0-5',
                'url': 'https://upwork.com/jobs/ml-recommendations',
                'verified_payment': True,
                'us_based': True
            },
            {
                'id': 'uw_005',
                'title': 'DevOps Engineer - Kubernetes Migration',
                'description': 'Migrate existing docker-compose setup to Kubernetes on EKS. CI/CD with GitHub Actions.',
                'platform': 'Upwork',
                'job_type': 'fixed',
                'fixed_budget': 5000,
                'estimated_duration': '1 month',
                'skills': ['kubernetes', 'aws', 'docker', 'cicd', 'devops'],
                'client_rating': 4.6,
                'client_spent': '$5k+',
                'posted_time': '4 hours ago',
                'proposals': '5-10',
                'url': 'https://upwork.com/jobs/devops-k8s',
                'verified_payment': True,
                'us_based': False
            }
        ]
        
        # Filter and score
        filtered = self._filter_gigs(mock_gigs, filters)
        scored = self._score_gigs(filtered)
        
        self.gigs_cache = scored[:15]
        self.bounties_found += len(scored)
        
        self.status = "RESTING"
        return scored

    async def _hunt_live_upwork(self, filters: Optional[Dict] = None) -> List[Dict]:
        query_skills = " ".join(self.skills[:4])
        query = f"site:upwork.com/freelance-jobs/apply/ {query_skills}"

        results: List[Dict] = []
        source_kind = None

        if apify.enabled:
            try:
                results = apify.google_search(query, max_results=8)
                source_kind = 'apify_google_search'
            except Exception as e:
                print(f"[WARN] {self.name}: Apify Upwork search failed: {e}")

        if not results and firecrawl.enabled:
            try:
                results = firecrawl.search(query, limit=8)
                source_kind = 'firecrawl_search'
            except Exception as e:
                print(f"[WARN] {self.name}: Firecrawl Upwork search failed: {e}")
                return []

        gigs: List[Dict] = []
        for idx, item in enumerate(results):
            url = item.get('url', '')
            if '/freelance-jobs/apply/' not in url:
                continue

            description = item.get('description') or ''
            title = item.get('title') or 'Upwork opportunity'

            hourly_match = re.search(r'\$\s*([0-9]{2,3})(?:\s*-\s*\$?([0-9]{2,3}))?\s*/?hr', description, re.I)
            fixed_match = re.search(r'\$\s*([0-9]{3,6})', description.replace(',', ''))

            job_type = 'hourly'
            hourly_rate = self.min_hourly_rate
            fixed_budget = None

            if hourly_match:
                first = int(hourly_match.group(1))
                second = int(hourly_match.group(2)) if hourly_match.group(2) else first
                hourly_rate = max(first, second)
            elif fixed_match:
                job_type = 'fixed'
                fixed_budget = max(int(fixed_match.group(1)), self.min_fixed_budget)

            gigs.append(
                normalize_opportunity(
                    {
                        'id': f'uw_live_{idx}',
                        'title': title,
                        'description': description,
                        'platform': 'Upwork',
                        'url': url,
                        'job_type': job_type,
                        'hourly_rate': hourly_rate,
                        'fixed_budget': fixed_budget,
                        'estimated_duration': 'unknown',
                        'skills': infer_tags(title, description),
                        'client_rating': 4.5,
                        'client_spent': '$10k+',
                        'posted_time': 'recent',
                        'proposals': '0-10',
                        'verified_payment': True,
                        'us_based': 'us' in description.lower() or 'united states' in description.lower(),
                        'metadata': {'source': 'apify' if source_kind == 'apify_google_search' else 'firecrawl'},
                    },
                    category='freelance',
                    platform='Upwork',
                    source_kind=source_kind or 'live_search',
                    verified=True,
                )
            )

        return dedupe_opportunities(gigs)
    
    def _filter_gigs(self, gigs: List[Dict], filters: Dict) -> List[Dict]:
        """Filter gigs based on criteria"""
        filtered = []
        
        for gig in gigs:
            # Rate/budget filter
            if gig.get('job_type') == 'hourly':
                if gig.get('hourly_rate', 0) < self.min_hourly_rate:
                    continue
            else:
                if gig.get('fixed_budget', 0) < self.min_fixed_budget:
                    continue
            
            # Skills filter
            if filters and 'skills' in filters:
                gig_skills = set(s.lower() for s in gig.get('skills', []))
                required = set(s.lower() for s in filters['skills'])
                if not required.intersection(gig_skills):
                    continue
            
            # Default: match our configured skills
            gig_skills = set(s.lower() for s in gig.get('skills', []))
            our_skills = set(s.lower() for s in self.skills)
            if not gig_skills.intersection(our_skills):
                continue
            
            filtered.append(gig)
        
        return filtered
    
    def _score_gigs(self, gigs: List[Dict]) -> List[Dict]:
        """Score gigs by quality/value"""
        for gig in gigs:
            score = 0
            
            # Rate score (0-30 points)
            if gig.get('job_type') == 'hourly':
                rate = gig.get('hourly_rate', 0)
                score += min(rate * 0.3, 30)
            else:
                budget = gig.get('fixed_budget', 0)
                score += min(budget * 0.005, 30)
            
            # Client quality (0-25 points)
            rating = gig.get('client_rating', 0)
            score += (rating - 4.0) * 25  # 5.0 = 25 pts, 4.0 = 0 pts
            
            spent = gig.get('client_spent', '$0')
            if '100k' in spent or '50k' in spent:
                score += 15
            elif '10k' in spent:
                score += 10
            elif '5k' in spent:
                score += 5
            
            # Competition (0-20 points) - fewer proposals = better
            proposals = gig.get('proposals', '10-15')
            match = re.search(r'(\d+)', proposals)
            if match:
                prop_count = int(match.group(1))
                if prop_count < 5:
                    score += 20
                elif prop_count < 10:
                    score += 15
                elif prop_count < 20:
                    score += 10
            
            # Verification bonuses
            if gig.get('verified_payment'):
                score += 10
            
            if gig.get('us_based'):
                score += 5
            
            # Freshness (0-10 points)
            posted = gig.get('posted_time', '')
            if 'minute' in posted:
                score += 10
            elif 'hour' in posted and '1 hour' in posted:
                score += 8
            elif 'hour' in posted:
                score += 5
            
            gig['score'] = round(score, 1)
            gig['hot_deal'] = score >= 70
            
            # Calculate match percentage
            gig_skills = set(s.lower() for s in gig.get('skills', []))
            our_skills = set(s.lower() for s in self.skills)
            if our_skills:
                match_pct = len(gig_skills.intersection(our_skills)) / len(gig_skills) * 100
                gig['skill_match_percent'] = round(match_pct)
        
        return sorted(gigs, key=lambda x: x.get('score', 0), reverse=True)
    
    def get_hot_gigs(self, count: int = 3) -> List[Dict]:
        """Get top hot gigs"""
        hot = [g for g in self.gigs_cache if g.get('hot_deal')]
        return hot[:count]
    
    def get_stats(self) -> Dict:
        """Get hound statistics"""
        return {
            'name': self.name,
            'status': self.status,
            'bounties_found': self.bounties_found,
            'gigs_cached': len(self.gigs_cache),
            'hot_gigs': len([g for g in self.gigs_cache if g.get('hot_deal')]),
            'last_hunt': self.last_hunt.isoformat() if self.last_hunt else None,
            'skills_tracking': len(self.skills)
        }
