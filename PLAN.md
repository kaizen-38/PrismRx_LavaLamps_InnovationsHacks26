# Plan.md — PrismRx

## 0) Project identity

- **project_name:** PrismRx
- **repo_name:** prismrx
- **track:** Anton RX — Medical Benefit Drug Policy Tracker
- **hackathon:** Innovation Hacks 2.0
- **duration_hours:** 48
- **one_liner:** AI-powered medical-benefit drug policy intelligence workspace for comparing payer coverage, criteria, and policy changes.
- **demo_mode:** Public policy documents + synthetic patient cases only
- **compliance_posture:** No real PHI, no member data, no claims ingestion in MVP
- **primary_llm_provider:** Gemini API
- **primary_model:** gemini-2.5-flash
- **optional_heavier_model:** gemini-2.5-pro
- **frontend:** Next.js + TypeScript + Tailwind + shadcn/ui
- **backend:** FastAPI + Python + Pydantic
- **database:** Postgres + pgvector
- **auth:** Auth0 placeholder, optional MVP integration if time permits
- **voice:** ElevenLabs optional stretch feature only

---

## 1) Problem statement in one paragraph

Health plans publish medical-benefit drug policies in inconsistent formats (PDFs, HTML, portals). Analysts must manually read them to answer: which payer covers which drug, under what prior-authorization or step-therapy criteria, and what changed across policy versions. PrismRx ingests those documents, extracts structured criteria, normalizes them into a canonical schema, and surfaces search, comparison, case simulation, and change detection.

---

## 2) What changes from the earlier sprint doc

### Keep
- Focus on **structured extraction**, not generic PDF chat.
- Focus on **coverage meaning**, not just text retrieval.
- Keep **case simulator** and **change radar** as core differentiators.
- Keep **public-documents-only** posture for the demo.

### Tighten
- Narrow MVP to **3 payers** and **6–10 policies**.
- Narrow clinical focus to **one therapeutic family**.
- Add **explicit evidence traceability**: every extracted fact must point to source page/section.
- Add **judging alignment** to each feature.
- Add **mock-first repo scaffolding** so frontend can be demo-ready before extraction is perfect.

### Remove / de-prioritize
- Do not overbuild multi-agent orchestration.
- Do not center voice as the product.
- Do not claim HIPAA compliance.
- Do not ingest real patient/member data.
- Do not attempt all payers or all drugs.

---

## 3) MVP scope lock

### Therapeutic focus
- **primary_therapeutic_area:** Autoimmune / inflammatory infused biologics

### Initial drug families
- infliximab
- rituximab
- vedolizumab
- abatacept IV
- golimumab IV
- tocilizumab IV
- ocrelizumab

### Initial payers
- UnitedHealthcare
- Cigna
- UPMC Health Plan

### Document target
- **min_policy_count:** 6
- **target_policy_count:** 8
- **max_policy_count:** 12

### Versioning target
- At least **2 policies** should have **older + newer** versions for diffing.

### Inputs
- public payer policy PDFs / HTML
- synthetic patient case form
- optional sample documents from organizer zip

### Outputs
- coverage matrix
- policy detail page with citations
- case simulator with blockers
- semantic policy diff
- source viewer

---

## 4) Demo story

### Demo headline
> PrismRx turns messy payer policies into a searchable coverage intelligence layer.

### 90-second demo arc
1. Open landing page and search a drug family.
2. Show coverage matrix across three payers.
3. Click a payer policy and show normalized extracted criteria with source citations.
4. Run a synthetic patient case and show blockers / likely fit by payer.
5. Open change radar and show what tightened or loosened between policy versions.
6. Optional: one-click spoken summary with ElevenLabs.

### One-line differentiation
> Most solutions tell you what the document says. PrismRx tells you what it means for access, what blocks approval, and what changed.

---

## 5) Success criteria mapped to judging

### Problem understanding
- Show why medical-benefit drug tracking is harder than pharmacy formulary lookup.
- Show payer format inconsistency.
- Show clinical criteria differences across plans.

### Technical implementation
- Parse PDFs and HTML.
- Extract structured fields.
- Normalize drug aliases and policy criteria.
- Implement semantic diff.
- Use Gemini for extraction / classification / comparison helpers.

