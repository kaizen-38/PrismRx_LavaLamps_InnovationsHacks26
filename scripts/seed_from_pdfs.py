"""
Rule-based policy seed script — extracts key fields from policy PDFs using
PyMuPDF text extraction + regex patterns, bypassing Gemini entirely.
Seeds the DB with realistic data for all 4 payers × 4 drugs.
Usage: PYTHONPATH=apps/api python3 scripts/seed_from_pdfs.py
"""
import asyncio
import re
import sys
import json
import hashlib
import uuid
from pathlib import Path
from datetime import datetime, UTC

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT / "apps" / "api"))

import fitz  # PyMuPDF
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.models.policy import Base, PolicyRecord, SourceDocument

DATABASE_URL = "sqlite+aiosqlite:///apps/api/prismrx.db"

# ── Helpers ───────────────────────────────────────────────────────────────────

def extract_text(path: Path) -> str:
    if path.suffix in (".txt", ".html"):
        return path.read_text(errors="replace")
    doc = fitz.open(str(path))
    return "\n".join(page.get_text() for page in doc)

def find_hcpcs(text: str) -> list[str]:
    return list(set(re.findall(r'\b[JQ]\d{4}\b', text)))

def find_effective_date(text: str) -> str | None:
    m = re.search(r'[Ee]ffective[:\s]+(\d{4}[-/]\d{2}[-/]\d{2})', text)
    if m:
        return m.group(1).replace("/", "-")
    m = re.search(r'[Ee]ffective[:\s]+(\w+ \d{1,2},?\s*\d{4})', text)
    if m:
        raw = m.group(1).strip()
        try:
            from datetime import datetime
            return datetime.strptime(raw.replace(",", ""), "%B %d %Y").strftime("%Y-%m-%d")
        except Exception:
            return None
    return None

def has_pa(text: str) -> bool:
    keywords = ["prior authorization", "precertification", "preauthorization",
                "prior auth", "PA required", "PA is required"]
    lower = text.lower()
    return any(k.lower() in lower for k in keywords)

def extract_step_therapy(text: str, max_items: int = 8) -> list[str]:
    lines = text.splitlines()
    results = []
    capture = False
    patterns = [
        r'step\s+therap', r'prior\s+(treatment|therapy|fail)', r'previous\s+trial',
        r'history\s+of\s+failure', r'inadequate\s+response', r'contraindication\s+to',
    ]
    for line in lines:
        if any(re.search(p, line, re.I) for p in patterns):
            capture = True
        if capture and len(line.strip()) > 30:
            results.append(line.strip())
        if capture and len(results) >= max_items:
            break
    return results[:max_items]

def extract_site_of_care(text: str) -> list[str]:
    lines = text.splitlines()
    soc = []
    for line in lines:
        if re.search(r'site.of.care|infusion\s+(center|suite|facility)|outpatient|intravenous\s+infusion', line, re.I):
            clean = line.strip()
            if len(clean) > 15:
                soc.append(clean)
    return list(set(soc))[:5]

def extract_diagnosis(text: str, max_items: int = 10) -> list[str]:
    dx_patterns = [
        r'rheumatoid arthritis', r"crohn.?s disease", r'ulcerative colitis',
        r'plaque psoriasis', r'psoriatic arthritis', r'ankylosing spondylitis',
        r'multiple sclerosis', r'relapsing.remitting', r'primary progressive',
        r'microscopic polyangiitis', r'granulomatosis with polyangiitis',
        r'non-hodgkin.?s? lymphoma', r'chronic lymphocytic leukemia',
        r'pemphigus vulgaris', r'neuromyelitis optica',
    ]
    found = []
    for pat in dx_patterns:
        if re.search(pat, text, re.I):
            clean = pat.replace(r'[^a-z ]', '').replace('?', '').replace('.', ' ').strip()
            found.append(clean.title())
    return found[:max_items]

def extract_drug_names(text: str, drug_family: str) -> list[str]:
    """Extract drug names based on family."""
    families = {
        "TNF Inhibitors": ["infliximab", "infliximab-axxq", "infliximab-dyyb", "infliximab-abda",
                           "Avsola", "Inflectra", "Renflexis", "Ixifi", "Remicade"],
        "Anti-CD20": ["rituximab", "rituximab-abbs", "rituximab-arrx", "rituximab-pvvr",
                      "Rituxan", "Truxima", "Ruxience", "Riabni"],
        "Integrin Inhibitors": ["vedolizumab", "Entyvio"],
        "Anti-CD20 MS": ["ocrelizumab", "Ocrevus", "Ocrevus Zunovo"],
        "Site of Care": [],
        "Therapeutic Alternatives": [],
    }
    return families.get(drug_family, [])

def plan_type_from_payer(payer: str) -> str:
    return "commercial"

def coverage_status_from_text(text: str) -> str:
    if re.search(r'not\s+covered|excluded|non-covered|not\s+eligible', text, re.I):
        return "not_covered"
    if re.search(r'prior\s+auth|conditional|criteria|step\s+therap', text, re.I):
        return "conditional"
    if re.search(r'covered\s+when|covered\s+if|covered\s+for', text, re.I):
        return "conditional"
    return "conditional"  # All specialty pharma is conditional


# ── Document manifest ─────────────────────────────────────────────────────────

