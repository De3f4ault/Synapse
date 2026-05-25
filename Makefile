.PHONY: help dev dev-frontend dev-backend \
	prod-start prod-stop prod-status \
	health install setup mac-setup linux-setup clean logs

# ============================================================================
# HELP
# ============================================================================

help: ## Show this help message
	@echo ''
	@echo '================================================================'
	@echo '                    SYNAPSE Project Makefile                    '
	@echo '================================================================'
	@echo ''
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Quick Start:'
	@echo '  make dev              Start development environment'
	@echo '  make prod-start       Start production (Supervisor)'
	@echo '  make health           Check health of all services'
	@echo '  make mac-setup        Set up infra on macOS (Homebrew)'
	@echo '  make linux-setup      Set up infra on Linux (Debian/Arch)'
	@echo ''
	@echo 'Available targets:'
	@echo ''
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-18s %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@echo ''

# ============================================================================
# DEVELOPMENT
# ============================================================================

dev: ## Start all development services (frontend + backend)
	@./scripts/dev-start.sh

dev-frontend: ## Start frontend dev server only
	@echo "Starting frontend development server..."
	@cd frontend && npm run dev

dev-backend: ## Start backend dev server only
	@echo "Starting backend development server..."
	@cd backend && make dev

# ============================================================================
# PRODUCTION (Supervisor)
# ============================================================================

prod-start: ## Start production services with Supervisor
	@echo "Starting production services..."
	@cd backend && make supervisor-start
	@echo ""
	@echo "✓ All production services started!"
	@echo ""
	@echo "Frontend: Serve frontend/dist/ with Nginx"
	@echo "Backend:  http://localhost:8000"

prod-stop: ## Stop all production services
	@echo "Stopping production services..."
	@cd backend && make supervisor-stop
	@echo ""
	@echo "✓ All production services stopped!"

prod-status: ## Check production server status
	@cd backend && make supervisor-status

prod-restart: ## Restart all production services
	@echo "Restarting production services..."
	@cd backend && supervisorctl -c config/supervisord.conf restart synapse:*

# ============================================================================
# HEALTH CHECKS
# ============================================================================

health: ## Check health of all services
	@./scripts/health-check.sh

# ============================================================================
# INSTALLATION & SETUP
# ============================================================================

install: ## Install all dependencies (frontend + backend)
	@echo "Installing dependencies..."
	@echo ""
	@echo "→ Installing backend dependencies..."
	@cd backend && make install
	@echo ""
	@echo "→ Installing frontend dependencies..."
	@cd frontend && npm install
	@echo ""
	@echo "✓ All dependencies installed!"

setup: ## Complete initial project setup
	@echo "================================================================"
	@echo "  SYNAPSE - Initial Setup"
	@echo "================================================================"
	@echo ""
	@echo "→ Setting up backend..."
	@cd backend && make setup
	@echo ""
	@echo "→ Installing frontend dependencies..."
	@cd frontend && npm install
	@echo ""
	@echo "→ Creating required directories..."
	@mkdir -p backend/data/qdrant
	@mkdir -p backend/logs
	@mkdir -p storage
	@echo ""
	@echo "================================================================"
	@echo "  Setup Complete!"
	@echo "================================================================"
	@echo ""
	@echo "Next steps:"
	@echo "  1. Review and update backend/.env with your configuration"
	@echo "  2. Start development: make dev"
	@echo "  3. Check health: make health"
	@echo ""

# ============================================================================
# PLATFORM SETUP
# ============================================================================

mac-setup: ## Set up macOS infrastructure (PG, extensions, Qdrant, Redis)
	@./scripts/mac-setup.sh

linux-setup: ## Set up Linux infrastructure (Debian/Arch — PG, extensions, Qdrant, Redis)
	@./scripts/linux-setup.sh

# ============================================================================
# UTILITIES
# ============================================================================

clean: ## Clean all build artifacts and caches
	@echo "Cleaning project..."
	@cd backend && make clean
	@cd frontend && rm -rf dist/ node_modules/.vite/
	@echo "✓ Project cleaned!"

logs: ## Tail application logs
	@cd backend && make logs

build: ## Build frontend for production
	@echo "Building frontend for production..."
	@cd frontend && npm run build
	@echo "✓ Frontend built to: frontend/dist/"

# ============================================================================
# DOCKER
# ============================================================================

