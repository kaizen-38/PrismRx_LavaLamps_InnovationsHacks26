"""
GET /api/policy/live — live web crawl for payer+drug policies.

Uses Tavily to find a policy page/PDF, then fetches and extracts text
so the AI layer can reason over non-indexed payers.
"""
import logging
import re

import httpx
from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

from ..core.config import get_settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["live"])

_HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; PrismRx/1.0; policy-research-bot)"}
_MAX_BYTES = 8 * 1024 * 1024   # 8 MB PDF cap
_MAX_TEXT  = 40_000            # chars returned to AI


# ── helpers ───────────────────────────────────────────────────────────────────

async def _tavily_search(query: str, api_key: str, max_results: int = 5) -> list[dict]:
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                "https://api.tavily.com/search",
                json={"api_key": api_key, "query": query, "max_results": max_results, "search_depth": "basic"},
            )
            resp.raise_for_status()
            return resp.json().get("results", [])
    except Exception as exc:
        logger.warning("Tavily search failed: %s", exc)
        return []


async def _fetch_pdf_text(url: str) -> str | None:
    try:
        import fitz  # PyMuPDF
        async with httpx.AsyncClient(timeout=25, follow_redirects=True) as client:
            async with client.stream("GET", url, headers=_HEADERS) as r:
                if r.status_code >= 400:
                    return None
                raw = b""
                async for chunk in r.aiter_bytes(65536):
                    raw += chunk
                    if len(raw) > _MAX_BYTES:
                        break
        doc = fitz.open(stream=raw, filetype="pdf")
        return "\n".join(page.get_text() for page in doc)
    except Exception as exc:
        logger.debug("PDF fetch failed for %s: %s", url, exc)
        return None


async def _fetch_html_text(url: str) -> str | None:
    try:
        from bs4 import BeautifulSoup
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            r = await client.get(url, headers=_HEADERS)
            if r.status_code >= 400:
                return None
        soup = BeautifulSoup(r.text, "html.parser")
        for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
            tag.decompose()
        text = soup.get_text(separator="\n")
        return re.sub(r"\n{3,}", "\n\n", text).strip()
    except Exception as exc:
        logger.debug("HTML fetch failed for %s: %s", url, exc)
        return None


# ── route ─────────────────────────────────────────────────────────────────────

@router.get("/policy/live")
async def live_policy(
    payer: str = Query(..., description="Payer / health plan name"),
    drug:  str = Query(..., description="Drug or drug family name"),
):
    """
    Search Tavily for a live payer+drug policy document, fetch it, and
    return the extracted text for AI reasoning.
    """
    settings = get_settings()
    if not settings.tavily_api_key:
        return JSONResponse(
            status_code=503,
            content={"found": False, "url": None, "text": None, "char_count": 0, "source": None,
                     "error": "TAVILY_API_KEY not configured on server"},
        )

    query = f'"{payer}" medical benefit prior authorization drug policy "{drug}" filetype:pdf OR coverage criteria'
    results = await _tavily_search(query, settings.tavily_api_key)

    for hit in results:
        url: str = hit.get("url", "")
        if not url:
            continue

        is_pdf = url.lower().endswith(".pdf") or "pdf" in url.lower()

        if is_pdf:
            text = await _fetch_pdf_text(url)
            if text and len(text) > 300:
                logger.info("Live policy found (PDF): %s", url)
                return {"found": True, "url": url, "text": text[:_MAX_TEXT], "char_count": len(text), "source": "pdf"}

        text = await _fetch_html_text(url)
        if text and len(text) > 300:
            logger.info("Live policy found (HTML): %s", url)
            return {"found": True, "url": url, "text": text[:_MAX_TEXT], "char_count": len(text), "source": "html"}

    logger.info("Live policy not found for %s + %s", payer, drug)
    return {"found": False, "url": None, "text": None, "char_count": 0, "source": None}
