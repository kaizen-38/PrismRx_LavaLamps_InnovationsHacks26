"""
Bulk ingest script — processes all PDFs in data/sample_policies/
Drop your policy PDFs in that folder and run:
    cd apps/api && python ../../scripts/ingest_bulk.py

File naming convention for auto payer/family detection:
    {payer_key}_{drug_family_key}_{anything}.pdf
    e.g. uhc_infliximab_v2026.pdf
         cigna_rituximab.pdf
"""
import asyncio
import sys
import os
from pathlib import Path

# Make sure apps/api is on the path when run from repo root
sys.path.insert(0, str(Path(__file__).parent.parent / "apps" / "api"))

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

from app.core.database import init_db, AsyncSessionLocal
from app.pipelines.ingest_pipeline import run_ingest

SAMPLE_DIR = Path(__file__).parent.parent / "data" / "sample_policies"

PAYER_MAP = {
    "uhc": "UnitedHealthcare",
    "united": "UnitedHealthcare",
    "cigna": "Cigna",
    "upmc": "UPMC Health Plan",
    "bcbs": "Blue Cross Blue Shield",
    "aetna": "Aetna",
    "emblem": "EmblemHealth",
    "priority": "Priority Health",
    "florida": "Florida Blue",
}

FAMILY_MAP = {
    "infliximab": "TNF Inhibitors",
    "adalimumab": "TNF Inhibitors",
    "golimumab": "TNF Inhibitors",
    "rituximab": "Anti-CD20",
    "ocrelizumab": "Anti-CD20",
    "vedolizumab": "Integrin Antagonists",
    "abatacept": "CTLA-4 Inhibitors",
    "tocilizumab": "IL-6 Inhibitors",
    "sarilumab": "IL-6 Inhibitors",
}


def guess_payer(stem: str) -> str:
    lower = stem.lower()
    for key, name in PAYER_MAP.items():
        if key in lower:
            return name
    return "Unknown Payer"


def guess_family(stem: str) -> str | None:
    lower = stem.lower()
    for key, family in FAMILY_MAP.items():
        if key in lower:
            return family
    return None


async def main():
    pdfs = sorted(SAMPLE_DIR.glob("*.pdf"))
    if not pdfs:
        print(f"No PDFs found in {SAMPLE_DIR}")
        print("Drop policy PDFs there and re-run.")
        return

    await init_db()

    for pdf in pdfs:
        payer = guess_payer(pdf.stem)
        family = guess_family(pdf.stem)
        print(f"\n  → {pdf.name}")
        print(f"     payer={payer}  family={family or 'unknown'}")

        async with AsyncSessionLocal() as db:
            result = await run_ingest(
                db=db,
                payer=payer,
                drug_family=family,
                file_bytes=pdf.read_bytes(),
                file_name=pdf.name,
            )

        if result.status == "duplicate":
            print(f"     SKIP  (already ingested)")
        elif result.status == "ok":
            print(f"     OK    policy_id={result.policy_id}  drugs={result.drug_names[:3]}")
        else:
            print(f"     FAIL  {result.error}")

    print("\nDone.")


if __name__ == "__main__":
    asyncio.run(main())
