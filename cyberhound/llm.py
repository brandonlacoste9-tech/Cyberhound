"""
CyberHound Unified LLM Client
=============================
Mirrors the TypeScript client in apps/web/src/lib/llm/client.ts for consistency.

Priority (same as web):
1. OpenClaw Gateway (local or remote OpenAI-compatible) — if OPENCLAW_BASE_URL set or in dev
2. DeepSeek (primary cloud)
3. Fallback to existing router (Ollama / Vertex) for flexibility

Usage:
    from cyberhound.llm import chat, ask

    text = await chat(...)   # or sync version
    or
    text = ask("user prompt", system="...")

Both sync and async variants provided.
"""

import json
import os
from typing import Any, Dict, List, Optional

import requests

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

# --- Config ---
OPENCLAW_BASE = os.getenv("OPENCLAW_BASE_URL", "http://localhost:18790/v1")
OPENCLAW_MODEL = os.getenv("OPENCLAW_MODEL", "default")
OPENCLAW_TOKEN = os.getenv("OPENCLAW_GATEWAY_TOKEN", "openclaw")

DEEPSEEK_BASE = "https://api.deepseek.com/v1"
DEEPSEEK_KEY = os.getenv("DEEPSEEK_API_KEY", "")

# Ollama (local) - set OLLAMA_HOST or AI_PROVIDER=ollama
OLLAMA_BASE = (os.getenv("OLLAMA_HOST") or os.getenv("OLLAMA_BASE_URL") or "http://localhost:11434/v1").rstrip("/")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")
OLLAMA_ENABLED = bool(os.getenv("OLLAMA_HOST") or os.getenv("OLLAMA_BASE_URL")) or os.getenv("AI_PROVIDER", "").lower() in ("ollama", "local")

# Legacy router (keep for full flexibility)
from .intelligence.llm_router import generate_text, generate_json as _legacy_generate_json

# ---------------------------------------------------------
# Core chat / ask (OpenAI compatible)
# ---------------------------------------------------------

def _get_openclaw_client():
    return {
        "base_url": OPENCLAW_BASE,
        "api_key": OPENCLAW_TOKEN,
        "model": OPENCLAW_MODEL,
    }

def _get_deepseek_client():
    if not DEEPSEEK_KEY:
        raise RuntimeError("DEEPSEEK_API_KEY is required for DeepSeek fallback")
    return {
        "base_url": DEEPSEEK_BASE,
        "api_key": DEEPSEEK_KEY,
        "model": "deepseek-chat",
    }

def _call_openai_compatible(
    messages: List[Dict[str, str]],
    base_url: str,
    api_key: str,
    model: str,
    temperature: float = 0.7,
    max_tokens: int = 2048,
    response_format: Optional[Dict] = None,
    timeout: int = 120,
) -> str:
    url = f"{base_url.rstrip('/')}/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload: Dict[str, Any] = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    if response_format:
        payload["response_format"] = response_format

    resp = requests.post(url, headers=headers, json=payload, timeout=timeout)
    resp.raise_for_status()
    data = resp.json()
    return data["choices"][0]["message"]["content"] or ""

def chat(
    messages: List[Dict[str, str]],
    temperature: float = 0.7,
    max_tokens: int = 2048,
    response_format: Optional[Dict] = None,
    timeout: int = 120,
) -> str:
    """
    Unified chat with Ollama support for fully local/autonomous runs.

    Priority:
      1. Ollama (if OLLAMA_HOST set or AI_PROVIDER=ollama)
      2. OpenClaw
      3. DeepSeek
      4. Legacy router (Ollama/Vertex/etc)
    """
    # --- 1. Ollama (local, free, great for autonomous mode) ---
    if OLLAMA_ENABLED:
        try:
            text = _call_openai_compatible(
                messages,
                OLLAMA_BASE,
                "ollama",  # Ollama ignores the key
                OLLAMA_MODEL,
                temperature,
                max_tokens,
                response_format,
                timeout,
            )
            if text:
                print(f"[LLM] ✓ Ollama ({OLLAMA_MODEL})")
                return text.strip()
        except Exception as e:
            print(f"[LLM] Ollama failed: {e}")

    # --- 2. OpenClaw ---
    try_openclaw = (
        os.getenv("NODE_ENV") == "development"
        or bool(os.getenv("OPENCLAW_BASE_URL"))
    )
    if try_openclaw:
        try:
            cfg = _get_openclaw_client()
            text = _call_openai_compatible(
                messages, cfg["base_url"], cfg["api_key"], cfg["model"],
                temperature, max_tokens, response_format, timeout
            )
            if text:
                print("[LLM] ✓ OpenClaw (python)")
                return text.strip()
        except Exception as e:
            print(f"[LLM] OpenClaw failed: {e}")

    # --- 3. DeepSeek ---
    if DEEPSEEK_KEY:
        try:
            cfg = _get_deepseek_client()
            text = _call_openai_compatible(
                messages, cfg["base_url"], cfg["api_key"], cfg["model"],
                temperature, max_tokens, response_format, timeout
            )
            if text:
                print("[LLM] ✓ DeepSeek (python)")
                return text.strip()
        except Exception as e:
            print(f"[LLM] DeepSeek failed: {e}")

    # --- 4. Final fallback ---
    print("[LLM] Falling back to legacy router")
    system = next((m["content"] for m in messages if m["role"] == "system"), None)
    user = next((m["content"] for m in messages if m["role"] == "user"), "")
    prompt = f"{system}\n\n{user}" if system else user
    return generate_text(prompt, system=system).strip()


def ask(
    user_prompt: str,
    system_prompt: Optional[str] = None,
    **kwargs,
) -> str:
    """Convenience single-turn ask (matches web client)."""
    messages: List[Dict[str, str]] = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": user_prompt})
    return chat(messages, **kwargs)


def ask_json(
    user_prompt: str,
    system_prompt: Optional[str] = None,
    **kwargs,
) -> dict:
    """Ask and parse as JSON. Uses response_format when provider supports it."""
    messages: List[Dict[str, str]] = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": user_prompt})

    try:
        raw = chat(messages, response_format={"type": "json_object"}, **kwargs)
        return json.loads(raw)
    except Exception:
        # Fallback: ask legacy to parse
        prompt = f"{system_prompt}\n\n{user_prompt}" if system_prompt else user_prompt
        return _legacy_generate_json(prompt, system=system_prompt)


# Backwards compat exports
generate = ask
generate_json = ask_json

print("[cyberhound.llm] Unified LLM client loaded (Ollama → OpenClaw → DeepSeek → legacy)")