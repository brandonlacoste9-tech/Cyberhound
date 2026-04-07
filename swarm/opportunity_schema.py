"""
Shared opportunity normalization for Cyberhound hounds.

The swarm currently mixes deal, gig, and bounty shapes.
This module creates one common output contract while remaining
backwards-compatible with the existing dashboard/manager code.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Iterable, Optional
import re


def _slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def normalize_opportunity(
    raw: Dict[str, Any],
    *,
    category: str,
    platform: str,
    source_kind: str,
    verified: bool = False,
) -> Dict[str, Any]:
    """Normalize any hunted item into the shared Cyberhound schema."""

    title = (
        raw.get("title")
        or raw.get("task")
        or raw.get("brand")
        or raw.get("name")
        or "Untitled Opportunity"
    )
    description = raw.get("description") or raw.get("summary") or ""
    tags = raw.get("tags") or raw.get("skills") or []
    if not isinstance(tags, list):
        tags = [str(tags)]

    created_at = raw.get("created_at") or raw.get("posted_at") or raw.get("timestamp")
    if isinstance(created_at, datetime):
        created_at = created_at.isoformat()

    normalized = dict(raw)
    normalized.update({
        "id": raw.get("id") or f"{source_kind}_{_slug(title)[:32]}",
        "title": title,
        "description": description,
        "platform": raw.get("platform") or platform,
        "category": raw.get("category") or category,
        "source_kind": source_kind,
        "url": raw.get("url") or raw.get("platform_url") or "#",
        "tags": tags,
        "skills": raw.get("skills") or tags,
        "reward": raw.get("reward"),
        "reward_type": raw.get("reward_type"),
        "reward_amount": raw.get("reward_amount") or raw.get("bounty_amount"),
        "reward_currency": raw.get("reward_currency") or raw.get("currency"),
        "original_price": raw.get("original_price"),
        "deal_price": raw.get("deal_price"),
        "discount_percent": raw.get("discount_percent", 0),
        "deal_type": raw.get("deal_type"),
        "difficulty": raw.get("difficulty"),
        "time_estimate": raw.get("time_estimate") or raw.get("estimated_duration"),
        "expires": raw.get("expires"),
        "posted_at": created_at,
        "score": raw.get("score", 0),
        "hot_deal": raw.get("hot_deal", False),
        "verified": raw.get("verified", verified),
        "image": raw.get("image"),
        "metadata": raw.get("metadata", {}),
    })

    return normalized


def price_pair_from_text(text: str) -> tuple[Optional[float], Optional[float]]:
    """Extract a simple price pair from strings like '$39 $100'."""
    if not text:
        return None, None

    matches = re.findall(r"\$\s*([0-9]+(?:\.[0-9]{1,2})?)", text)
    if len(matches) >= 2:
        first = float(matches[0])
        second = float(matches[1])
        return second, first  # original, deal
    if len(matches) == 1:
        only = float(matches[0])
        return None, only
    return None, None


def infer_tags(*values: Iterable[str] | str | None) -> list[str]:
    out: list[str] = []
    for value in values:
        if value is None:
            continue
        if isinstance(value, str):
            tokens = re.findall(r"[A-Za-z0-9+#.]+", value.lower())
            out.extend(tokens[:8])
        else:
            for item in value:
                if item:
                    out.append(str(item).lower())
    deduped: list[str] = []
    for token in out:
        if token not in deduped:
            deduped.append(token)
    return deduped[:12]


def dedupe_opportunities(items: list[Dict[str, Any]]) -> list[Dict[str, Any]]:
    """Deduplicate normalized opportunities by URL, then title/platform."""
    deduped: list[Dict[str, Any]] = []
    seen: set[str] = set()

    for item in items:
        url = str(item.get("url") or "").strip().lower()
        title = str(item.get("title") or "").strip().lower()
        platform = str(item.get("platform") or "").strip().lower()
        key = url or f"{platform}::{title}"
        if not key or key in seen:
            continue
        seen.add(key)
        deduped.append(item)

    return deduped
