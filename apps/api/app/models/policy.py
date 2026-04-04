"""
SQLAlchemy ORM models — persisted policy records and source manifest.
Merged: rhythm's schema (canonical Policy DNA) + sam's ParsingStatus enum.
"""
from sqlalchemy import Column, String, Boolean, Text, DateTime, JSON, Float, Integer, Enum
from sqlalchemy.orm import DeclarativeBase
from datetime import datetime
import uuid
import enum


class Base(DeclarativeBase):
    pass


class ParsingStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class SourceDocument(Base):
    """Tracks every raw document we've ingested."""
    __tablename__ = "source_documents"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    payer = Column(String, nullable=False, index=True)
    drug_family = Column(String, nullable=True, index=True)
    source_type = Column(String, nullable=False)   # pdf | html
    source_uri = Column(String, nullable=True)
    file_name = Column(String, nullable=True)
    file_hash = Column(String, nullable=True, unique=True)  # sha256 dedup
    page_count = Column(Integer, nullable=True)
    raw_text = Column(Text, nullable=True)
    parse_status = Column(
        Enum(ParsingStatus),
        default=ParsingStatus.PENDING,
        nullable=False,
        index=True,
    )
    extracted = Column(Boolean, default=False)
    ingested_at = Column(DateTime, default=datetime.utcnow)
    parsed_at = Column(DateTime, nullable=True)
    version = Column(Integer, default=1, nullable=False)


class PolicyRecord(Base):
    """Canonical normalized policy extracted from a source document."""
    __tablename__ = "policies"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    source_document_id = Column(String, nullable=True, index=True)

    # Identity
    payer = Column(String, nullable=False, index=True)
    plan_type = Column(String, default="unknown")
    policy_number = Column(String, nullable=True)
    effective_date = Column(String, nullable=True)

    # Drug
    drug_family = Column(String, nullable=True, index=True)
    drug_names = Column(JSON, default=list)
    hcpcs_codes = Column(JSON, default=list)

    # Coverage
    coverage_status = Column(String, default="unclear")
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

    # Citations
    citations = Column(JSON, default=list)

    # Extraction metadata
    extraction_model = Column(String, nullable=True)
    extraction_confidence = Column(Float, nullable=True)
    extracted_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
