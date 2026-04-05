# PrismRx — System Architecture

## Core Interaction Flow

```
User message
    │
    ▼
[1] Entity Extraction — require payer + drug family
    │ missing either? → ask clarifying question
    │
    ▼
[2] Policy DB Lookup — GET /api/policy?payer=...&drug=...
    │ not found? → fallback response with supported options
    │
    ▼
[3] Claude Verification — does the retrieved policy match what was asked?
    │ mismatch? → surface mismatch + show what was found
    │
    ▼
[4] Table Fill — populate CoverageReportHero + BlockersAndRequirements
    │           from verified policy record (never from model hallucination)
    │
    ▼
[5] Claude Narration — 2-3 sentence summary using policy data as context
    │
    ▼
[6] Q&A Mode — user asks follow-up questions, answered from policy context
```

---

## Backend: FastAPI (`apps/api`)

### New endpoint: `GET /api/policy`

**File:** `apps/api/app/api/policy.py`

**Query params:** `payer: str`, `drug: str`

**Logic:**
1. Normalize payer + drug using `_payer_key()` / `_drug_info()` from `matrix.py`
2. Query `policies` table: match by payer (normalized) AND drug_family/drug_names
3. Pick best record (highest extraction_confidence, most recent effective_date)
4. Return full policy details or `{"found": false, "message": "..."}`

**Response shape (found):**
```json
{
  "found": true,
  "policy_id": "uuid",
  "payer": "UnitedHealthcare",
  "drug_family": "TNF Inhibitors",
  "drug_display": "Infliximab",
  "coverage_status": "conditional",
  "pa_required": true,
  "step_therapy_required": true,
  "effective_date": "2026-02-01",
  "version_label": "2026D0004AR",
  "friction_score": 65,
  "step_therapy_requirements": ["..."],
  "diagnosis_requirements": ["..."],
  "lab_or_biomarker_requirements": ["..."],
  "prescriber_requirements": ["..."],
  "site_of_care_restrictions": ["..."],
  "dose_frequency_rules": ["..."],
  "reauthorization_rules": ["..."],
  "preferred_product_notes": ["..."],
  "exclusions": ["..."],
  "drug_names": ["..."],
  "hcpcs_codes": ["..."],
  "citations": [{"page": 1, "section": "...", "quote": "...", "confidence": 0.9}]
}
```

**Fallback response (not found):**
```json
{
  "found": false,
  "requested_payer": "Aetna",
  "requested_drug": "vedolizumab",
  "message": "No indexed policy found for Aetna / Vedolizumab",
  "available_payers": ["UnitedHealthcare", "Cigna"],
  "available_drugs": ["infliximab", "rituximab"]
}
```

### Existing: `GET /api/matrix`
Unchanged — returns payer × drug grid for the matrix page.

### LLM: AWS Bedrock
- **File:** `apps/api/app/services/llm/bedrock_client.py`
- Model: `global.anthropic.claude-sonnet-4-5-20250929-v1:0`
- Auth: `AWS_BEARER_TOKEN_BEDROCK` env var (set at module import time)

---

## Frontend: Next.js (`apps/web`)

### Pages

| Route | Description |
|-------|-------------|
| `/workspace` | Main AI assistant (chat + widget panel) |
| `/matrix` | Coverage matrix grid (existing) |

### Key files

| File | Role |
|------|------|
| `app/workspace/WorkspaceClient.tsx` | Chat UI — sends to `/api/assistant/respond` |
| `app/api/assistant/respond/route.ts` | Next.js route → calls orchestrator |
| `lib/assistant-orchestrator.ts` | Main logic — entity extraction, DB lookup, verification, widget assembly |
| `lib/bedrock.ts` | Bedrock client for narration |
| `lib/policy/db-repository.ts` | Calls FastAPI `GET /api/policy` |

### Orchestrator flow

```typescript
orchestrate(req: AssistantRequest): AssistantResponse

1. extractEntities(message, context) → { payer?, drug? }
2. if missing payer OR drug → return missingFieldResponse (shows CoverageIntakeForm)
3. policy = await dbRepository.lookup(payer, drug)
4. if !policy.found → return fallbackResponse (shows SupportedOptionsCard)
5. verified = await verifyWithClaude(policy, payer, drug)
   // Claude: "Does this policy match {payer} + {drug}? Reply JSON {match: bool, note: string}"
6. narrative = await generateNarrative(policy)
   // Claude: "Summarize in 2-3 sentences based on this policy data..."
7. return coverageResponse(policy, narrative, widgets)
```

### Widget rendering

**Primary widget** (center panel):
- `coverage_intake_form` — when entities missing
- `coverage_report_hero` — when policy found + verified
- `supported_options_card` — when fallback

**Side widgets** (right panel, when policy found):
1. `blockers_and_requirements` — PA, step therapy, site of care, lab, specialist
2. `preferred_alternative` — biosimilar notes
3. `evidence_drawer` — citations from policy document
4. `policy_snapshot_card` — metadata (date, version, policy ID)
5. `related_actions` — other payer/drug combinations
6. `limitation_notice` — always last

### DB-backed policy repository

**File:** `apps/web/lib/policy/db-repository.ts`

```typescript
export async function lookupPolicy(payer: string, drug: string): Promise<PolicyLookupResult>
export async function listSupportedPayers(): Promise<PayerOption[]>
export async function listSupportedDrugs(): Promise<DrugOption[]>
```

All three call the FastAPI backend (`NEXT_PUBLIC_API_URL`, default `http://localhost:8000`).

---

## Database

Tables used (PostgreSQL):

| Table | Purpose |
|-------|---------|
| `source_documents` | Raw PDFs + parse status |
| `policies` | Extracted policy records (9 ingested) |

---

## Environment Variables

### `apps/api/.env`
```
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/prismrx_dev
aws_bearer_token_bedrock=<token>
aws_region=us-east-1
bedrock_model_id=global.anthropic.claude-sonnet-4-5-20250929-v1:0
```

### `apps/web/.env.local`
```
NEXT_PUBLIC_API_URL=http://localhost:8000
AWS_BEARER_TOKEN_BEDROCK=<token>
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=global.anthropic.claude-sonnet-4-5-20250929-v1:0
```

---

## Implementation Plan

### Phase 1 — Backend policy endpoint
- `apps/api/app/api/policy.py` — `GET /api/policy`
- Register in `apps/api/app/main.py`

### Phase 2 — Frontend wired to real DB
- `apps/web/lib/policy/db-repository.ts` — calls FastAPI
- Update `lib/assistant-orchestrator.ts` — use DB repo + Claude verification step

### Phase 3 — Polish + test
- `apps/web/.env.local` — API URL + Bedrock keys
- Test: "UHC infliximab" → policy fills table
- Test: "Aetna vedolizumab" → fallback shown
- Test: "Does UHC cover Remicade?" → natural language Q&A