.PHONY: docker-first-run docker-build docker-up docker-down docker-restart \
	docker-logs docker-logs-api docker-logs-worker docker-ps \
	docker-shell-api docker-shell-worker docker-shell-db \
	populate-models migrate bootstrap-qdrant docker-smoke rollback-bare-metal

docker-first-run: ## Full first-run: build + populate models + migrate + start + bootstrap Qdrant
	@bash docker/scripts/first-run.sh

docker-build: ## Build all Docker images (parallel)
	@docker compose build --parallel

docker-up: ## Start all containers (detached)
	@docker compose up -d

docker-down: ## Stop and remove all containers (data volumes preserved)
	@docker compose down

docker-restart: ## Restart all containers
	@docker compose restart

docker-logs: ## Tail all container logs
	@docker compose logs -f

docker-logs-api: ## Tail API logs only
	@docker compose logs -f api

docker-logs-worker: ## Tail worker-cpu and worker-io logs
	@docker compose logs -f worker-cpu worker-io

docker-ps: ## Show container status and health
	@docker compose ps

docker-shell-api: ## Open bash shell in api container
	@docker compose exec api bash

docker-shell-worker: ## Open bash shell in worker-cpu container
	@docker compose exec worker-cpu bash

docker-shell-db: ## Open psql in postgres container
	@docker compose exec postgres psql -U postgres -d synapse

populate-models: ## Download HuggingFace models into synapse_model_cache volume
	@echo "Downloading models (requires internet — HF_HUB_OFFLINE disabled)..."
	@docker compose run --rm \
		-e HF_HUB_OFFLINE=0 \
		-e TRANSFORMERS_OFFLINE=0 \
		api python -c "import os; cache_dir = os.environ.get('SYNAPSE_MODEL_CACHE_DIR', '/app/.model_cache'); print(f'Cache: {cache_dir}'); from sentence_transformers import SentenceTransformer, CrossEncoder; SentenceTransformer('nomic-ai/nomic-embed-text-v1.5', cache_folder=cache_dir); print('✓ nomic-embed-text-v1.5'); SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2', cache_folder=cache_dir); print('✓ all-MiniLM-L6-v2'); CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2', cache_folder=cache_dir); print('✓ ms-marco-MiniLM-L-6-v2'); from transformers import AutoImageProcessor, AutoModel, AutoTokenizer; AutoImageProcessor.from_pretrained('nomic-ai/nomic-embed-vision-v1.5', cache_dir=cache_dir); AutoModel.from_pretrained('nomic-ai/nomic-embed-vision-v1.5', cache_dir=cache_dir, trust_remote_code=True); print('✓ nomic-embed-vision-v1.5'); AutoTokenizer.from_pretrained('answerdotai/answerai-colbert-small-v1', cache_dir=cache_dir); AutoModel.from_pretrained('answerdotai/answerai-colbert-small-v1', cache_dir=cache_dir); print('✓ answerai-colbert-small-v1'); print('Done.')"
	@echo "✓ Models cached."

migrate: ## Run Alembic migrations (idempotent)
	@docker compose run --rm migrate

bootstrap-qdrant: ## Create Qdrant shared collection (retry loop, 60s timeout)
	@echo "Bootstrapping Qdrant collections..."
	@retries=0; max=12; \
	until docker compose exec -T api python -c \
		"from app.core.ai.rag.vector_store.qdrant.client import get_qdrant_client; \
		 from app.core.ai.rag.vector_store.qdrant.collection_manager import CollectionManager; \
		 cm = CollectionManager(get_qdrant_client().get_client()); \
		 print('Collection:', cm.create_shared_collection())" 2>/dev/null; do \
		retries=$$((retries+1)); \
		[ $$retries -ge $$max ] && echo "ERROR: Qdrant bootstrap failed." && exit 1; \
		echo "  Waiting for API... ($$retries/$$max)"; sleep 5; \
	done
	@echo "✓ Qdrant collections ready."

docker-smoke: ## Run smoke tests against the running stack
	@docker compose run --rm api pytest tests/smoke/ -v --tb=short

rollback-bare-metal: ## Show rollback instructions (bare-metal via supervisord)
	@echo ""
	@echo "=== Rollback to bare-metal (supervisord) ==="
	@echo ""
	@echo "  1. docker compose down"
	@echo "  2. cd backend && make start"
	@echo ""
	@echo "  Estimated time: < 2 minutes."
	@echo "  Bare-metal config (supervisord.conf) is unchanged and always ready."
	@echo ""

