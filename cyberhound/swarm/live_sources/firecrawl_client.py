"""Minimal Firecrawl client for Cyberhound live-source upgrades."""

from __future__ import annotations

import os
from typing import Any, Dict, List, Optional

import requests
from dotenv import load_dotenv

load_dotenv()

FIRECRAWL_API_KEY = os.getenv("FIRECRAWL_API_KEY")
FIRECRAWL_BASE_URL = os.getenv("FIRECRAWL_BASE_URL", "https://api.firecrawl.dev/v1")


class FirecrawlClient:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or FIRECRAWL_API_KEY

    @property
    def enabled(self) -> bool:
        return bool(self.api_key)

    def search(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        if not self.enabled:
            return []

        response = requests.post(
            f"{FIRECRAWL_BASE_URL}/search",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}",
            },
            json={"query": query, "limit": limit},
            timeout=45,
        )
        response.raise_for_status()
        payload = response.json()
        return payload.get("data", []) if isinstance(payload, dict) else []


firecrawl = FirecrawlClient()
