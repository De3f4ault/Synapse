.PHONY: help install dev build build-prod preview clean lint format type-check

# ============================================================================
# HELP
# ============================================================================

help: ## Show this help message
	@echo ''
	@echo '================================================================'
	@echo '                  SYNAPSE Frontend Makefile                     '
	@echo '================================================================'
	@echo ''
	@echo 'Usage: make [target]'
	@echo ''
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@echo ''

# ============================================================================
# DEVELOPMENT
# ============================================================================

install: ## Install npm dependencies
	@echo "Installing frontend dependencies..."
	@npm install
	@echo "✓ Dependencies installed!"

dev: ## Start development server
	@echo "Starting Vite dev server..."
	@npm run dev

preview: ## Preview production build locally
	@echo "Starting preview server..."
	@npm run preview

# ============================================================================
# BUILD
# ============================================================================

build: ## Build for production (with type checking)
	@echo "Building frontend..."
	@npm run build
	@echo "✓ Build complete! Output in: dist/"

build-prod: ## Build for production (without type checking)
	@echo "Building frontend (production mode)..."
	@npm run build:prod
	@echo "✓ Build complete! Output in: dist/"

# ============================================================================
# CODE QUALITY
# ============================================================================

lint: ## Run ESLint
	@echo "Running linter..."
	@npm run lint

format: ## Format code with Prettier
	@echo "Formatting code..."
	@npm run format
	@echo "✓ Code formatted!"

type-check: ## Run TypeScript type checking
	@echo "Running type check..."
	@npm run type-check

# ============================================================================
# UTILITIES
# ============================================================================

clean: ## Clean build artifacts and caches
	@echo "Cleaning frontend..."
	@rm -rf dist/
	@rm -rf node_modules/.vite/
	@echo "✓ Frontend cleaned!"

clean-all: clean ## Clean everything including node_modules
	@echo "Removing node_modules..."
	@rm -rf node_modules/
	@echo "✓ All cleaned!"

# ============================================================================
# API CLIENT GENERATION
# ============================================================================

generate-api: ## Generate API client from OpenAPI spec
	@echo "Generating API client..."
	@npm run generate:api
	@echo "✓ API client generated!"
