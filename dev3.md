# PrismRx — `dev3` branch

Branch documentation for the document-grounded policy assistant, live web crawl, and Bedrock-backed Q&A.

**Remote:** [github.com/kaizen-38/PrismRx_LavaLamps_InnovationsHacks26](https://github.com/kaizen-38/PrismRx_LavaLamps_InnovationsHacks26) · branch **`dev3`**

---

## What this branch does

1. User asks about **payer + drug** in the workspace.
2. **DB lookup** (`GET /api/policy`) for an indexed policy row.
3. **Live web path** (`GET /api/policy/live`): search → rank multiple URLs → extract text (PDF or HTML).
4. **Text priority for Claude:** live extracted text → stored `raw_text` → structured DB fields (with clear limits when no PDF exists).
5. **AWS Bedrock (Claude)** answers only from that material; citations are verbatim snippets when available.
6. If there is **no usable document** after DB miss + live attempt, the assistant states that **the information is not available** (and explains API/network issues when relevant).

---

## Backend (FastAPI)

| Area | Notes |
|------|--------|
| **Policy API** | `apps/api/app/api/policy_lookup.py` — `GET /api/policy`, `/api/policy/options`, `/api/policy/{id}/document`, **`GET /api/policy/live`** (live route lives here so it ships with the policy router). |
| **Crawler** | `apps/api/app/services/crawler/policy_crawler.py` — Tavily (optional key) + Brave (optional) + DuckDuckGo; ranked **multi-URL** tries; PDF via PyMuPDF; HTML via **Jina Reader** → **trafilatura** → BeautifulSoup → optional Crawl4AI. |
| **Config** | `apps/api/app/core/config.py` — `SettingsConfigDict` loads `apps/api/.env` by path; optional `TAVILY_API_KEY` / `tavily_api_key`, `BRAVE_SEARCH_API_KEY` / `brave_search_api_key`; Bedrock + DB settings. |
| **Main** | `apps/api/app/main.py` — includes policy lookup router only (`policy_crawl.py` removed; live merged into lookup). |
| **Bedrock** | `apps/api/app/services/llm/bedrock_client.py` — bearer token auth for document analysis / extraction. |
| **Deps** | `requirements.txt` — e.g. `duckduckgo-search`, `trafilatura`, `boto3`; `crawl4ai` optional on Windows. |

### Environment (names only — **do not commit secrets**)

- Postgres: `DATABASE_URL` / `database_url`
- Bedrock: `aws_bearer_token_bedrock`, `aws_region`, `bedrock_model_id`
- Crawler (optional): `TAVILY_API_KEY` or `tavily_api_key`, `BRAVE_SEARCH_API_KEY` or `brave_search_api_key`

---

## Frontend (Next.js)

| Area | Notes |
|------|--------|
| **Orchestrator** | `apps/web/lib/assistant-orchestrator.ts` — after DB miss, calls live crawl once, then coverage or explicit refusal; `buildCoverageFromSources` + Claude refusal rules when document text is insufficient. |
| **API client** | `apps/web/lib/policy/db-repository.ts` — `API_URL` or `NEXT_PUBLIC_API_URL` for server-side fetch; `cache: 'no-store'`; live fetch timeout; optional `httpStatus` / `fetchFailed` for error copy. |
| **Types** | `apps/web/lib/assistant-types.ts` — `dataSource: 'manual_indexed' \| 'live_web'`. |
| **Workspace UI** | `apps/web/app/workspace/WorkspaceClient.tsx` — longer assistant request timeout; copy reflects indexed + live. |
| **Tests** | `assistant-envelope.test.ts` — mocks `getLivePolicyText` for speed. |

---

## How to run (local)

**Postgres** (example):

```bash
docker run -d --name prismrx-pg -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=prismrx_dev -p 5432:5432 postgres:15
```

**API** (`apps/api`):

```bash
cd apps/api
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Web** (`apps/web`):

```bash
cd apps/web
pnpm dev
# or: npm install --legacy-peer-deps && npm run dev
```

**Env hints**

- Web: `NEXT_PUBLIC_API_URL=http://localhost:8000`, Bedrock vars if using real Claude from Next.
- If Next runs in Docker and API on host: set **`API_URL`** (e.g. `http://host.docker.internal:8000`) for server-side policy fetches.

---

## Quick verification

```bash
curl "http://localhost:8000/api/health"
curl "http://localhost:8000/api/policy/options"
curl "http://localhost:8000/api/policy/live?payer=Aetna&drug=vedolizumab"
```

Workspace: **http://localhost:3000/workspace**

**Sample prompts**

- Indexed: `Does UnitedHealthcare cover infliximab?` · `Cigna rituximab coverage`
- Live-heavy (often not indexed): `Does Aetna cover vedolizumab?` · `Aetna Entyvio medical benefit policy`

---

## Related docs

- `current.md` — earlier session summary (may overlap; this file is the `dev3` branch-oriented overview).

---

*Last updated for push to `dev3` — keep API keys and tokens out of git; use `.env` only locally.*
