.PHONY: help install install-dev venv setup dev dev-bg dev-stop shell db-shell \
	migrate migrate-create migrate-down migrate-history init-db seed reset-db \
	format lint ruff check test test-cov \
	clean clean-all openapi openapi-serve logs ps \
	supervisor-start supervisor-stop supervisor-status supervisor-restart \
	prod-start prod-stop prod-status health \
	celery-io celery-cpu celery-all backfill-embeddings

# ============================================================================
# HELP
# ============================================================================

help: ## Show this help message
	@echo ''
	@echo '================================================================'
	@echo '                  SYNAPSE Backend Makefile                      '
	@echo '================================================================'
	@echo ''
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Quick Start:'
	@echo '  make dev              Start development server'
	@echo '  make supervisor-start Start production (Supervisor)'
	@echo '  make health           Check service health'
	@echo ''
	@echo 'Available targets:'
	@echo ''
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-22s %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@echo ''

# ============================================================================
# ENVIRONMENT & SETUP
# ============================================================================

install: ## Install Python dependencies
	pip install -r requirements.txt

install-dev: ## Install development dependencies
	pip install -r requirements.txt
	pip install black isort mypy ruff pytest pytest-cov pytest-asyncio

venv: ## Create virtual environment
	@if [ ! -d ".venv" ]; then \
		echo "Creating virtual environment..."; \
		python3 -m venv .venv; \
		echo "Virtual environment created at backend/.venv"; \
	else \
		echo "Virtual environment already exists at backend/.venv"; \
	fi
	@echo "Activate with: source .venv/bin/activate"

setup: ## Complete project setup (venv + install + env check)
	@if [ ! -f .env ]; then \
		echo "WARNING: .env file not found. Copying from .env.example..."; \
		cp .env.example .env; \
		echo "SUCCESS: .env file created. Please update with your values."; \
	else \
		echo "SUCCESS: .env file already exists."; \
	fi
	@mkdir -p logs data/qdrant
	@echo "Installing dependencies..."
	@make install

# ============================================================================
# DEVELOPMENT
# ============================================================================

dev: ## Run development server with auto-reload
	uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

dev-bg: ## Run development server in background
	@echo "Starting development server in background..."
	@uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 > /tmp/synapse-backend-dev.log 2>&1 & echo $$! > /tmp/synapse-backend-dev.pid
	@echo "✓ Backend started (PID: $$(cat /tmp/synapse-backend-dev.pid))"
	@echo "→ Logs: tail -f /tmp/synapse-backend-dev.log"

dev-stop: ## Stop background development server
	@if [ -f /tmp/synapse-backend-dev.pid ]; then \
		kill $$(cat /tmp/synapse-backend-dev.pid) 2>/dev/null || true; \
		rm /tmp/synapse-backend-dev.pid; \
		echo "✓ Development server stopped"; \
	else \
		echo "No development server PID file found"; \
	fi

shell: ## Interactive Python shell with app context
	python -i -c "from app.main import app; from app.db.session import AsyncSessionLocal; print('App loaded. Available: app, AsyncSessionLocal')"

db-shell: ## PostgreSQL database shell
	PGPASSWORD=synapse_pass psql -h localhost -U synapse_user -d synapse

# ============================================================================
# DATABASE & MIGRATIONS
# ============================================================================

migrate: ## Run all pending migrations
	alembic upgrade head

migrate-create: ## Create new migration (usage: make migrate-create MESSAGE="description")
	@if [ -z "$(MESSAGE)" ]; then \
		echo "ERROR: MESSAGE is required. Usage: make migrate-create MESSAGE=\"your message\""; \
		exit 1; \
	fi
	alembic revision --autogenerate -m "$(MESSAGE)"

migrate-down: ## Rollback last migration
	alembic downgrade -1

migrate-history: ## Show migration history
	alembic history --verbose

init-db: ## Initialize database schema
	python scripts/init_db.py

