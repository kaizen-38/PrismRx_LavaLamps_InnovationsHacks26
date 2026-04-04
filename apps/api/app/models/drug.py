"""Drug model for storing medical benefit drugs."""

import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, Text, ARRAY
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class Drug(Base):
    """Drug entity for medical benefit tracking."""

    __tablename__ = "drugs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    brand_name = Column(String(100), nullable=False, index=True)
    generic_name = Column(String(200), nullable=False, index=True)
    j_code = Column(String(10), nullable=True, unique=True, index=True)
    ndc_codes = Column(ARRAY(String), nullable=True)
    therapeutic_area = Column(String(100), nullable=False, index=True)
    mechanism = Column(String(200), nullable=True)
    fda_approved_indications = Column(Text, nullable=True)  # Stored as JSON string
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<Drug(id={self.id}, brand_name={self.brand_name}, j_code={self.j_code})>"

    def to_dict(self):
        """Convert to dictionary."""
        return {
            "id": str(self.id),
            "brand_name": self.brand_name,
            "generic_name": self.generic_name,
            "j_code": self.j_code,
            "ndc_codes": self.ndc_codes,
            "therapeutic_area": self.therapeutic_area,
            "mechanism": self.mechanism,
            "fda_approved_indications": self.fda_approved_indications,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
