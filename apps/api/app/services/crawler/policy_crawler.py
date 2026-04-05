"""
Live policy document discovery + extraction.

Pipeline:
  1. Search — Tavily (optional API key) + Brave (optional) + DuckDuckGo, merged.
  2. Rank — score URLs (PDF, payer domain, drug/aliases, policy keywords).
  3. Fetch — try top-N URLs until text passes minimum length.
     PDF → PyMuPDF
     HTML → Jina Reader (markdown) → trafilatura → BeautifulSoup → optional Crawl4AI

SERVER SIDE ONLY — GET /api/policy/live
"""
from __future__ import annotations

import asyncio
import logging
import urllib.parse
from typing import Any

import httpx
import fitz
from bs4 import BeautifulSoup

from app.core.config import get_settings

logger = logging.getLogger(__name__)

# ── Tunables ──────────────────────────────────────────────────────────────────

MIN_EXTRACTED_CHARS = 250  # skip error/login stubs; frontend applies its own higher bar
MAX_URLS_TO_TRY = 8
HTTP_TIMEOUT = httpx.Timeout(45.0, connect=15.0)
BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "no-cache",
}

# Payer → official / common policy host hints
_PAYER_DOMAINS: dict[str, list[str]] = {
    "unitedhealthcare": ["uhcprovider.com", "uhc.com", "unitedhealthcare.com"],
    "uhc": ["uhcprovider.com", "uhc.com"],
    "cigna": ["cigna.com", "evicore.com"],
    "aetna": ["aetna.com", "aetnacvs.com"],
    "anthem": ["anthem.com", "empireblue.com", "bcbs.com"],
    "priority health": ["priorityhealth.com"],
    "blue shield": ["blueshieldca.com"],
    "bcbs": ["bcbs.com"],
}

# Canonical drug → extra tokens for search + scoring
_DRUG_ALIASES: dict[str, list[str]] = {
    "infliximab": ["remicade", "inflectra", "tnf"],
    "rituximab": ["rituxan", "anti-cd20"],
    "vedolizumab": ["entyvio", "integrin"],
    "ocrelizumab": ["ocrevus"],
    "tocilizumab": ["actemra", "il-6"],
    "bevacizumab": ["avastin"],
}


def _payer_domains(payer: str) -> list[str]:
    p = payer.lower()
    for key, domains in _PAYER_DOMAINS.items():
        if key in p:
            return domains
    return []


def _drug_tokens(drug: str) -> list[str]:
    d = drug.lower().strip()
    out = [d]
    out.extend(_DRUG_ALIASES.get(d, []))
    return list(dict.fromkeys(out))


def _score_candidate(url: str, title: str, payer: str, drug: str) -> int:
    u = url.lower()
    t = (title or "").lower()
    score = 0
    if u.endswith(".pdf"):
        score += 14
    elif ".pdf" in u:
        score += 10
    for dom in _payer_domains(payer):
        if dom in u:
            score += 12
            break
    for tok in _drug_tokens(drug):
        if tok in u or tok in t:
            score += 5
    for year in ("2026", "2025", "2024"):
        if year in u or year in t:
            score += 2
            break
    for kw in (
        "cpb",
        "coverage",
        "criteria",
        "policy",
        "prior-auth",
        "prior_authorization",
        "medical-benefit",
        "medical_policy",
        "pharmacy",
        "clinical",
    ):
        if kw in u or kw in t:
            score += 2
    if "login" in u or "signin" in u or "sso." in u:
        score -= 15
    return score


def _search_queries(payer: str, drug: str) -> list[str]:
    sites = _payer_domains(payer)
    site_clause = ""
    if sites:
        site_clause = " (" + " OR ".join(f"site:{s}" for s in sites[:4]) + ")"

    tokens = _drug_tokens(drug)
    brand = tokens[1] if len(tokens) > 1 else ""

    return [
        f'{payer} {drug} medical policy prior authorization criteria PDF',
        f'"{payer}" "{drug}" coverage policy clinical',
        f'{payer} {drug} CPB medical benefit{site_clause}',
        f'"{payer}" {drug} filetype:pdf',
        f"{payer} {brand} infusion coverage policy".strip() if brand else f"{payer} {drug} infusion policy",
        f"{drug} {payer} health plan medical necessity",
    ]


# ── Search providers ────────────────────────────────────────────────────────────


async def _search_ddg(query: str, max_results: int = 12) -> list[dict[str, Any]]:
    def _run() -> list[dict[str, Any]]:
        from duckduckgo_search import DDGS

        out: list[dict[str, Any]] = []
        for backend in ("api", "lite"):
            try:
                with DDGS() as ddgs:
                    rows = list(ddgs.text(query, max_results=max_results, backend=backend))
                if rows:
                    out.extend(rows)
                    break
            except Exception as e:
                logger.debug(f"[crawler] DDG backend={backend} query={query[:50]!r}: {e}")
        return out

    try:
        return await asyncio.get_event_loop().run_in_executor(None, _run)
    except Exception as e:
        logger.warning(f"[crawler] DDG search failed for {query[:60]!r}: {e}")
        return []


