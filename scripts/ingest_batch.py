"""
Batch ingestion script — runs all policy_docs through the full extraction pipeline.
Usage: PYTHONPATH=apps/api python3 scripts/ingest_batch.py
"""
import asyncio
import sys
import json
from pathlib import Path

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT / "apps" / "api"))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.models.policy import Base
from app.pipelines.ingest_pipeline import run_ingest

DATABASE_URL = "sqlite+aiosqlite:///apps/api/prismrx.db"

# ── Document manifest ─────────────────────────────────────────────────────────
DOCS = [
    # UnitedHealthcare
    ("policy_docs/uhc_infliximab_2026.pdf",                            "UnitedHealthcare",   "TNF Inhibitors"),
    ("policy_docs/uhc_rituximab_2026.pdf",                             "UnitedHealthcare",   "Anti-CD20"),
    ("policy_docs/uhc_vedolizumab_2026.pdf",                           "UnitedHealthcare",   "Integrin Inhibitors"),
    ("policy_docs/uhc_site_of_care_2026.pdf",                          "UnitedHealthcare",   "Site of Care"),
    ("policy_docs/uhc_therapeutic_equivalent_excluded_drugs_2026.pdf", "UnitedHealthcare",   "Therapeutic Alternatives"),
    # Aetna (text files scraped from HTML)
    ("policy_docs/aetna_infliximab_cpb0341_2026.txt",                  "Aetna",              "TNF Inhibitors"),
    ("policy_docs/aetna_ocrelizumab_cpb0264_2026.txt",                 "Aetna",              "Anti-CD20 MS"),
    # Cigna
    ("policy_docs/cigna_infliximab_2026.pdf",                          "Cigna Healthcare",   "TNF Inhibitors"),
    ("policy_docs/cigna_rituximab_2026.pdf",                           "Cigna Healthcare",   "Anti-CD20"),
    ("policy_docs/cigna_ocrelizumab_2026.pdf",                         "Cigna Healthcare",   "Anti-CD20 MS"),
    ("policy_docs/cigna_vedolizumab_2026.pdf",                         "Cigna Healthcare",   "Integrin Inhibitors"),
]


async def main():
    engine = create_async_engine(DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    results = []
    for file_path, payer, drug_family in DOCS:
        path = ROOT / file_path
        if not path.exists():
            print(f"  SKIP  {file_path} — file not found")
            continue

        size_kb = path.stat().st_size // 1024
        print(f"  INGEST {payer} / {drug_family} — {path.name} ({size_kb} KB)...", flush=True)
        try:
            async with async_session() as db:
                data = path.read_bytes()
                # Treat .txt files as HTML so the HTML parser handles them
                result = await run_ingest(
                    db=db, payer=payer, drug_family=drug_family,
                    file_bytes=data, file_name=path.name,
                )

            status = result.status
            drugs = result.drug_names or []
            print(f"    → {status} | policy_id={result.policy_id} | drugs={drugs[:3]}", flush=True)
            results.append({
                "file": file_path, "payer": payer,
                "status": status, "policy_id": result.policy_id, "drugs": drugs,
            })
        except Exception as e:
            print(f"    ERROR: {e}", flush=True)
            results.append({"file": file_path, "payer": payer, "status": "error", "error": str(e)})

    ok = [r for r in results if r["status"] == "ok"]
    print(f"\nDone: {len(ok)}/{len(results)} successful", flush=True)

    out_path = ROOT / "data" / "processed" / "ingest_batch_results.json"
    out_path.write_text(json.dumps(results, indent=2))
    print(f"Results saved to {out_path}", flush=True)


if __name__ == "__main__":
    asyncio.run(main())
