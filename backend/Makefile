.PHONY: help install install-dev venv setup dev shell db-shell \
	migrate migrate-create migrate-down migrate-history init-db seed reset-db \
	docker-up docker-down docker-logs docker-clean \
	format lint ruff check test test-cov \
	clean clean-all openapi openapi-serve logs ps

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
	@echo 'Available targets:'
	@echo ''
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)
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
	python3 -m venv venv
	@echo "Virtual environment created. Activate with: source venv/bin/activate"

setup: ## Complete project setup (venv + install + env check)
	@if [ ! -f .env ]; then \
		echo "WARNING: .env file not found. Copying from .env.example..."; \
		cp .env.example .env; \
		echo "SUCCESS: .env file created. Please update with your values."; \
	else \
		echo "SUCCESS: .env file already exists."; \
	fi
	@echo "Installing dependencies..."
	@make install

# ============================================================================
# DEVELOPMENT
# ============================================================================

dev: ## Run development server with auto-reload
	uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

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
	@echo "Create scripts/seed_data.py to implement database seeding"

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
# DOCKER SERVICES
# ============================================================================

docker-up: ## Start all Docker services (PostgreSQL, Redis)
	@echo "Starting Docker services..."
	@docker run -d --name synapse-postgres \
		-e POSTGRES_USER=synapse_user \
		-e POSTGRES_PASSWORD=synapse_pass \
		-e POSTGRES_DB=synapse \
		-p 5432:5432 \
		postgres:16-alpine || echo "WARNING: synapse-postgres already running"
	@docker run -d --name synapse-redis \
		-p 6379:6379 \
		redis:7-alpine || echo "WARNING: synapse-redis already running"
	@echo "SUCCESS: Docker services started!"
	@echo "PostgreSQL: localhost:5432 (user: synapse_user, db: synapse)"
	@echo "Redis: localhost:6379"

docker-down: ## Stop all Docker services
	@echo "Stopping Docker services..."
	-@docker stop synapse-postgres synapse-redis
	-@docker rm synapse-postgres synapse-redis
	@echo "SUCCESS: Docker services stopped!"

docker-logs: ## View Docker service logs
	@docker logs -f synapse-postgres

docker-clean: ## Clean Docker volumes and containers
	@echo "Cleaning Docker resources..."
	-@docker stop synapse-postgres synapse-redis
	-@docker rm synapse-postgres synapse-redis
	-@docker volume prune -f
	@echo "SUCCESS: Docker cleanup complete!"

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
	@rm -rf data/ logs/ htmlcov/ .coverage
	@echo "SUCCESS: All cleaned!"

# ============================================================================
# OPENAPI
# ============================================================================

openapi: ## Generate OpenAPI schema JSON file
	@echo "Generating OpenAPI schema..."
	@python -c "from app.main import app; import json; print(json.dumps(app.openapi(), indent=2))" > openapi.json
	@echo "SUCCESS: OpenAPI schema saved to openapi.json"

openapi-serve: ## Serve OpenAPI docs
	@echo "Starting development server for OpenAPI docs..."
	@echo "Swagger UI: http://localhost:8000/docs"
	@echo "ReDoc: http://localhost:8000/redoc"
	@make dev

# ============================================================================
# UTILITIES
# ============================================================================

logs: ## Tail application logs
	@if [ -d "logs" ]; then \
		tail -f logs/*.log; \
	else \
		echo "WARNING: No logs directory found."; \
	fi

ps: ## Show running processes
	@echo "Python processes:"
	@ps aux | grep python | grep -v grep || echo "No Python processes found"
	@echo ""
	@echo "Docker containers:"
	@docker ps --filter "name=synapse" || echo "No Docker containers found"
