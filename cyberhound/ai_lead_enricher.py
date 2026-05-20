"""
AI Lead Enricher — Hermes-powered lead research and enrichment.

Finds executive emails, enriches lead profiles, and scores opportunities
using the Hermes AI client.
"""

import os
import sys
import json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hermes_client import score_lead, deep_reason


def enrich_lead(
    company_name: str,
    website: str = "",
    industry: str = "",
    signals: list = None,
) -> dict:
    """
    Enrich a lead with AI-powered analysis.

    Returns: {
        icp_score, risk_level, recommended_tone, key_selling_points,
        reasoning, market_position, estimated_budget
    }
    """
    print(f"🔍 [Enrich] Analyzing: {company_name}")

    # First pass: quick scoring
    lead_score = score_lead(company_name, website, industry, signals)

    # Second pass: deep analysis for high-value leads
    if lead_score.get("icp_score", 0) >= 60:
        try:
            deep_prompt = f"""
            You are a B2B sales intelligence analyst. Provide a strategic assessment of:

            Company: {company_name}
            Website: {website or 'N/A'}
            Industry: {industry or 'Unknown'}
            ICP Score: {lead_score.get('icp_score')}/100

            Return valid JSON with:
            - market_position (string): Their competitive position (leader, challenger, niche, unknown)
            - estimated_budget (string): Estimated budget range for AI/compliance services (e.g. "$5K-$15K/mo")
            - decision_maker_title (string): Most likely job title of the buyer
            - outreach_channel (string): Best channel to reach them (email, linkedin, phone)
            - timeline (string): Estimated buying timeline (immediate, 1-3mo, 3-6mo, 6+mo)
            - strategic_angle (string): Best angle for the pitch (1-2 sentences)
            """
            deep_analysis = deep_reason(deep_prompt)

            try:
                # Try to parse the deep analysis as JSON
                parsed = json.loads(deep_analysis)
                lead_score.update(parsed)
            except json.JSONDecodeError:
                # If not valid JSON, store as raw reasoning
                lead_score["deep_analysis"] = deep_analysis

        except Exception as e:
            print(f"  ⚠️  Deep analysis failed: {e}")
            lead_score["deep_analysis"] = f"Deep analysis unavailable: {e}"

    return lead_score


def batch_enrich(leads: list) -> list:
    """
    Enrich a batch of leads.
    Each lead should have: name, website, industry (optional)

    Returns the list with enrichment data added.
    """
    enriched = []
    for i, lead in enumerate(leads):
        print(f"\n[{i+1}/{len(leads)}] Enriching: {lead.get('name', 'Unknown')}")
        try:
            result = enrich_lead(
                company_name=lead.get("name", lead.get("company", "Unknown")),
                website=lead.get("website", ""),
                industry=lead.get("industry", ""),
                signals=lead.get("signals", []),
            )
            lead["enrichment"] = result
            lead["icp_score"] = result.get("icp_score")
        except Exception as e:
            print(f"  ❌ Enrichment failed: {e}")
            lead["enrichment"] = {"error": str(e)}

        enriched.append(lead)

    return enriched


def auto_find_contacts(
    company_name: str,
    domain: str = "",
) -> dict:
    """
    AI-powered contact finding. Uses Hermes reasoning to suggest
    likely email patterns and decision-maker titles.
    """
    prompt = f"""
    You are an expert at finding business contacts. For the company:

    Company: {company_name}
    Domain: {domain or 'unknown'}

    Suggest likely contact information:

    Return valid JSON:
    - likely_email_patterns (list of strings): e.g. ["first.last@{domain}", "first@{domain}"]
    - suggested_titles (list of strings): Job titles to target
    - linkedin_search_query (string): Best LinkedIn search to find decision makers
    - notes (string): Any additional lead gen advice
    """
    return deep_reason(prompt)


# ── CLI ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("🐺 AI Lead Enricher — Hermes-Powered Intelligence")
    print("=" * 60)
    print("\nUsage:")
    print("  from cyberhound.ai_lead_enricher import enrich_lead, batch_enrich")
    print("  result = enrich_lead('Acme Corp', 'acme.com', 'SaaS')")
