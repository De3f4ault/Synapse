#!/bin/bash
# ============================================================================
# SYNAPSE - SSL Certificate Setup Script
# ============================================================================
# Generates self-signed SSL certificates for local development
# For production, use Let's Encrypt (certbot) instead
# Usage: sudo ./scripts/ssl-setup.sh
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  SYNAPSE - SSL Setup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}✗ Error: This script must be run as root${NC}"
    echo -e "${YELLOW}→ Run with: sudo ./scripts/ssl-setup.sh${NC}"
    exit 1
fi

# ============================================================================
# Configuration
# ============================================================================
SSL_DIR="/etc/nginx/ssl"
CERT_FILE="${SSL_DIR}/synapse.crt"
KEY_FILE="${SSL_DIR}/synapse.key"
DAYS_VALID=365

# Certificate details
COUNTRY="US"
STATE="Development"
CITY="Local"
ORGANIZATION="SYNAPSE"
ORG_UNIT="Development"
COMMON_NAME="localhost"

echo -e "${GREEN}✓${NC} SSL directory: ${SSL_DIR}"
echo -e "${GREEN}✓${NC} Certificate will be valid for: ${DAYS_VALID} days"
echo ""

# ============================================================================
# Create SSL Directory
# ============================================================================
echo -e "${YELLOW}Ensuring SSL directory exists...${NC}"
mkdir -p "$SSL_DIR"
chmod 700 "$SSL_DIR"
echo -e "${GREEN}✓${NC} SSL directory ready"
echo ""

# ============================================================================
# Check for Existing Certificates
# ============================================================================
if [ -f "$CERT_FILE" ] && [ -f "$KEY_FILE" ]; then
    echo -e "${YELLOW}⚠ Existing certificates found${NC}"
    echo -e "${YELLOW}Certificate: ${CERT_FILE}${NC}"
    echo -e "${YELLOW}Key: ${KEY_FILE}${NC}"
    echo ""
    
    # Show expiration date
    if command -v openssl &> /dev/null; then
        EXPIRY=$(openssl x509 -enddate -noout -in "$CERT_FILE" 2>/dev/null | cut -d= -f2)
        echo -e "${YELLOW}Current certificate expires: ${EXPIRY}${NC}"
    fi
    echo ""
    
    read -p "Do you want to regenerate? (y/N): " -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${GREEN}✓${NC} Keeping existing certificates"
        exit 0
    fi
    
    # Backup existing certificates
    echo -e "${YELLOW}Backing up existing certificates...${NC}"
    BACKUP_DIR="${SSL_DIR}/backup_$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    mv "$CERT_FILE" "${BACKUP_DIR}/" 2>/dev/null || true
    mv "$KEY_FILE" "${BACKUP_DIR}/" 2>/dev/null || true
    echo -e "${GREEN}✓${NC} Backup created: ${BACKUP_DIR}"
    echo ""
fi

# ============================================================================
# Generate Self-Signed Certificate
# ============================================================================
echo -e "${YELLOW}Generating self-signed SSL certificate...${NC}"
echo -e "${BLUE}→ This may take a moment...${NC}"
echo ""

# Generate private key and certificate in one command
openssl req -x509 -nodes -days "$DAYS_VALID" -newkey rsa:2048 \
    -keyout "$KEY_FILE" \
    -out "$CERT_FILE" \
    -subj "/C=${COUNTRY}/ST=${STATE}/L=${CITY}/O=${ORGANIZATION}/OU=${ORG_UNIT}/CN=${COMMON_NAME}" \
    -addext "subjectAltName=DNS:localhost,DNS:synapse.local,IP:127.0.0.1" \
    2>/dev/null

echo -e "${GREEN}✓${NC} Certificate generated successfully!"
echo ""