### Usability & design
- Non-technical stakeholder can answer key questions in under 60 seconds.
- Clear matrix, compare, and source-trace UI.
- Strong loading states and confidence labels.

### Completeness
- ingestion -> extraction -> normalization -> comparison -> interface
- at least one end-to-end path must work live in demo

### Creativity & wow
- blocker simulator
- change radar
- biosimilar/preferred-product normalization
- optional voice brief if stable

---

## 6) Non-goals

- no real member data
- no OCR-heavy pipeline in MVP
- no training custom ML models
- no full payer crawling framework
- no production-grade HIPAA claim
- no appeals submission automation
- no complex role-based enterprise auth unless time remains

---

## 7) Data sources

### Priority order
1. Organizer-provided sample policy zip
2. Public payer policy libraries
3. Public drug normalization sources
4. Synthetic case generators

### Payer policy sources
- UnitedHealthcare commercial medical drug policies
- Cigna drug and biologic coverage policies
- UPMC health plan prior authorization / medical pharmacy docs
- Optional fallback: Priority Health, EmblemHealth, BCBS NC, Florida Blue

### Drug normalization sources
- RxNorm
- HCPCS / J-code references
- FDA Purple Book for biologics / biosimilars

### Synthetic data
- synthetic cases only
- no real PHI

---

## 7A) Terminology normalization map

### Medical-benefit drug synonyms to treat as equivalent
- medical benefit drugs
- medical pharmacy drugs
- medical drugs
- specialty drugs on the medical benefit
- provider-administered drugs
- physician-administered drugs
- medical injectables / medical injectable drugs
- buy-and-bill drugs

### Policy document synonyms to treat as equivalent
- medical policy
- medical benefit drug policy
- drug and biologic coverage policy
- medical pharmacy policy
- coverage determination guideline
- clinical policy bulletin

### Canonical internal labels
- `medical_benefit_drug`
- `policy_document`
- `coverage_criteria`
- `prior_authorization`
- `step_therapy`
- `site_of_care`

---

## 8) Canonical schema (Policy DNA)

```json
{
  "policy_id": "string",
  "payer": "string",
  "plan_type": "commercial|exchange|medicare|medicaid|unknown",
  "drug_family": "string",
  "drug_names": ["string"],
  "hcpcs_codes": ["string"],
  "coverage_status": "covered|conditional|not_covered|unclear",
  "covered_indications": ["string"],
  "prior_authorization_required": true,
  "step_therapy_requirements": ["string"],
  "diagnosis_requirements": ["string"],
  "lab_or_biomarker_requirements": ["string"],
  "prescriber_requirements": ["string"],
  "site_of_care_restrictions": ["string"],
  "dose_frequency_rules": ["string"],
  "reauthorization_rules": ["string"],
  "preferred_product_notes": ["string"],
  "exclusions": ["string"],
  "effective_date": "YYYY-MM-DD",
  "source_type": "pdf|html",
  "source_uri": "string",
  "citations": [
    {
      "page": 1,
      "section": "Coverage Criteria",
      "quote": "string",
      "confidence": 0.0
    }
  ]
}
```

---

## 9) Repo structure (target)

```text
prismrx/
  README.md
  Plan.md
  .editorconfig
  .gitignore
  .gitattributes
  .env.example
  package.json
  pnpm-workspace.yaml
  turbo.json
  docker-compose.yml
  apps/
    web/
      app/
      components/
      features/
      lib/
      public/
      styles/
      tests/
      package.json
    api/
      app/
        main.py
        api/
        core/
        models/
        schemas/
        services/
        parsers/
        extractors/
        pipelines/
        tests/
      pyproject.toml
  packages/
    ui/
    shared/
    config/
  data/
    raw/
    processed/
    fixtures/
  docs/
    adr/
    api/
    demo/
    data-model/
  scripts/
    bootstrap/
    ingest/
    eval/
  .github/
    workflows/
    ISSUE_TEMPLATE/
    PULL_REQUEST_TEMPLATE.md
```

---

## 10) Frontend information architecture

