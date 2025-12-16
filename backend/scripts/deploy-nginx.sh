#!/bin/bash
# ============================================================================
# SYNAPSE - Deploy Nginx Configuration
# ============================================================================
# Deploys the nginx reverse proxy configuration to the system
# Usage: sudo ./scripts/deploy-nginx.sh
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  SYNAPSE - Nginx Configuration Deployment${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}✗ Error: This script must be run as root${NC}"
    echo -e "${YELLOW}→ Run with: sudo ./scripts/deploy-nginx.sh${NC}"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
NGINX_CONF="${PROJECT_ROOT}/config/nginx.conf"

echo -e "${GREEN}✓${NC} Project root: ${PROJECT_ROOT}"
echo ""

# ============================================================================
# Check Prerequisites
# ============================================================================
echo -e "${YELLOW}Checking prerequisites...${NC}"

# Check if nginx is installed
if ! command -v nginx &> /dev/null; then
    echo -e "${RED}✗ Error: Nginx is not installed${NC}"
    echo -e "${YELLOW}→ Install with: sudo pacman -S nginx${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} Nginx is installed"

# Check if config file exists
if [ ! -f "$NGINX_CONF" ]; then
    echo -e "${RED}✗ Error: Nginx config not found at ${NGINX_CONF}${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} Nginx config found"

echo ""

# ============================================================================
# Determine Nginx Configuration Structure
# ============================================================================
echo -e "${YELLOW}Determining nginx configuration structure...${NC}"

if [ -d "/etc/nginx/conf.d" ]; then
    # Arch Linux structure
    echo -e "${GREEN}→${NC} Using conf.d structure (Arch Linux)"
    NGINX_DEST="/etc/nginx/conf.d/synapse.conf"
    
    # Backup existing config if it exists
    if [ -f "$NGINX_DEST" ]; then
        echo -e "${YELLOW}→ Backing up existing config...${NC}"
        cp "$NGINX_DEST" "${NGINX_DEST}.backup.$(date +%Y%m%d_%H%M%S)"
        echo -e "${GREEN}✓${NC} Backup created"
    fi
    
    # Copy config
    echo -e "${YELLOW}Copying nginx configuration...${NC}"
    cp "$NGINX_CONF" "$NGINX_DEST"
    chmod 644 "$NGINX_DEST"
    echo -e "${GREEN}✓${NC} Configuration installed: ${NGINX_DEST}"
    
elif [ -d "/etc/nginx/sites-available" ]; then
    # Debian/Ubuntu structure
    echo -e "${GREEN}→${NC} Using sites-available structure (Debian/Ubuntu)"
    NGINX_AVAILABLE="/etc/nginx/sites-available/synapse"
    NGINX_ENABLED="/etc/nginx/sites-enabled/synapse"
    
    # Backup existing config if it exists
    if [ -f "$NGINX_AVAILABLE" ]; then
        echo -e "${YELLOW}→ Backing up existing config...${NC}"
        cp "$NGINX_AVAILABLE" "${NGINX_AVAILABLE}.backup.$(date +%Y%m%d_%H%M%S)"
        echo -e "${GREEN}✓${NC} Backup created"
    fi
    
    # Copy config
    echo -e "${YELLOW}Copying nginx configuration...${NC}"
    cp "$NGINX_CONF" "$NGINX_AVAILABLE"
    chmod 644 "$NGINX_AVAILABLE"
    echo -e "${GREEN}✓${NC} Configuration installed: ${NGINX_AVAILABLE}"
    
    # Enable site
    if [ -L "$NGINX_ENABLED" ]; then
        rm "$NGINX_ENABLED"
    fi
    ln -s "$NGINX_AVAILABLE" "$NGINX_ENABLED"
    echo -e "${GREEN}✓${NC} Site enabled: ${NGINX_ENABLED}"
    
    # Disable default site
    if [ -f "/etc/nginx/sites-enabled/default" ]; then
        rm -f "/etc/nginx/sites-enabled/default"
        echo -e "${GREEN}✓${NC} Default site disabled"
    fi
else
    echo -e "${RED}✗ Error: Unable to determine nginx configuration structure${NC}"
    exit 1
fi

echo ""

# ============================================================================
# Create Required Directories
# ============================================================================
echo -e "${YELLOW}Ensuring required directories exist...${NC}"

# Frontend dist directory
FRONTEND_DIST="${PROJECT_ROOT}/../frontend/dist"
if [ ! -d "$FRONTEND_DIST" ]; then
    echo -e "${YELLOW}⚠ Warning: Frontend dist directory not found: ${FRONTEND_DIST}${NC}"
    echo -e "${YELLOW}→ You'll need to build the frontend before nginx can serve it${NC}"
    echo -e "${YELLOW}→ Run: cd ../frontend && npm run build${NC}"
else
    echo -e "${GREEN}✓${NC} Frontend dist directory exists"
fi

# SSL directory
mkdir -p /etc/nginx/ssl
chmod 700 /etc/nginx/ssl
echo -e "${GREEN}✓${NC} SSL directory ready: /etc/nginx/ssl"

# Log directory
mkdir -p /var/log/nginx
echo -e "${GREEN}✓${NC} Log directory ready: /var/log/nginx"

echo ""

# ============================================================================
# Test Nginx Configuration
# ============================================================================
echo -e "${YELLOW}Testing nginx configuration...${NC}"
if nginx -t; then
    echo -e "${GREEN}✓${NC} Nginx configuration is valid"
else
    echo -e "${RED}✗ Error: Nginx configuration test failed${NC}"
    echo -e "${YELLOW}→ Please check the configuration and try again${NC}"
    exit 1
fi

echo ""

# ============================================================================
# Reload/Restart Nginx
# ============================================================================
echo -e "${YELLOW}Applying nginx configuration...${NC}"

if systemctl is-active --quiet nginx; then
    # Nginx is running, reload
    systemctl reload nginx
    echo -e "${GREEN}✓${NC} Nginx reloaded with new configuration"
else
    # Nginx not running, start it
    systemctl enable nginx
    systemctl start nginx
    echo -e "${GREEN}✓${NC} Nginx started and enabled"
fi

echo ""

# ============================================================================
# Summary
# ============================================================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Nginx Deployment Complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}Configuration deployed successfully!${NC}"
echo ""
echo -e "${YELLOW}Important next steps:${NC}"
echo ""
echo -e "  1. ${GREEN}Generate SSL certificates:${NC}"
echo -e "     sudo ./scripts/ssl-setup.sh"
echo ""
echo -e "  2. ${GREEN}Build frontend (if not done):${NC}"
echo -e "     cd ../frontend && npm run build"
echo ""
echo -e "  3. ${GREEN}Start backend services:${NC}"
echo -e "     sudo ./scripts/install-services.sh"
echo -e "     sudo systemctl start synapse"
echo ""
echo -e "  4. ${GREEN}Check nginx status:${NC}"
echo -e "     sudo systemctl status nginx"
echo -e "     sudo nginx -t"
echo ""
echo -e "${YELLOW}Useful commands:${NC}"
echo -e "  • View logs: ${GREEN}sudo tail -f /var/log/nginx/synapse_error.log${NC}"
echo -e "  • Reload config: ${GREEN}sudo nginx -s reload${NC}"
echo -e "  • Test config: ${GREEN}sudo nginx -t${NC}"
echo ""
echo -e "${GREEN}Nginx is now configured to serve Synapse on:${NC}"
echo -e "  • ${GREEN}https://localhost${NC} (requires SSL certificates)"
echo -e "  • ${GREEN}http://localhost${NC} (will redirect to HTTPS)"
echo ""
