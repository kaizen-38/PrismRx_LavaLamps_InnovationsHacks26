"""
Dynamic policy document crawler.

Flow:
  1. DuckDuckGo search  →  ranked list of candidate URLs
  2. Best URL selected  →  PDF: download + PyMuPDF extract
                        →  HTML: Crawl4AI extract (fallback: httpx + BeautifulSoup)
  3. Return extracted text to caller

SERVER SIDE ONLY — called by api/policy_crawl.py
"""
import logging
import asyncio
import httpx
import fitz  # PyMuPDF — already in requirements
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

# ── Payer domain hints ─────────────────────────────────────────────────────────

_PAYER_DOMAINS: dict[str, list[str]] = {
    "unitedhealthcare": ["uhcprovider.com", "uhc.com", "unitedhealthcare.com"],
    "uhc": ["uhcprovider.com", "uhc.com"],
    "cigna": ["cigna.com", "evicore.com"],
    "aetna": ["aetna.com"],
    "anthem": ["anthem.com", "empireblue.com"],
    "priority health": ["priorityhealth.com"],
    "blue shield": ["blueshieldca.com"],
    "bcbs": ["bcbs.com"],
}

def _payer_domains(payer: str) -> list[str]:
    p = payer.lower()
    for key, domains in _PAYER_DOMAINS.items():
        if key in p:
            return domains
    return []


# ── Search ─────────────────────────────────────────────────────────────────────

async def _search_ddg(query: str, max_results: int = 8) -> list[dict]:
    """Run a DuckDuckGo text search in a thread pool (DDGS is sync)."""
    def _run():
        from duckduckgo_search import DDGS
        with DDGS() as ddgs:
            return list(ddgs.text(query, max_results=max_results))
    try:
        return await asyncio.get_event_loop().run_in_executor(None, _run)
    except Exception as e:
        logger.warning(f"DDG search failed for '{query}': {e}")
        return []


def _score_result(result: dict, payer: str, drug: str) -> int:
    url = (result.get("href") or "").lower()
    title = (result.get("title") or "").lower()
    score = 0

    # PDF is best — we can extract clean text
    if url.endswith(".pdf"):
        score += 12
    elif ".pdf" in url:
        score += 8

    # Official payer domain
    preferred = _payer_domains(payer)
    if any(d in url for d in preferred):
        score += 10

    # Drug name in URL or title
    drug_lower = drug.lower()
    if drug_lower in url or drug_lower in title:
        score += 4

    # Recency
    for year in ("2025", "2024"):
        if year in url or year in title:
            score += 2
            break

    # Policy / criteria keywords
    for kw in ("medical-benefit", "medical_benefit", "prior-auth", "criteria", "policy"):
        if kw in url or kw in title:
            score += 2

    return score


async def search_policy_url(payer: str, drug: str) -> str | None:
    """
    Try several search queries and return the best-scored candidate URL.
    """
    preferred = _payer_domains(payer)
    domain_hint = (" OR site:" + " OR site:".join(preferred)) if preferred else ""

    queries = [
        f'"{payer}" "{drug}" medical benefit drug policy prior authorization filetype:pdf',
        f'"{payer}" {drug} "medical benefit" policy criteria{domain_hint}',
        f'{payer} {drug} infused biologic coverage policy 2025',
    ]

    all_results: list[dict] = []
    for q in queries:
        hits = await _search_ddg(q.strip())
        all_results.extend(hits)
        if any(_score_result(h, payer, drug) >= 10 for h in hits):
            break  # good enough, stop early

    if not all_results:
        return None

    # Deduplicate by URL
    seen: set[str] = set()
    unique = []
    for r in all_results:
        url = r.get("href", "")
        if url and url not in seen:
            seen.add(url)
            unique.append(r)

    best = max(unique, key=lambda r: _score_result(r, payer, drug))
    url = best.get("href")
    if url:
        logger.info(f"[crawler] Best URL for {payer}/{drug}: {url}  score={_score_result(best, payer, drug)}")
    return url or None


# ── PDF extraction ─────────────────────────────────────────────────────────────

async def _extract_pdf(url: str) -> str | None:
    """Download a PDF and extract full text page-by-page using PyMuPDF."""
    try:
        async with httpx.AsyncClient(
            timeout=40,
            follow_redirects=True,
            headers={"User-Agent": "Mozilla/5.0 (compatible; PrismRx/1.0)"},
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
        logger.info(f"[crawler] PDF extracted: {len(pages)} pages, {len(full_text)} chars from {url}")
        return full_text
    except Exception as e:
        logger.warning(f"[crawler] PDF extraction failed for {url}: {e}")
        return None


# ── HTML crawl ─────────────────────────────────────────────────────────────────

async def _crawl_html_crawl4ai(url: str) -> str | None:
    """Crawl an HTML page using Crawl4AI and return markdown text."""
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
            if text.strip():
                logger.info(f"[crawler] Crawl4AI extracted {len(text)} chars from {url}")
                return text
    except Exception as e:
        logger.warning(f"[crawler] Crawl4AI failed for {url}: {e}")
    return None


async def _crawl_html_fallback(url: str) -> str | None:
    """Fallback HTML crawl using httpx + BeautifulSoup."""
    try:
        async with httpx.AsyncClient(
            timeout=20,
            follow_redirects=True,
            headers={"User-Agent": "Mozilla/5.0 (compatible; PrismRx/1.0)"},
        ) as client:
            r = await client.get(url)
            r.raise_for_status()
            soup = BeautifulSoup(r.text, "html.parser")
            for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
                tag.decompose()
            text = soup.get_text(separator="\n", strip=True)
            if text.strip():
                logger.info(f"[crawler] BS4 fallback extracted {len(text)} chars from {url}")
                return text
    except Exception as e:
        logger.warning(f"[crawler] BS4 fallback failed for {url}: {e}")
    return None


async def crawl_url(url: str) -> str | None:
    """Route a URL to the appropriate extractor (PDF or HTML)."""
    if ".pdf" in url.lower():
        return await _extract_pdf(url)

    # Try Crawl4AI first, then fall back to BS4
    text = await _crawl_html_crawl4ai(url)
    if text:
        return text
    return await _crawl_html_fallback(url)


# ── Public API ─────────────────────────────────────────────────────────────────

async def get_live_policy_text(payer: str, drug: str) -> dict:
    """
    Search the web for a policy document for the given payer + drug,
    then crawl and return the extracted text.

    Returns:
        {
            "found": bool,
            "url": str | None,
            "text": str | None,
            "char_count": int,
            "source": "pdf" | "html" | None,
        }
    """
    url = await search_policy_url(payer, drug)
    if not url:
        logger.info(f"[crawler] No URL found for {payer}/{drug}")
        return {"found": False, "url": None, "text": None, "char_count": 0, "source": None}

    text = await crawl_url(url)
    if not text:
        logger.info(f"[crawler] Crawl returned no text for {url}")
        return {"found": False, "url": url, "text": None, "char_count": 0, "source": None}

    source = "pdf" if ".pdf" in url.lower() else "html"
    return {
        "found": True,
        "url": url,
        "text": text,
        "char_count": len(text),
        "source": source,
    }
