# Repo Bootstrap Prompt for Claude Code / Codex / Cursor / Similar Agents

Use this as a single-shot scaffold prompt.

---

You are a senior full-stack engineer bootstrapping a hackathon codebase for a project called **PrismRx**.

## Product context
PrismRx is an AI-powered medical-benefit drug policy intelligence workspace for the Anton RX hackathon track. It ingests public payer medical policy documents, extracts structured coverage criteria, normalizes them across payers, and provides:
- a coverage matrix
- policy detail views with citations
- side-by-side comparison
- a synthetic patient case simulator showing blockers
- policy version diff / change radar

This is a **hackathon MVP**, not a production healthcare system.

## Hard constraints
- Use **public policy documents** and **synthetic patient cases only**.
- Do **not** build anything that assumes real PHI.
- Do **not** claim HIPAA compliance.
- Use **Gemini API** as the LLM provider for now.
- Keep **Auth0** and **ElevenLabs** optional and feature-flagged.
- Optimize for **speed, clarity, maintainability, and demo-readiness**.
- Do **not** overbuild multi-agent architecture.
- Prefer **simple, grounded, testable code**.

## What I want you to generate
Create the **initial GitHub repository structure** and bootstrap the project with strong engineering defaults.

### Tech stack
- Frontend: **Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui**
- Backend: **FastAPI + Python + Pydantic**
- Workspace: **pnpm monorepo** with **Turborepo**
- Python environment: **uv** if possible, otherwise standard pip-compatible setup
- Database: **Postgres** with optional **pgvector** support
- LLM SDK: official **Google Gen AI SDK**
- Testing: **Vitest** for TS utilities and **pytest** for Python
- Linting/formatting: **ESLint + Prettier** and **Ruff + Black**
- CI: GitHub Actions

## Important implementation rules
1. Build **mock-first**. The UI and API should work immediately with seeded fixture data.
2. Keep the extraction pipeline modular:
   - parser layer
   - extractor layer
   - normalization layer
   - citation layer
   - diff layer
3. Keep all LLM logic server-side.
4. Never expose `GEMINI_API_KEY` to the browser.
5. Make every extracted fact able to reference a source page/section.
6. Add feature flags for auth, voice, and chat.
7. Add good README files and setup instructions.
8. Use typed contracts shared between frontend and backend wherever practical.

## Target repository structure
Create this shape unless a slightly better equivalent is justified:

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

## Required frontend routes
Implement scaffolded pages with polished layout, dummy data, and clear placeholders:
- `/` — landing page with search box and CTA cards
- `/matrix` — coverage matrix page
- `/policy/[policyId]` — policy detail view with citation drawer
- `/compare` — side-by-side comparison page
- `/simulate` — synthetic case simulator page
- `/changes` — policy change radar page
- `/sources` — source manifest page
- `/about` — methodology, limitations, and compliance posture

## Required backend API routes
Create working FastAPI routes with mock data and response schemas:
- `GET /health`
- `GET /api/policies`
- `GET /api/policies/{policy_id}`
- `POST /api/compare`
- `POST /api/simulate`
- `POST /api/diff`
- `GET /api/sources`
- `POST /api/ingest/local` (stub okay)
- `POST /api/ingest/url` (stub okay)
- `POST /api/chat` (disabled by default)

## Required shared contracts
Create clear schemas/types for:
- PolicyDocument
- PolicyCriterion
- PolicyCitation
- CoverageMatrixRow
- ComparisonRequest / ComparisonResponse
- SyntheticCase
- SimulationResult
- PolicyDiff
- SourceManifestEntry
- AppFeatureFlags

## Required fixture data
Seed enough realistic mock data to make the UI feel real:
- 3 payers
- 6–8 policy documents
- 1 therapeutic area
- 2 policy versions for at least 1 drug
- 2 synthetic patient cases

## Required design direction
Make the web app feel like a modern clinical analytics dashboard:
- dark, polished, high-contrast theme
- electric cyan accent
- mint for positive / covered states
- coral for tightened / blocked states
- serious typography
- clean table design
- strong skeleton/loading states
- empty states that look intentional

## Required quality files
Please create and configure:
- `.editorconfig`
- `.gitignore`
- `.gitattributes`
- `.env.example`
- `README.md`
- `apps/web/README.md`
- `apps/api/README.md`
- `.github/workflows/ci.yml`
- `.github/PULL_REQUEST_TEMPLATE.md`
- at least 2 issue templates

## Required engineering standards
- strict TypeScript if possible
- no `any` unless absolutely necessary
- typed API client layer in frontend
- Zod validation for external inputs in TS
- Pydantic validation in Python
- modular service boundaries
- minimal but useful tests
- meaningful comments only where needed
- no dead placeholder files with no purpose
- no giant god-components
- no giant god-services

## Gemini integration requirements
Use the official Google Gen AI SDK on the server side only.
Prepare a small provider wrapper so the app can later swap models without rewriting business logic.
Use environment variables:
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `GEMINI_FALLBACK_MODEL`

Create:
- `apps/api/app/services/llm/gemini_client.py`
- `apps/api/app/services/llm/types.py`
- `apps/api/app/services/llm/prompts/`

Stub prompt files for:
- policy extraction
- policy normalization
- semantic diff
- grounded answer generation

## Auth and voice requirements
Scaffold but do not fully wire unless simple:
- feature flags: `ENABLE_AUTH`, `ENABLE_VOICE`, `ENABLE_CHAT`
- auth placeholder middleware/module
- voice placeholder service/module
- keep both optional and disabled by default

## Deliverables I want from you
1. Generate the repo structure and files.
2. Fill files with high-quality starter code.
3. Add fixture data.
4. Add setup instructions.
5. Add TODO markers where real implementation will go.
6. After writing the code, print:
   - repo tree
   - main decisions made
   - commands to run locally
   - what remains stubbed

## Execution behavior
- First, briefly summarize your plan in 8–12 bullets.
- Then generate the scaffold.
- If a choice is ambiguous, choose the simplest professional option.
- Do not ask unnecessary questions.
- Do not install obscure dependencies.
- Do not implement scraping or OCR yet.
- Do not use browser-side Gemini calls.
- Do not produce fake medical logic; use clearly labeled mock logic where needed.

## Product copy
Use the following product framing:
- Name: **PrismRx**
- Tagline: **Coverage intelligence for medical-benefit drugs**
- Description: **PrismRx turns messy payer policies into a searchable, comparable coverage intelligence layer with citations, case blockers, and policy change tracking.**

## Additional request
Make the codebase pleasant for future coding agents by adding:
- a concise root README
- docs for architecture
- docs for data model
- a small ADR describing why the monorepo is structured this way
- comments at major extension points

Now scaffold the repository.