### Routes
- `/` — landing + universal search
- `/matrix` — coverage matrix
- `/policy/[policyId]` — policy detail with citations
- `/compare` — side-by-side policy comparison
- `/simulate` — synthetic case simulator
- `/changes` — policy diff / change radar
- `/sources` — raw source manifest
- `/about` — data limitations, compliance posture, methodology

### Visual system
- dark clinical analytics theme
- serious, dense-but-readable tables
- electric cyan accent for active state
- coral for tightened/restricted
- mint for covered/loosened
- violet for compare state
- mono font only for codes and IDs

### Core components
- SearchBar
- CoverageMatrix
- PayerBadge
- PolicyCriteriaCard
- SourceCitationDrawer
- ComparisonDiffCard
- AccessBlockerPanel
- SyntheticCaseForm
- ChangeTimeline
- ConfidenceTag
- LoadingPipelineSteps

---

## 11) Backend services

### API routes
- `GET /health`
- `GET /api/policies`
- `GET /api/policies/{policy_id}`
- `POST /api/compare`
- `POST /api/simulate`
- `POST /api/diff`
- `POST /api/ingest/local`
- `POST /api/ingest/url`
- `GET /api/sources`
- `POST /api/chat` (optional, grounded only)

### Service layers
- `source_registry_service`
- `document_parse_service`
- `criterion_extraction_service`
- `normalization_service`
- `comparison_service`
- `diff_service`
- `simulation_service`
- `citation_service`

---

## 12) Gemini usage plan

### Gemini should be used for
- extracting policy criteria from parsed text
- mapping free-form criteria into canonical schema
- summarizing semantic differences across policy versions
- grounded natural-language answers over already-extracted structured data

### Gemini should NOT be used for
- raw browser-side API calls with exposed secrets
- hallucinated medical judgment
- unsupported approval predictions
- replacing deterministic parsing when regex/rules are enough

### Model strategy
- `gemini-2.5-flash` for extraction, summarization, and chat defaults
- `gemini-2.5-pro` only for difficult compare/diff jobs if needed

---

## 13) Auth0 and ElevenLabs posture

### Auth0
- optional MVP integration
- okay to scaffold login shell and role model only
- if time is tight, keep auth mocked behind feature flag

### ElevenLabs
- stretch only
- one feature maximum: spoken 20-second policy brief
- do not let voice work block core extraction / comparison demo

---

## 14) Compliance posture

### Allowed in MVP
- public payer policies
- synthetic patient cases
- synthetic identifiers
- public drug reference data

### Not allowed in MVP
- real patient names
- real dates of service
- real insurance IDs
- real claims
- uploaded medical records

### Product language to use
- “public documents + synthetic demo data only”
- “designed to be adaptable to regulated environments”

### Product language to avoid
- “HIPAA compliant”
- “production ready for PHI”

---

## 15) Sprint breakdown

### Sprint 0 — Scope lock (2 hours)
- finalize therapeutic area
- finalize payers
- finalize schema
- create source manifest
- confirm demo story

**done_when:** project name, repo name, routes, schema, and top 8 source docs are locked

### Sprint 1 — Repo bootstrap (4 hours)
- initialize monorepo
- set up Next.js app
- set up FastAPI app
- add lint/format/test configs
- add CI
- add env example
- add mock data fixtures

**done_when:** apps boot locally, CI passes, mock APIs return sample payloads

### Sprint 2 — Data ingestion and parsing (8 hours)
- create source manifest
- ingest 6–10 policies
- parse text from PDFs/HTML
- store text + sections + page references

**done_when:** all target docs are parseable and accessible in local data store

### Sprint 3 — Extraction and normalization (8 hours)
- build canonical schema
- map drug aliases
- extract policy criteria
- attach citations and confidence

**done_when:** at least 6 policies converted into structured JSON with citations

### Sprint 4 — Core product UI (8 hours)
- landing page
- coverage matrix
- policy detail drawer/page
- compare page
- loading states

**done_when:** user can inspect and compare structured policy outputs visually

### Sprint 5 — Case simulator + diff (8 hours)
- synthetic case form
- blocker engine
- semantic diff pipeline
- change radar UI

