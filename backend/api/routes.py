"""
FastAPI routes — policy ingestion, search, comparison, NL query, and live web crawl.
"""
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional
import tempfile, os, io, re, logging

import requests
from bs4 import BeautifulSoup

from ..database.db import get_db
from ..database.models import PolicyRecord
from ..ingestion.pdf_parser import parse_pdf
from ..extraction.policy_extractor import extract_policy
from ..normalization.normalizer import normalize_policy

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api")

# ── Live web crawl helpers ────────────────────────────────────────────────────

_TAVILY_KEY = os.getenv("TAVILY_API_KEY", "")
_HTTP_HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; PrismRx/1.0; policy-research-bot)"
}

def _tavily_search(query: str, max_results: int = 3) -> list[dict]:
    """Search via Tavily and return list of {url, content} dicts."""
    if not _TAVILY_KEY:
        return []
    try:
        resp = requests.post(
            "https://api.tavily.com/search",
            json={"api_key": _TAVILY_KEY, "query": query, "max_results": max_results, "search_depth": "basic"},
            timeout=15,
        )
        if not resp.ok:
            return []
        return resp.json().get("results", [])
    except Exception:
        return []


def _fetch_pdf_text(url: str) -> str | None:
    """Download a PDF and extract text with fitz (PyMuPDF)."""
    try:
        import fitz
        r = requests.get(url, headers=_HTTP_HEADERS, timeout=20, stream=True)
        if not r.ok:
            return None
        raw = b""
        for chunk in r.iter_content(chunk_size=65536):
            raw += chunk
            if len(raw) > 10 * 1024 * 1024:  # 10 MB cap
                break
        doc = fitz.open(stream=raw, filetype="pdf")
        pages = []
        for page in doc:
            pages.append(page.get_text())
        return "\n".join(pages)
    except Exception:
        return None


def _fetch_html_text(url: str) -> str | None:
    """Fetch an HTML page and return readable text."""
    try:
        r = requests.get(url, headers=_HTTP_HEADERS, timeout=15)
        if not r.ok:
            return None
        soup = BeautifulSoup(r.text, "html.parser")
        for tag in soup(["script", "style", "nav", "footer", "header"]):
            tag.decompose()
        return re.sub(r"\n{3,}", "\n\n", soup.get_text(separator="\n")).strip()
    except Exception:
        return None


def _crawl_live_policy(payer: str, drug: str) -> dict:
    """Search Tavily for the payer+drug policy, then fetch and extract text."""
    query = f"{payer} medical benefit drug policy prior authorization {drug} site:*.com OR site:*.org"
    results = _tavily_search(query)

    for hit in results:
        url: str = hit.get("url", "")
        if not url:
            continue

        # Prefer PDF links
        if url.lower().endswith(".pdf") or "pdf" in url.lower():
            text = _fetch_pdf_text(url)
            if text and len(text) > 200:
                return {"found": True, "url": url, "text": text[:40000], "char_count": len(text), "source": "pdf"}

        # Fall back to HTML
        text = _fetch_html_text(url)
        if text and len(text) > 200:
            return {"found": True, "url": url, "text": text[:40000], "char_count": len(text), "source": "html"}

    return {"found": False, "url": None, "text": None, "char_count": 0, "source": None}


@router.post("/ingest")
async def ingest_policy(
    file: UploadFile = File(...),
    payer: str = Query(..., description="Payer / health plan name"),
    db: Session = Depends(get_db),
):
    """Upload and process a policy PDF."""
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        parsed = parse_pdf(tmp_path)
        extracted = extract_policy(parsed["full_text"], payer_hint=payer)
        normalized = normalize_policy(extracted, source_file=file.filename, payer=payer)

        record = PolicyRecord(**{k: v for k, v in normalized.items() if k != "ingested_at"})
        record.raw_text = parsed["full_text"][:5000]
        db.add(record)
        db.commit()
        db.refresh(record)
        return {"id": record.id, "drug_name": record.drug_name, "payer": record.payer}
    finally:
        os.unlink(tmp_path)


@router.get("/policies")
def list_policies(
    drug: Optional[str] = None,
    payer: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """List all policies, optionally filtered by drug or payer."""
    q = db.query(PolicyRecord)
    if drug:
        q = q.filter(PolicyRecord.drug_name.ilike(f"%{drug}%"))
    if payer:
        q = q.filter(PolicyRecord.payer.ilike(f"%{payer}%"))
    return q.all()


@router.get("/compare")
def compare_drug(drug: str, db: Session = Depends(get_db)):
    """Return all payer policies for a given drug for side-by-side comparison."""
    results = db.query(PolicyRecord).filter(PolicyRecord.drug_name.ilike(f"%{drug}%")).all()
    if not results:
        raise HTTPException(status_code=404, detail="No policies found for that drug")
    return results


@router.get("/payers")
def list_payers(db: Session = Depends(get_db)):
    """Return distinct payers in the database."""
    payers = db.query(PolicyRecord.payer).distinct().all()
    return [p[0] for p in payers]


@router.get("/drugs")
def list_drugs(db: Session = Depends(get_db)):
    """Return distinct drug names in the database."""
    drugs = db.query(PolicyRecord.drug_name).distinct().all()
    return [d[0] for d in drugs]


@router.get("/policy/live")
def live_policy(
    payer: str = Query(..., description="Payer / health plan name"),
    drug: str = Query(..., description="Drug or drug family name"),
):
    """
    Live web crawl: search Tavily for a payer+drug policy page or PDF,
    fetch it, and return the extracted text for the AI to reason over.
    """
    result = _crawl_live_policy(payer, drug)
    return result
