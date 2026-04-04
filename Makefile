.PHONY: help dev stop logs build test clean migrate lint format

help:
	@echo "PrismRx Hackathon Backend"
	@echo ""
	@echo "Usage:"
	@echo "  make dev        - Start all services (Docker Compose)"
	@echo "  make stop       - Stop all services"
	@echo "  make rebuild    - Rebuild Docker images"
	@echo "  make logs       - Tail API logs"
	@echo "  make shell      - Open shell in API container"
	@echo "  make migrate    - Run database migrations"
	@echo "  make test       - Run tests"
	@echo "  make lint       - Run linting checks"
	@echo "  make format     - Format code with black"
	@echo "  make clean      - Clean up containers and volumes"

dev:
	@echo "Starting PrismRx development environment..."
	docker-compose up -d
	@echo ""
	@echo "Services starting:"
	@echo "  API:      http://localhost:8000"
	@echo "  Docs:     http://localhost:8000/docs"
	@echo "  Postgres: localhost:5432"
	@echo "  Redis:    localhost:6379"
	@echo ""
	@echo "View logs with: make logs"

stop:
	@echo "Stopping services..."
	docker-compose down

rebuild:
	@echo "Rebuilding Docker images..."
	docker-compose build --no-cache

logs:
	docker-compose logs -f api

shell:
	docker-compose exec api /bin/sh

db-shell:
	docker-compose exec postgres psql -U postgres -d prismrx_dev

migrate:
	@echo "Running migrations..."
	docker-compose exec api python run_alembic.py upgrade head

migrate-down:
	@echo "Rolling back migration..."
	docker-compose exec api python run_alembic.py downgrade -1

migrate-create:
	@echo "Creating new migration..."
	docker-compose exec api python run_alembic.py revision --autogenerate -m "$(MSG)"

test:
	@echo "Running tests..."
	docker-compose exec api pytest -v

lint:
	@echo "Linting code..."
	docker-compose exec api pylint app/

format:
	@echo "Formatting code with black..."
	docker-compose exec api black app/

clean:
	@echo "Cleaning up..."
	docker-compose down -v
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete

env-setup:
	@echo "Setting up .env file..."
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo ".env file created from .env.example"; \
	else \
		echo ".env file already exists"; \
	fi

# Database seeding target (for later)
seed:
	@echo "Seeding database..."
	docker-compose exec api python -m app.scripts.seed

# Health check
health:
	@echo "Checking service health..."
	@docker-compose exec api curl -s http://localhost:8000/health || echo "API not responding"
	@docker-compose exec postgres pg_isready || echo "Postgres not responding"
