"""
Policy lookup endpoint — returns a single best-match policy record for a given
payer + drug combination. Used by the frontend assistant orchestrator.
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from typing import Optional

from ..core.database import get_db
from ..models.policy import PolicyRecord, SourceDocument
from .matrix import _payer_key, _drug_info, _friction_score, _map_coverage_status, _DRUG_FAMILIES

router = APIRouter(prefix="/api", tags=["policy"])


# ── Supported options helpers ─────────────────────────────────────────────────

async def _get_available_payers(db: AsyncSession) -> list[str]:
    result = await db.execute(select(PolicyRecord.payer).distinct())
    return sorted({row[0] for row in result.fetchall() if row[0]})


async def _get_available_drugs(db: AsyncSession) -> list[str]:
    result = await db.execute(select(PolicyRecord.drug_family).distinct())
    families = {row[0] for row in result.fetchall() if row[0]}
    # Map to display names
    drugs = []
    for fam in sorted(families):
        info = _DRUG_FAMILIES.get(fam.lower())
        drugs.append(info["display"] if info else fam)
    return drugs


# ── Drug name normalization ────────────────────────────────────────────────────

_DRUG_ALIASES: dict[str, str] = {
    # Generic names
    "infliximab": "tnf inhibitors",
    "remicade": "tnf inhibitors",
    "inflectra": "tnf inhibitors",
    "avsola": "tnf inhibitors",
    "renflexis": "tnf inhibitors",
    "ixifi": "tnf inhibitors",
    "rituximab": "anti-cd20",
    "rituxan": "anti-cd20",
    "truxima": "anti-cd20",
    "ruxience": "anti-cd20",
    "riabni": "anti-cd20",
    "vedolizumab": "integrin inhibitors",
    "entyvio": "integrin inhibitors",
    "ocrelizumab": "anti-cd20 ms",
    "ocrevus": "anti-cd20 ms",
    "tocilizumab": "il-6 inhibitors",
    "actemra": "il-6 inhibitors",
    # Family names
    "tnf": "tnf inhibitors",
    "tnf inhibitor": "tnf inhibitors",
    "anti-cd20": "anti-cd20",
    "integrin": "integrin inhibitors",
    "integrin inhibitor": "integrin inhibitors",
    "il-6": "il-6 inhibitors",
}


def _normalize_drug_family(drug: str) -> str:
    """Map any drug alias or family name to a normalized family string."""
    return _DRUG_ALIASES.get(drug.lower().strip(), drug.lower().strip())


# ── Main lookup endpoint ───────────────────────────────────────────────────────

@router.get("/policy")
async def lookup_policy(
    payer: str = Query(..., description="Payer name (e.g. 'UnitedHealthcare', 'Cigna')"),
    drug: str = Query(..., description="Drug name or family (e.g. 'infliximab', 'rituximab')"),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns the best-matching policy record for a payer + drug combination.
    Used by the frontend assistant to populate the coverage table.
    """
    payer_key = _payer_key(payer)
    drug_family_normalized = _normalize_drug_family(drug)

    # Query all records for this payer (normalized)
    result = await db.execute(select(PolicyRecord))
    all_records = list(result.scalars().all())

    # Filter by payer
    payer_records = [
        r for r in all_records
        if _payer_key(r.payer) == payer_key
    ]

    # Filter by drug family or drug name
    def _matches_drug(record: PolicyRecord) -> bool:
        fam = (record.drug_family or "").lower()
        names = [n.lower() for n in (record.drug_names or [])]
        # Check if any known alias maps to the same family
        normalized_record_fam = _normalize_drug_family(fam)
        if drug_family_normalized in normalized_record_fam or normalized_record_fam in drug_family_normalized:
            return True
        # Check drug_names
        return any(drug.lower() in n or n in drug.lower() for n in names)

    matched = [r for r in payer_records if _matches_drug(r)]

    # If no match, return fallback
    if not matched:
        available_payers = await _get_available_payers(db)
        available_drugs = await _get_available_drugs(db)
        return {
            "found": False,
            "requested_payer": payer,
            "requested_drug": drug,
            "message": f"No indexed policy found for {payer} / {drug}",
            "available_payers": available_payers,
            "available_drugs": available_drugs,
        }

    # Pick best record: highest extraction_confidence, then most recent effective_date
    best = sorted(
        matched,
        key=lambda r: (r.extraction_confidence or 0, r.effective_date or ""),
        reverse=True,
    )[0]

    drug_info = _drug_info(best)
    step_therapy_required = bool(best.step_therapy_requirements)

    return {
        "found": True,
        "policy_id": best.id,
        "payer": best.payer,
        "drug_family": best.drug_family,
        "drug_display": drug_info["display"],
        "drug_short": drug_info["short"],
        "reference_product": drug_info["reference"],
        "biosimilars": drug_info["biosimilars"],
        "coverage_status": _map_coverage_status(best.coverage_status),
        "pa_required": bool(best.prior_authorization_required),
        "step_therapy_required": step_therapy_required,
        "effective_date": best.effective_date or "Unknown",
        "version_label": best.policy_number or best.effective_date or "Current",
        "friction_score": _friction_score(best),
        "drug_names": best.drug_names or [],
        "hcpcs_codes": best.hcpcs_codes or [],
        "covered_indications": best.covered_indications or [],
        "step_therapy_requirements": best.step_therapy_requirements or [],
        "diagnosis_requirements": best.diagnosis_requirements or [],
        "lab_or_biomarker_requirements": best.lab_or_biomarker_requirements or [],
        "prescriber_requirements": best.prescriber_requirements or [],
        "site_of_care_restrictions": best.site_of_care_restrictions or [],
        "dose_frequency_rules": best.dose_frequency_rules or [],
        "reauthorization_rules": best.reauthorization_rules or [],
        "preferred_product_notes": best.preferred_product_notes or [],
        "exclusions": best.exclusions or [],
        "citations": [
            c if isinstance(c, dict) else c.__dict__
            for c in (best.citations or [])
        ],
    }


