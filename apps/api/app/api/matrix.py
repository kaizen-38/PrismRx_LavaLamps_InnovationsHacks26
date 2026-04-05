"""
Coverage Matrix endpoint — maps PolicyRecord rows to the CoverageMatrixData shape
that the frontend coverage matrix component expects.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from datetime import datetime, UTC

from ..core.database import get_db
from ..models.policy import PolicyRecord

router = APIRouter(prefix="/api", tags=["matrix"])

# ── Drug canonicalization ─────────────────────────────────────────────────────

# Maps drug_family → (canonical_key, display_name, short_name, reference_product, biosimilars)
_DRUG_FAMILIES: dict[str, dict] = {
    "tnf inhibitors": {
        "key": "infliximab",
        "display": "Infliximab",
        "short": "IFX",
        "reference": "Remicade",
        "biosimilars": ["Avsola", "Inflectra", "Ixifi", "Renflexis"],
    },
    "anti-cd20": {
        "key": "rituximab",
        "display": "Rituximab",
        "short": "RTX",
        "reference": "Rituxan",
        "biosimilars": ["Truxima", "Ruxience", "Riabni"],
    },
    "anti-cd20 ms": {
        "key": "ocrelizumab",
        "display": "Ocrelizumab",
        "short": "OCR",
        "reference": "Ocrevus",
        "biosimilars": ["Ocrevus Zunovo"],
    },
}


_PAYER_CANONICAL: dict[str, tuple[str, str]] = {
    # (normalized key, display label) — merges variants
    "unitedhealthcare":      ("unitedhealthcare", "UnitedHealthcare"),
    "uhc":                   ("unitedhealthcare", "UnitedHealthcare"),
    "aetna":                 ("aetna", "Aetna"),
    "cigna":                 ("cigna", "Cigna"),
    "cigna healthcare":      ("cigna", "Cigna"),
    "cigna health":          ("cigna", "Cigna"),
    "blue shield":           ("bsca", "Blue Shield CA"),
    "blue shield of california": ("bsca", "Blue Shield CA"),
    "bsca":                  ("bsca", "Blue Shield CA"),
}

def _payer_key(payer: str) -> str:
    """Normalize payer name to a stable lowercase ID."""
    lower = payer.lower().strip()
    entry = _PAYER_CANONICAL.get(lower)
    if entry:
        return entry[0]
    # Fuzzy fallback
    for key_pattern, (canonical, _) in _PAYER_CANONICAL.items():
        if key_pattern in lower:
            return canonical
    return lower.replace(" ", "_").replace("/", "_")

def _payer_label(payer: str) -> str:
    """Return canonical display label for a payer."""
    lower = payer.lower().strip()
    entry = _PAYER_CANONICAL.get(lower)
    if entry:
        return entry[1]
    for key_pattern, (_, label) in _PAYER_CANONICAL.items():
        if key_pattern in lower:
            return label
    return payer


def _drug_info(record: PolicyRecord) -> dict:
    family = (record.drug_family or "").lower()
    # Check longest keys first to avoid "anti-cd20" matching "anti-cd20 ms"
    for fam_key in sorted(_DRUG_FAMILIES.keys(), key=len, reverse=True):
        if fam_key in family:
            return _DRUG_FAMILIES[fam_key]
    # Fallback: derive from drug_names
    names = record.drug_names or []
    key = names[0].lower() if names else "unknown"
    return {
        "key": key,
        "display": names[0].title() if names else "Unknown",
        "short": names[0][:3].upper() if names else "UNK",
        "reference": names[0] if names else "Unknown",
        "biosimilars": names[1:] if len(names) > 1 else [],
    }


def _friction_score(record: PolicyRecord) -> int:
    """Compute a simple 0-100 friction score from extracted policy fields."""
    score = 0
    # PA required adds significant burden
    if record.prior_authorization_required:
        score += 30
    # Step therapy requirements
    score += min(len(record.step_therapy_requirements or []) * 10, 25)
    # Diagnosis requirements
    score += min(len(record.diagnosis_requirements or []) * 5, 15)
    # Lab requirements
    score += min(len(record.lab_or_biomarker_requirements or []) * 5, 15)
    # Site of care restrictions
    if record.site_of_care_restrictions:
        score += 10
    # Prescriber requirements
    if record.prescriber_requirements:
        score += 5
    return min(score, 100)


def _map_coverage_status(status: str) -> str:
    """Map backend coverage_status to frontend-compatible values."""
    mapping = {
        "covered": "covered",
        "conditional": "conditional",
        "not_covered": "not_covered",
        "unclear": "unclear",
    }
    return mapping.get(status, "unclear")


@router.get("/matrix")
async def get_coverage_matrix(
    drug: Optional[str] = Query(None, description="Filter by canonical drug key"),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns CoverageMatrixData — a payer × drug grid of coverage cells.
    Shape matches apps/web/lib/types.ts → CoverageMatrixData.
    """
    stmt = select(PolicyRecord)
    result = await db.execute(stmt)
    records = list(result.scalars().all())

    # Optionally filter by drug key
    if drug:
        drug_lower = drug.lower()
        records = [
            r for r in records
            if _drug_info(r)["key"] == drug_lower
            or any(drug_lower in n.lower() for n in (r.drug_names or []))
        ]

    # Build payer registry (canonical — deduplicates Cigna / Cigna Healthcare)
    payer_ids: list[str] = []
    payer_labels: dict[str, str] = {}
    for r in records:
        pid = _payer_key(r.payer)
        if pid not in payer_labels:
            payer_ids.append(pid)
            payer_labels[pid] = _payer_label(r.payer)

    # Group records by drug key → list of records, skip "unknown" family
    drug_groups: dict[str, list[PolicyRecord]] = {}
    drug_meta: dict[str, dict] = {}
    for r in records:
        info = _drug_info(r)
        dk = info["key"]
        if dk == "unknown":
            continue  # skip site-of-care / cross-cutting docs without a drug
        drug_groups.setdefault(dk, []).append(r)
        drug_meta[dk] = info

    # Build matrix rows
    rows = []
    for dk, recs in drug_groups.items():
        meta = drug_meta[dk]
        cells: dict[str, dict] = {}
        for r in sorted(recs, key=lambda x: x.extraction_confidence or 0):
            pid = _payer_key(r.payer)
            # Higher confidence record wins (last write wins after sort)
            cells[pid] = {
                "policy_id": r.id,
                "coverage_status": _map_coverage_status(r.coverage_status),
                "friction_score": _friction_score(r),
                "pa_required": bool(r.prior_authorization_required),
                "effective_date": r.effective_date or "2024-01-01",
                "version_label": r.effective_date or "Current",
            }
        rows.append({
            "drug_key": dk,
            "drug_display_name": meta["display"],
            "drug_short_name": meta["short"],
            "reference_product": meta["reference"],
            "biosimilars": meta["biosimilars"],
            "cells": cells,
        })

    return {
        "payer_ids": payer_ids,
        "payer_labels": payer_labels,
        "rows": rows,
        "generated_at": datetime.now(UTC).isoformat(),
    }
