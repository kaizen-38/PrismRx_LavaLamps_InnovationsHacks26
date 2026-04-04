"""
Policy Fit Simulator endpoint — evaluates a patient case against all policies
for a given drug and returns fit scores + blocker analysis per payer.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
import uuid

from ..core.database import get_db
from ..models.policy import PolicyRecord

router = APIRouter(prefix="/api", tags=["simulate"])


# ── Request schema (matches frontend SimulationCase) ─────────────────────────

class SimulationCase(BaseModel):
    diagnosis: str
    icd10_code: str
    drug_key: str
    prior_therapies: list[str] = []
    specialty: str = ""
    care_setting: str = "infusion_center"
    age: int = 0
    labs: dict[str, str] = {}
    notes: str = ""


# ── Blocker detection helpers ─────────────────────────────────────────────────

def _check_step_therapy(case: SimulationCase, record: PolicyRecord) -> Optional[dict]:
    """Detect missing prior therapy failures."""
    requirements = record.step_therapy_requirements or []
    if not requirements:
        return None
    # Heuristic: count required failures vs provided
    if len(case.prior_therapies) == 0 and len(requirements) > 0:
        return {
            "type": "step_therapy_required",
            "severity": "hard",
            "description": f"Step therapy required: {requirements[0][:120]}",
            "resolution": "Document prior therapy trials or obtain exception from payer",
            "citation": None,
        }
    return None


def _check_site_of_care(case: SimulationCase, record: PolicyRecord) -> Optional[dict]:
    restrictions = record.site_of_care_restrictions or []
    if not restrictions:
        return None
    allowed = " ".join(restrictions).lower()
    setting = case.care_setting.lower().replace("_", " ")
    if setting not in allowed and "any" not in allowed:
        return {
            "type": "wrong_care_setting",
            "severity": "soft",
            "description": f"Care setting '{case.care_setting}' may not meet policy requirement: {restrictions[0][:100]}",
            "resolution": "Verify approved sites of care with payer; consider requesting authorization for alternate site",
            "citation": None,
        }
    return None


def _check_prescriber(case: SimulationCase, record: PolicyRecord) -> Optional[dict]:
    requirements = record.prescriber_requirements or []
    if not requirements:
        return None
    if not case.specialty:
        return {
            "type": "specialist_required",
            "severity": "soft",
            "description": f"Prescriber requirement: {requirements[0][:100]}",
            "resolution": f"Ensure prescriber specialty matches: {', '.join(requirements[:2])}",
            "citation": None,
        }
    return None


def _check_labs(case: SimulationCase, record: PolicyRecord) -> Optional[dict]:
    lab_reqs = record.lab_or_biomarker_requirements or []
    if not lab_reqs:
        return None
    if not case.labs:
        return {
            "type": "missing_lab",
            "severity": "soft",
            "description": f"Lab/biomarker documentation required: {lab_reqs[0][:100]}",
            "resolution": "Collect and document required lab results before submission",
            "citation": None,
        }
    return None


def _compute_fit_score(case: SimulationCase, record: PolicyRecord, blockers: list) -> int:
    """0-100; higher = better fit. Deduct per blocker severity."""
    score = 100
    for b in blockers:
        if b["severity"] == "hard":
            score -= 40
        else:
            score -= 15
    # PA adds mild friction but isn't a blocker
    if record.prior_authorization_required:
        score -= 5
    return max(0, score)


def _payer_key(payer: str) -> str:
    return payer.lower().replace(" ", "_").replace("/", "_")


# ── Route ─────────────────────────────────────────────────────────────────────

@router.post("/simulate")
async def run_simulation(
    case: SimulationCase,
    db: AsyncSession = Depends(get_db),
):
    """
    Evaluate a patient case against all policies for the requested drug.
    Returns SimulationResult[] matching apps/web/lib/types.ts.
    """
    drug_lower = case.drug_key.lower()
    result = await db.execute(select(PolicyRecord))
    all_records = list(result.scalars().all())

    # Filter to drug
    matching = [
        r for r in all_records
        if any(drug_lower in n.lower() for n in (r.drug_names or []))
        or (r.drug_family or "").lower().replace(" ", "_").startswith(drug_lower[:4])
    ]

    if not matching:
        raise HTTPException(status_code=404, detail=f"No policies found for drug: {case.drug_key}")

    results = []
    for record in matching:
        blockers = []
        for check in [_check_step_therapy, _check_site_of_care, _check_prescriber, _check_labs]:
            b = check(case, record)
            if b:
                blockers.append(b)

        fit_score = _compute_fit_score(case, record, blockers)

        # PA summary
        pa_parts = []
        if record.prior_authorization_required:
            pa_parts.append(f"{record.payer} requires prior authorization for {case.drug_key}.")
        if record.step_therapy_requirements:
            pa_parts.append(f"Step therapy: {record.step_therapy_requirements[0][:80]}...")
        if record.diagnosis_requirements:
            pa_parts.append(f"Diagnosis must include: {record.diagnosis_requirements[0][:60]}.")
        pa_summary = " ".join(pa_parts) or f"Policy allows {case.drug_key} with standard documentation."

        # Evidence checklist
        checklist = []
        if record.prior_authorization_required:
            checklist.append("Complete PA request form")
        checklist.append(f"Clinical note documenting {case.diagnosis}")
        if record.step_therapy_requirements:
            checklist.append("Documentation of prior therapy failures")
        if record.lab_or_biomarker_requirements:
            checklist.append("Relevant lab results / biomarker reports")
        if record.prescriber_requirements:
            checklist.append("Prescriber specialty credentials")
        checklist.append("Current medication list")

        # Next best action
        if not blockers:
            next_best = "Proceed with PA submission — no major blockers detected."
        elif any(b["severity"] == "hard" for b in blockers):
            next_best = "Address hard blockers before submission: " + blockers[0]["resolution"][:80]
        else:
            next_best = "Soft blockers present — submit with supporting documentation: " + blockers[0]["resolution"][:60]

        results.append({
            "case_id": str(uuid.uuid4()),
            "drug_key": case.drug_key,
            "payer_id": _payer_key(record.payer),
            "payer_name": record.payer,
            "coverage_status": record.coverage_status,
            "blockers": blockers,
            "fit_score": fit_score,
            "next_best_action": next_best,
            "pa_summary": pa_summary,
            "evidence_checklist": checklist,
        })

    # Sort best fit first
    results.sort(key=lambda r: r["fit_score"], reverse=True)
    return results