# ============================================================================
# Set Permissions
# ============================================================================
echo -e "${YELLOW}Setting permissions...${NC}"
chmod 600 "$KEY_FILE"
chmod 644 "$CERT_FILE"
chown root:root "$KEY_FILE" "$CERT_FILE"
echo -e "${GREEN}✓${NC} Permissions set"
echo ""

# ============================================================================
# Verify Certificate
# ============================================================================
echo -e "${YELLOW}Verifying certificate...${NC}"
if openssl x509 -in "$CERT_FILE" -text -noout > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Certificate is valid"
    
    # Show certificate details
    echo ""
    echo -e "${BLUE}Certificate Details:${NC}"
    echo -e "${GREEN}→ Subject:${NC} $(openssl x509 -subject -noout -in "$CERT_FILE" | cut -d= -f2-)"
    echo -e "${GREEN}→ Issuer:${NC} $(openssl x509 -issuer -noout -in "$CERT_FILE" | cut -d= -f2-)"
    echo -e "${GREEN}→ Valid From:${NC} $(openssl x509 -startdate -noout -in "$CERT_FILE" | cut -d= -f2)"
    echo -e "${GREEN}→ Valid Until:${NC} $(openssl x509 -enddate -noout -in "$CERT_FILE" | cut -d= -f2)"
    echo ""
else
    echo -e "${RED}✗ Error: Certificate validation failed${NC}"
    exit 1
fi

# ============================================================================
# Reload Nginx (if running)
# ============================================================================
if systemctl is-active --quiet nginx 2>/dev/null || systemctl is-active --quiet nginx.service 2>/dev/null; then
    echo -e "${YELLOW}Reloading Nginx...${NC}"
    if nginx -t 2>/dev/null; then
        systemctl reload nginx 2>/dev/null || systemctl reload nginx.service 2>/dev/null
        echo -e "${GREEN}✓${NC} Nginx reloaded with new certificates"
    else
        echo -e "${RED}✗ Error: Nginx configuration test failed${NC}"
        echo -e "${YELLOW}→ Fix configuration errors before reloading${NC}"
    fi
    echo ""
fi


# ============================================================================
# Summary
# ============================================================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  SSL Setup Complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}Certificate files:${NC}"
echo -e "  • Certificate: ${CERT_FILE}"
echo -e "  • Private Key: ${KEY_FILE}"
echo ""
echo -e "${YELLOW}Important Notes:${NC}"
echo -e "  • This is a SELF-SIGNED certificate for LOCAL DEVELOPMENT"
echo -e "  • Browsers will show a security warning (this is expected)"
echo -e "  • Click 'Advanced' and 'Proceed' to access your site"
echo -e "  • Valid for ${DAYS_VALID} days (until $(date -d "+${DAYS_VALID} days" '+%Y-%m-%d'))"
echo ""
echo -e "${YELLOW}For Production:${NC}"
echo -e "  • Use Let's Encrypt (free, trusted certificates)"

# Detect OS for correct certbot install command
if command -v pacman &> /dev/null; then
    echo -e "  • Install certbot: ${GREEN}sudo pacman -S certbot certbot-nginx${NC}"
elif command -v apt-get &> /dev/null; then
    echo -e "  • Install certbot: ${GREEN}sudo apt install certbot python3-certbot-nginx${NC}"
elif command -v dnf &> /dev/null; then
    echo -e "  • Install certbot: ${GREEN}sudo dnf install certbot python3-certbot-nginx${NC}"
elif command -v yum &> /dev/null; then
    echo -e "  • Install certbot: ${GREEN}sudo yum install certbot python3-certbot-nginx${NC}"
else
    echo -e "  • Install certbot (check your distribution's package manager)"
fi

echo -e "  • Run: ${GREEN}sudo certbot --nginx -d yourdomain.com${NC}"
echo ""
echo -e "${GREEN}You can now access your site at:${NC}"
echo -e "  • https://localhost"
echo -e "  • https://synapse.local (add to /etc/hosts if needed)"
echo ""
