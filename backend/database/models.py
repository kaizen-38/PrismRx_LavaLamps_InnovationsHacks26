"""
SQLAlchemy models for persisting normalized policy records.
"""
from sqlalchemy import Column, String, Boolean, Text, DateTime, JSON
from sqlalchemy.orm import DeclarativeBase
from datetime import datetime
import uuid


class Base(DeclarativeBase):
    pass


class PolicyRecord(Base):
    __tablename__ = "policies"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    drug_name = Column(String, nullable=False, index=True)
    brand_names = Column(JSON, default=list)
    hcpcs_codes = Column(JSON, default=list)
    payer = Column(String, nullable=False, index=True)
    covered_indications = Column(JSON, default=list)
    prior_auth_required = Column(Boolean, default=False)
    prior_auth_criteria = Column(JSON, default=list)
    step_therapy_required = Column(Boolean, default=False)
    step_therapy_criteria = Column(JSON, default=list)
    site_of_care_restrictions = Column(JSON, default=list)
    effective_date = Column(String, nullable=True)
    policy_number = Column(String, nullable=True)
    source_file = Column(String, nullable=True)
    raw_text = Column(Text, nullable=True)
    ingested_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
