"""
Gemini client wrapper — single place to swap models or providers later.
All LLM calls in the app go through here; never call genai directly elsewhere.
"""
import asyncio
import json
import re
from typing import Any

from google import genai
from google.genai import types
from google.api_core.exceptions import ResourceExhausted

from ...core.config import get_settings

_client: genai.Client | None = None

_RETRY_DELAYS = [60, 120, 300]  # seconds between retries on rate limit


def get_client() -> genai.Client:
    global _client
    if _client is None:
        settings = get_settings()
        _client = genai.Client(api_key=settings.gemini_api_key)
    return _client


async def generate_json(
    prompt: str,
    model: str | None = None,
    temperature: float = 0.1,
) -> dict[str, Any]:
    """
    Send a prompt expecting JSON back.
    Uses response_mime_type=application/json to force valid JSON from Gemini.
    Retries on 429 rate-limit with exponential backoff.
    """
    settings = get_settings()
    model = model or settings.gemini_model
    client = get_client()

    last_error: Exception | None = None
    for attempt, delay in enumerate([0] + _RETRY_DELAYS):
        if delay:
            print(f"    Rate limited — waiting {delay}s before retry {attempt}...")
            await asyncio.sleep(delay)
        try:
            response = client.models.generate_content(
                model=model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=temperature,
                    max_output_tokens=65536,
                    response_mime_type="application/json",
                ),
            )
            return _parse_json_response(response.text)
        except ResourceExhausted as e:
            last_error = e
            continue
        except Exception as e:
            # Non-rate-limit errors — check if it's a 429 wrapped differently
            if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                last_error = e
                continue
            raise

    raise RuntimeError(f"Gemini rate limit exceeded after {len(_RETRY_DELAYS)} retries: {last_error}")


async def generate(
    prompt: str,
    model: str | None = None,
    temperature: float = 0.1,
) -> str:
    """Send a prompt and return raw text (non-JSON use cases)."""
    settings = get_settings()
    model = model or settings.gemini_model
    client = get_client()

    last_error: Exception | None = None
    for attempt, delay in enumerate([0] + _RETRY_DELAYS):
        if delay:
            await asyncio.sleep(delay)
        try:
            response = client.models.generate_content(
                model=model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=temperature,
                    max_output_tokens=65536,
                ),
            )
            return response.text
        except Exception as e:
            if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                last_error = e
                continue
            raise

    raise RuntimeError(f"Gemini rate limit exceeded after retries: {last_error}")


def _parse_json_response(raw: str) -> dict[str, Any]:
    """Strip markdown fences if present and parse JSON."""
    text = raw.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        raise ValueError(f"Gemini returned invalid JSON.\nRaw (first 500):\n{raw[:500]}\nError: {e}")
