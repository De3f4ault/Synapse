#!/bin/bash
# ============================================================================
# SYNAPSE - Comprehensive Health Check Script
# ============================================================================
# Checks the health of all services and dependencies
# Usage: ./scripts/health-check.sh
# ============================================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Symbols
CHECK="${GREEN}✓${NC}"
CROSS="${RED}✗${NC}"
WARN="${YELLOW}⚠${NC}"

echo -e "${BLUE}================================================================${NC}"
echo -e "${BLUE}  SYNAPSE - System Health Check${NC}"
echo -e "${BLUE}================================================================${NC}"
echo ""

# Track overall health
ALL_HEALTHY=true

# ============================================================================
# System Services
# ============================================================================

echo -e "${BLUE}System Services:${NC}"
echo ""

# PostgreSQL
echo -n "PostgreSQL:       "
if systemctl is-active postgresql > /dev/null 2>&1; then
    echo -e "$CHECK Running"
elif pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo -e "$CHECK Running (not via systemd)"
else
    echo -e "$CROSS Not running"
    ALL_HEALTHY=false
fi

# Redis/Valkey
echo -n "Redis/Valkey:     "
if systemctl is-active valkey > /dev/null 2>&1; then
    echo -e "$CHECK Valkey running"
elif systemctl is-active redis > /dev/null 2>&1; then
    echo -e "$CHECK Redis running"
elif command -v redis-cli &> /dev/null && redis-cli -h localhost -p 6379 ping > /dev/null 2>&1; then
    echo -e "$CHECK Running (not via systemd)"
else
    echo -e "$CROSS Not running"
    ALL_HEALTHY=false
fi

# Qdrant
echo -n "Qdrant:           "
if curl -f http://localhost:6333/healthz > /dev/null 2>&1; then
    echo -e "$CHECK Running"
else
    echo -e "$CROSS Not responding"
    ALL_HEALTHY=false
fi

echo ""

# ============================================================================
# Application Services
# ============================================================================

echo -e "${BLUE}Application Services:${NC}"
echo ""

# Backend (Synapse)
echo -n "Backend API:      "
if systemctl is-active synapse > /dev/null 2>&1; then
    # Production mode (systemd)
    if curl -f http://localhost:8000/api/v1/health > /dev/null 2>&1; then
        echo -e "$CHECK Running (production)"
    else
        echo -e "$WARN Systemd active but not responding"
        ALL_HEALTHY=false
    fi
elif curl -f http://localhost:8000/api/v1/health > /dev/null 2>&1; then
    # Development mode
    echo -e "$CHECK Running (development)"
else
    echo -e "$CROSS Not running"
    ALL_HEALTHY=false
fi

# Celery Worker
echo -n "Celery Worker:    "
if systemctl is-active synapse-celery-worker > /dev/null 2>&1; then
    echo -e "$CHECK Running"
else
    echo -e "$CROSS Not running"
    # Don't fail health check for Celery in dev mode
fi

# Celery Beat
echo -n "Celery Beat:      "
if systemctl is-active synapse-celery-beat > /dev/null 2>&1; then
    echo -e "$CHECK Running"
else
    echo -e "$CROSS Not running"
    # Don't fail health check for Celery Beat in dev mode
fi

# Frontend (development server)
echo -n "Frontend Dev:     "
if curl -f http://localhost:5173 > /dev/null 2>&1; then
    echo -e "$CHECK Running"
else
    echo -e "$CROSS Not running (dev server)"
fi

# Frontend (production build)
echo -n "Frontend Build:   "
if [ -d "frontend/dist" ] && [ "$(ls -A frontend/dist)" ]; then
    echo -e "$CHECK Built"
else
    echo -e "$CROSS Not built"
fi

echo ""

# ============================================================================
# API Endpoints
# ============================================================================

echo -e "${BLUE}API Endpoints:${NC}"
echo ""

# Health endpoint
echo -n "Health Check:     "
if curl -f http://localhost:8000/api/v1/health > /dev/null 2>&1; then
    echo -e "$CHECK http://localhost:8000/api/v1/health"
else
    echo -e "$CROSS http://localhost:8000/api/v1/health"
    ALL_HEALTHY=false
fi

# API Docs
echo -n "API Docs:         "
if curl -f http://localhost:8000/docs > /dev/null 2>&1; then
    echo -e "$CHECK http://localhost:8000/docs"
else
    echo -e "$CROSS http://localhost:8000/docs"
fi

# Qdrant API
echo -n "Qdrant API:       "
if curl -f http://localhost:6333/collections > /dev/null 2>&1; then
    echo -e "$CHECK http://localhost:6333"
else
    echo -e "$CROSS http://localhost:6333"
fi

echo ""

# ============================================================================
# Summary
# ============================================================================

echo -e "${BLUE}================================================================${NC}"
if [ "$ALL_HEALTHY" = true ]; then
    echo -e "${GREEN}  ✓ All critical services are healthy${NC}"
else
    echo -e "${RED}  ✗ Some critical services are not running${NC}"
fi
echo -e "${BLUE}================================================================${NC}"
echo ""

# Exit with appropriate code
if [ "$ALL_HEALTHY" = true ]; then
    exit 0
else
    exit 1
fi
