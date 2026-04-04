"""
Pydantic schemas — API request/response contracts and internal data types.
These are the shared contracts between layers; ORM models stay in models/.
"""
from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime


# ── Citations ────────────────────────────────────────────────────────────────

class PolicyCitation(BaseModel):
    page: int
    section: Optional[str] = None
    quote: str
    confidence: float = Field(ge=0.0, le=1.0)


# ── Source document ───────────────────────────────────────────────────────────

class SourceDocumentOut(BaseModel):
    id: str
    payer: str
    drug_family: Optional[str]
    source_type: str
    source_uri: Optional[str]
    file_name: Optional[str]
    page_count: Optional[int]
    parse_status: str
    extracted: bool
    ingested_at: datetime

    class Config:
        from_attributes = True


# ── Policy DNA (canonical schema per Plan.md §8) ─────────────────────────────

class PolicyDocument(BaseModel):
    id: str
    source_document_id: Optional[str]
    payer: str
    plan_type: Literal["commercial", "exchange", "medicare", "medicaid", "unknown"] = "unknown"
    policy_number: Optional[str]
    effective_date: Optional[str]

    drug_family: Optional[str]
    drug_names: list[str] = []
    hcpcs_codes: list[str] = []

    coverage_status: Literal["covered", "conditional", "not_covered", "unclear"] = "unclear"
    covered_indications: list[str] = []

    prior_authorization_required: bool = False
    step_therapy_requirements: list[str] = []
    diagnosis_requirements: list[str] = []
    lab_or_biomarker_requirements: list[str] = []
    prescriber_requirements: list[str] = []
    site_of_care_restrictions: list[str] = []
    dose_frequency_rules: list[str] = []
    reauthorization_rules: list[str] = []
    preferred_product_notes: list[str] = []
    exclusions: list[str] = []

    citations: list[PolicyCitation] = []
    extraction_model: Optional[str]
    extraction_confidence: Optional[float]
    extracted_at: Optional[datetime]

    class Config:
        from_attributes = True


# ── Extraction result (raw output from Gemini before DB write) ────────────────

class ExtractionResult(BaseModel):
    """Intermediate type returned by the extractor before normalization."""
    payer: str
    plan_type: str = "unknown"
    policy_number: Optional[str] = None
    effective_date: Optional[str] = None
    drug_family: Optional[str] = None
    drug_names: list[str] = []
    hcpcs_codes: list[str] = []
    coverage_status: str = "unclear"
    covered_indications: list[str] = []
    prior_authorization_required: bool = False
    step_therapy_requirements: list[str] = []
    diagnosis_requirements: list[str] = []
    lab_or_biomarker_requirements: list[str] = []
    prescriber_requirements: list[str] = []
    site_of_care_restrictions: list[str] = []
    dose_frequency_rules: list[str] = []
    reauthorization_rules: list[str] = []
    preferred_product_notes: list[str] = []
    exclusions: list[str] = []
    citations: list[PolicyCitation] = []


# ── Ingest request ─────────────────────────────────────────────────────────────

class IngestURLRequest(BaseModel):
    url: str
    payer: str
    drug_family: Optional[str] = None