seed: ## Seed test data
	@echo "WARNING: Seed data script not yet implemented"

reset-db: ## Drop and recreate database (DANGEROUS!)
	@echo "WARNING: This will delete ALL data in the database!"
	@read -p "Are you sure? Type 'yes' to continue: " confirm; \
	if [ "$$confirm" = "yes" ]; then \
		alembic downgrade base; \
		alembic upgrade head; \
		echo "SUCCESS: Database reset complete."; \
	else \
		echo "CANCELLED."; \
	fi

# ============================================================================
# CODE QUALITY
# ============================================================================

format: ## Format code with Black and isort
	@echo "Formatting code..."
	black app/ --line-length 100
	isort app/ --profile black --line-length 100
	@echo "SUCCESS: Code formatted!"

lint: ## Run type checking with mypy
	@echo "Running type checks..."
	mypy app/ --ignore-missing-imports
	@echo "SUCCESS: Type checking complete!"

ruff: ## Run Ruff linter
	@echo "Running Ruff linter..."
	ruff check app/
	@echo "SUCCESS: Ruff check complete!"

check: format lint ruff ## Run all quality checks (format + lint + ruff)
	@echo "SUCCESS: All quality checks passed!"

# ============================================================================
# TESTING
# ============================================================================

test: ## Run tests with pytest
	@if [ -d "tests" ]; then \
		pytest tests/ -v; \
	else \
		echo "WARNING: No tests directory found. Skipping tests."; \
	fi

test-cov: ## Run tests with coverage report
	@if [ -d "tests" ]; then \
		pytest tests/ -v --cov=app --cov-report=html --cov-report=term; \
		echo "Coverage report generated in htmlcov/index.html"; \
	else \
		echo "WARNING: No tests directory found. Skipping tests."; \
	fi

# ============================================================================
# CLEANING
# ============================================================================

clean: ## Remove Python cache files
	@echo "Cleaning cache files..."
	@find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	@find . -type f -name "*.pyc" -delete
	@find . -type f -name "*.pyo" -delete
	@find . -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name ".mypy_cache" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name ".ruff_cache" -exec rm -rf {} + 2>/dev/null || true
	@echo "SUCCESS: Cache cleaned!"

clean-all: clean ## Remove cache + data directories
	@echo "Cleaning all generated files..."
	@rm -rf htmlcov/ .coverage
	@echo "SUCCESS: All cleaned!"

# ============================================================================
# OPENAPI
# ============================================================================

openapi: ## Generate OpenAPI schema JSON file
	@echo "Generating OpenAPI schema..."
	@python -c "from app.main import app; import json; print(json.dumps(app.openapi(), indent=2))" > openapi.json
	@echo "SUCCESS: OpenAPI schema saved to openapi.json"

openapi-serve: ## Serve OpenAPI docs
	@echo "Swagger UI: http://localhost:8000/docs"
	@echo "ReDoc: http://localhost:8000/redoc"
	@make dev

# ============================================================================
# SUPERVISOR - Production Process Management
# ============================================================================

supervisor-start: ## Start all services with Supervisor
	@echo "Starting Supervisor..."
	@mkdir -p logs data/qdrant
	supervisord -c config/supervisord.conf
	@echo "✓ Supervisor started"
	@sleep 2
	@make supervisor-status

supervisor-stop: ## Stop all Supervisor services
	@echo "Stopping all services..."
	supervisorctl -c config/supervisord.conf stop all
	supervisorctl -c config/supervisord.conf shutdown
	@echo "✓ All services stopped"

supervisor-status: ## Show Supervisor status
	@supervisorctl -c config/supervisord.conf status

supervisor-restart: ## Restart all services
	@echo "Restarting all services..."
	supervisorctl -c config/supervisord.conf restart synapse:*

# ============================================================================
# PRODUCTION (Aliases for Supervisor)
# ============================================================================