async def _search_tavily(query: str, api_key: str, include_domains: list[str] | None) -> list[dict[str, Any]]:
    payload: dict[str, Any] = {
        "api_key": api_key,
        "query": query,
        "search_depth": "advanced",
        "max_results": 12,
        "include_answer": False,
    }
    if include_domains:
        payload["include_domains"] = include_domains[:8]

    try:
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT, headers=BROWSER_HEADERS) as client:
            r = await client.post("https://api.tavily.com/search", json=payload)
            r.raise_for_status()
            data = r.json()
        out: list[dict[str, Any]] = []
        for item in data.get("results") or []:
            u = item.get("url")
            if u:
                out.append({"href": u, "title": item.get("title") or ""})
        return out
    except Exception as e:
        logger.warning(f"[crawler] Tavily search failed: {e}")
        return []


async def _search_brave(query: str, api_key: str) -> list[dict[str, Any]]:
    try:
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT, headers=BROWSER_HEADERS) as client:
            r = await client.get(
                "https://api.search.brave.com/res/v1/web/search",
                params={"q": query, "count": 15},
                headers={"X-Subscription-Token": api_key, "Accept": "application/json"},
            )
            r.raise_for_status()
            data = r.json()
        out: list[dict[str, Any]] = []
        for item in (data.get("web") or {}).get("results") or []:
            u = item.get("url")
            if u:
                out.append({"href": u, "title": item.get("title") or ""})
        return out
    except Exception as e:
        logger.warning(f"[crawler] Brave search failed: {e}")
        return []


async def _gather_candidates(payer: str, drug: str) -> list[dict[str, Any]]:
    settings = get_settings()
    queries = _search_queries(payer, drug)
    include_domains = _payer_domains(payer) or None

    tasks: list[asyncio.Task] = []

    # Tavily — best quality when key present (run first 3 queries)
    if settings.tavily_api_key:
        for q in queries[:3]:
            tasks.append(
                asyncio.create_task(_search_tavily(q, settings.tavily_api_key, include_domains))
            )

    # Brave — optional second paid/alternative index
    if settings.brave_search_api_key:
        for q in queries[:2]:
            tasks.append(asyncio.create_task(_search_brave(q, settings.brave_search_api_key)))

    # DuckDuckGo — always (no key)
    for q in queries[:4]:
        tasks.append(asyncio.create_task(_search_ddg(q)))

    merged: list[dict[str, Any]] = []
    if tasks:
        batches = await asyncio.gather(*tasks, return_exceptions=True)
        for b in batches:
            if isinstance(b, list):
                merged.extend(b)
            elif isinstance(b, Exception):
                logger.debug(f"[crawler] search task error: {b}")

    return merged


def _rank_unique_urls(candidates: list[dict[str, Any]], payer: str, drug: str) -> list[tuple[str, int]]:
    seen: set[str] = set()
    scored: list[tuple[str, int]] = []
    for row in candidates:
        url = (row.get("href") or "").strip()
        if not url or not url.startswith("http"):
            continue
        if url in seen:
            continue
        seen.add(url)
        title = row.get("title") or ""
        sc = _score_candidate(url, title, payer, drug)
        scored.append((url, sc))
    scored.sort(key=lambda x: x[1], reverse=True)
    return scored


# ── Extraction ────────────────────────────────────────────────────────────────


async def _extract_pdf(url: str) -> str | None:
    try:
        async with httpx.AsyncClient(
            timeout=HTTP_TIMEOUT,
            follow_redirects=True,
            headers=BROWSER_HEADERS,
        ) as client:
            r = await client.get(url)
            r.raise_for_status()
            pdf_bytes = r.content

        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        pages: list[str] = []
        for page in doc:
            text = page.get_text("text")
            if text.strip():
                pages.append(f"[Page {page.number + 1}]\n{text.strip()}")
        doc.close()
        if not pages:
            return None
        full_text = "\n\n".join(pages)
        logger.info(f"[crawler] PDF: {len(pages)} pages, {len(full_text)} chars from {url[:80]}")
        return full_text
    except Exception as e:
        logger.warning(f"[crawler] PDF failed {url[:80]}: {e}")
        return None


async def _jina_reader(url: str) -> str | None:
    """Jina AI Reader — returns markdown for many HTML (and some PDF) URLs."""
    reader = "https://r.jina.ai/" + urllib.parse.quote(url, safe="")
    try:
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT, headers=BROWSER_HEADERS) as client:
            r = await client.get(
                reader,
                headers={
                    **BROWSER_HEADERS,
                    "X-Return-Format": "markdown",
                },
            )
            r.raise_for_status()
            text = r.text
        if text and len(text.strip()) >= MIN_EXTRACTED_CHARS:
            logger.info(f"[crawler] Jina Reader: {len(text)} chars from {url[:80]}")
            return text.strip()
    except Exception as e:
        logger.debug(f"[crawler] Jina Reader failed {url[:80]}: {e}")
    return None


