# PrismRx

AI-powered medical benefit drug policy tracker. Built for Innovation Hacks 2026 @ ASU.

PrismRx ingests payer PDF policies, extracts structured coverage criteria using Gemini, and surfaces a payer × drug coverage matrix for pharmacy benefit managers and prior authorization teams.

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 15, Tailwind CSS, Framer Motion |
| Backend | FastAPI, SQLAlchemy (async), asyncpg |
| AI Extraction | Google Gemini 2.5 Flash |
| Database | PostgreSQL 15 |
| Cache | Redis 7 |
| Infra | Docker Compose (local) |

---

## Monorepo Structure

```
apps/
  web/        Next.js frontend
  api/        FastAPI backend
data/
  sample_policies/   Sample payer PDFs for ingestion
```

---

## Local Development

### Prerequisites

- Docker Desktop (for Postgres + Redis)
- Python 3.11+
- Node.js 18+

### 1. Start infrastructure

```bash
docker compose up -d
```

### 2. Backend

```bash
cd apps/api

# Install dependencies
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Start server
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Create `apps/api/.env`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/prismrx_dev
database_url=postgresql+asyncpg://postgres:postgres@localhost:5432/prismrx_dev
ENVIRONMENT=development
gemini_api_key=YOUR_GEMINI_API_KEY
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

### 3. Frontend

```bash
cd apps/web
npm install
npm run dev
```

Create `apps/web/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_USE_MOCK=false
```

Open [http://localhost:3000](http://localhost:3000).

---

## Ingesting Policies

Upload a PDF policy document to extract and store coverage criteria:

```bash
curl -X POST "http://localhost:8000/api/ingest/local?payer=UnitedHealthcare&drug_family=infliximab" \
  -F "file=@data/sample_policies/infliximab-remicade-inflectra.pdf"
```

The pipeline: PDF → Gemini extraction → `PolicyRecord` stored in Postgres → available in `/api/matrix`.

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/matrix` | Payer × drug coverage matrix |
| GET | `/api/policies` | List all ingested policies |
| GET | `/api/policies/{id}` | Single policy detail |
| POST | `/api/ingest/local` | Upload PDF for ingestion |
| POST | `/api/ingest/url` | Ingest policy from URL |
| GET | `/health` | Health check |

---

## Team

Built by the LavaLamps team for Innovation Hacks 2026.
