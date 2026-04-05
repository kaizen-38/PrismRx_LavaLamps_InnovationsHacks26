"""
AWS Bedrock client — drop-in replacement for gemini_client.py.
Uses Claude via Bedrock with bearer token auth (AWS_BEARER_TOKEN_BEDROCK env var).
All LLM calls in the ingest pipeline route through here.
"""
import asyncio
import json
import os
import re
from typing import Any

import boto3
from botocore.config import Config

from ...core.config import get_settings

# Set auth env var at import time so it's available in thread-pool workers
_settings = get_settings()
if _settings.aws_bearer_token_bedrock:
    os.environ["AWS_BEARER_TOKEN_BEDROCK"] = _settings.aws_bearer_token_bedrock


def _make_client():
    settings = get_settings()
    return boto3.client(
        "bedrock-runtime",
        region_name=settings.aws_region,
        config=Config(
            read_timeout=300,
            connect_timeout=30,
            retries={"max_attempts": 3, "mode": "adaptive"},
        ),
    )


async def generate_json(
    prompt: str,
    model: str | None = None,
    temperature: float = 0.1,
) -> dict[str, Any]:
    """Send a prompt expecting JSON back. Mirrors gemini_client.generate_json."""
    raw = await generate(prompt, model=model, temperature=temperature)
    return _parse_json_response(raw)


async def generate(
    prompt: str,
    model: str | None = None,
    temperature: float = 0.1,
) -> str:
    """Send a prompt and return raw text. Mirrors gemini_client.generate."""
    settings = get_settings()
    model_id = model or settings.bedrock_model_id
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _invoke, model_id, prompt, temperature)


def _invoke(model_id: str, prompt: str, temperature: float) -> str:
    """Blocking boto3 call — executed in thread pool."""
    client = _make_client()
    body = json.dumps({
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 8192,
        "temperature": temperature,
        "messages": [{"role": "user", "content": prompt}],
    })
    resp = client.invoke_model(
        modelId=model_id,
        body=body,
        contentType="application/json",
        accept="application/json",
    )
    result = json.loads(resp["body"].read())
    return result["content"][0]["text"]


def _parse_json_response(raw: str) -> dict[str, Any]:
    """Strip markdown fences if present and parse JSON."""
    text = raw.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        raise ValueError(f"Bedrock returned invalid JSON.\nRaw (first 500):\n{raw[:500]}\nError: {e}")
