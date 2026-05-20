"""
AI Email Envoy — Hermes-powered personalized email generation.

Replaces hardcoded templates with AI-generated emails
tailored to each lead's ICP score, risk level, and context.
"""

import os
import sys
import json
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hermes_client import generate_email as ai_generate_email, score_lead

# Fallback to email_envoy v2 for SMTP sending
from cyberhound.email_envoy_v2 import (
    _send_html,
    fire_touch_1,
    fire_touch_2,
    fire_touch_3,
    fire_reply_autoresponse,
    fire_post_call,
)


def ai_generate_touch(
    target_email: str,
    target_name: str,
    company_name: str = "",
    icp_score: int = None,
    risk_level: str = None,
    selling_points: list = None,
    tone: str = "consultative",
    touch_number: int = 1,
    send: bool = False,
) -> dict:
    """
    Generate and optionally send an AI-personalized email.

    Args:
        target_email: Recipient email
        target_name: Recipient name
        company_name: Company name for personalization
        icp_score: Pre-computed ICP score (will auto-score if None)
        risk_level: Pre-computed risk level
        selling_points: Key points to emphasize
        tone: Email tone
        touch_number: 1, 2, or 3
        send: If True, send via SMTP immediately

    Returns: { subject, body, icp_score, risk_level, sent }
    """
    # Auto-score if not provided
    if icp_score is None or risk_level is None:
        try:
            lead_score = score_lead(
                company_name=company_name or target_name,
                industry="technology",
            )
            icp_score = icp_score or lead_score.get("icp_score", 70)
            risk_level = risk_level or lead_score.get("risk_level", "medium")
            if not selling_points:
                selling_points = lead_score.get("key_selling_points", [])
            if tone == "consultative":
                tone = lead_score.get("recommended_tone", "consultative")
        except Exception as e:
            print(f"  ⚠️  Auto-scoring failed: {e}, using defaults")
            icp_score = icp_score or 70
            risk_level = risk_level or "medium"

    # Generate the email
    email = ai_generate_email(
        to_name=target_name,
        company_name=company_name or target_name,
        icp_score=icp_score,
        risk_level=risk_level,
        selling_points=selling_points or [],
        tone=tone,
        touch_number=touch_number,
    )

    result = {
        "subject": email.get("subject", ""),
        "body": email.get("body", ""),
        "icp_score": icp_score,
        "risk_level": risk_level,
        "touch_number": touch_number,
        "generated_at": datetime.now().isoformat(),
        "sent": False,
    }

    # Optionally send
    if send and target_email:
        subject = email.get("subject", f"Strategic Advisory: {target_name}")
        body_html = f"<html><body style='font-family:Georgia,serif;color:#e8e0d0;max-width:600px;'><pre style='white-space:pre-wrap;font-family:Georgia,serif;font-size:14px;line-height:1.6;'>{email.get('body', '')}</pre></body></html>"

        success = _send_html(target_email, target_name, subject, body_html)
        result["sent"] = success
        if success:
            print(f"  ✅ AI Email sent → {target_name} (ICP: {icp_score}/100)")
        else:
            print(f"  ❌ Failed to send to {target_name}")

    return result


def ai_send_sequence(
    target_email: str,
    target_name: str,
    company_name: str = "",
    start_touch: int = 1,
    max_touches: int = 3,
    interval_days: int = 3,
) -> list:
    """
    Generate and send a full outreach sequence.
    Returns list of results for each touch.
    """
    results = []

    # Score once and reuse
    lead_score = None
    try:
        lead_score = score_lead(company_name or target_name, industry="technology")
        print(f"  📊 Lead scored: {lead_score.get('icp_score')}/100 ICP")
    except Exception as e:
        print(f"  ⚠️  Scoring failed: {e}")

    for touch in range(start_touch, max_touches + 1):
        print(f"\n  ✉️  Generating Touch {touch}/{max_touches}...")
        result = ai_generate_touch(
            target_email=target_email,
            target_name=target_name,
            company_name=company_name,
            icp_score=lead_score.get("icp_score") if lead_score else None,
            risk_level=lead_score.get("risk_level") if lead_score else None,
            selling_points=lead_score.get("key_selling_points") if lead_score else None,
            tone=lead_score.get("recommended_tone", "consultative") if lead_score else "consultative",
            touch_number=touch,
            send=(touch == start_touch),  # Only send the first touch immediately
        )
        results.append(result)

    return results


# ── CLI ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("🐺 AI Email Envoy — Hermes-Powered Outreach")
    print("=" * 60)
    print("\nUsage:")
    print("  from cyberhound.ai_email_envoy import ai_generate_touch")
    print("  result = ai_generate_touch(")
    print("      target_email='prospect@company.com',")
    print("      target_name='John Smith',")
    print("      company_name='Acme Corp',")
    print("      send=True")
    print("  )")
