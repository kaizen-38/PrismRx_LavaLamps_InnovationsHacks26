"""
Policy Extractor — uses Gemini to extract structured fields from raw policy text.

Extracted fields per policy:
  - drug_name
  - brand_names
  - hcpcs_codes (J-codes)
  - payer
  - covered_indications
  - prior_auth_required (bool)
  - prior_auth_criteria
  - step_therapy_required (bool)
  - step_therapy_criteria
  - site_of_care_restrictions
  - effective_date
  - raw_text (truncated)
"""
import os
import json
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

genai.configure(api_key=os.environ["GEMINI_API_KEY"])
model = genai.GenerativeModel("gemini-1.5-flash")

EXTRACTION_PROMPT = """
You are a healthcare policy analyst. Extract structured data from the following medical benefit drug policy document.

Return a JSON object with these exact fields:
{{
  "drug_name": "generic drug name",
  "brand_names": ["list", "of", "brand", "names"],
  "hcpcs_codes": ["J-codes or other HCPCS codes"],
  "payer": "name of the health plan / payer",
  "covered_indications": ["list of covered diagnoses or conditions"],
  "prior_auth_required": true or false,
  "prior_auth_criteria": ["list of criteria the patient must meet"],
  "step_therapy_required": true or false,
  "step_therapy_criteria": ["list of drugs patient must try first"],
  "site_of_care_restrictions": ["list of approved administration sites"],
  "effective_date": "YYYY-MM-DD or null if not found",
  "policy_number": "policy ID if present, else null"
}}

If a field cannot be determined, use null or an empty list [].

POLICY TEXT:
{policy_text}
"""


def extract_policy(policy_text: str, payer_hint: str = "") -> dict:
    """
    Send policy text to Gemini and return structured extraction.
    """
    prompt = EXTRACTION_PROMPT.format(policy_text=policy_text[:12000])  # stay within context
    response = model.generate_content(prompt)
    raw = response.text.strip()

    # Strip markdown code fences if present
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]

    return json.loads(raw)
