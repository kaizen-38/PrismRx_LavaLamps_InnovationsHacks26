"""
Normalizer — maps extracted policy dicts to a canonical schema
so policies from different payers can be compared apples-to-apples.
"""
from datetime import datetime
from typing import Optional


def normalize_policy(raw: dict, source_file: str = "", payer: str = "") -> dict:
    """
    Normalize an extracted policy dict into the canonical PolicyRecord schema.
    """
    return {
        "drug_name": (raw.get("drug_name") or "").strip().lower(),
        "brand_names": [b.strip() for b in (raw.get("brand_names") or [])],
        "hcpcs_codes": [c.strip().upper() for c in (raw.get("hcpcs_codes") or [])],
        "payer": (raw.get("payer") or payer).strip(),
        "covered_indications": raw.get("covered_indications") or [],
        "prior_auth_required": bool(raw.get("prior_auth_required")),
        "prior_auth_criteria": raw.get("prior_auth_criteria") or [],
        "step_therapy_required": bool(raw.get("step_therapy_required")),
        "step_therapy_criteria": raw.get("step_therapy_criteria") or [],
        "site_of_care_restrictions": raw.get("site_of_care_restrictions") or [],
        "effective_date": _parse_date(raw.get("effective_date")),
        "policy_number": raw.get("policy_number"),
        "source_file": source_file,
        "ingested_at": datetime.utcnow().isoformat(),
    }


def _parse_date(val: Optional[str]) -> Optional[str]:
    if not val:
        return None
    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%B %d, %Y", "%b %d, %Y"):
        try:
            return datetime.strptime(val.strip(), fmt).strftime("%Y-%m-%d")
        except (ValueError, AttributeError):
            continue
    return val  # return as-is if unparseable