def _trafilatura_from_html(html: str, url: str) -> str | None:
    try:
        import trafilatura

        extracted = trafilatura.extract(
            html,
            url=url,
            include_comments=False,
            include_tables=True,
            no_fallback=False,
        )
        if extracted and len(extracted.strip()) >= MIN_EXTRACTED_CHARS:
            return extracted.strip()
    except Exception as e:
        logger.debug(f"[crawler] trafilatura failed {url[:80]}: {e}")
    return None


async def _fetch_html(url: str) -> str | None:
    try:
        async with httpx.AsyncClient(
            timeout=HTTP_TIMEOUT,
            follow_redirects=True,
            headers=BROWSER_HEADERS,
        ) as client:
            r = await client.get(url)
            r.raise_for_status()
            return r.text
    except Exception as e:
        logger.warning(f"[crawler] HTML fetch failed {url[:80]}: {e}")
        return None


async def _crawl_html_bs4(html: str, url: str) -> str | None:
    try:
        soup = BeautifulSoup(html, "html.parser")
        for tag in soup(["script", "style", "nav", "footer", "header", "aside", "iframe"]):
            tag.decompose()
        text = soup.get_text(separator="\n", strip=True)
        if text and len(text.strip()) >= MIN_EXTRACTED_CHARS:
            logger.info(f"[crawler] BS4: {len(text)} chars from {url[:80]}")
            return text.strip()
    except Exception as e:
        logger.debug(f"[crawler] BS4 failed: {e}")
    return None


async def _crawl_html_crawl4ai(url: str) -> str | None:
    try:
        from crawl4ai import AsyncWebCrawler  # type: ignore

        async with AsyncWebCrawler(verbose=False) as crawler:
            result = await crawler.arun(url=url)
            text = (
                getattr(result, "markdown_v2", None)
                or getattr(result, "markdown", None)
                or getattr(result, "cleaned_html", None)
                or ""
            )
            if text.strip() and len(text.strip()) >= MIN_EXTRACTED_CHARS:
                logger.info(f"[crawler] Crawl4AI: {len(text)} chars from {url[:80]}")
                return text.strip()
    except Exception as e:
        logger.debug(f"[crawler] Crawl4AI failed: {e}")
    return None


async def crawl_url(url: str) -> str | None:
    lower = url.lower()
    if lower.endswith(".pdf") or ".pdf?" in lower:
        t = await _extract_pdf(url)
        if t:
            return t

    # HTML (or ambiguous) — try Jina first (handles JS-heavy pages well)
    t = await _jina_reader(url)
    if t:
        return t

    html = await _fetch_html(url)
    if html:
        t = _trafilatura_from_html(html, url)
        if t:
            logger.info(f"[crawler] trafilatura: {len(t)} chars from {url[:80]}")
            return t
        t = await _crawl_html_bs4(html, url)
        if t:
            return t

    t = await _crawl_html_crawl4ai(url)
    if t:
        return t

    return None


async def search_policy_urls(payer: str, drug: str) -> list[str]:
    raw = await _gather_candidates(payer, drug)
    ranked = _rank_unique_urls(raw, payer, drug)
    urls = [u for u, _ in ranked[:MAX_URLS_TO_TRY]]
    if urls:
        logger.info(
            f"[crawler] Top URLs for {payer}/{drug}: "
            + ", ".join(f"{u[:60]}…({s})" for u, s in ranked[:3])
        )
    return urls


async def get_live_policy_text(payer: str, drug: str) -> dict:
    urls = await search_policy_urls(payer, drug)
    if not urls:
        logger.info(f"[crawler] No URLs for {payer}/{drug}")
        return {"found": False, "url": None, "text": None, "char_count": 0, "source": None}

    for url in urls:
        text = await crawl_url(url)
        if text and len(text.strip()) >= MIN_EXTRACTED_CHARS:
            source = "pdf" if ".pdf" in url.lower() else "html"
            return {
                "found": True,
                "url": url,
                "text": text,
                "char_count": len(text),
                "source": source,
            }
        logger.info(f"[crawler] Skipping insufficient text from {url[:80]}")

    logger.info(f"[crawler] No usable extraction for {payer}/{drug} after {len(urls)} URLs")
    return {"found": False, "url": urls[0], "text": None, "char_count": 0, "source": None}


# Back-compat for tests / callers that only need one URL
async def search_policy_url(payer: str, drug: str) -> str | None:
    urls = await search_policy_urls(payer, drug)
    return urls[0] if urls else None
