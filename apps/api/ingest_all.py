"""
Batch ingest script — runs all 8 policy PDFs through the pipeline.
Run from apps/api/: python ingest_all.py
"""
import asyncio
import sys
from pathlib import Path

# Add app to path
sys.path.insert(0, str(Path(__file__).parent))

from app.core.database import AsyncSessionLocal
from app.pipelines.ingest_pipeline import run_ingest

POLICIES_DIR = Path(__file__).parent.parent.parent / "data" / "sample_policies"

FILES = [
    # (filename, payer, drug_family)
    ("infliximab-remicade-inflectra.pdf",                                              "UnitedHealthcare", "Infliximab"),
    ("rituxan-rituximab.pdf",                                                          "UnitedHealthcare", "Rituximab"),
    ("rituxan-rituximab-cs.pdf",                                                       "UnitedHealthcare", "Rituximab"),
    ("ip_0319_coveragepositioncriteria_rituximab_non_oncology.pdf",                    "Cigna",            "Rituximab"),
    ("ip_0660_coveragepositioncriteria_inflammatory_conditions_infliximab_intravenous_products_pa.pdf", "Cigna", "Infliximab"),
    ("psm_005_inflammatory_conditions_infliximab_intravenous_products.pdf",            "Cigna",            "Infliximab"),
    ("MDL_EmployerGroupMyPriority_2025.pdf",                                           "Priority Health",  None),
    ("MDL_EmployerGroupMyPriority_2026.pdf",                                           "Priority Health",  None),
    ("2026_Aetna_Commercial_Clinical_Program_Summary.pdf",                             "Aetna",            None),
]


async def main():
    print(f"Starting batch ingest of {len(FILES)} files...\n")

    async with AsyncSessionLocal() as db:
        for filename, payer, drug_family in FILES:
            path = POLICIES_DIR / filename
            if not path.exists():
                print(f"  [SKIP] {filename} — file not found")
                continue

            file_bytes = path.read_bytes()
            print(f"  [{payer}] {filename} ...", end=" ", flush=True)

            try:
                result = await run_ingest(
                    db=db,
                    payer=payer,
                    drug_family=drug_family,
                    file_bytes=file_bytes,
                    file_name=filename,
                )
                await db.commit()

                if result.status == "ok":
                    print(f"OK — drugs: {result.drug_names[:3]}{'...' if len(result.drug_names) > 3 else ''}")
                elif result.status == "duplicate":
                    print(f"DUPLICATE (already ingested)")
                else:
                    print(f"FAILED [{result.status}]: {result.error}")
            except Exception as e:
                await db.rollback()
                print(f"ERROR: {e}")

    print("\nDone.")


if __name__ == "__main__":
    asyncio.run(main())
