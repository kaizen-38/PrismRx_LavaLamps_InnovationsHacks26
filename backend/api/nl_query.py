"""
Natural language query endpoint — Gemini interprets free-text questions
and returns relevant policy data.
"""
import os
import json
import google.generativeai as genai
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from dotenv import load_dotenv

from ..database.db import get_db
from ..database.models import PolicyRecord

load_dotenv()
genai.configure(api_key=os.environ["GEMINI_API_KEY"])
model = genai.GenerativeModel("gemini-1.5-flash")

router = APIRouter(prefix="/api")


class NLQueryRequest(BaseModel):
    question: str


@router.post("/query")
def natural_language_query(req: NLQueryRequest, db: Session = Depends(get_db)):
    """
    Accept a natural language question and return a Gemini-powered answer
    grounded in the stored policies.
    """
    policies = db.query(PolicyRecord).all()
    if not policies:
        return {"answer": "No policies have been ingested yet.", "sources": []}

    # Build a compact context of all policies
    context_lines = []
    for p in policies:
        line = (
            f"[{p.payer}] {p.drug_name}: "
            f"PA={'yes' if p.prior_auth_required else 'no'}, "
            f"StepTherapy={'yes' if p.step_therapy_required else 'no'}, "
            f"Indications={p.covered_indications[:3]}"
        )
        context_lines.append(line)
    context = "\n".join(context_lines)

    prompt = f"""You are a medical benefit policy analyst assistant.
Answer the following question using ONLY the policy data provided below.
Be concise and accurate. If the answer is not in the data, say so.

POLICY DATA:
{context}

QUESTION: {req.question}
"""
    response = model.generate_content(prompt)
    return {"answer": response.text.strip(), "sources": [p.id for p in policies[:5]]}
