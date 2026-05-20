"""
Hermes AI Client — Centralized OpenAI-compatible LLM interface for Cyberhound.

Supports: DeepSeek, OpenRouter, custom OpenAI-compatible endpoints.
Configure via .env or environment variables.

Env vars:
  HERMES_BASE_URL   — API base URL (default: https://api.deepseek.com/v1)
  HERMES_API_KEY    — API key (falls back to DEEPSEEK_API_KEY)
  HERMES_MODEL      — Model name (default: deepseek-chat)
  HERMES_MAX_MODEL  — Heavy reasoning model (default: deepseek-reasoner)
"""

import os
import json
import time
import requests
from typing import Optional, Dict, Any, List
from dotenv import load_dotenv

load_dotenv(".env.local")
load_dotenv(".env")

# ── Configuration ────────────────────────────────────────────────────────────

BASE_URL = os.getenv("HERMES_BASE_URL", "https://api.deepseek.com/v1")
API_KEY = os.getenv("HERMES_API_KEY") or os.getenv("DEEPSEEK_API_KEY", "")
STANDARD_MODEL = os.getenv("HERMES_MODEL", "deepseek-chat")
MAX_MODEL = os.getenv("HERMES_MAX_MODEL", "deepseek-reasoner")

MAX_RETRIES = 3
RETRY_DELAY = 2  # seconds


# ── Core Client ──────────────────────────────────────────────────────────────

def _call_api(
    messages: List[Dict[str, str]],
    model: str = None,
    temperature: float = 0.7,
    max_tokens: int = 2048,
    response_format: Optional[Dict] = None,
) -> Dict[str, Any]:
    """Low-level API call with retry logic."""
    if not API_KEY:
        raise RuntimeError(
            "HERMES_API_KEY or DEEPSEEK_API_KEY not set. "
            "Add to .env: HERMES_API_KEY=sk-..."
        )

    model = model or STANDARD_MODEL
    endpoint = f"{BASE_URL.rstrip('/')}/chat/completions"

    payload: Dict[str, Any] = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    if response_format:
        payload["response_format"] = response_format

    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json",
    }

    last_error = None
    for attempt in range(MAX_RETRIES):
        try:
            response = requests.post(
                endpoint, headers=headers, json=payload, timeout=60
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            last_error = e
            if attempt < MAX_RETRIES - 1:
                wait = RETRY_DELAY * (2**attempt)
                print(f"  ⚠️  API call failed (attempt {attempt+1}/{MAX_RETRIES}), "
                      f"retrying in {wait}s...")
                time.sleep(wait)

    raise RuntimeError(f"Hermes API call failed after {MAX_RETRIES} attempts: {last_error}")


# ── High-Level Methods ───────────────────────────────────────────────────────

def chat(
    prompt: str,
    system: str = "You are a helpful AI assistant.",
    model: str = None,
    temperature: float = 0.7,
    max_tokens: int = 2048,
) -> str:
    """Simple chat completion. Returns text response."""
    result = _call_api(
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ],
        model=model,
        temperature=temperature,
        max_tokens=max_tokens,
    )
    return result["choices"][0]["message"]["content"]


def chat_json(
    prompt: str,
    system: str = "You are a helpful AI assistant. Always respond with valid JSON.",
    model: str = None,
    temperature: float = 0.3,
    max_tokens: int = 2048,
) -> Dict[str, Any]:
    """Chat completion that returns parsed JSON."""
    result = _call_api(
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ],
        model=model,
        temperature=temperature,
        max_tokens=max_tokens,
        response_format={"type": "json_object"},
    )
    content = result["choices"][0]["message"]["content"]
    return json.loads(content)


def deep_reason(
    prompt: str,
    system: str = "You are an expert analyst. Think deeply before responding.",
    max_tokens: int = 4096,
) -> str:
    """Use the MAX model for heavy reasoning tasks."""
    return chat(
        prompt=prompt,
        system=system,
        model=MAX_MODEL,
        temperature=0.3,
        max_tokens=max_tokens,
    )


# ── Cyberhound-Specific Methods ──────────────────────────────────────────────

def research_market(
    niche: str,
    market: str = "North America",
) -> Dict[str, Any]:
    """
    Deep market research for a niche in a target market.
    Returns: score, demand_signals, competition_level, mrr_potential, price_point, reasoning
    """
    prompt = f"""
    You are an autonomous market research agent. Deep-dive on the '{niche}' niche in '{market}'.
    Search the web, analyze competitor pricing, and evaluate market demand.

    Return ONLY a valid JSON object with these exact keys:
    - score (integer 0-100): overall opportunity score
    - demand_signals (list of strings): evidence of market demand
    - competition_level ("low", "medium", or "high")
    - estimated_mrr_potential (string, e.g. "$5K-$20K/mo")
    - recommended_price_point (string)
    - reasoning (string): strategic analysis paragraph
    """
    return chat_json(
        prompt=prompt,
        system="You are an expert market analyst and research agent.",
        temperature=0.3,
        max_tokens=2048,
    )


