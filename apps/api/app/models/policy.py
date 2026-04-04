"""Policy document model for storing medical policy documents and their metadata."""

import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, Text, Integer, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
import enum

from app.database import Base


class ParsingStatus(str, enum.Enum):
    """Status of policy document parsing."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class PolicyDocument(Base):
    """Raw policy document storage with parsing metadata."""

    __tablename__ = "policy_documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    payer_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    title = Column(String(300), nullable=False)
    policy_number = Column(String(50), nullable=True)
    effective_date = Column(DateTime, nullable=False)
    expiry_date = Column(DateTime, nullable=True)
    pdf_storage_path = Column(String(500), nullable=False)
    pdf_hash = Column(String(64), nullable=False, unique=True, index=True)
    page_count = Column(Integer, nullable=True)
    raw_text = Column(Text, nullable=True)
    parsing_status = Column(
        Enum(ParsingStatus),
        default=ParsingStatus.PENDING,
        nullable=False,
        index=True
    )
    parsed_at = Column(DateTime, nullable=True)
    version = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<PolicyDocument(id={self.id}, title={self.title}, status={self.parsing_status})>"

    def to_dict(self):
        """Convert to dictionary."""
        return {
            "id": str(self.id),
            "payer_id": str(self.payer_id),
            "title": self.title,
            "policy_number": self.policy_number,
            "effective_date": self.effective_date.isoformat() if self.effective_date else None,
            "expiry_date": self.expiry_date.isoformat() if self.expiry_date else None,
            "pdf_storage_path": self.pdf_storage_path,
            "pdf_hash": self.pdf_hash,
            "page_count": self.page_count,
            "parsing_status": self.parsing_status.value,
            "parsed_at": self.parsed_at.isoformat() if self.parsed_at else None,
            "version": self.version,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
