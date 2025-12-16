#!/usr/bin/env bash
#
# Celery Worker Startup Script - CPU Optimized
# 
# This script starts a Celery worker with optimized settings for
# CPU-bound tasks (document processing, embedding generation, RAG).
#
# Usage:
#   ./start-celery-worker.sh [OPTIONS]
#
# Options:
#   --queues=QUEUES     Comma-separated queue names (default: rag,documents,default)
#   --autoscale=MAX,MIN Enable autoscaling (e.g., --autoscale=8,2)
#   --concurrency=N     Fixed concurrency (overrides auto-detection)
#   --loglevel=LEVEL    Log level (default: info)
#   --dry-run           Print command without executing
#

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
QUEUES="rag,documents,default"
LOGLEVEL="info"
DRY_RUN=false
AUTOSCALE=""
CONCURRENCY=""

# Parse arguments
for arg in "$@"; do
    case $arg in
        --queues=*)
            QUEUES="${arg#*=}"
            ;;
        --autoscale=*)
            AUTOSCALE="${arg#*=}"
            ;;
        --concurrency=*)
            CONCURRENCY="${arg#*=}"
            ;;
        --loglevel=*)
            LOGLEVEL="${arg#*=}"
            ;;
        --dry-run)
            DRY_RUN=true
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --queues=QUEUES       Comma-separated queue names (default: rag,documents,default)"
            echo "  --autoscale=MAX,MIN   Enable autoscaling (e.g., --autoscale=8,2)"
            echo "  --concurrency=N       Fixed concurrency (overrides auto-detection)"
            echo "  --loglevel=LEVEL      Log level (default: info)"
            echo "  --dry-run             Print command without executing"
            echo ""
            exit 0
            ;;
        *)
            echo "Unknown option: $arg"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Detect physical CPU cores (not hyperthreaded)
echo -e "${BLUE}Detecting physical CPU cores...${NC}"

if command -v lscpu &> /dev/null; then
    # Linux with lscpu
    PHYSICAL_CORES=$(lscpu | grep "^Core(s) per socket:" | awk '{print $4}')
    SOCKETS=$(lscpu | grep "^Socket(s):" | awk '{print $2}')
    TOTAL_PHYSICAL_CORES=$((PHYSICAL_CORES * SOCKETS))
elif command -v python3 &> /dev/null; then
    # Fallback to Python psutil (if available)
    TOTAL_PHYSICAL_CORES=$(python3 -c "import psutil; print(psutil.cpu_count(logical=False))" 2>/dev/null || echo "")
    if [ -z "$TOTAL_PHYSICAL_CORES" ]; then
        echo -e "${YELLOW}Warning: Could not detect physical cores, using all cores${NC}"
        TOTAL_PHYSICAL_CORES=$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo "4")
    fi
else
    # Last resort
    echo -e "${YELLOW}Warning: Could not detect CPU cores, defaulting to 4${NC}"
    TOTAL_PHYSICAL_CORES=4
fi

echo -e "${GREEN}Detected ${TOTAL_PHYSICAL_CORES} physical CPU cores${NC}"

# Set concurrency (use user-provided or auto-detected)
if [ -n "$CONCURRENCY" ]; then
    WORKER_CONCURRENCY="$CONCURRENCY"
    echo -e "${GREEN}Using manual concurrency: ${WORKER_CONCURRENCY}${NC}"
elif [ -n "$AUTOSCALE" ]; then
    echo -e "${GREEN}Using autoscale: ${AUTOSCALE}${NC}"
else
    WORKER_CONCURRENCY="$TOTAL_PHYSICAL_CORES"
    echo -e "${GREEN}Using auto-detected concurrency: ${WORKER_CONCURRENCY}${NC}"
fi

# Build Celery command
CELERY_CMD="celery -A app.services.background.celery_app worker"
CELERY_CMD="$CELERY_CMD --pool=prefork"
CELERY_CMD="$CELERY_CMD --queues=$QUEUES"
CELERY_CMD="$CELERY_CMD --loglevel=$LOGLEVEL"
CELERY_CMD="$CELERY_CMD --prefetch-multiplier=1"
CELERY_CMD="$CELERY_CMD --max-tasks-per-child=50"
CELERY_CMD="$CELERY_CMD --max-memory-per-child=500000"

# Performance flags (reduce overhead)
CELERY_CMD="$CELERY_CMD --without-heartbeat"
CELERY_CMD="$CELERY_CMD --without-gossip"
CELERY_CMD="$CELERY_CMD --without-mingle"

# Add concurrency or autoscale
if [ -n "$AUTOSCALE" ]; then
    CELERY_CMD="$CELERY_CMD --autoscale=$AUTOSCALE"
else
    CELERY_CMD="$CELERY_CMD --concurrency=$WORKER_CONCURRENCY"
fi

# Print configuration
echo ""
echo -e "${BLUE}=====================================${NC}"
echo -e "${BLUE}  Celery Worker Configuration${NC}"
echo -e "${BLUE}=====================================${NC}"
echo -e "Queues:          ${GREEN}$QUEUES${NC}"
echo -e "Pool:            ${GREEN}prefork${NC}"
if [ -n "$AUTOSCALE" ]; then
    echo -e "Concurrency:     ${GREEN}autoscale ($AUTOSCALE)${NC}"
else
    echo -e "Concurrency:     ${GREEN}$WORKER_CONCURRENCY processes${NC}"
fi
echo -e "Prefetch:        ${GREEN}1 (optimized)${NC}"
echo -e "Max tasks/child: ${GREEN}50 (prevent memory leaks)${NC}"
echo -e "Max memory:      ${GREEN}500MB per worker${NC}"
echo -e "Log level:       ${GREEN}$LOGLEVEL${NC}"
echo -e "${BLUE}=====================================${NC}"
echo ""

if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}DRY RUN - Command that would be executed:${NC}"
    echo "$CELERY_CMD"
    exit 0
fi

# Start worker
echo -e "${GREEN}Starting Celery worker...${NC}"
echo ""
exec $CELERY_CMD
