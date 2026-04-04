"""
Standalone pipeline runner — parses + extracts the 2 policy PDFs and prints results.
Run from repo root:
    source .venv/bin/activate
    python scripts/run_pipeline.py
"""
import asyncio
import json
import sys
import os
from pathlib import Path

# Add apps/api to path
sys.path.insert(0, str(Path(__file__).parent.parent / "apps" / "api"))

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

from app.parsers.pdf_parser import parse_pdf
from app.extractors.policy_extractor import extract_policy

DOCS = [
    {
        "file": "data/sample_policies/infliximab-remicade-inflectra.pdf",
        "payer": "UnitedHealthcare",
        "drug_family": "TNF Inhibitors",
    },
    {
        "file": "data/sample_policies/ip_0319_coveragepositioncriteria_rituximab_non_oncology.pdf",
        "payer": "Cigna",
        "drug_family": "Anti-CD20",
    },
]

ROOT = Path(__file__).parent.parent


async def run():
    results = []
    for doc_info in DOCS:
        path = ROOT / doc_info["file"]
        print(f"\n{'='*60}")
        print(f"Processing: {path.name}")
        print(f"  Payer: {doc_info['payer']} | Family: {doc_info['drug_family']}")
        print(f"  Parsing PDF...")

        doc = parse_pdf(path)
        print(f"  Pages: {doc.page_count} | Chars: {len(doc.full_text):,} | Sections: {len(doc.sections)}")

        print(f"  Extracting with Gemini...")
        try:
            result = await extract_policy(
                doc=doc,
                payer_hint=doc_info["payer"],
                drug_family_hint=doc_info["drug_family"],
            )
            out = result.model_dump()
            results.append(out)

            print(f"\n  ✓ Extraction complete")
            print(f"    Drug names:      {out['drug_names'][:5]}")
            print(f"    HCPCS codes:     {out['hcpcs_codes']}")
            print(f"    Coverage status: {out['coverage_status']}")
            print(f"    Prior auth:      {out['prior_authorization_required']}")
            print(f"    Step therapy:    {out['step_therapy_requirements'][:2]}")
            print(f"    Indications:     {len(out['covered_indications'])} found")
            print(f"    Citations:       {len(out['citations'])} found")
            if out['citations']:
                c = out['citations'][0]
                print(f"    First citation:  [p{c['page']}] {c['section'][:50]}...")

        except Exception as e:
            print(f"  ✗ Extraction failed: {e}")
            import traceback; traceback.print_exc()

    # Write output to file for inspection
    out_path = ROOT / "data" / "processed" / "extraction_results.json"
    out_path.parent.mkdir(exist_ok=True)
    with open(out_path, "w") as f:
        json.dump(results, f, indent=2, default=str)
    print(f"\n\nResults written to {out_path}")


if __name__ == "__main__":
    asyncio.run(run())
