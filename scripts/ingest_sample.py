"""
Quick script to bulk-ingest all PDFs in data/sample_policies/.
Usage: python scripts/ingest_sample.py
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pathlib import Path
from backend.ingestion.pdf_parser import parse_pdf
from backend.extraction.policy_extractor import extract_policy
from backend.normalization.normalizer import normalize_policy
from backend.database.db import init_db, SessionLocal
from backend.database.models import PolicyRecord

SAMPLE_DIR = Path("data/sample_policies")

# Map filename prefixes to payer names (customize as you add files)
PAYER_MAP = {
    "uhc": "UnitedHealthcare",
    "cigna": "Cigna",
    "bcbs": "Blue Cross Blue Shield",
    "aetna": "Aetna",
    "emblem": "EmblemHealth",
    "upmc": "UPMC Health Plan",
    "priority": "Priority Health",
}


def guess_payer(filename: str) -> str:
    lower = filename.lower()
    for prefix, name in PAYER_MAP.items():
        if prefix in lower:
            return name
    return "Unknown"


def main():
    init_db()
    db = SessionLocal()
    pdfs = list(SAMPLE_DIR.glob("*.pdf"))
    if not pdfs:
        print(f"No PDFs found in {SAMPLE_DIR}")
        return

    for pdf in pdfs:
        payer = guess_payer(pdf.name)
        print(f"  Ingesting {pdf.name} ({payer})...")
        try:
            parsed = parse_pdf(pdf)
            extracted = extract_policy(parsed["full_text"], payer_hint=payer)
            normalized = normalize_policy(extracted, source_file=pdf.name, payer=payer)
            record = PolicyRecord(**{k: v for k, v in normalized.items() if k != "ingested_at"})
            record.raw_text = parsed["full_text"][:5000]
            db.add(record)
            db.commit()
            print(f"    -> {record.drug_name} | {record.payer}")
        except Exception as e:
            print(f"    ERROR: {e}")

    db.close()
    print("Done.")


if __name__ == "__main__":
    main()
