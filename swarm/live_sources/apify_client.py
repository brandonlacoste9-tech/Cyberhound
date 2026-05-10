"""Minimal Apify client for Cyberhound live-source upgrades."""

from __future__ import annotations

import os
from typing import Any, Dict, Iterable, List, Optional

import requests
from dotenv import load_dotenv

load_dotenv()

APIFY_API_KEY = os.getenv("APIFY_API_KEY")
APIFY_BASE_URL = os.getenv("APIFY_BASE_URL", "https://api.apify.com/v2")


class ApifyClient:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or APIFY_API_KEY

    @property
    def enabled(self) -> bool:
        return bool(self.api_key)

    def google_search(
        self,
        queries: str | Iterable[str],
        *,
        max_results: int = 10,
        max_pages_per_query: int = 1,
    ) -> List[Dict[str, Any]]:
        if not self.enabled:
            return []

        if isinstance(queries, str):
            queries_payload = queries
        else:
            queries_payload = "\n".join([q for q in queries if q])

        response = requests.post(
            f"{APIFY_BASE_URL}/acts/apify~google-search-scraper/run-sync-get-dataset-items",
            params={"token": self.api_key},
            headers={"Content-Type": "application/json"},
            json={
                "queries": queries_payload,
                "maxPagesPerQuery": max_pages_per_query,
                "resultsPerPage": min(max(max_results, 1), 10),
                "mobileResults": False,
                "includeUnfilteredResults": False,
            },
            timeout=90,
        )
        response.raise_for_status()
        payload = response.json()
        if not isinstance(payload, list):
            return []

        flattened: List[Dict[str, Any]] = []
        for query_result in payload:
            organic = query_result.get("organicResults") or []
            for item in organic:
                flattened.append(
                    {
                        "title": item.get("title"),
                        "url": item.get("url"),
                        "description": item.get("description"),
                        "displayed_url": item.get("displayedUrl"),
                        "position": item.get("position"),
                        "query": (query_result.get("searchQuery") or {}).get("term"),
                        "source": "apify_google_search",
                    }
                )
                if len(flattened) >= max_results:
                    return flattened

        return flattened


apify = ApifyClient()
