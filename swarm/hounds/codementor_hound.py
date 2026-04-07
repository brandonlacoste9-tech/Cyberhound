"""
CodementorHound - Specialized agent for live coding-help demand signals.
"""

import re
from datetime import datetime
from typing import Dict, List, Optional

from .base_hound import BaseHound
from ..live_sources import apify, firecrawl
from ..opportunity_schema import dedupe_opportunities, infer_tags, normalize_opportunity


class CodementorHound(BaseHound):
    """
    The live-coding help hunter.

    Uses live search results from Codementor skill/expert pages to detect
    active demand channels for debugging, mentoring, tutoring, and code review.
    """

    def __init__(self, config: Dict = None):
        config = config or {}
        super().__init__(
            name="CodementorHound",
            category="mentoring",
            config=config,
        )
        self.requests_cache: List[Dict] = []
        self.skills = config.get(
            "skills",
            ["python", "react", "typescript", "debugging", "docker"],
        )
        self.max_results = config.get("max_results", 8)

    async def hunt(self, filters: Optional[Dict] = None) -> List[Dict]:
        self.status = "HUNTING"
        self.last_hunt = datetime.now()

        live_requests = await self._hunt_live_codementor(filters)
        if live_requests:
            filtered = self._filter_requests(live_requests, filters)
            scored = self._score_requests(filtered)
            self.requests_cache = scored[:15]
            self.bounties_found += len(scored)
            self.status = "RESTING"
            return scored

        fallback_requests = [
            normalize_opportunity(
                {
                    "id": "cm_001",
                    "title": "React Authentication Bug - Can't login with Google OAuth",
                    "description": "User reports unable to login. Firebase auth setup seems correct but getting error 400.",
                    "platform": "Codementor",
                    "url": "https://codementor.io/requests/react-auth-bug",
                    "skills": ["react", "firebase", "oauth"],
                    "reward_type": "hourly",
                    "reward_amount": 80,
                    "reward_currency": "USD",
                    "urgency": "high",
                    "time_estimate": "1-2 hours",
                    "posted_at": "2026-02-26T18:00:00+00:00",
                },
                category="mentoring",
                platform="Codementor",
                source_kind="fallback_mock",
            ),
            normalize_opportunity(
                {
                    "id": "cm_002",
                    "title": "Python Data Processing Script Slow",
                    "description": "Need to optimize pandas script processing 1M+ rows. Currently takes 30 mins.",
                    "platform": "Codementor",
                    "url": "https://codementor.io/requests/python-optimize",
                    "skills": ["python", "pandas", "performance"],
                    "reward_type": "hourly",
                    "reward_amount": 120,
                    "reward_currency": "USD",
                    "urgency": "medium",
                    "time_estimate": "1-2 hours",
                    "posted_at": "2026-02-26T17:30:00+00:00",
                },
                category="mentoring",
                platform="Codementor",
                source_kind="fallback_mock",
            ),
        ]

        filtered = self._filter_requests(fallback_requests, filters)
        scored = self._score_requests(filtered)
        self.requests_cache = scored[:15]
        self.bounties_found += len(scored)
        self.status = "RESTING"
        return scored

    async def _hunt_live_codementor(self, filters: Optional[Dict] = None) -> List[Dict]:
        search_skills = (filters or {}).get("skills") or self.skills[:4]
        queries = [f"site:codementor.io {skill} experts codementor help" for skill in search_skills]

        results: List[Dict] = []
        source_kind = None

        if apify.enabled:
            try:
                results = apify.google_search(queries, max_results=self.max_results)
                source_kind = "apify_google_search"
            except Exception as e:
                print(f"[WARN] {self.name}: Apify Codementor search failed: {e}")

        if not results and firecrawl.enabled:
            try:
                merged: List[Dict] = []
                for query in queries[:3]:
                    merged.extend(firecrawl.search(query, limit=3))
                results = merged
                source_kind = "firecrawl_search"
            except Exception as e:
                print(f"[WARN] {self.name}: Firecrawl Codementor search failed: {e}")
                return []

        opportunities: List[Dict] = []
        for idx, item in enumerate(results):
            url = item.get("url", "")
            if "codementor.io" not in url:
                continue

            title = item.get("title") or "Codementor help signal"
            description = item.get("description") or ""
            skills = infer_tags(title, description)
            text_blob = f"{title} {description}".lower()

            urgency = "high" if "6 minutes" in text_blob or "asap" in text_blob else "medium"
            reward_amount = 90
            reward_match = re.search(r"\$\s*([0-9]{2,4})", description.replace(",", ""))
            if reward_match:
                reward_amount = int(reward_match.group(1))

            opportunities.append(
                normalize_opportunity(
                    {
                        "id": f"cm_live_{idx}",
                        "title": title,
                        "description": description,
                        "platform": "Codementor",
                        "url": url,
                        "skills": skills,
                        "reward_type": "hourly",
                        "reward_amount": reward_amount,
                        "reward_currency": "USD",
                        "urgency": urgency,
                        "time_estimate": "live / short session",
                        "metadata": {
                            "source": "apify" if source_kind == "apify_google_search" else "firecrawl",
                            "query": item.get("query"),
                        },
                    },
                    category="mentoring",
                    platform="Codementor",
                    source_kind=source_kind or "live_search",
                    verified=True,
                )
            )

        return dedupe_opportunities(opportunities)

    def _filter_requests(self, requests: List[Dict], filters: Optional[Dict]) -> List[Dict]:
        filtered: List[Dict] = []
        requested_skills = set(s.lower() for s in (filters or {}).get("skills", []))
        our_skills = set(s.lower() for s in self.skills)

        for request in requests:
            req_skills = set(s.lower() for s in request.get("skills", []))
            if requested_skills and not req_skills.intersection(requested_skills):
                continue
            if req_skills and not req_skills.intersection(our_skills):
                if request.get("source_kind") not in {"apify_google_search", "firecrawl_search"}:
                    continue
            filtered.append(request)

        return filtered

    def _score_requests(self, requests: List[Dict]) -> List[Dict]:
        for request in requests:
            score = 35

            reward = request.get("reward_amount") or 0
            score += min(float(reward) * 0.15, 25)

            urgency = str(request.get("urgency") or "").lower()
            if urgency == "high":
                score += 20
            elif urgency == "medium":
                score += 10

            req_skills = set(s.lower() for s in request.get("skills", []))
            our_skills = set(s.lower() for s in self.skills)
            matches = req_skills.intersection(our_skills)
            score += min(len(matches) * 6, 18)

            if request.get("verified"):
                score += 8

            request["score"] = round(score, 1)
            request["hot_deal"] = score >= 70
            request["skill_match_percent"] = round(
                (len(matches) / len(req_skills) * 100) if req_skills else 0
            )

        return sorted(requests, key=lambda x: x.get("score", 0), reverse=True)

    def get_hot_requests(self, count: int = 3) -> List[Dict]:
        hot = [r for r in self.requests_cache if r.get("hot_deal")]
        return hot[:count]

    def get_stats(self) -> Dict:
        return {
            "name": self.name,
            "status": self.status,
            "bounties_found": self.bounties_found,
            "requests_cached": len(self.requests_cache),
            "hot_requests": len([r for r in self.requests_cache if r.get("hot_deal")]),
            "last_hunt": self.last_hunt.isoformat() if self.last_hunt else None,
            "skills_tracking": len(self.skills),
        }
