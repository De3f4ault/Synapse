.PHONY: help install install-dev venv setup dev shell db-shell \
	migrate migrate-create migrate-down migrate-history init-db seed reset-db \
	docker-up docker-down docker-logs docker-clean \
	format lint ruff check test test-cov \
	clean clean-all openapi openapi-serve logs ps \
	nginx-install nginx-deploy nginx-reload nginx-test ssl-setup \
	prod-start prod-stop prod-restart prod-status prod-build prod-install-service \
	services-install services-start services-stop services-status services-restart \
	qdrant-start qdrant-stop qdrant-status celery-start celery-stop celery-status \
	health logs-backend logs-qdrant logs-celery logs-nginx logs-all


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
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-25s %s\n", $$1, $$2}' $(MAKEFILE_LIST)
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

# ============================================================================
# NATIVE SERVICE MANAGEMENT (SystemD)
# ============================================================================

services-install: ## Install all systemd services
	@echo "Installing systemd services..."
	@echo "NOTE: This requires sudo privileges"
	@sudo ./scripts/install-services.sh

services-start: ## Start all native services (Qdrant, Backend, Celery)
	@echo "Starting all services..."
	@sudo systemctl start postgresql || echo "PostgreSQL already running or not installed via systemd"
	@sudo systemctl start valkey || sudo systemctl start redis || echo "Valkey/Redis already running or not installed"
	@sudo systemctl start qdrant
	@sudo systemctl start synapse
	@sudo systemctl start synapse-celery-worker
	@sudo systemctl start synapse-celery-beat
	@echo "✓ All services started"
	@make services-status

services-stop: ## Stop all native services
	@echo "Stopping all services..."
	@sudo systemctl stop synapse-celery-beat || true
	@sudo systemctl stop synapse-celery-worker || true
	@sudo systemctl stop synapse || true
	@sudo systemctl stop qdrant || true
	@echo "✓ All services stopped"

services-restart: ## Restart all native services
	@echo "Restarting all services..."
	@make services-stop
	@sleep 2
	@make services-start

services-status: ## Check status of all native services
	@echo "========================================"
	@echo "  Service Status"
	@echo "========================================"
	@echo ""
	@echo "PostgreSQL:"
	@systemctl is-active postgresql > /dev/null 2>&1 && echo "  ✓ Running" || echo "  ✗ Stopped"
	@echo ""
	@echo "Valkey/Redis:"
	@systemctl is-active valkey > /dev/null 2>&1 && echo "  ✓ Valkey Running" || \
		(systemctl is-active redis > /dev/null 2>&1 && echo "  ✓ Redis Running" || echo "  ✗ Stopped")
	@echo ""
	@echo "Qdrant:"
	@systemctl is-active qdrant > /dev/null 2>&1 && echo "  ✓ Running" || echo "  ✗ Stopped"
	@echo ""
	@echo "Backend (Gunicorn):"
	@systemctl is-active synapse > /dev/null 2>&1 && echo "  ✓ Running" || echo "  ✗ Stopped"
	@echo ""
	@echo "Celery Worker:"
	@systemctl is-active synapse-celery-worker > /dev/null 2>&1 && echo "  ✓ Running" || echo "  ✗ Stopped"
	@echo ""
	@echo "Celery Beat:"
	@systemctl is-active synapse-celery-beat > /dev/null 2>&1 && echo "  ✓ Running" || echo "  ✗ Stopped"
	@echo ""
	@echo "Nginx:"
	@systemctl is-active nginx > /dev/null 2>&1 && echo "  ✓ Running" || echo "  ✗ Stopped"
	@echo ""

# ============================================================================
# INDIVIDUAL SERVICE MANAGEMENT
# ============================================================================

qdrant-start: ## Start Qdrant vector database
	@sudo systemctl start qdrant
	@echo "✓ Qdrant started"

qdrant-stop: ## Stop Qdrant
	@sudo systemctl stop qdrant
	@echo "✓ Qdrant stopped"

qdrant-status: ## Check Qdrant status
	@systemctl status qdrant

celery-start: ## Start Celery worker and beat
	@sudo systemctl start synapse-celery-worker
	@sudo systemctl start synapse-celery-beat
	@echo "✓ Celery services started"

celery-stop: ## Stop Celery worker and beat
	@sudo systemctl stop synapse-celery-beat
	@sudo systemctl stop synapse-celery-worker
	@echo "✓ Celery services stopped"

celery-status: ## Check Celery status
	@echo "Celery Worker:"
	@systemctl status synapse-celery-worker --no-pager -l 0
	@echo ""
	@echo "Celery Beat:"
	@systemctl status synapse-celery-beat --no-pager -l 0

# ============================================================================
# NGINX DEPLOYMENT & MANAGEMENT
# ============================================================================