# ── Supported options endpoint ─────────────────────────────────────────────────

@router.get("/policy/options")
async def get_supported_options(db: AsyncSession = Depends(get_db)):
    """
    Returns all payer + drug combinations currently indexed in the DB.
    Used by the frontend to populate the SupportedOptionsCard.
    """
    result = await db.execute(select(PolicyRecord))
    records = list(result.scalars().all())

    payers: dict[str, str] = {}
    drugs: dict[str, str] = {}

    for r in records:
        pk = _payer_key(r.payer)
        payers[pk] = r.payer

        info = _drug_info(r)
        if info["key"] != "unknown":
            drugs[info["key"]] = info["display"]

    return {
        "payers": [{"id": k, "displayName": v} for k, v in sorted(payers.items())],
        "drugs": [{"key": k, "displayName": v} for k, v in sorted(drugs.items())],
    }


# ── Raw document text endpoint ─────────────────────────────────────────────────

@router.get("/policy/{policy_id}/document")
async def get_policy_document(policy_id: str, db: AsyncSession = Depends(get_db)):
    """
    Returns the raw extracted text of the source document for a given policy ID.
    Used by the frontend to pass the full document to Claude for grounded Q&A.
    """
    result = await db.execute(select(PolicyRecord).where(PolicyRecord.id == policy_id))
    policy = result.scalar_one_or_none()
    if not policy:
        return {"raw_text": None, "file_name": None, "source_uri": None, "page_count": None}

    if not policy.source_document_id:
        return {"raw_text": None, "file_name": None, "source_uri": None, "page_count": None}

    result = await db.execute(
        select(SourceDocument).where(SourceDocument.id == policy.source_document_id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        return {"raw_text": None, "file_name": None, "source_uri": None, "page_count": None}

    return {
        "raw_text": doc.raw_text,
        "file_name": doc.file_name,
        "source_uri": doc.source_uri,
        "page_count": doc.page_count,
    }
