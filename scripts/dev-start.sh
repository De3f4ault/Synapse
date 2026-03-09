#!/bin/bash
# ============================================================================
# SYNAPSE - Unified Development Startup Script
# ============================================================================
# Starts all development services in the correct order
# Usage: ./scripts/dev-start.sh
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================================${NC}"
echo -e "${BLUE}  SYNAPSE - Development Environment Startup${NC}"
echo -e "${BLUE}================================================================${NC}"
echo ""

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# ============================================================================
# Prerequisites Check
# ============================================================================

echo -e "${CYAN}Checking prerequisites...${NC}"
echo ""

# Check PostgreSQL
if command -v pg_isready &> /dev/null; then
    if pg_isready -h localhost -p 5432 &> /dev/null; then
        echo -e "${GREEN}✓${NC} PostgreSQL is running"
    else
        echo -e "${YELLOW}⚠${NC} PostgreSQL not running. Starting..."
        sudo systemctl start postgresql || echo -e "${RED}✗ Failed to start PostgreSQL${NC}"
    fi
else
    echo -e "${YELLOW}⚠${NC} pg_isready not found, skipping PostgreSQL check"
fi

# Check Redis/Valkey
if command -v redis-cli &> /dev/null; then
    if redis-cli -h localhost -p 6379 ping &> /dev/null; then
        echo -e "${GREEN}✓${NC} Redis/Valkey is running"
    else
        echo -e "${YELLOW}⚠${NC} Redis/Valkey not running. Starting..."
        sudo systemctl start valkey || sudo systemctl start redis || echo -e "${RED}✗ Failed to start Redis/Valkey${NC}"
    fi
fi

# Check Qdrant
if curl -f http://localhost:6333/healthz 2>/dev/null >/dev/null; then
    echo -e "${GREEN}✓${NC} Qdrant is running"
else
    echo -e "${YELLOW}⚠${NC} Qdrant not running. Starting..."
    sudo systemctl start qdrant || echo -e "${RED}✗ Failed to start Qdrant${NC}"
    sleep 2
fi

echo ""

# ============================================================================
# Start Backend Development Server
# ============================================================================

echo -e "${CYAN}Starting backend development server...${NC}"
cd "$PROJECT_ROOT/backend"

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}✗ Backend .env file not found${NC}"
    echo -e "${YELLOW}→ Copying from .env.example...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✓${NC} Created .env file. Please update with your values if needed."
    echo ""
fi

# Start backend in background
echo -e "${GREEN}→${NC} Starting FastAPI server on http://localhost:8000"
"$PROJECT_ROOT/backend/.venv/bin/uvicorn" app.main:app --reload --host 0.0.0.0 --port 8000 > /tmp/synapse-backend.log 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}✓${NC} Backend started (PID: $BACKEND_PID)"

# Wait for backend to be ready (60s timeout for ML model loading)
echo -e "${YELLOW}→${NC} Waiting for backend to be ready (loading ML models)..."
BACKEND_READY=false
for i in {1..60}; do
    if curl -f http://localhost:8000/api/v1/health 2>/dev/null >/dev/null; then
        echo -e "${GREEN}✓${NC} Backend is ready!"
        BACKEND_READY=true
        break
    fi
    sleep 1
done
if [ "$BACKEND_READY" = false ]; then
    echo -e "${YELLOW}⚠${NC} Backend still loading ML models (this is normal on first start)"
    echo -e "${YELLOW}→${NC} The backend will be ready in ~30s. Check: tail -f /tmp/synapse-backend.log"
fi

echo ""

# ============================================================================
# Start Frontend Development Server
# ============================================================================

echo -e "${CYAN}Starting frontend development server...${NC}"
cd "$PROJECT_ROOT/frontend"

# Check if node_modules exists
if [ ! -d node_modules ]; then
    echo -e "${YELLOW}⚠${NC} node_modules not found. Installing dependencies..."
    npm install
fi

echo -e "${GREEN}→${NC} Starting Vite dev server on http://localhost:3000"
npm run dev > /tmp/synapse-frontend.log 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}✓${NC} Frontend started (PID: $FRONTEND_PID)"

echo ""

# ============================================================================
# Summary
# ============================================================================

echo -e "${BLUE}================================================================${NC}"
echo -e "${BLUE}  Development Environment Ready!${NC}"
echo -e "${BLUE}================================================================${NC}"
echo ""
echo -e "${GREEN}Backend:${NC}  http://localhost:8000"
echo -e "          API Docs: http://localhost:8000/docs"
echo ""
echo -e "${GREEN}Frontend:${NC} http://localhost:3000"
echo ""
echo -e "${YELLOW}Logs:${NC}"
echo -e "  Backend:  tail -f /tmp/synapse-backend.log"
echo -e "  Frontend: tail -f /tmp/synapse-frontend.log"
echo ""
echo -e "${YELLOW}To stop services:${NC}"
echo -e "  kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo -e "${CYAN}Press Ctrl+C to stop all services...${NC}"
echo ""

# ============================================================================
# Cleanup Handler
# ============================================================================

cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down services...${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    echo -e "${GREEN}✓${NC} Services stopped"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Keep script running
wait
