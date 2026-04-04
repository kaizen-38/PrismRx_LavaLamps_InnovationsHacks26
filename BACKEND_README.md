# PrismRx Backend

FastAPI-based backend for medical benefit drug policy tracking and analysis.

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Python 3.11+ (for local development without Docker)

### Setup with Docker (Recommended)

```bash
# Copy environment file
cp .env.example .env

# Start all services (Postgres, Redis, API)
make dev

# In another terminal, run migrations
make migrate

# Seed sample data
make seed
```

The API will be available at `http://localhost:8000`
- **API Docs**: `http://localhost:8000/docs`
- **OpenAPI Schema**: `http://localhost:8000/openapi.json`

### Setup for Local Development

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r apps/api/requirements.txt

# Set up environment
cp .env.example .env

# Start Postgres and Redis with Docker only
docker-compose up postgres redis

# In another terminal, run migrations
cd apps/api
alembic upgrade head

# Start the API server
uvicorn app.main:app --reload
```

## Project Structure

```
apps/api/
├── app/
│   ├── main.py              # FastAPI application factory
│   ├── config.py            # Configuration management
│   ├── database.py          # Database setup and sessions
│   │
│   ├── models/              # SQLAlchemy ORM models
│   │   ├── drug.py          # Drug entity
│   │   ├── policy.py        # Policy document metadata
│   │   └── policy_dna.py    # Normalized policy coverage data
│   │
│   ├── routers/             # API route handlers
│   │   ├── ingest.py        # PDF upload and parsing endpoints
│   │   ├── policies.py      # Coverage query endpoints
│   │   └── matrix.py        # Dashboard matrix endpoints
│   │
│   ├── services/            # Business logic
│   │   └── parser.py        # PDF parsing with source traceability
│   │
│   ├── schemas/             # Pydantic request/response schemas
│   │   └── policies.py      # Policy-related schemas
│   │
│   ├── scripts/             # Utility scripts
│   │   └── seed.py          # Database seeding
│   │
│   └── utils/               # Helper utilities
│
├── alembic/                 # Database migrations
│   └── versions/
│       └── 001_initial_schema.py
│
├── requirements.txt         # Python dependencies
├── Dockerfile              # Container image definition
└── pytest.ini              # Test configuration
```

## Key Features

### 1. PDF Parsing Pipeline (`app/services/parser.py`)

Extracts text from policy PDFs with source traceability:
- Preserves page numbers for each text chunk
- Supports both PyMuPDF and pdfplumber fallback
- Calculates file hash for deduplication
- Graceful error handling with manual curation fallback

```python
parsed_doc = pdf_parser.parse_pdf(
    file_path="/path/to/policy.pdf",
    payer_name="Aetna",
    source_url="https://..."
)
# Returns: ParsedPolicyDocument with chunks, page numbers, and source info
```

### 2. Coverage Matrix API (`app/routers/matrix.py`)

Returns structured grid data for dashboard visualization:
- Drug × Payer coverage matrix
- Friction score calculation (access difficulty)
- Therapeutic area filtering
- Side-by-side comparisons

```bash
GET /api/v1/matrix/coverage?therapeutic_area=Oncology&limit=50
```

### 3. Policy Ingestion (`app/routers/ingest.py`)

Upload and parse policy documents:
- Accepts PDF files
- Extracts structured coverage data
- Stores in database
- Returns parsing status

```bash
POST /api/v1/ingest/upload-policy
Content-Type: multipart/form-data

file: <policy.pdf>
payer_id: <uuid>
effective_date: 2026-04-01
```

## Database Schema

### Tables
- **payers**: Health plan information (Aetna, Cigna, UHC, etc.)
- **drugs**: Medical benefit drugs with therapeutic classification
- **policy_documents**: Raw PDF documents with parsing metadata
- **coverage_policies**: Normalized, structured policy coverage data (Policy DNA)

### Key Relationships
- `coverage_policies` links `drugs` and `payers` with coverage details
- `policy_documents` stores the raw PDF + extraction status
- All entities include audit timestamps (created_at, updated_at)

## Makefile Commands

```bash
make dev          # Start development environment
make stop         # Stop all services
make rebuild      # Rebuild Docker images
make logs         # View API logs
make shell        # Open shell in API container
make db-shell     # Connect to Postgres directly
make migrate      # Run database migrations
make test         # Run test suite
make lint         # Run linting checks
make format       # Format code with black
make clean        # Clean up containers and volumes
make health       # Check service health
```

## API Endpoints

### Health & Info
- `GET /` - API root info
- `GET /health` - Health check
- `GET /api/v1/ingest/health` - Ingest service health

### Ingestion
- `POST /api/v1/ingest/upload-policy` - Upload a policy PDF
- `GET /api/v1/ingest/status/{policy_id}` - Check parsing status

### Policies
- `GET /api/v1/policies/drug/{drug_id}` - Get coverage for a drug
- `GET /api/v1/policies/payer/{payer_id}/drugs` - Get drugs covered by payer
- `GET /api/v1/policies/search` - Search policies
- `GET /api/v1/policies/{policy_id}` - Get policy details

### Matrix
- `GET /api/v1/matrix/coverage` - Get coverage matrix for dashboard
- `GET /api/v1/matrix/compare/{drug_id}` - Side-by-side comparison
- `GET /api/v1/matrix/therapeutic-areas` - List therapeutic areas
- `GET /api/v1/matrix/summary` - Dashboard summary stats

## Testing

```bash
# Run all tests
make test

# Run specific test file
docker-compose exec api pytest tests/test_routers.py -v

# Run with coverage
docker-compose exec api pytest --cov=app
```

## Environmental Variables

See `.env.example` for all available settings:

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://...` | Postgres connection string |
| `API_PORT` | `8000` | FastAPI server port |
| `ENVIRONMENT` | `development` | Environment mode |
| `STORAGE_PATH` | `/data/policies` | Where to store uploaded PDFs |
| `LOG_LEVEL` | `INFO` | Logging level |
| `REDIS_URL` | `redis://localhost:6379/0` | Redis connection |

## Troubleshooting

### Database Connection Error
```bash
# Ensure Postgres is running
docker-compose ps

# Check container health
docker-compose logs postgres
```

### PDF Parsing Issues
- Check if PyMuPDF installed correctly: `pip install PyMuPDF`
- Verify PDF file is readable before upload
- Check logs for detailed parsing errors
- Fallback to manual text extraction if needed

### Port Already in Use
```bash
# Stop existing containers
make stop

# Or use different port
API_PORT=8001 docker-compose up
```

## Architecture Notes

### Why Multiple Agents (Planned)
- **Parser**: Extracts raw text with page numbers
- **Normalizer**: Maps to canonical drugs, standardizes criteria
- **Delta**: Detects policy changes between versions
- **Comparator**: Calculates cross-payer restrictiveness
- **Explainer**: Generates human-readable summaries

For hackathon MVP, focus is on Parser → Matrix endpoint.

### Scaling Considerations
- pgvector ready for semantic search (phase 2)
- Redis for caching frequently queried policies (phase 2)
- Async API ready for high concurrency
- Database indexes optimized for common queries

## Contributing

1. Create feature branch: `git checkout -b feature/my-feature`
2. Run tests: `make test`
3. Run linting: `make lint`
4. Format code: `make format`
5. Commit with clear messages
6. PR should have tests and documentation

## Support

For issues or questions:
- Check logs: `make logs`
- Run health check: `make health`
- Review API docs: `http://localhost:8000/docs`

---

**Built for Anton RX Innovation Hacks 2026**
