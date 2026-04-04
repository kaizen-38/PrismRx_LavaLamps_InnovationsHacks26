"""Ingest router for uploading and parsing policy documents."""

import logging
import os
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, File, UploadFile, Form, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_async_db
from app.config import settings
from app.services.parser import pdf_parser
from app.models import PolicyDocument, ParsingStatus, Payer
from sqlalchemy import select

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/upload-policy")
async def upload_policy(
    file: UploadFile = File(...),
    payer_id: str = Form(...),
    effective_date: str = Form(...),
    policy_number: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Upload a new policy document for parsing.
    
    This endpoint accepts a PDF file and stores it for parsing.
    The parser will extract text, preserve page numbers, and create chunks.
    """
    try:
        if not file.filename.endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are supported")
        
        # Save uploaded file
        os.makedirs(settings.STORAGE_PATH, exist_ok=True)
        file_path = os.path.join(settings.STORAGE_PATH, file.filename)
        
        contents = await file.read()
        with open(file_path, 'wb') as f:
            f.write(contents)
        
        logger.info(f"Saved uploaded file to {file_path}")
        
        # Parse the PDF immediately
        parsed_doc = pdf_parser.parse_pdf(
            file_path=file_path,
            payer_name=payer_id,
            source_url=None
        )
        
        # Store policy document in database
        policy_doc = PolicyDocument(
            payer_id=payer_id,
            title=file.filename,
            policy_number=policy_number,
            effective_date=datetime.fromisoformat(effective_date),
            pdf_storage_path=file_path,
            pdf_hash=parsed_doc.document_hash,
            page_count=parsed_doc.page_count,
            raw_text=parsed_doc.raw_text,
            parsing_status=ParsingStatus.COMPLETED if not parsed_doc.extraction_errors else ParsingStatus.COMPLETED,
            parsed_at=datetime.utcnow()
        )
        
        db.add(policy_doc)
        await db.commit()
        await db.refresh(policy_doc)
        
        logger.info(f"Created policy document: {policy_doc.id}")
        
        return {
            "message": "Policy uploaded and parsed successfully",
            "policy_id": str(policy_doc.id),
            "page_count": parsed_doc.page_count,
            "chunks_extracted": len(parsed_doc.chunks),
            "extraction_errors": parsed_doc.extraction_errors,
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading policy: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.get("/status/{policy_id}")
async def get_parsing_status(
    policy_id: str,
    db: AsyncSession = Depends(get_async_db)
):
    """Check the parsing status of an uploaded policy document."""
    try:
        stmt = select(PolicyDocument).where(PolicyDocument.id == policy_id)
        result = await db.execute(stmt)
        policy = result.scalar_one_or_none()
        
        if not policy:
            raise HTTPException(status_code=404, detail="Policy not found")
        
        return policy.to_dict()
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def ingest_health(db: AsyncSession = Depends(get_async_db)):
    """Health check for ingest service."""
    try:
        # Test database connection
        stmt = select(PolicyDocument).limit(1)
        await db.execute(stmt)
        
        return {
            "status": "healthy",
            "service": "ingest",
            "storage_path": settings.STORAGE_PATH,
            "storage_exists": os.path.exists(settings.STORAGE_PATH)
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=500, detail="Service unhealthy")
