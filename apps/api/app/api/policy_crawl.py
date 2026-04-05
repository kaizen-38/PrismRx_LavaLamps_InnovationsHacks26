"""
Live policy crawl endpoint.
Searches the web for a payer + drug policy document, crawls it, and returns the text.
Used by the frontend assistant to get document-grounded answers from Claude.
"""
from fastapi import APIRouter, Query

from ..services.crawler.policy_crawler import get_live_policy_text

router = APIRouter(prefix="/api", tags=["policy"])


@router.get("/policy/live")
async def live_policy_crawl(
    payer: str = Query(..., description="Payer name (e.g. 'UnitedHealthcare')"),
    drug: str = Query(..., description="Drug name or family (e.g. 'infliximab')"),
):
    """
    Dynamically searches the web for a policy document for the given payer + drug,
    crawls it, and returns the full extracted text.
    Used by the frontend to pass live document content to Claude for grounded Q&A.
    """
    return await get_live_policy_text(payer, drug)
