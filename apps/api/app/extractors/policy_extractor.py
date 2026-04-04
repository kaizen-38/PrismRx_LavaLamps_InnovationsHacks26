"""
Policy Extractor — sends parsed document text to Gemini and returns
a validated ExtractionResult with citations.

Handles chunking for long documents: splits by pages and merges results.
"""
from pathlib import Path

from ..parsers.pdf_parser import ParsedDocument
from ..schemas.policy import ExtractionResult, PolicyCitation
from ..services.llm.gemini_client import generate_json
from ..core.config import get_settings

_EXTRACTION_PROMPT = (Path(__file__).parent.parent / "services/llm/prompts/extraction.txt").read_text()
_NORMALIZATION_PROMPT = (Path(__file__).parent.parent / "services/llm/prompts/normalization.txt").read_text()

# Characters per chunk — ~10k tokens for flash, leaves room for response
_CHUNK_CHARS = 30_000


async def extract_policy(
    doc: ParsedDocument,
    payer_hint: str = "",
    drug_family_hint: str = "",
) -> ExtractionResult:
    """
    Main entry point. Returns a validated ExtractionResult.
    For long docs, chunks by pages and merges multi-chunk results.
    """
    settings = get_settings()

    if len(doc.full_text) <= _CHUNK_CHARS:
        raw = await _extract_chunk(
            text=doc.full_text,
            page_start=1,
            page_end=doc.page_count,
            payer_hint=payer_hint,
            model=settings.gemini_model,
        )
    else:
        raw = await _extract_chunked(doc, payer_hint, settings.gemini_model)

    # Normalize drug names / terminology
    raw = await _normalize(raw, settings.gemini_model)

    # Override drug_family hint if extractor left it null
    if not raw.get("drug_family") and drug_family_hint:
        raw["drug_family"] = drug_family_hint
    if not raw.get("payer") and payer_hint:
        raw["payer"] = payer_hint

    return _to_extraction_result(raw)


async def _extract_chunk(
    text: str,
    page_start: int,
    page_end: int,
    payer_hint: str,
    model: str,
) -> dict:
    prompt = (
        _EXTRACTION_PROMPT
        .replace("{payer_hint}", payer_hint or "unknown")
        .replace("{page_start}", str(page_start))
        .replace("{page_end}", str(page_end))
        .replace("{policy_text}", text)
    )
    return await generate_json(prompt, model=model)


async def _extract_chunked(doc: ParsedDocument, payer_hint: str, model: str) -> dict:
    """
    Split the document into page-aligned chunks, extract each,
    then merge by union-ing list fields and taking the first non-null scalar.
    """
    chunks: list[tuple[int, int, str]] = []
    buffer = ""
    chunk_start = 1

    for page in doc.pages:
        if len(buffer) + len(page.text) > _CHUNK_CHARS and buffer:
            chunks.append((chunk_start, page.page_num - 1, buffer))
            buffer = page.text
            chunk_start = page.page_num
        else:
            buffer += "\n\n" + page.text

    if buffer:
        chunks.append((chunk_start, doc.page_count, buffer))

    results = []
    for start, end, text in chunks:
        result = await _extract_chunk(text, start, end, payer_hint, model)
        results.append(result)

    return _merge_results(results)


def _merge_results(results: list[dict]) -> dict:
    """Merge multiple chunk extractions into one record."""
    if not results:
        return {}
    merged = results[0].copy()
    list_fields = [
        "drug_names", "hcpcs_codes", "covered_indications",
        "step_therapy_requirements", "diagnosis_requirements",
        "lab_or_biomarker_requirements", "prescriber_requirements",
        "site_of_care_restrictions", "dose_frequency_rules",
        "reauthorization_rules", "preferred_product_notes",
        "exclusions", "citations",
    ]
    for r in results[1:]:
        for field in list_fields:
            existing = merged.get(field) or []
            incoming = r.get(field) or []
            # Deduplicate strings; keep all citations
            if field == "citations":
                merged[field] = existing + incoming
            else:
                merged[field] = list(dict.fromkeys(existing + incoming))
        # Scalar fields: take first non-null value
        for key in ("payer", "plan_type", "policy_number", "effective_date",
                    "drug_family", "coverage_status"):
            if not merged.get(key) and r.get(key):
                merged[key] = r[key]
        # prior_auth: True wins
        if r.get("prior_authorization_required"):
            merged["prior_authorization_required"] = True

    return merged


async def _normalize(raw: dict, model: str) -> dict:
    """Run the normalization prompt and merge corrections back."""
    prompt = _NORMALIZATION_PROMPT.replace("{extraction_json}", str(raw))
    try:
        corrections = await generate_json(prompt, model=model)
        raw.update({k: v for k, v in corrections.items() if v is not None})
    except ValueError:
        pass  # normalization is best-effort; extraction result is still valid
    return raw


def _to_extraction_result(raw: dict) -> ExtractionResult:
    citations = [
        PolicyCitation(**c) if isinstance(c, dict) else c
        for c in (raw.get("citations") or [])
    ]
    return ExtractionResult(
        payer=raw.get("payer") or "Unknown",
        plan_type=raw.get("plan_type") or "unknown",
        policy_number=raw.get("policy_number"),
        effective_date=raw.get("effective_date"),
        drug_family=raw.get("drug_family"),
        drug_names=raw.get("drug_names") or [],
        hcpcs_codes=raw.get("hcpcs_codes") or [],
        coverage_status=raw.get("coverage_status") or "unclear",
        covered_indications=raw.get("covered_indications") or [],
        prior_authorization_required=bool(raw.get("prior_authorization_required")),
        step_therapy_requirements=raw.get("step_therapy_requirements") or [],
        diagnosis_requirements=raw.get("diagnosis_requirements") or [],
        lab_or_biomarker_requirements=raw.get("lab_or_biomarker_requirements") or [],
        prescriber_requirements=raw.get("prescriber_requirements") or [],
        site_of_care_restrictions=raw.get("site_of_care_restrictions") or [],
        dose_frequency_rules=raw.get("dose_frequency_rules") or [],
        reauthorization_rules=raw.get("reauthorization_rules") or [],
        preferred_product_notes=raw.get("preferred_product_notes") or [],
        exclusions=raw.get("exclusions") or [],
        citations=citations,
    )
