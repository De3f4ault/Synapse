#!/bin/bash
# ============================================================================
# SYNAPSE Backend - Production Startup Script
# ============================================================================
# Starts the FastAPI backend using Gunicorn with Uvicorn workers
# Usage: ./scripts/start-production.sh
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  SYNAPSE Backend - Production Start${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# ============================================================================
# Configuration
# ============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# Load environment variables
if [ -f ".env" ]; then
    echo -e "${GREEN}✓${NC} Loading environment variables from .env"
    # Use set -a to export all variables, then source the file
    # This properly handles JSON arrays and special characters
    set -a
    source .env
    set +a
else
    echo -e "${RED}✗ Error: .env file not found${NC}"
    echo -e "${YELLOW}→ Please create .env file (copy from .env.example)${NC}"
    exit 1
fi

# Gunicorn configuration
GUNICORN_CONF="${PROJECT_ROOT}/config/gunicorn.conf.py"
APP_MODULE="app.main:app"
WORKERS=${GUNICORN_WORKERS:-$(($(nproc) * 2 + 1))}

echo -e "${GREEN}✓${NC} Project root: ${PROJECT_ROOT}"
echo -e "${GREEN}✓${NC} Workers: ${WORKERS}"
echo ""

# ============================================================================
# Pre-flight Checks
# ============================================================================
echo -e "${YELLOW}Running pre-flight checks...${NC}"

# Check if gunicorn is installed
if ! command -v gunicorn &> /dev/null; then
    echo -e "${RED}✗ Error: gunicorn not installed${NC}"
    echo -e "${YELLOW}→ Install with: pip install gunicorn${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} Gunicorn installed"

# Check if PostgreSQL is accessible
if command -v pg_isready &> /dev/null; then
    if pg_isready -h localhost -p 5432 &> /dev/null; then
        echo -e "${GREEN}✓${NC} PostgreSQL is running"
    else
        echo -e "${YELLOW}⚠${NC} Warning: PostgreSQL not accessible on localhost:5432"
        echo -e "${YELLOW}→ Make sure PostgreSQL is running (or start with: make docker-up)${NC}"
    fi
else
    # pg_isready not available (common on Arch), try psql
    if command -v psql &> /dev/null; then
        if psql -h localhost -p 5432 -U postgres -c '\q' &> /dev/null 2>&1; then
            echo -e "${GREEN}✓${NC} PostgreSQL is accessible"
        else
            echo -e "${YELLOW}⚠${NC} Warning: Could not verify PostgreSQL status"
        fi
    else
        echo -e "${YELLOW}⚠${NC} Note: PostgreSQL client tools not found, skipping check"
    fi
fi


# Check if Redis is accessible
if command -v redis-cli &> /dev/null; then
    if redis-cli -h localhost -p 6379 ping &> /dev/null; then
        echo -e "${GREEN}✓${NC} Redis is running"
    else
        echo -e "${YELLOW}⚠${NC} Warning: Redis not accessible on localhost:6379"
        echo -e "${YELLOW}→ Make sure Redis is running (or start with: make docker-up)${NC}"
    fi
fi

echo ""

# ============================================================================
# Database Migrations
# ============================================================================
# TEMP: Commented out due to overlapping revision conflict
# The database should already be migrated. If you need to run migrations:
# Comment this back in after resolving the conflict with:
#   alembic heads (check for multiple heads)
#   alembic merge <rev1> <rev2> --splice (if needed)
#
# echo -e "${YELLOW}Running database migrations...${NC}"
# if command -v alembic &> /dev/null; then
#     alembic upgrade head
#     echo -e "${GREEN}✓${NC} Migrations complete"
# else
#     echo -e "${YELLOW}⚠${NC} Alembic not found, skipping migrations"
# fi
# echo ""

echo -e "${YELLOW}⚠ Skipping database migrations (conflict resolution needed)${NC}"
echo ""

# ============================================================================
# Start Gunicorn
# ============================================================================
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Starting Gunicorn Server${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}App Module:${NC} ${APP_MODULE}"
echo -e "${GREEN}Config File:${NC} ${GUNICORN_CONF}"
echo -e "${GREEN}Bind Address:${NC} 0.0.0.0:8000"
echo -e "${GREEN}Workers:${NC} ${WORKERS}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"
echo ""

# Start Gunicorn
exec gunicorn \
    --config "$GUNICORN_CONF" \
    "$APP_MODULE"