def score_lead(
    company_name: str,
    website: str = "",
    industry: str = "",
    signals: List[str] = None,
) -> Dict[str, Any]:
    """
    Score a lead for outreach priority.
    Returns: icp_score, risk_level, recommended_tone, key_selling_points, reasoning
    """
    signals_str = "\n".join(f"- {s}" for s in (signals or []))
    prompt = f"""
    Analyze this lead for outreach scoring:

    Company: {company_name}
    Website: {website or 'N/A'}
    Industry: {industry or 'Unknown'}
    Signals detected:
    {signals_str or 'None'}

    Return valid JSON:
    - icp_score (integer 0-100): Ideal Customer Profile fit score
    - risk_level ("low", "medium", or "high"): regulatory/compliance risk
    - recommended_tone (string): suggested email tone (formal, casual, technical, consultative)
    - key_selling_points (list of strings): 3-5 points to emphasize
    - reasoning (string): brief strategic analysis
    """
    return chat_json(
        prompt=prompt,
        system="You are an expert B2B sales strategist and lead qualifier.",
        temperature=0.4,
        max_tokens=1500,
    )


def generate_email(
    to_name: str,
    company_name: str,
    sender_name: str = "Northern Ventures Intelligence Division",
    sender_email: str = "",
    phone: str = "",
    icp_score: int = 70,
    risk_level: str = "medium",
    selling_points: List[str] = None,
    tone: str = "consultative",
    touch_number: int = 1,
    previous_reply: str = "",
) -> Dict[str, str]:
    """
    Generate a personalized outreach email.
    Returns: { subject, body }
    """
    points_str = "\n".join(f"- {p}" for p in (selling_points or []))

    touch_context = {
        1: "This is the FIRST outreach email. Introduce yourself and the value proposition. Include the key selling points.",
        2: "This is a FOLLOW-UP email (Touch 2). Reference the previous email. Add urgency. Softer ask.",
        3: "This is the FINAL follow-up (Touch 3). Be direct. Include a clear call to action. This is the last attempt.",
        4: "This is an AUTO-REPLY to a response from the prospect. They wrote: " + (previous_reply or "asking for more info") + ". Be helpful and move toward a call."
    }

    prompt = f"""
    Generate a personalized B2B sales email.

    TARGET:
    - Name: {to_name}
    - Company: {company_name}
    - ICP Score: {icp_score}/100
    - Risk Level: {risk_level}

    SELLING POINTS:
    {points_str or '- AI-powered compliance & growth solutions'}

    SENDER:
    - Name: {sender_name}
    - Email: {sender_email or 'N/A'}
    - Phone: {phone or 'N/A'}

    TONE: {tone}
    CONTEXT: {touch_context.get(touch_number, touch_context[1])}

    RULES:
    - Keep it under 150 words
    - No generic fluff — reference specifics about their company
    - Include a single clear call to action
    - Sign off as: {sender_name.split()[0] if ' ' in sender_name else sender_name}

    Return valid JSON:
    - subject (string): email subject line
    - body (string): plain text email body
    """
    return chat_json(
        prompt=prompt,
        system="You are an expert B2B sales copywriter. Write concise, effective cold outreach emails.",
        temperature=0.7,
        max_tokens=1500,
    )


def analyze_reply(
    reply_text: str,
    original_context: str = "",
) -> Dict[str, Any]:
    """
    Analyze a prospect's reply to determine sentiment and next action.
    Returns: sentiment, intent, should_respond, suggested_response_type, confidence
    """
    prompt = f"""
    Analyze this prospect's reply to our outreach email:

    ORIGINAL CONTEXT:
    {original_context or 'Cold outreach email about AI/compliance services'}

    PROSPECT REPLY:
    {reply_text}

    Classify the reply and return JSON:
    - sentiment ("positive", "neutral", "negative", "out_of_office", "bounce")
    - intent ("interested", "not_interested", "wrong_person", "more_info", "meeting_request", "other")
    - should_respond (boolean)
    - suggested_response_type (string, e.g. "schedule_call", "send_more_info", "polite_close", "none")
    - confidence (float 0-1)
    - brief (string): one-line summary for the dashboard
    """
    return chat_json(
        prompt=prompt,
        system="You are an expert sales analyst. Classify prospect replies accurately.",
        temperature=0.2,
        max_tokens=800,
    )


# ── Health Check ─────────────────────────────────────────────────────────────

def ping() -> Dict[str, Any]:
    """Quick connectivity check."""
    start = time.time()
    try:
        result = _call_api(
            messages=[{"role": "user", "content": "Reply with the single word: PONG"}],
            max_tokens=10,
            temperature=0,
        )
        return {
            "ok": True,
            "model": result.get("model", "unknown"),
            "latency_ms": int((time.time() - start) * 1000),
        }
    except Exception as e:
        return {"ok": False, "error": str(e)}