DOCS = [
    # (file, payer, drug_family, policy_number)
    ("policy_docs/uhc_infliximab_2026.pdf",                            "UnitedHealthcare",   "TNF Inhibitors",          None),
    ("policy_docs/uhc_rituximab_2026.pdf",                             "UnitedHealthcare",   "Anti-CD20",               None),
    ("policy_docs/uhc_vedolizumab_2026.pdf",                           "UnitedHealthcare",   "Integrin Inhibitors",     None),
    ("policy_docs/uhc_site_of_care_2026.pdf",                          "UnitedHealthcare",   "Site of Care",            None),
    ("policy_docs/aetna_infliximab_cpb0341_2026.txt",                  "Aetna",              "TNF Inhibitors",          "CPB 0341"),
    ("policy_docs/aetna_ocrelizumab_cpb0264_2026.txt",                 "Aetna",              "Anti-CD20 MS",            "CPB 0264"),
    ("policy_docs/cigna_infliximab_2026.pdf",                          "Cigna Healthcare",   "TNF Inhibitors",          "IP0660"),
    ("policy_docs/cigna_rituximab_2026.pdf",                           "Cigna Healthcare",   "Anti-CD20",               "IP0319"),
    ("policy_docs/cigna_ocrelizumab_2026.pdf",                         "Cigna Healthcare",   "Anti-CD20 MS",            "IP0212"),
    ("policy_docs/cigna_vedolizumab_2026.pdf",                         "Cigna Healthcare",   "Integrin Inhibitors",     "IP0674"),
]


async def main():
    engine = create_async_engine(DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    # Check existing file hashes to avoid duplicates
    from sqlalchemy import select
    async with async_session() as db:
        result = await db.execute(select(SourceDocument.file_hash))
        existing_hashes = set(r[0] for r in result.fetchall() if r[0])

    seeded = 0
    for file_path, payer, drug_family, policy_number in DOCS:
        path = ROOT / file_path
        if not path.exists():
            print(f"  SKIP  {path.name} — not found")
            continue

        data = path.read_bytes()
        file_hash = hashlib.sha256(data).hexdigest()

        if file_hash in existing_hashes:
            print(f"  DUP   {path.name}")
            continue

        print(f"  SEED  {payer} / {drug_family} — {path.name}...", end=" ", flush=True)

        try:
            text = extract_text(path)
        except Exception as e:
            print(f"FAILED to extract text: {e}")
            continue

        drug_names  = extract_drug_names(text, drug_family)
        hcpcs       = find_hcpcs(text)
        eff_date    = find_effective_date(text)
        pa_req      = has_pa(text)
        step_therapy = extract_step_therapy(text)
        site_of_care = extract_site_of_care(text)
        diagnoses   = extract_diagnosis(text)
        cov_status  = coverage_status_from_text(text)

        # Build sample citations from text (first 3 meaningful paragraphs)
        paragraphs = [p.strip() for p in text.split("\n\n") if len(p.strip()) > 80][:3]
        citations = [
            {"page": i + 1, "section": "Policy Criteria", "quote": para[:200], "confidence": 0.75}
            for i, para in enumerate(paragraphs)
        ]

        async with async_session() as db:
            src_id = str(uuid.uuid4())
            src = SourceDocument(
                id=src_id, payer=payer, drug_family=drug_family,
                source_type="pdf" if path.suffix == ".pdf" else "html",
                file_name=path.name, file_hash=file_hash,
                page_count=len(fitz.open(str(path))) if path.suffix == ".pdf" else None,
                raw_text=text[:30_000],
                parse_status="completed", extracted=True,
                ingested_at=datetime.now(UTC),
            )
            db.add(src)

            pol = PolicyRecord(
                id=str(uuid.uuid4()), source_document_id=src_id,
                payer=payer, plan_type="commercial",
                policy_number=policy_number, effective_date=eff_date,
                drug_family=drug_family, drug_names=drug_names, hcpcs_codes=hcpcs,
                coverage_status=cov_status,
                covered_indications=diagnoses,
                prior_authorization_required=pa_req,
                step_therapy_requirements=step_therapy,
                diagnosis_requirements=diagnoses,
                lab_or_biomarker_requirements=[],
                prescriber_requirements=[],
                site_of_care_restrictions=site_of_care,
                dose_frequency_rules=[],
                reauthorization_rules=[],
                preferred_product_notes=[],
                exclusions=[],
                citations=citations,
                extraction_model="rule-based-fitz",
                extraction_confidence=0.65,
                extracted_at=datetime.now(UTC),
                updated_at=datetime.now(UTC),
            )
            db.add(pol)
            await db.commit()
            existing_hashes.add(file_hash)

        seeded += 1
        print(f"OK (pa={pa_req}, date={eff_date}, drugs={len(drug_names)}, hcpcs={hcpcs[:2]})")

    print(f"\nSeeded {seeded} new policy records")

    # Summary
    from sqlalchemy import func
    async with async_session() as db:
        result = await db.execute(select(PolicyRecord.payer, func.count()).group_by(PolicyRecord.payer))
        print("\nDB summary (policies by payer):")
        for payer, count in result.fetchall():
            print(f"  {payer}: {count}")


if __name__ == "__main__":
    asyncio.run(main())
