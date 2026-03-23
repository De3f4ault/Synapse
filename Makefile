.PHONY: help dev dev-frontend dev-backend \
	prod-start prod-stop prod-status \
	health install setup mac-setup clean logs

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
# macOS SETUP (Homebrew)
# ============================================================================

mac-setup: ## Set up macOS infrastructure (PG, extensions, Qdrant, Redis)
	@./scripts/mac-setup.sh

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
