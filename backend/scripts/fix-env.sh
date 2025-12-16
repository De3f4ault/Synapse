#!/bin/bash
# ============================================================================
# Fix .env file - Correct CORS_ORIGINS format
# ============================================================================

set -e

ENV_FILE=".env"
BACKUP_FILE=".env.backup.$(date +%Y%m%d_%H%M%S)"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "========================================="
echo "  Fixing .env Configuration"
echo "========================================="
echo ""

# Check if .env exists
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}✗ Error: .env file not found${NC}"
    echo -e "${YELLOW}→ Copy .env.fixed to .env${NC}"
    exit 1
fi

# Backup current .env
echo -e "${YELLOW}Backing up current .env...${NC}"
cp "$ENV_FILE" "$BACKUP_FILE"
echo -e "${GREEN}✓${NC} Backup created: $BACKUP_FILE"
echo ""

# Fix CORS_ORIGINS - ensure it's valid JSON
echo -e "${YELLOW}Fixing CORS_ORIGINS...${NC}"

# Remove any existing CORS_ORIGINS line
sed -i '/^CORS_ORIGINS=/d' "$ENV_FILE"

# Add correct CORS_ORIGINS at the end of CORS section
# Find the line after "# CORS - Cross-Origin Resource Sharing" and insert
sed -i '/# CORS - Cross-Origin Resource Sharing/a CORS_ORIGINS=["http://localhost:3000","http://localhost:8000","https://localhost"]' "$ENV_FILE"

echo -e "${GREEN}✓${NC} CORS_ORIGINS fixed"
echo ""

# Validate the fix
echo -e "${YELLOW}Validating .env file...${NC}"
if python3 -c "
import os
from dotenv import load_dotenv
load_dotenv('.env')
import json
cors_origins = os.getenv('CORS_ORIGINS')
if cors_origins:
    json.loads(cors_origins)
    print('CORS_ORIGINS is valid JSON')
else:
    print('CORS_ORIGINS not found')
" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} .env file is valid"
    echo ""
    echo -e "${GREEN}SUCCESS!${NC} You can now run: ${YELLOW}make prod-start${NC}"
else
    echo -e "${RED}✗ Validation failed${NC}"
    echo -e "${YELLOW}→ Restoring backup...${NC}"
    cp "$BACKUP_FILE" "$ENV_FILE"
    echo -e "${YELLOW}→ Please use the template: .env.fixed${NC}"
    exit 1
fi
