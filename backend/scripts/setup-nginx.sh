#!/bin/bash
# ============================================================================
# SYNAPSE - Nginx Setup Script
# ============================================================================
# Installs and configures Nginx for the SYNAPSE application
# Usage: sudo ./scripts/setup-nginx.sh
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  SYNAPSE - Nginx Setup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}✗ Error: This script must be run as root${NC}"
    echo -e "${YELLOW}→ Run with: sudo ./scripts/setup-nginx.sh${NC}"
    exit 1
fi

# ============================================================================
# Configuration
# ============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
NGINX_CONF="${PROJECT_ROOT}/config/nginx.conf"
NGINX_SITES_AVAILABLE="/etc/nginx/sites-available/synapse"
NGINX_SITES_ENABLED="/etc/nginx/sites-enabled/synapse"

echo -e "${GREEN}✓${NC} Project root: ${PROJECT_ROOT}"
echo -e "${GREEN}✓${NC} Nginx config: ${NGINX_CONF}"
echo ""

# ============================================================================
# Detect OS and Package Manager
# ============================================================================
echo -e "${YELLOW}Detecting operating system...${NC}"

if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS_NAME=$ID
    OS_VERSION=$VERSION_ID
    echo -e "${GREEN}✓${NC} Detected: $PRETTY_NAME"
elif [ -f /etc/arch-release ]; then
    OS_NAME="arch"
    echo -e "${GREEN}✓${NC} Detected: Arch Linux"
else
    echo -e "${RED}✗ Error: Unable to detect operating system${NC}"
    exit 1
fi

# Determine package manager
if command -v pacman &> /dev/null; then
    PKG_MANAGER="pacman"
    echo -e "${GREEN}✓${NC} Package manager: pacman (Arch-based)"
elif command -v apt-get &> /dev/null; then
    PKG_MANAGER="apt"
    echo -e "${GREEN}✓${NC} Package manager: apt-get (Debian-based)"
elif command -v dnf &> /dev/null; then
    PKG_MANAGER="dnf"
    echo -e "${GREEN}✓${NC} Package manager: dnf (Fedora-based)"
elif command -v yum &> /dev/null; then
    PKG_MANAGER="yum"
    echo -e "${GREEN}✓${NC} Package manager: yum (RHEL-based)"
else
    echo -e "${RED}✗ Error: No supported package manager found${NC}"
    echo -e "${YELLOW}Supported: pacman, apt-get, dnf, yum${NC}"
    exit 1
fi
echo ""

# ============================================================================
# Install Nginx (if not installed)
# ============================================================================
if ! command -v nginx &> /dev/null; then
    echo -e "${YELLOW}Installing Nginx...${NC}"
    
    case $PKG_MANAGER in
        pacman)
            pacman -Sy --noconfirm nginx
            ;;
        apt)
            apt-get update
            apt-get install -y nginx
            ;;
        dnf)
            dnf install -y nginx
            ;;
        yum)
            yum install -y nginx
            ;;
        *)
            echo -e "${RED}✗ Error: Unsupported package manager${NC}"
            exit 1
            ;;
    esac
    
    echo -e "${GREEN}✓${NC} Nginx installed"
else
    echo -e "${GREEN}✓${NC} Nginx already installed"
fi


# ============================================================================
# Create SSL Directory
# ============================================================================
echo -e "${YELLOW}Creating SSL directory...${NC}"
mkdir -p /etc/nginx/ssl
chmod 700 /etc/nginx/ssl
echo -e "${GREEN}✓${NC} SSL directory created: /etc/nginx/ssl"
echo ""

# ============================================================================
# Copy Nginx Configuration
# ============================================================================
echo -e "${YELLOW}Installing Nginx configuration...${NC}"

if [ ! -f "$NGINX_CONF" ]; then
    echo -e "${RED}✗ Error: Nginx config not found at ${NGINX_CONF}${NC}"
    exit 1
fi

# Determine Nginx configuration directory structure
# Arch Linux: /etc/nginx/nginx.conf (main config, include conf.d/*)
# Debian/Ubuntu: /etc/nginx/sites-available/ and sites-enabled/
if [ -d "/etc/nginx/sites-available" ]; then
    # Debian/Ubuntu structure
    echo -e "${GREEN}→${NC} Using Debian/Ubuntu configuration structure"
    
    # Backup existing config if it exists
    if [ -f "$NGINX_SITES_AVAILABLE" ]; then
        echo -e "${YELLOW}→ Backing up existing config...${NC}"
        cp "$NGINX_SITES_AVAILABLE" "${NGINX_SITES_AVAILABLE}.backup.$(date +%Y%m%d_%H%M%S)"
    fi
    
    # Copy new config
    cp "$NGINX_CONF" "$NGINX_SITES_AVAILABLE"
    echo -e "${GREEN}✓${NC} Configuration copied to ${NGINX_SITES_AVAILABLE}"
    
    # Create symbolic link to enable site
    if [ -L "$NGINX_SITES_ENABLED" ]; then
        rm "$NGINX_SITES_ENABLED"
    fi
    ln -s "$NGINX_SITES_AVAILABLE" "$NGINX_SITES_ENABLED"
    echo -e "${GREEN}✓${NC} Site enabled: ${NGINX_SITES_ENABLED}"
    
    # Disable default Nginx site
    if [ -f "/etc/nginx/sites-enabled/default" ]; then
        rm -f "/etc/nginx/sites-enabled/default"
        echo -e "${GREEN}✓${NC} Default site disabled"
    fi
