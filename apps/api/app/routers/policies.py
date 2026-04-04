"""Policies router for querying coverage information."""

import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.database import get_async_db
from app.models import CoveragePolicyDNA, Drug, Payer
from app.schemas.policies import PolicyDetailSchema, DrugDetailSchema

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/drug/{drug_id}")
async def get_drug_coverage(
    drug_id: str,
    payer_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get coverage information for a specific drug.
    Optionally filter by payer.
    """
    try:
        # Get drug details
        stmt = select(Drug).where(Drug.id == drug_id)
        result = await db.execute(stmt)
        drug = result.scalar_one_or_none()
        
        if not drug:
            raise HTTPException(status_code=404, detail="Drug not found")
        
        # Get coverage policies
        stmt = select(CoveragePolicyDNA).where(CoveragePolicyDNA.drug_id == drug_id)
        if payer_id:
            stmt = stmt.where(CoveragePolicyDNA.payer_id == payer_id)
        
        result = await db.execute(stmt)
        policies = result.scalars().all()
        
        # Enrich with payer information
        coverage = []
        for policy in policies:
            payer_stmt = select(Payer).where(Payer.id == policy.payer_id)
            payer_result = await db.execute(payer_stmt)
            payer = payer_result.scalar_one_or_none()
            
            coverage.append({
                **policy.to_dict(),
                "payer": payer.to_dict() if payer else None
            })
        
        return {
            "drug": drug.to_dict(),
            "coverage": coverage,
            "total_payers": len(coverage),
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching drug coverage: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/payer/{payer_id}/drugs")
async def get_payer_drugs(
    payer_id: str,
    area: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get all drugs covered by a payer.
    Optionally filter by therapeutic area.
    """
    try:
        # Get policies for this payer
        stmt = select(CoveragePolicyDNA).where(CoveragePolicyDNA.payer_id == payer_id)
        result = await db.execute(stmt)
        policies = result.scalars().all()
        
        # Get unique drugs
        drug_ids = set(p.drug_id for p in policies)
        
        drugs_data = []
        for drug_id in drug_ids:
            stmt = select(Drug).where(Drug.id == drug_id)
            result = await db.execute(stmt)
            drug = result.scalar_one_or_none()
            
            if drug and (not area or drug.therapeutic_area == area):
                # Get this drug's policies for this payer
                drug_policies = [p for p in policies if p.drug_id == drug_id]
                drugs_data.append({
                    "drug": drug.to_dict(),
                    "policies": [p.to_dict() for p in drug_policies],
                })
        
        return {
            "payer_id": payer_id,
            "drugs": drugs_data,
            "total": len(drugs_data),
        }
        
    except Exception as e:
        logger.error(f"Error fetching payer drugs: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/search")
async def search_policies(
    drug_name: Optional[str] = Query(None),
    j_code: Optional[str] = Query(None),
    payer_id: Optional[str] = Query(None),
    indication: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(25, ge=1, le=100),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Search policies by drug name, J-code, payer, or indication.
    """
    try:
        # Start with policies
        stmt = select(CoveragePolicyDNA)
        
        # Apply filters
        if payer_id:
            stmt = stmt.where(CoveragePolicyDNA.payer_id == payer_id)
        
        if indication:
            stmt = stmt.where(CoveragePolicyDNA.indication.ilike(f"%{indication}%"))
        
        # If drug filter, need to join with drugs
        if drug_name or j_code:
            stmt = stmt.join(Drug)
            if drug_name:
                stmt = stmt.where(
                    (Drug.brand_name.ilike(f"%{drug_name}%")) |
                    (Drug.generic_name.ilike(f"%{drug_name}%"))
                )
            if j_code:
                stmt = stmt.where(Drug.j_code == j_code)
        
        # Get total count
        count_result = await db.execute(select(CoveragePolicyDNA).count())
        total = count_result.scalar()
        
        # Apply pagination
        stmt = stmt.offset(skip).limit(limit)
        result = await db.execute(stmt)
        policies = result.scalars().all()
        
        return {
            "results": [p.to_dict() for p in policies],
            "total": total,
            "skip": skip,
            "limit": limit,
        }
        
    except Exception as e:
        logger.error(f"Error searching policies: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{policy_id}")
async def get_policy_detail(
    policy_id: str,
    db: AsyncSession = Depends(get_async_db)
):
    """Get detailed information about a specific policy."""
    try:
        stmt = select(CoveragePolicyDNA).where(CoveragePolicyDNA.id == policy_id)
        result = await db.execute(stmt)
        policy = result.scalar_one_or_none()
        
        if not policy:
            raise HTTPException(status_code=404, detail="Policy not found")
        
        # Get related drug and payer
        drug_stmt = select(Drug).where(Drug.id == policy.drug_id)
        drug_result = await db.execute(drug_stmt)
        drug = drug_result.scalar_one_or_none()
        
        payer_stmt = select(Payer).where(Payer.id == policy.payer_id)
        payer_result = await db.execute(payer_stmt)
        payer = payer_result.scalar_one_or_none()
        
        return {
            "policy": policy.to_dict(),
            "drug": drug.to_dict() if drug else None,
            "payer": payer.to_dict() if payer else None,
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching policy detail: {e}")
        raise HTTPException(status_code=500, detail=str(e))
