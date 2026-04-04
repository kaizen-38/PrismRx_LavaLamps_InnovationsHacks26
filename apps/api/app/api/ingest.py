"""
Ingest API routes — file upload and URL ingestion.
"""
from fastapi import APIRouter, UploadFile, File, Depends, Query, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from ..core.database import get_db
from ..pipelines.ingest_pipeline import run_ingest
from ..schemas.policy import IngestURLRequest

router = APIRouter(prefix="/api/ingest", tags=["ingest"])


@router.post("/local")
async def ingest_local(
    file: UploadFile = File(...),
    payer: str = Query(..., description="Payer name e.g. 'UnitedHealthcare'"),
    drug_family: Optional[str] = Query(None, description="e.g. 'TNF Inhibitors'"),
    db: AsyncSession = Depends(get_db),
):
    """Upload a PDF policy document and run the full extraction pipeline."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    data = await file.read()
    result = await run_ingest(
        db=db,
        payer=payer,
        drug_family=drug_family,
        file_bytes=data,
        file_name=file.filename,
    )

    if result.status == "duplicate":
        return JSONResponse(status_code=200, content={
            "status": "duplicate",
            "source_document_id": result.source_document_id,
            "message": "Document already ingested",
        })
    if result.status in ("parse_failed", "extract_failed"):
        raise HTTPException(status_code=422, detail=result.error)

    return {
        "status": "ok",
        "source_document_id": result.source_document_id,
        "policy_id": result.policy_id,
        "drug_names": result.drug_names,
        "payer": result.payer,
    }


@router.post("/url")
async def ingest_url(
    req: IngestURLRequest,
    db: AsyncSession = Depends(get_db),
):
    """Fetch a policy from a URL (PDF or HTML) and run extraction."""
    result = await run_ingest(
        db=db,
        payer=req.payer,
        drug_family=req.drug_family,
        url=req.url,
    )

    if result.status == "duplicate":
        return JSONResponse(status_code=200, content={
            "status": "duplicate",
            "source_document_id": result.source_document_id,
        })
    if result.status in ("parse_failed", "extract_failed"):
        raise HTTPException(status_code=422, detail=result.error)

    return {
        "status": "ok",
        "source_document_id": result.source_document_id,
        "policy_id": result.policy_id,
        "drug_names": result.drug_names,
        "payer": result.payer,
    }
