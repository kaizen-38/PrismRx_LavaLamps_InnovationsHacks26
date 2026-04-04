"""
Policy read routes — list, get, sources.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional

from ..core.database import get_db
from ..models.policy import PolicyRecord, SourceDocument
from ..schemas.policy import PolicyDocument, SourceDocumentOut

router = APIRouter(prefix="/api", tags=["policies"])


@router.get("/policies", response_model=list[PolicyDocument])
async def list_policies(
    drug: Optional[str] = Query(None),
    payer: Optional[str] = Query(None),
    drug_family: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(PolicyRecord)
    if payer:
        stmt = stmt.where(PolicyRecord.payer.ilike(f"%{payer}%"))
    if drug_family:
        stmt = stmt.where(PolicyRecord.drug_family.ilike(f"%{drug_family}%"))
    result = await db.execute(stmt)
    records = result.scalars().all()

    if drug:
        drug_lower = drug.lower()
        records = [
            r for r in records
            if any(drug_lower in n.lower() for n in (r.drug_names or []))
        ]

    return records


@router.get("/policies/{policy_id}", response_model=PolicyDocument)
async def get_policy(policy_id: str, db: AsyncSession = Depends(get_db)):
    record = await db.get(PolicyRecord, policy_id)
    if not record:
        raise HTTPException(status_code=404, detail="Policy not found")
    return record


@router.get("/sources", response_model=list[SourceDocumentOut])
async def list_sources(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SourceDocument))
    return result.scalars().all()


@router.get("/health")
async def health():
    return {"status": "ok", "service": "PrismRx API"}
