"""
Change Radar / Policy Diff endpoint — computes cross-version policy changes.
For the current dataset (single version per payer/drug), generates synthetic
diffs showing key policy differences between payers for demo purposes.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
import uuid

from ..core.database import get_db
from ..models.policy import PolicyRecord

router = APIRouter(prefix="/api", tags=["diff"])


def _payer_key(payer: str) -> str:
    return payer.lower().replace(" ", "_").replace("/", "_")


def _drug_key(record: PolicyRecord) -> str:
    names = record.drug_names or []
    return names[0].lower() if names else (record.drug_family or "unknown").lower()


def _friction_score(record: PolicyRecord) -> int:
    score = 0
    if record.prior_authorization_required:
        score += 30
    score += min(len(record.step_therapy_requirements or []) * 10, 25)
    score += min(len(record.diagnosis_requirements or []) * 5, 15)
    score += min(len(record.lab_or_biomarker_requirements or []) * 5, 15)
    if record.site_of_care_restrictions:
        score += 10
    if record.prescriber_requirements:
        score += 5
    return min(score, 100)


def _build_changes(before: PolicyRecord, after: PolicyRecord) -> list[dict]:
    """Build a list of PolicyChange objects comparing two records."""
    changes = []

    # Coverage status change
    if before.coverage_status != after.coverage_status:
        changes.append({
            "field": "coverage_status",
            "field_label": "Coverage Status",
            "change_type": "tightened" if after.coverage_status in ("not_covered", "unclear") else "loosened",
            "before": before.coverage_status,
            "after": after.coverage_status,
            "impact": "high",
            "citation_before": None,
            "citation_after": None,
        })

    # PA requirement
    if before.prior_authorization_required != after.prior_authorization_required:
        changes.append({
            "field": "prior_authorization_required",
            "field_label": "Prior Authorization",
            "change_type": "tightened" if after.prior_authorization_required else "loosened",
            "before": "Required" if before.prior_authorization_required else "Not required",
            "after": "Required" if after.prior_authorization_required else "Not required",
            "impact": "high",
            "citation_before": None,
            "citation_after": None,
        })

    # Step therapy count change
    before_steps = len(before.step_therapy_requirements or [])
    after_steps = len(after.step_therapy_requirements or [])
    if before_steps != after_steps:
        changes.append({
            "field": "step_therapy_requirements",
            "field_label": "Step Therapy Requirements",
            "change_type": "tightened" if after_steps > before_steps else "loosened",
            "before": f"{before_steps} requirement(s)",
            "after": f"{after_steps} requirement(s)",
            "impact": "high" if abs(after_steps - before_steps) > 1 else "medium",
            "citation_before": None,
            "citation_after": None,
        })

    # Site of care
    before_soc = len(before.site_of_care_restrictions or [])
    after_soc = len(after.site_of_care_restrictions or [])
    if before_soc != after_soc:
        changes.append({
            "field": "site_of_care_restrictions",
            "field_label": "Site of Care Restrictions",
            "change_type": "tightened" if after_soc > before_soc else "loosened",
            "before": f"{before_soc} restriction(s)",
            "after": f"{after_soc} restriction(s)",
            "impact": "medium",
            "citation_before": None,
            "citation_after": None,
        })

    # Effective date
    if before.effective_date != after.effective_date:
        changes.append({
            "field": "effective_date",
            "field_label": "Effective Date",
            "change_type": "added",
            "before": before.effective_date or "N/A",
            "after": after.effective_date or "N/A",
            "impact": "low",
            "citation_before": None,
            "citation_after": None,
        })

    return changes


@router.get("/diff")
async def get_diffs(
    drug: Optional[str] = Query(None, description="Filter by drug key"),
    payer: Optional[str] = Query(None, description="Filter by payer ID"),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns PolicyDiff[] for the Change Radar component.
    When multiple payers cover the same drug, generates cross-payer diffs.
    Returns frontend-compatible PolicyDiff shape from apps/web/lib/types.ts.
    """
    result = await db.execute(select(PolicyRecord))
    all_records = list(result.scalars().all())

    # Apply filters
    if drug:
        drug_lower = drug.lower()
        all_records = [
            r for r in all_records
            if any(drug_lower in n.lower() for n in (r.drug_names or []))
        ]
    if payer:
        all_records = [
            r for r in all_records
            if _payer_key(r.payer) == payer
        ]

    # Group by canonical drug key
    drug_groups: dict[str, list[PolicyRecord]] = {}
    for r in all_records:
        dk = _drug_key(r)
        drug_groups.setdefault(dk, []).append(r)

    diffs = []
    for dk, records in drug_groups.items():
        if len(records) < 2:
            continue  # Need at least 2 records to diff

        # Generate pairwise diffs (first vs each subsequent)
        base = records[0]
        for compare in records[1:]:
            friction_before = _friction_score(base)
            friction_after = _friction_score(compare)
            friction_delta = friction_after - friction_before

            changes = _build_changes(base, compare)

            if friction_delta > 5:
                direction = "tightened"
            elif friction_delta < -5:
                direction = "loosened"
            else:
                direction = "unchanged"

            # Get drug display name
            drug_names = base.drug_names or []
            drug_display = drug_names[0].title() if drug_names else dk.title()

            diffs.append({
                "id": str(uuid.uuid4()),
                "drug_key": dk,
                "drug_display_name": drug_display,
                "payer_id": _payer_key(base.payer),
                "payer_name": f"{base.payer} vs {compare.payer}",
                "version_before": base.effective_date or "Q1 2026",
                "version_after": compare.effective_date or "Q2 2026",
                "date_before": base.effective_date or "2026-01-01",
                "date_after": compare.effective_date or "2026-04-01",
                "overall_direction": direction,
                "friction_before": friction_before,
                "friction_after": friction_after,
                "friction_delta": friction_delta,
                "changes": changes,
            })

    return diffs
