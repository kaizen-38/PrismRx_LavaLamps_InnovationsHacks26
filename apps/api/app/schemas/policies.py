"""Request and response schemas for policies API."""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class PolicyBasicSchema(BaseModel):
    """Basic policy information."""
    id: str
    title: str
    payer_id: str
    effective_date: datetime
    coverage_status: str
    prior_auth_required: bool
    step_therapy_required: bool

    class Config:
        from_attributes = True


class PolicyDetailSchema(PolicyBasicSchema):
    """Detailed policy information."""
    clinical_criteria: str
    indication: str
    source_page_numbers: Optional[List[int]] = None
    confidence_score: Optional[float] = None
    created_at: datetime
    updated_at: datetime


class CoverageMatrixCellSchema(BaseModel):
    """Single cell in the coverage matrix."""
    drug_id: str
    drug_brand_name: str
    payer_id: str
    payer_name: str
    coverage_status: str
    prior_auth_required: bool
    step_therapy_required: bool
    friction_score: Optional[float] = None
    effective_date: datetime
    policy_id: str


class CoverageMatrixSchema(BaseModel):
    """Coverage matrix response."""
    drugs: List[dict] = Field(default_factory=list)
    total: int
    page: int


class DrugDetailSchema(BaseModel):
    """Drug information with all payer coverage."""
    id: str
    brand_name: str
    generic_name: str
    j_code: Optional[str] = None
    therapeutic_area: str
    coverage: List[PolicyBasicSchema] = Field(default_factory=list)

    class Config:
        from_attributes = True