**done_when:** one live case simulation and one live version diff work end-to-end

### Sprint 6 — Polish + optional integrations (6 hours)
- optional Auth0 shell
- optional ElevenLabs brief
- fix empty/error states
- improve copy and demo path

**done_when:** app looks stable, coherent, and demo-ready

### Sprint 7 — Demo prep (4 hours)
- rehearse 90-second walkthrough
- add backup screenshots / fallback JSON
- lock final talking points

**done_when:** demo can survive live failure scenarios

---

## 16) Definition of done

A build is “done” for demo if all are true:
- web app runs locally
- API runs locally
- at least 6 policies ingested
- at least 3 payers represented
- at least 1 therapeutic family normalized
- coverage matrix works
- one policy detail page shows citations
- one compare flow works
- one synthetic case simulation works
- one semantic diff works
- README and setup docs are usable

---

## 17) Backlog priority

### P0
- repo bootstrap
- source manifest
- parsing
- schema
- coverage matrix
- policy detail citations
- compare flow
- case simulator
- semantic diff

### P1
- source viewer
- preferred product / biosimilar normalization
- better prompt evaluation
- seeded sample DB

### P2
- Auth0 login shell
- ElevenLabs voice brief
- agentic chat layer
- export summary PDF

---

## 18) Risks and mitigations

### Risk: parsing quality is inconsistent
- mitigate with manual curation and mock fixtures

### Risk: extraction is noisy
- mitigate with narrow schema and source citations

### Risk: UI depends on backend too early
- mitigate with mock JSON first

### Risk: team gets distracted by extra integrations
- mitigate by making Auth0 and ElevenLabs explicitly optional

### Risk: live demo fails
- mitigate with backup screenshots and cached sample responses

---

## 19) Environment variables

```env
# App
NODE_ENV=development
NEXT_PUBLIC_APP_NAME=PrismRx
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
APP_ENV=local

# Gemini
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
GEMINI_FALLBACK_MODEL=gemini-2.5-pro

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/prismrx
PGVECTOR_ENABLED=true

# Auth (optional)
AUTH0_DOMAIN=
AUTH0_CLIENT_ID=
AUTH0_CLIENT_SECRET=
AUTH0_SECRET=
NEXT_PUBLIC_AUTH0_DOMAIN=
NEXT_PUBLIC_AUTH0_CLIENT_ID=

# Voice (optional)
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=

# App limits
MAX_SOURCE_DOCS=12
MAX_COMPARE_POLICIES=3
ENABLE_AUTH=false
ENABLE_VOICE=false
ENABLE_CHAT=false
```

---

## 20) Team roles

### Role A — Product / demo / frontend
- own UI polish
- own landing, matrix, compare, simulate pages
- own demo narrative

### Role B — Backend / parsing
- own ingestion
- own parsing pipeline
- own source manifest and storage

### Role C — Extraction / LLM / normalization
- own schema
- own prompt design
- own extraction evaluation
- own diff and blocker logic

### Role D — Integration / QA / DevOps
- own CI
- own env setup
- own mock fixtures
- own test data + backup demo assets

---

## 21) Daily standup template

- what changed in last 3 hours
- what is blocked
- what is the next user-visible milestone
- what can be mocked instead of built perfectly
- what must be in the final demo no matter what

---

## 22) Prompting rules for coding agents

- do not over-engineer
- prefer clean scaffolding over speculative complexity
- build mock-first, then wire real data
- keep all LLM outputs grounded to source text or structured data
- preserve citations everywhere
- no hardcoded secrets
- no browser-side Gemini secret exposure
- write concise README instructions for every new subsystem
- when uncertain, choose the simplest implementation that preserves the demo path

---

## 23) Final command checklist

```bash
# web
pnpm install
pnpm dev

# api
cd apps/api
uv sync || pip install -e .[dev]
uvicorn app.main:app --reload --port 8000

# tests
pnpm test
cd apps/api && pytest
```

---

## 24) Final pitch bullets

- messy payer policies -> structured coverage intelligence
- compare coverage across plans in seconds
- understand blockers for a patient scenario
- see what changed across policy versions
- public docs only, synthetic case demo, real operational value
