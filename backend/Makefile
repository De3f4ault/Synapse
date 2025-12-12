.PHONY: help install dev migrate shell format lint clean test

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install dependencies
	pip install -r requirements.txt

dev: ## Run development server
	uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

migrate: ## Run database migrations
	alembic upgrade head

migrate-create: ## Create new migration (usage: make migrate-create MESSAGE="description")
	alembic revision --autogenerate -m "$(MESSAGE)"

migrate-down: ## Rollback one migration
	alembic downgrade -1

shell: ## Open Python shell with app context
	python -i -c "from app.main import app; from app.db.session import AsyncSessionLocal"

format: ## Format code with black and isort
	black app/
	isort app/

lint: ## Run mypy type checking
	mypy app/

test: ## Run tests
	pytest tests/ -v

clean: ## Clean cache files
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	find . -type f -name "*.pyo" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} +
	find . -type d -name ".pytest_cache" -exec rm -rf {} +
	find . -type d -name ".mypy_cache" -exec rm -rf {} +

init-db: ## Initialize database and run migrations
	python scripts/init_db.py

seed: ## Seed test data
	python scripts/seed_data.py

redis: ## Start Redis server
	redis-server

postgres: ## Start PostgreSQL (local)
	pg_ctl -D /usr/local/var/postgres start

postgres-stop: ## Stop PostgreSQL (local)
	pg_ctl -D /usr/local/var/postgres stop

postgres-status: ## Check PostgreSQL status
	pg_ctl -D /usr/local/var/postgres status
