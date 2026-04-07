import json
import os
from typing import Optional

import requests

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

try:
    import vertexai
    from vertexai.generative_models import GenerativeModel
except Exception:
    vertexai = None
    GenerativeModel = None


AI_PROVIDER = os.getenv("CYBERHOUND_AI_PROVIDER", "auto").lower()
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434").rstrip("/")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:latest")
GOOGLE_CLOUD_PROJECT = os.getenv("GOOGLE_CLOUD_PROJECT", "zyeute-v3")
VERTEX_LOCATION = os.getenv("VERTEX_LOCATION", "us-central1")
DISABLE_PAID_FALLBACKS = (
    str(os.getenv("CYBERHOUND_DISABLE_PAID_FALLBACKS", "false")).lower() == "true"
)

_vertex_model = None
_vertex_init_attempted = False


def _get_vertex_model() -> Optional[object]:
    global _vertex_model, _vertex_init_attempted

    if _vertex_init_attempted:
        return _vertex_model

    _vertex_init_attempted = True
    if not vertexai or not GenerativeModel:
        return None

    try:
        vertexai.init(project=GOOGLE_CLOUD_PROJECT, location=VERTEX_LOCATION)
        _vertex_model = GenerativeModel("gemini-1.5-flash-001")
    except Exception as e:
        print(f"Warning: Vertex AI init failed: {e}")
        _vertex_model = None

    return _vertex_model


def ollama_generate(prompt: str, system: Optional[str] = None) -> str:
    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": 0.2},
    }
    if system:
        payload["system"] = system

    response = requests.post(
        f"{OLLAMA_HOST}/api/generate",
        json=payload,
        timeout=120,
    )
    response.raise_for_status()
    data = response.json()
    text = (data.get("response") or "").strip()
    if not text:
        raise RuntimeError("Ollama returned an empty response")
    return text


def vertex_generate(prompt: str) -> str:
    model = _get_vertex_model()
    if not model:
        raise RuntimeError("Vertex AI not initialized")
    response = model.generate_content(prompt)
    return response.text.strip()


def generate_text(prompt: str, system: Optional[str] = None) -> str:
    prefer_ollama = AI_PROVIDER in {"auto", "ollama", "ollama-first"}

    if prefer_ollama:
        try:
            return ollama_generate(prompt, system=system)
        except Exception as e:
            print(f"Warning: Ollama generation failed: {e}")
            if AI_PROVIDER == "ollama" and DISABLE_PAID_FALLBACKS:
                raise

    if not DISABLE_PAID_FALLBACKS:
        try:
            return vertex_generate(prompt)
        except Exception as e:
            print(f"Warning: Vertex generation failed: {e}")

    if not prefer_ollama:
        return ollama_generate(prompt, system=system)

    raise RuntimeError("No AI provider available")


def generate_json(prompt: str, system: Optional[str] = None) -> dict:
    raw = generate_text(prompt, system=system)
    cleaned = raw.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    if cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()
    return json.loads(cleaned)
