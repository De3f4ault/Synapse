#!/usr/bin/env bash
#
# Celery Flower Monitoring Dashboard Startup Script
#
# Flower is a real-time web-based monitoring tool for Celery.
# It provides insights into:
# - Active/idle workers
# - Task execution times and states
# - Queue lengths
# - Worker CPU/memory usage
#
# Usage:
#   ./start-celery-flower.sh [OPTIONS]
#
# Options:
#   --port=PORT        Port to run Flower on (default: 5555)
#   --broker=URL       Redis broker URL (default: from settings)
#   --dry-run          Print command without executing
#

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Default values
PORT=5555
DRY_RUN=false
BROKER=""

# Parse arguments
for arg in "$@"; do
    case $arg in
        --port=*)
            PORT="${arg#*=}"
            ;;
        --broker=*)
            BROKER="${arg#*=}"
            ;;
        --dry-run)
            DRY_RUN=true
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --port=PORT     Port to run Flower on (default: 5555)"
            echo "  --broker=URL    Redis broker URL (default: from settings)"
            echo "  --dry-run       Print command without executing"
            echo ""
            exit 0
            ;;
        *)
            echo "Unknown option: $arg"
            exit 1
            ;;
    esac
done

# Build command
FLOWER_CMD="celery -A app.services.background.celery_app flower"
FLOWER_CMD="$FLOWER_CMD --port=$PORT"

if [ -n "$BROKER" ]; then
    FLOWER_CMD="$FLOWER_CMD --broker=$BROKER"
fi

# Print configuration
echo ""
echo -e "${BLUE}=====================================${NC}"
echo -e "${BLUE}  Flower Monitoring Dashboard${NC}"
echo -e "${BLUE}=====================================${NC}"
echo -e "Port:            ${GREEN}$PORT${NC}"
echo -e "Access URL:      ${GREEN}http://localhost:$PORT${NC}"
echo -e "${BLUE}=====================================${NC}"
echo ""

if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}DRY RUN - Command that would be executed:${NC}"
    echo "$FLOWER_CMD"
    exit 0
fi

# Start Flower
echo -e "${GREEN}Starting Flower dashboard...${NC}"
echo -e "${YELLOW}Open http://localhost:$PORT in your browser${NC}"
echo ""
exec $FLOWER_CMD