prod-start: supervisor-start ## Start production server (alias for supervisor-start)

prod-stop: supervisor-stop ## Stop production server (alias for supervisor-stop)

prod-status: supervisor-status ## Check production status (alias for supervisor-status)

# ============================================================================
# HEALTH CHECK & MONITORING
# ============================================================================

health: ## Check health of all services
	@echo "========================================"
	@echo "  System Health Check"
	@echo "========================================"
	@echo ""
	@echo "PostgreSQL:"
	@pg_isready -h localhost -p 5432 > /dev/null 2>&1 && echo "  ✓ Running" || echo "  ✗ Stopped"
	@echo ""
	@echo "Redis/Valkey:"
	@redis-cli -h localhost -p 6379 ping > /dev/null 2>&1 && echo "  ✓ Running" || echo "  ✗ Stopped"
	@echo ""
	@echo "Qdrant:"
	@curl -f http://localhost:6333/healthz 2>/dev/null >/dev/null && echo "  ✓ Running" || echo "  ✗ Stopped"
	@echo ""
	@echo "Backend API:"
	@curl -f http://localhost:8000/api/v1/health 2>/dev/null >/dev/null && echo "  ✓ Running" || echo "  ✗ Stopped"
	@echo ""

logs: ## Tail all service logs
	@tail -f logs/*.log 2>/dev/null || echo "No logs found. Start services first."

ps: ## Show running processes
	@echo "Python processes:"
	@ps aux | grep python | grep -v grep || echo "No Python processes found"

# ============================================================================
# CELERY (Manual Worker Control)
# ============================================================================

celery-io: ## Start IO-bound Celery worker (emails, webhooks)
	@echo "Starting IO-bound Celery worker..."
	celery -A app.services.background.celery_app worker \
		--pool=prefork \
		--queues=emails,default,webhook \
		--loglevel=info \
		--concurrency=2 \
		--max-tasks-per-child=100 \
		--max-memory-per-child=300000 \
		-n io_worker@%h

celery-cpu: ## Start CPU-bound Celery worker (RAG, embeddings, OCR)
	@echo "Starting CPU-bound Celery worker..."
	celery -A app.services.background.celery_app worker \
		--pool=prefork \
		--queues=rag,embeddings,documents,ocr \
		--loglevel=info \
		--concurrency=1 \
		--max-tasks-per-child=100 \
		--max-memory-per-child=1500000 \
		-n cpu_worker@%h

celery-all: ## Start all Celery queues in one worker (dev only)
	@echo "Starting Celery worker (all queues)..."
	celery -A app.services.background.celery_app worker \
		--pool=prefork \
		--queues=emails,default,webhook,rag,embeddings,documents,ocr \
		--loglevel=info \
		--concurrency=1 \
		--prefetch-multiplier=1 \
		--max-tasks-per-child=100 \
		--max-memory-per-child=1500000 \
		-n dev_worker@%h

celery-beat: ## Start Celery beat scheduler
	@echo "Starting Celery beat..."
	@rm -f /tmp/celerybeat.pid
	celery -A app.services.background.celery_app beat \
		--loglevel=info \
		--pidfile=/tmp/celerybeat.pid

# ============================================================================
# EMBEDDING MANAGEMENT
# ============================================================================

backfill-embeddings: ## Backfill embeddings for existing notes/flashcards
	@echo "Starting embedding backfill..."
	@echo "This will queue embedding generation for all notes and flashcards."
	@read -p "Continue? [y/N] " confirm; \
	if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
		python -c "from app.services.background import batch_backfill_notes_task, batch_backfill_flashcards_task; print('Queueing notes...'); batch_backfill_notes_task.apply_async(); print('Queueing flashcards...'); batch_backfill_flashcards_task.apply_async(); print('Done! Monitor with: celery -A app.services.background.celery_app inspect active')"; \
	else \
		echo "Cancelled."; \
	fi