nginx-install: ## Install and configure Nginx reverse proxy
	@echo "Setting up Nginx..."
	@if [ ! -f "config/nginx.conf" ]; then \
		echo "ERROR: config/nginx.conf not found"; \
		exit 1; \
	fi
	@echo "NOTE: This requires sudo privileges"
	@sudo ./scripts/setup-nginx.sh

nginx-deploy: ## Deploy nginx configuration
	@echo "Deploying nginx configuration..."
	@sudo ./scripts/deploy-nginx.sh

nginx-reload: ## Reload nginx configuration
	@sudo nginx -t && sudo systemctl reload nginx
	@echo "✓ Nginx reloaded"

nginx-test: ## Test nginx configuration
	@sudo nginx -t

ssl-setup: ## Generate self-signed SSL certificates for local dev
	@echo "Generating SSL certificates..."
	@echo "NOTE: This requires sudo privileges"
	@sudo ./scripts/ssl-setup.sh

# ============================================================================
# PRODUCTION DEPLOYMENT
# ============================================================================

prod-build: ## Build frontend and install production dependencies
	@echo "Building frontend..."
	@cd ../frontend && npm run build:prod
	@echo ""
	@echo "Installing production dependencies..."
	@pip install gunicorn
	@echo ""
	@echo "SUCCESS: Production build complete!"
	@echo "Frontend built to: ../frontend/dist"

prod-start: ## Start production server with Gunicorn
	@echo "Starting production server..."
	@./scripts/start-production.sh

prod-stop: ## Stop production server
	@echo "Stopping production server..."
	@pkill -f "gunicorn.*app.main:app" || echo "No Gunicorn process found"
	@echo "SUCCESS: Production server stopped"

prod-restart: ## Restart production server
	@echo "Restarting production server..."
	@make prod-stop
	@sleep 2
	@make prod-start

prod-status: ## Check production server status
	@echo "========================================" 
	@echo "  Production Server Status"
	@echo "========================================"
	@echo ""
	@echo "Gunicorn processes:"
	@ps aux | grep "gunicorn.*app.main:app" | grep -v grep || echo "  No Gunicorn processes running"
	@echo ""
	@echo "Nginx status:"
	@systemctl is-active nginx > /dev/null 2>&1 && echo "  ✓ Nginx is running" || echo "  ✗ Nginx is not running"
	@echo ""
	@echo "PostgreSQL status:"
	@systemctl is-active postgresql > /dev/null 2>&1 && echo "  ✓ PostgreSQL is running" || echo "  ✗ PostgreSQL is not running"
	@echo ""
	@echo "Redis/Valkey status:"
	@systemctl is-active valkey > /dev/null 2>&1 && echo "  ✓ Valkey is running" || \
		(systemctl is-active redis > /dev/null 2>&1 && echo "  ✓ Redis is running" || \
		(docker ps --filter "name=synapse-redis" --format "{{.Status}}" 2>/dev/null | grep -q "Up" && echo "  ✓ Redis (Docker) is running" || echo "  ✗ Stopped"))
	@echo ""

prod-install-service: ## Install systemd service for auto-start
	@echo "Installing systemd service..."
	@if [ ! -f "config/synapse.service" ]; then \
		echo "ERROR: config/synapse.service not found"; \
		exit 1; \
	fi
	@echo "NOTE: This requires sudo privileges"
	@sudo cp config/synapse.service /etc/systemd/system/
	@sudo systemctl daemon-reload
	@sudo systemctl enable synapse.service
	@echo "SUCCESS: Systemd service installed"
	@echo ""
	@echo "Manage with:"
	@echo "  sudo systemctl start synapse"
	@echo "  sudo systemctl stop synapse"
	@echo "  sudo systemctl restart synapse"
	@echo "  sudo systemctl status synapse"

# ============================================================================
# HEALTH CHECK & MONITORING
# ============================================================================

health: ## Check health of all services
	@echo "========================================"
	@echo "  System Health Check"
	@echo "========================================"
	@echo ""
	@make services-status
	@echo ""
	@echo "Testing backend health endpoint..."
	@curl -f http://localhost:8000/api/v1/health 2>/dev/null && echo "  ✓ Backend health OK" || echo "  ✗ Backend not responding"
	@echo ""
	@echo "Testing Qdrant..."
	@curl -f http://localhost:6333/healthz 2>/dev/null && echo "  ✓ Qdrant health OK" || echo "  ✗ Qdrant not responding"
	@echo ""

# ============================================================================
# LOGGING
# ============================================================================

logs-backend: ## View backend logs
	@journalctl -u synapse -f

logs-qdrant: ## View Qdrant logs
	@journalctl -u qdrant -f

logs-celery: ## View Celery worker logs
	@journalctl -u synapse-celery-worker -f

logs-nginx: ## View nginx error logs
	@sudo tail -f /var/log/nginx/synapse_error.log

logs-all: ## View all service logs
	@journalctl -u synapse -u qdrant -u synapse-celery-worker -u synapse-celery-beat -f
