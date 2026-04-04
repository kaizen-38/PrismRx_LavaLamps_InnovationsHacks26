"""Coverage matrix router for dashboard visualization."""

import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, distinct

from app.database import get_async_db
from app.models import CoveragePolicyDNA, Drug, Payer

logger = logging.getLogger(__name__)
router = APIRouter()


def calculate_friction_score(policy: CoveragePolicyDNA) -> float:
    """
    Calculate an access friction score (0-100).
    Higher = more restrictive/harder access.
    """
    score = 0.0
    
    # Prior auth adds friction
    if policy.prior_auth_required:
        score += 25
    
    # Step therapy adds friction
    if policy.step_therapy_required:
        score += 20
    
    # Clinical criteria complexity
    if policy.clinical_criteria and len(policy.clinical_criteria) > 100:
        score += 15
    
    # Reauth frequency
    if policy.reauth_interval_months and policy.reauth_interval_months < 12:
        score += 10
    
    # Peer-to-peer required
    if policy.peer_to_peer_required:
        score += 10
    
    return min(score, 100.0)


@router.get("/coverage")
async def get_coverage_matrix(
    drug_ids: Optional[str] = Query(None, description="Comma-separated drug IDs"),
    payer_ids: Optional[str] = Query(None, description="Comma-separated payer IDs"),
    therapeutic_area: Optional[str] = Query(None),
    coverage_status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get coverage matrix data for the dashboard.
    Returns grid-friendly format: drugs x payers.
    """
    try:
        # Parse filters
        drug_id_list = [d.strip() for d in drug_ids.split(",")] if drug_ids else None
        payer_id_list = [p.strip() for p in payer_ids.split(",")] if payer_ids else None
        
        # Get drugs
        drug_stmt = select(Drug).where(Drug.is_active == True)
        if drug_id_list:
            drug_stmt = drug_stmt.where(Drug.id.in_(drug_id_list))
        if therapeutic_area:
            drug_stmt = drug_stmt.where(Drug.therapeutic_area == therapeutic_area)
        
        drug_result = await db.execute(drug_stmt)
        drugs = drug_result.scalars().all()
        
        # Get payers
        payer_stmt = select(Payer).where(Payer.is_active == True)
        if payer_id_list:
            payer_stmt = payer_stmt.where(Payer.id.in_(payer_id_list))
        
        payer_result = await db.execute(payer_stmt)
        payers = payer_result.scalars().all()
        
        # Get all policies for these drugs/payers
        policy_stmt = select(CoveragePolicyDNA)
        if drugs:
            policy_stmt = policy_stmt.where(CoveragePolicyDNA.drug_id.in_([d.id for d in drugs]))
        if payers:
            policy_stmt = policy_stmt.where(CoveragePolicyDNA.payer_id.in_([p.id for p in payers]))
        if coverage_status:
            policy_stmt = policy_stmt.where(CoveragePolicyDNA.coverage_status == coverage_status)
        
        policy_result = await db.execute(policy_stmt)
        policies = policy_result.scalars().all()
        
        # Build matrix: group policies by drug_id and payer_id
        policy_map = {}
        for policy in policies:
            key = (str(policy.drug_id), str(policy.payer_id))
            policy_map[key] = policy
        
        # Build response
        matrix_data = []
        for drug in drugs:
            row = {
                "drug_id": str(drug.id),
                "brand_name": drug.brand_name,
                "generic_name": drug.generic_name,
                "j_code": drug.j_code,
                "therapeutic_area": drug.therapeutic_area,
                "payers": []
            }
            
            for payer in payers:
                key = (str(drug.id), str(payer.id))
                policy = policy_map.get(key)
                
                cell = {
                    "payer_id": str(payer.id),
                    "payer_name": payer.name,
                    "payer_color": payer.color_hex,
                    "coverage_status": policy.coverage_status if policy else "not_listed",
                    "prior_auth_required": policy.prior_auth_required if policy else False,
                    "step_therapy_required": policy.step_therapy_required if policy else False,
                    "friction_score": calculate_friction_score(policy) if policy else 0.0,
                    "policy_id": str(policy.id) if policy else None,
                    "effective_date": policy.effective_date.isoformat() if policy and policy.effective_date else None,
                }
                row["payers"].append(cell)
            
            matrix_data.append(row)
        
        return {
            "matrix": matrix_data,
            "total_drugs": len(drugs),
            "total_payers": len(payers),
            "total_cells": len(drugs) * len(payers),
            "total_policies": len(policies),
        }
        
    except Exception as e:
        logger.error(f"Error fetching coverage matrix: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/compare/{drug_id}")
async def compare_drug_across_payers(
    drug_id: str,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get side-by-side comparison of a drug across all payers.
    """
    try:
        # Get drug
        drug_stmt = select(Drug).where(Drug.id == drug_id)
        drug_result = await db.execute(drug_stmt)
        drug = drug_result.scalar_one_or_none()
        
        if not drug:
            raise HTTPException(status_code=404, detail="Drug not found")
        
        # Get all policies for this drug
        policy_stmt = select(CoveragePolicyDNA).where(CoveragePolicyDNA.drug_id == drug_id)
        policy_result = await db.execute(policy_stmt)
        policies = policy_result.scalars().all()
        
        # Enrich with payer information
        comparison_data = []
        for policy in policies:
            payer_stmt = select(Payer).where(Payer.id == policy.payer_id)
            payer_result = await db.execute(payer_stmt)
            payer = payer_result.scalar_one_or_none()
            
            comparison_data.append({
                "payer": payer.to_dict() if payer else None,
                "policy": policy.to_dict(),
                "friction_score": calculate_friction_score(policy),
            })
        
        # Sort by coverage status (covered first) then by friction score
        status_order = {"covered": 0, "covered_with_restrictions": 1, "not_covered": 2, "not_listed": 3}
        comparison_data.sort(
            key=lambda x: (status_order.get(x["policy"]["coverage_status"], 999), x["friction_score"])
        )
        
        return {
            "drug": drug.to_dict(),
            "comparison": comparison_data,
            "total_payers": len(comparison_data),
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error comparing drug: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/therapeutic-areas")
async def get_therapeutic_areas(db: AsyncSession = Depends(get_async_db)):
    """Get list of all therapeutic areas with drug counts."""
    try:
        stmt = select(distinct(Drug.therapeutic_area)).where(Drug.is_active == True)
        result = await db.execute(stmt)
        areas = result.scalars().all()
        
        areas_data = []
        for area in areas:
            stmt = select(Drug).where(
                (Drug.therapeutic_area == area) & (Drug.is_active == True)
            )
            count_result = await db.execute(stmt)
            drugs = count_result.scalars().all()
            
            areas_data.append({
                "name": area,
                "drug_count": len(drugs),
            })
        
        return {"therapeutic_areas": sorted(areas_data, key=lambda x: x["drug_count"], reverse=True)}
        
    except Exception as e:
        logger.error(f"Error fetching therapeutic areas: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/summary")
async def get_matrix_summary(db: AsyncSession = Depends(get_async_db)):
    """Get summary statistics for the coverage matrix."""
    try:
        # Get counts
        drug_result = await db.execute(select(Drug).where(Drug.is_active == True))
        total_drugs = len(drug_result.scalars().all())
        
        payer_result = await db.execute(select(Payer).where(Payer.is_active == True))
        total_payers = len(payer_result.scalars().all())
        
        policy_result = await db.execute(select(CoveragePolicyDNA))
        total_policies = len(policy_result.scalars().all())
        
        # Coverage status breakdown
        covered_result = await db.execute(
            select(CoveragePolicyDNA).where(CoveragePolicyDNA.coverage_status == "covered")
        )
        covered_count = len(covered_result.scalars().all())
        
        pa_result = await db.execute(
            select(CoveragePolicyDNA).where(CoveragePolicyDNA.prior_auth_required == True)
        )
        pa_count = len(pa_result.scalars().all())
        
        step_result = await db.execute(
            select(CoveragePolicyDNA).where(CoveragePolicyDNA.step_therapy_required == True)
        )
        step_count = len(step_result.scalars().all())
        
        return {
            "total_drugs": total_drugs,
            "total_payers": total_payers,
            "total_policies": total_policies,
            "covered_policies": covered_count,
            "policies_with_pa": pa_count,
            "policies_with_step_therapy": step_count,
        }
        
    except Exception as e:
        logger.error(f"Error fetching summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))
