"""
FastAPI routes — policy ingestion, search, comparison, and NL query.
"""
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional
import tempfile, os

from ..database.db import get_db
from ..database.models import PolicyRecord
from ..ingestion.pdf_parser import parse_pdf
from ..extraction.policy_extractor import extract_policy
from ..normalization.normalizer import normalize_policy

router = APIRouter(prefix="/api")


@router.post("/ingest")
async def ingest_policy(
    file: UploadFile = File(...),
    payer: str = Query(..., description="Payer / health plan name"),
    db: Session = Depends(get_db),
):
    """Upload and process a policy PDF."""
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        parsed = parse_pdf(tmp_path)
        extracted = extract_policy(parsed["full_text"], payer_hint=payer)
        normalized = normalize_policy(extracted, source_file=file.filename, payer=payer)

        record = PolicyRecord(**{k: v for k, v in normalized.items() if k != "ingested_at"})
        record.raw_text = parsed["full_text"][:5000]
        db.add(record)
        db.commit()
        db.refresh(record)
        return {"id": record.id, "drug_name": record.drug_name, "payer": record.payer}
    finally:
        os.unlink(tmp_path)


@router.get("/policies")
def list_policies(
    drug: Optional[str] = None,
    payer: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """List all policies, optionally filtered by drug or payer."""
    q = db.query(PolicyRecord)
    if drug:
        q = q.filter(PolicyRecord.drug_name.ilike(f"%{drug}%"))
    if payer:
        q = q.filter(PolicyRecord.payer.ilike(f"%{payer}%"))
    return q.all()


@router.get("/compare")
def compare_drug(drug: str, db: Session = Depends(get_db)):
    """Return all payer policies for a given drug for side-by-side comparison."""
    results = db.query(PolicyRecord).filter(PolicyRecord.drug_name.ilike(f"%{drug}%")).all()
    if not results:
        raise HTTPException(status_code=404, detail="No policies found for that drug")
    return results


@router.get("/payers")
def list_payers(db: Session = Depends(get_db)):
    """Return distinct payers in the database."""
    payers = db.query(PolicyRecord.payer).distinct().all()
    return [p[0] for p in payers]


@router.get("/drugs")
def list_drugs(db: Session = Depends(get_db)):
    """Return distinct drug names in the database."""
    drugs = db.query(PolicyRecord.drug_name).distinct().all()
    return [d[0] for d in drugs]
