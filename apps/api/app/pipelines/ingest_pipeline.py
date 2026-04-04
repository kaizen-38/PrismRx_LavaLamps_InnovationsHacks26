"""
Ingest Pipeline — orchestrates the full flow:
  raw file/URL  →  parse  →  store source doc  →  extract  →  store policy record

Usage:
    result = await run_ingest(file_bytes=..., file_name="uhc_infliximab.pdf", payer="UnitedHealthcare")
    result = await run_ingest(url="https://...", payer="Cigna", drug_family="TNF Inhibitors")
"""
import httpx
from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession

from ..parsers.pdf_parser import parse_pdf_bytes, ParsedDocument
from ..parsers.html_parser import parse_html
from ..extractors.policy_extractor import extract_policy
from ..models.policy import SourceDocument, PolicyRecord
from ..schemas.policy import ExtractionResult
from ..core.config import get_settings


@dataclass
class IngestResult:
    source_document_id: str
    policy_id: str | None
    drug_names: list[str]
    payer: str
    status: str   # "ok" | "parse_failed" | "extract_failed" | "duplicate"
    error: str | None = None


async def run_ingest(
    db: AsyncSession,
    payer: str,
    drug_family: str | None = None,
    file_bytes: bytes | None = None,
    file_name: str | None = None,
    url: str | None = None,
) -> IngestResult:
    """
    Main pipeline entry point.
    Provide either file_bytes+file_name (PDF upload) or url (HTML/PDF fetch).
    """
    settings = get_settings()

    # ── 1. Fetch / parse ──────────────────────────────────────────────────────
    try:
        doc, source_type = await _fetch_and_parse(file_bytes, file_name, url)
    except Exception as e:
        return IngestResult(
            source_document_id="",
            policy_id=None,
            drug_names=[],
            payer=payer,
            status="parse_failed",
            error=str(e),
        )

    # ── 2. Dedup check ────────────────────────────────────────────────────────
    existing = await db.get(SourceDocument, doc.file_hash)  # won't match — that's by ID
    from sqlalchemy import select
    stmt = select(SourceDocument).where(SourceDocument.file_hash == doc.file_hash)
    result = await db.execute(stmt)
    dup = result.scalar_one_or_none()
    if dup:
        return IngestResult(
            source_document_id=dup.id,
            policy_id=None,
            drug_names=[],
            payer=payer,
            status="duplicate",
        )

    # ── 3. Persist source document ────────────────────────────────────────────
    src = SourceDocument(
        payer=payer,
        drug_family=drug_family,
        source_type=source_type,
        source_uri=url,
        file_name=file_name or (url or "")[-60:],
        file_hash=doc.file_hash,
        page_count=doc.page_count,
        raw_text=doc.full_text[:50_000],  # cap stored raw text
        parse_status="parsed",
        extracted=False,
    )
    db.add(src)
    await db.flush()   # get src.id without committing

    # ── 4. Extract ────────────────────────────────────────────────────────────
    try:
        extraction: ExtractionResult = await extract_policy(
            doc=doc,
            payer_hint=payer,
            drug_family_hint=drug_family or "",
        )
    except Exception as e:
        src.parse_status = "extract_failed"
        await db.commit()
        return IngestResult(
            source_document_id=src.id,
            policy_id=None,
            drug_names=[],
            payer=payer,
            status="extract_failed",
            error=str(e),
        )

    # ── 5. Persist policy record ──────────────────────────────────────────────
    policy = PolicyRecord(
        source_document_id=src.id,
        payer=extraction.payer,
        plan_type=extraction.plan_type,
        policy_number=extraction.policy_number,
        effective_date=extraction.effective_date,
        drug_family=extraction.drug_family or drug_family,
        drug_names=extraction.drug_names,
        hcpcs_codes=extraction.hcpcs_codes,
        coverage_status=extraction.coverage_status,
        covered_indications=extraction.covered_indications,
        prior_authorization_required=extraction.prior_authorization_required,
        step_therapy_requirements=extraction.step_therapy_requirements,
        diagnosis_requirements=extraction.diagnosis_requirements,
        lab_or_biomarker_requirements=extraction.lab_or_biomarker_requirements,
        prescriber_requirements=extraction.prescriber_requirements,
        site_of_care_restrictions=extraction.site_of_care_restrictions,
        dose_frequency_rules=extraction.dose_frequency_rules,
        reauthorization_rules=extraction.reauthorization_rules,
        preferred_product_notes=extraction.preferred_product_notes,
        exclusions=extraction.exclusions,
        citations=[c.model_dump() for c in extraction.citations],
        extraction_model=settings.gemini_model,
    )
    db.add(policy)
    src.extracted = True
    await db.commit()

    return IngestResult(
        source_document_id=src.id,
        policy_id=policy.id,
        drug_names=extraction.drug_names,
        payer=extraction.payer,
        status="ok",
    )


async def _fetch_and_parse(
    file_bytes: bytes | None,
    file_name: str | None,
    url: str | None,
) -> tuple[ParsedDocument, str]:
    """Returns (ParsedDocument, source_type)."""
    if file_bytes:
        doc = parse_pdf_bytes(file_bytes, file_name=file_name or "upload.pdf")
        return doc, "pdf"

    if url:
        async with httpx.AsyncClient(follow_redirects=True, timeout=30) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            content_type = resp.headers.get("content-type", "")
            if "pdf" in content_type or url.lower().endswith(".pdf"):
                doc = parse_pdf_bytes(resp.content, file_name=url.split("/")[-1])
                return doc, "pdf"
            else:
                doc = parse_html(resp.text, source_uri=url, file_name=url.split("/")[-1])
                return doc, "html"

    raise ValueError("Must provide either file_bytes or url")
