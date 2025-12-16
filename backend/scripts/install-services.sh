#!/bin/bash
# ============================================================================
# SYNAPSE - Install SystemD Services Script
# ============================================================================
# Installs all systemd service files and enables them
# Usage: sudo ./scripts/install-services.sh
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  SYNAPSE

 SystemD Services Installation${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}✗ Error: This script must be run as root${NC}"
    echo -e "${YELLOW}→ Run with: sudo ./scripts/install-services.sh${NC}"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CONFIG_DIR="${PROJECT_ROOT}/config"

echo -e "${GREEN}✓${NC} Project root: ${PROJECT_ROOT}"
echo ""

# Service files to install
services=(
    "qdrant"
    "synapse"
    "synapse-celery-worker"
    "synapse-celery-beat"
)

# Install each service
for service in "${services[@]}"; do
    SERVICE_FILE="${CONFIG_DIR}/${service}.service"
    
    if [ ! -f "$SERVICE_FILE" ]; then
        echo -e "${RED}✗ Error: Service file not found: ${SERVICE_FILE}${NC}"
        exit 1
    fi
    
    echo -e "${YELLOW}Installing ${service}.service...${NC}"
    
    # Backup existing service if it exists
    if [ -f "/etc/systemd/system/${service}.service" ]; then
        echo -e "${YELLOW}→ Backing up existing service...${NC}"
        cp "/etc/systemd/system/${service}.service" "/etc/systemd/system/${service}.service.backup.$(date +%Y%m%d_%H%M%S)"
    fi
    
    # Copy service file
    cp "$SERVICE_FILE" "/etc/systemd/system/${service}.service"
    chmod 644 "/etc/systemd/system/${service}.service"
    
    echo -e "${GREEN}✓${NC} Installed: ${service}.service"
done

echo ""
echo -e "${YELLOW}Reloading systemd daemon...${NC}"
systemctl daemon-reload
echo -e "${GREEN}✓${NC} Daemon reloaded"
echo ""

# Enable services (but don't start yet)
echo -e "${YELLOW}Enabling services...${NC}"
for service in "${services[@]}"; do
    systemctl enable "${service}.service"
    echo -e "${GREEN}✓${NC} Enabled: ${service}.service"
done

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Installation Complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}Services installed and enabled:${NC}"
for service in "${services[@]}"; do
    echo -e "  • ${service}.service"
done
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "  1. Verify data directories exist:"
echo -e "     mkdir -p ${PROJECT_ROOT}/data/qdrant"
echo -e "     mkdir -p ${PROJECT_ROOT}/data"
echo -e "     mkdir -p ${PROJECT_ROOT}/logs"
echo ""
echo -e "  2. Start services in order:"
echo -e "     ${GREEN}sudo systemctl start qdrant${NC}"
echo -e "     ${GREEN}sudo systemctl start synapse${NC}"
echo -e "     ${GREEN}sudo systemctl start synapse-celery-worker${NC}"
echo -e "     ${GREEN}sudo systemctl start synapse-celery-beat${NC}"
echo ""
echo -e "  3. Check status:"
echo -e "     ${GREEN}sudo systemctl status qdrant${NC}"
echo -e "     ${GREEN}journalctl -u qdrant -f${NC}"
echo ""
echo -e "${YELLOW}Or use the Makefile:${NC}"
echo -e "  ${GREEN}make services-start${NC}"
echo -e "  ${GREEN}make services-status${NC}"
echo ""