else
    # Arch Linux structure (or similar)
    echo -e "${GREEN}→${NC} Using Arch Linux configuration structure"
    
    # Create conf.d directory if it doesn't exist
    mkdir -p /etc/nginx/conf.d
    
    # Backup existing config if it exists
    if [ -f "/etc/nginx/conf.d/synapse.conf" ]; then
        echo -e "${YELLOW}→ Backing up existing config...${NC}"
        cp "/etc/nginx/conf.d/synapse.conf" "/etc/nginx/conf.d/synapse.conf.backup.$(date +%Y%m%d_%H%M%S)"
    fi
    
    # Copy new config to conf.d
    cp "$NGINX_CONF" "/etc/nginx/conf.d/synapse.conf"
    echo -e "${GREEN}✓${NC} Configuration copied to /etc/nginx/conf.d/synapse.conf"
    
    # Check if default server needs to be disabled
    if [ -f "/etc/nginx/nginx.conf" ]; then
        # Comment out default server block if it exists
        if grep -q "server {" /etc/nginx/nginx.conf 2>/dev/null; then
            echo -e "${YELLOW}⚠${NC} Note: You may need to manually disable the default server in /etc/nginx/nginx.conf"
        fi
    fi
fi
echo ""



# ============================================================================
# Determine Nginx User
# ============================================================================
# Different distributions use different users for Nginx
if id -u http >/dev/null 2>&1; then
    NGINX_USER="http"
    NGINX_GROUP="http"
    echo -e "${GREEN}→${NC} Nginx user: http (Arch Linux)"
elif id -u www-data >/dev/null 2>&1; then
    NGINX_USER="www-data"
    NGINX_GROUP="www-data"
    echo -e "${GREEN}→${NC} Nginx user: www-data (Debian/Ubuntu)"
elif id -u nginx >/dev/null 2>&1; then
    NGINX_USER="nginx"
    NGINX_GROUP="nginx"
    echo -e "${GREEN}→${NC} Nginx user: nginx (RHEL/CentOS)"
else
    echo -e "${YELLOW}⚠${NC} Warning: Could not detect Nginx user, using root"
    NGINX_USER="root"
    NGINX_GROUP="root"
fi

# ============================================================================
# Create Log Directory
# ============================================================================
echo -e "${YELLOW}Creating log directory...${NC}"
mkdir -p /var/log/nginx
chown -R ${NGINX_USER}:${NGINX_GROUP} /var/log/nginx
echo -e "${GREEN}✓${NC} Log directory ready"
echo ""

# ============================================================================
# Test Nginx Configuration
# ============================================================================
echo -e "${YELLOW}Testing Nginx configuration...${NC}"
if nginx -t; then
    echo -e "${GREEN}✓${NC} Nginx configuration is valid"
else
    echo -e "${RED}✗ Error: Nginx configuration test failed${NC}"
    echo -e "${YELLOW}→ Please check the configuration and try again${NC}"
    exit 1
fi
echo ""

# ============================================================================
# Reload Nginx
# ============================================================================
echo -e "${YELLOW}Reloading Nginx...${NC}"

# Enable and start Nginx service
systemctl enable nginx 2>/dev/null || systemctl enable nginx.service 2>/dev/null
systemctl restart nginx 2>/dev/null || systemctl restart nginx.service 2>/dev/null

echo -e "${GREEN}✓${NC} Nginx restarted and enabled on boot"
echo ""


# ============================================================================
# Status Check
# ============================================================================
echo -e "${YELLOW}Checking Nginx status...${NC}"
if systemctl is-active --quiet nginx 2>/dev/null || systemctl is-active --quiet nginx.service 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Nginx is running"
else
    echo -e "${RED}✗ Error: Nginx is not running${NC}"
    echo -e "${YELLOW}→ Check logs with: sudo journalctl -u nginx -n 50${NC}"
    exit 1
fi
echo ""


# ============================================================================
# Summary
# ============================================================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Setup Complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}Next steps:${NC}"
echo -e "  1. Generate SSL certificates: sudo ./scripts/ssl-setup.sh"
echo -e "  2. Build frontend: cd frontend && npm run build"
echo -e "  3. Start backend: ./scripts/start-production.sh"
echo ""
echo -e "${YELLOW}Important:${NC}"
echo -e "  • HTTP will redirect to HTTPS automatically"
echo -e "  • You need SSL certificates before HTTPS will work"
echo -e "  • Frontend must be built and placed in frontend/dist/"
echo ""
echo -e "${GREEN}Useful commands:${NC}"
echo -e "  • Check status: sudo systemctl status nginx"
echo -e "  • View logs: sudo tail -f /var/log/nginx/synapse_error.log"
echo -e "  • Reload config: sudo nginx -s reload"
echo -e "  • Test config: sudo nginx -t"
echo ""
