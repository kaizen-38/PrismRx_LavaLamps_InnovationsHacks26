"""
SQLAlchemy ORM models — persisted policy records and source manifest.
"""
from sqlalchemy import Column, String, Boolean, Text, DateTime, JSON, Float, Integer
from sqlalchemy.orm import DeclarativeBase
from datetime import datetime
import uuid


class Base(DeclarativeBase):
    pass


class SourceDocument(Base):
    """Tracks every raw document we've ingested."""
    __tablename__ = "source_documents"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    payer = Column(String, nullable=False, index=True)
    drug_family = Column(String, nullable=True, index=True)
    source_type = Column(String, nullable=False)   # pdf | html
    source_uri = Column(String, nullable=True)     # original URL or file path
    file_name = Column(String, nullable=True)
    file_hash = Column(String, nullable=True, unique=True)  # sha256 — dedup
    page_count = Column(Integer, nullable=True)
    raw_text = Column(Text, nullable=True)
    parse_status = Column(String, default="pending")  # pending|parsed|failed
    extracted = Column(Boolean, default=False)
    ingested_at = Column(DateTime, default=datetime.utcnow)


class PolicyRecord(Base):
    """Canonical normalized policy extracted from a source document."""
    __tablename__ = "policies"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    source_document_id = Column(String, nullable=True, index=True)

    # Identity
    payer = Column(String, nullable=False, index=True)
    plan_type = Column(String, default="unknown")  # commercial|exchange|medicare|medicaid|unknown
    policy_number = Column(String, nullable=True)
    effective_date = Column(String, nullable=True)

    # Drug
    drug_family = Column(String, nullable=True, index=True)
    drug_names = Column(JSON, default=list)        # [generic, brand, ...]
    hcpcs_codes = Column(JSON, default=list)       # J-codes

    # Coverage
    coverage_status = Column(String, default="unclear")  # covered|conditional|not_covered|unclear
    covered_indications = Column(JSON, default=list)

    # Clinical criteria
    prior_authorization_required = Column(Boolean, default=False)
    step_therapy_requirements = Column(JSON, default=list)
    diagnosis_requirements = Column(JSON, default=list)
    lab_or_biomarker_requirements = Column(JSON, default=list)
    prescriber_requirements = Column(JSON, default=list)
    site_of_care_restrictions = Column(JSON, default=list)
    dose_frequency_rules = Column(JSON, default=list)
    reauthorization_rules = Column(JSON, default=list)
    preferred_product_notes = Column(JSON, default=list)
    exclusions = Column(JSON, default=list)

    # Citations — [{page, section, quote, confidence}]
    citations = Column(JSON, default=list)

    # Extraction metadata
    extraction_model = Column(String, nullable=True)
    extraction_confidence = Column(Float, nullable=True)
    extracted_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
