"""Policy DNA model for normalized, structured policy data."""

import uuid
import json
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, Text, Integer, Float, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
import enum

from app.database import Base


class CoverageStatus(str, enum.Enum):
    """Coverage status for a drug under a policy."""
    COVERED = "covered"
    COVERED_WITH_RESTRICTIONS = "covered_with_restrictions"
    NOT_COVERED = "not_covered"
    NOT_LISTED = "not_listed"


class CoveragePolicyDNA(Base):
    """Normalized policy coverage data - the core intelligence object."""

    __tablename__ = "coverage_policies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    drug_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    payer_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    document_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    
    # Core coverage information
    indication = Column(String(200), nullable=False, index=True)
    coverage_status = Column(
        String(50),
        nullable=False,
        index=True,
        default=CoverageStatus.NOT_LISTED.value
    )
    
    # Prior authorization
    prior_auth_required = Column(Boolean, default=False, index=True)
    
    # Step therapy
    step_therapy_required = Column(Boolean, default=False, index=True)
    step_therapy_drugs = Column(JSONB, nullable=True)  # Array of {drug_name, min_duration_weeks}
    
    # Quantity and dosing limits
    quantity_limits = Column(JSONB, nullable=True)  # {max_dose, frequency, duration}
    age_restrictions = Column(JSONB, nullable=True)  # {min_age, max_age}
    
    # Clinical criteria
    clinical_criteria = Column(Text, nullable=False)
    criteria_structured = Column(JSONB, nullable=True)  # Array of {criterion, required: bool}
    
    # Administrative rules
    reauth_interval_months = Column(Integer, nullable=True)
    peer_to_peer_required = Column(Boolean, default=False)
    
    # Dates and sourcing
    effective_date = Column(DateTime, nullable=False)
    source_page_numbers = Column(ARRAY(Integer), nullable=True)
    confidence_score = Column(Float, nullable=True)  # 0.0-1.0
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<CoveragePolicyDNA(drug_id={self.drug_id}, payer_id={self.payer_id}, status={self.coverage_status})>"

    def to_dict(self):
        """Convert to dictionary."""
        return {
            "id": str(self.id),
            "drug_id": str(self.drug_id),
            "payer_id": str(self.payer_id),
            "document_id": str(self.document_id),
            "indication": self.indication,
            "coverage_status": self.coverage_status,
            "prior_auth_required": self.prior_auth_required,
            "step_therapy_required": self.step_therapy_required,
            "step_therapy_drugs": self.step_therapy_drugs,
            "quantity_limits": self.quantity_limits,
            "age_restrictions": self.age_restrictions,
            "clinical_criteria": self.clinical_criteria,
            "criteria_structured": self.criteria_structured,
            "reauth_interval_months": self.reauth_interval_months,
            "peer_to_peer_required": self.peer_to_peer_required,
            "effective_date": self.effective_date.isoformat() if self.effective_date else None,
            "source_page_numbers": self.source_page_numbers,
            "confidence_score": self.confidence_score,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class Payer(Base):
    """Health plan payer information."""

    __tablename__ = "payers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False, unique=True, index=True)
    slug = Column(String(50), nullable=False, unique=True, index=True)
    logo_url = Column(String(500), nullable=True)
    color_hex = Column(String(7), nullable=False, default="#3b82f6")
    website_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<Payer(id={self.id}, name={self.name})>"

    def to_dict(self):
        """Convert to dictionary."""
        return {
            "id": str(self.id),
            "name": self.name,
            "slug": self.slug,
            "logo_url": self.logo_url,
            "color_hex": self.color_hex,
            "website_url": self.website_url,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
