#!/usr/bin/env bash
# ============================================================================
# SYNAPSE — macOS (Homebrew) Full Infrastructure Setup Script
# ============================================================================
#
# This script installs and configures the complete Synapse data layer on macOS
# using Homebrew (Approach B — native, no Docker).
#
# Components installed:
#   1. PostgreSQL 16
#   2. PostgreSQL Extensions:
#      - pgvector    (vector similarity search)
#      - pg_trgm     (fuzzy text search — built-in, just needs CREATE EXTENSION)
#      - pg_cron     (in-database job scheduler — compiled from source)
#   3. PgBouncer     (connection pooling on port 6432)
#   4. Qdrant        (vector database — binary from GitHub releases)
#   5. Redis         (caching / task queue)
#
# Requirements:
#   - macOS (Apple Silicon or Intel)
#   - Xcode Command Line Tools (the script will check)
#   - Internet connection
#
# Usage:
#   chmod +x scripts/mac-setup.sh
#   ./scripts/mac-setup.sh
#
# ============================================================================

set -euo pipefail

# ============================================================================
# ANSI Colors & Symbols
# ============================================================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

CHECK="${GREEN}✓${NC}"
CROSS="${RED}✗${NC}"
WARN="${YELLOW}⚠${NC}"
ARROW="${CYAN}→${NC}"
GEAR="${MAGENTA}⚙${NC}"

# ============================================================================
# Configuration — Defaults (user can override at the end)
# ============================================================================
PG_VERSION="16"
DB_NAME="synapse"
DB_USER="synapse_user"
DB_PASS="synapse_pass"
PGBOUNCER_PORT="6432"
PG_PORT="5432"
QDRANT_VERSION="latest"  # Will resolve to actual latest tag
QDRANT_PORT="6333"
QDRANT_GRPC_PORT="6334"
QDRANT_DATA_DIR="$HOME/.qdrant/storage"
REDIS_PORT="6379"

# Detect architecture
ARCH=$(uname -m)
if [[ "$ARCH" == "arm64" ]]; then
    HOMEBREW_PREFIX="/opt/homebrew"
    QDRANT_ARCH="aarch64-apple-darwin"
else
    HOMEBREW_PREFIX="/usr/local"
    QDRANT_ARCH="x86_64-apple-darwin"
fi

PG_DATA="$HOMEBREW_PREFIX/var/postgresql@${PG_VERSION}"
PG_BIN="$HOMEBREW_PREFIX/opt/postgresql@${PG_VERSION}/bin"
PG_LIB="$HOMEBREW_PREFIX/opt/postgresql@${PG_VERSION}/lib/postgresql"
PG_SHARE="$HOMEBREW_PREFIX/opt/postgresql@${PG_VERSION}/share/postgresql"
PG_INCLUDE="$HOMEBREW_PREFIX/opt/postgresql@${PG_VERSION}/include"
PG_CONFIG="$PG_BIN/pg_config"
PGBOUNCER_INI="$HOMEBREW_PREFIX/etc/pgbouncer.ini"
PGBOUNCER_USERLIST="$HOMEBREW_PREFIX/etc/pgbouncer_userlist.txt"
QDRANT_INSTALL_DIR="$HOMEBREW_PREFIX/bin"

# Track what we installed (for the summary)
declare -a INSTALLED_ITEMS=()
declare -a SKIPPED_ITEMS=()
declare -a FAILED_ITEMS=()

# ============================================================================
# Helper Functions
# ============================================================================

banner() {
    echo ""
    echo -e "${BLUE}================================================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}================================================================${NC}"
    echo ""
}

section() {
    echo ""
    echo -e "${CYAN}────────────────────────────────────────────────────────────────${NC}"
    echo -e "${BOLD}${CYAN}  $1${NC}"
    echo -e "${CYAN}────────────────────────────────────────────────────────────────${NC}"
    echo ""
}

info()    { echo -e "${ARROW} $1"; }
success() { echo -e "${CHECK} $1"; }
warn()    { echo -e "${WARN} $1"; }
fail()    { echo -e "${CROSS} $1"; }
gear()    { echo -e "${GEAR} $1"; }

confirm() {
    local prompt="$1"
    local default="${2:-y}"
    local yn
    if [[ "$default" == "y" ]]; then
        read -rp "$(echo -e "${YELLOW}${prompt} [Y/n]:${NC} ")" yn
        yn="${yn:-y}"
    else
        read -rp "$(echo -e "${YELLOW}${prompt} [y/N]:${NC} ")" yn
        yn="${yn:-n}"
    fi
    [[ "$yn" =~ ^[Yy]$ ]]
}

command_exists() {
    command -v "$1" &>/dev/null
}

brew_installed() {
    brew list "$1" &>/dev/null 2>&1
}

pg_ext_installed() {
    local ext_name="$1"
    # Check if the .control file exists in the extension directory
    [[ -f "$PG_SHARE/extension/${ext_name}.control" ]]
}

wait_for_pg() {
    local max_wait="${1:-30}"
    local count=0
    while ! "$PG_BIN/pg_isready" -h localhost -p "$PG_PORT" &>/dev/null; do
        if (( count >= max_wait )); then
            fail "PostgreSQL did not start within ${max_wait}s"
            return 1
        fi
        sleep 1
        ((count++))
    done
    return 0
}

# ============================================================================
# PREFLIGHT CHECKS
# ============================================================================

banner "SYNAPSE — macOS Infrastructure Setup"

echo -e "${DIM}Detected architecture: ${BOLD}${ARCH}${NC}"
echo -e "${DIM}Homebrew prefix:      ${BOLD}${HOMEBREW_PREFIX}${NC}"
echo -e "${DIM}Date:                 ${BOLD}$(date '+%Y-%m-%d %H:%M:%S')${NC}"
echo ""

section "Step 0 · Preflight Checks"

# --- Xcode Command Line Tools ---
info "Checking for Xcode Command Line Tools..."
if xcode-select -p &>/dev/null; then
    success "Xcode Command Line Tools installed"
else
    warn "Xcode Command Line Tools not found. Installing..."
    xcode-select --install
    echo ""
    echo -e "${YELLOW}  A dialog should have appeared to install Xcode CLT.${NC}"
    echo -e "${YELLOW}  Please complete the installation, then re-run this script.${NC}"
    exit 1
fi

# --- Homebrew ---
info "Checking for Homebrew..."
if command_exists brew; then
    success "Homebrew found: $(brew --version | head -n1)"
    info "Updating Homebrew..."
    brew update --quiet
    success "Homebrew updated"
else
    warn "Homebrew not found. Installing..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    # Ensure brew is in PATH for the rest of this script
    eval "$($HOMEBREW_PREFIX/bin/brew shellenv)"
    success "Homebrew installed"
fi
echo ""

# ============================================================================
# STEP 1 · PostgreSQL
# ============================================================================

section "Step 1 · PostgreSQL ${PG_VERSION}"

if brew_installed "postgresql@${PG_VERSION}"; then
    success "PostgreSQL ${PG_VERSION} is already installed via Homebrew"
    SKIPPED_ITEMS+=("PostgreSQL ${PG_VERSION}")
else
    info "Installing PostgreSQL ${PG_VERSION}..."
    brew install "postgresql@${PG_VERSION}"
    success "PostgreSQL ${PG_VERSION} installed"
    INSTALLED_ITEMS+=("PostgreSQL ${PG_VERSION}")
fi

# Ensure pg binaries are on PATH for this session
export PATH="$PG_BIN:$PATH"

# Start PostgreSQL if not running
if "$PG_BIN/pg_isready" -h localhost -p "$PG_PORT" &>/dev/null; then
    success "PostgreSQL is already running on port ${PG_PORT}"
else
    info "Starting PostgreSQL..."
    brew services start "postgresql@${PG_VERSION}"
    info "Waiting for PostgreSQL to become ready..."
    if wait_for_pg 30; then
        success "PostgreSQL is running on port ${PG_PORT}"
    else
        fail "PostgreSQL failed to start. Check: brew services list"
        FAILED_ITEMS+=("PostgreSQL start")
    fi
fi

# --- Create Synapse user and database ---
info "Setting up database user '${DB_USER}' and database '${DB_NAME}'..."

# Create role if it doesn't exist
if "$PG_BIN/psql" -h localhost -p "$PG_PORT" -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" postgres 2>/dev/null | grep -q 1; then
    success "Role '${DB_USER}' already exists"
else
    "$PG_BIN/psql" -h localhost -p "$PG_PORT" -c "CREATE ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASS}' CREATEDB SUPERUSER;" postgres
    success "Role '${DB_USER}' created (with SUPERUSER for extension installation)"
fi

# Create database if it doesn't exist
if "$PG_BIN/psql" -h localhost -p "$PG_PORT" -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" postgres 2>/dev/null | grep -q 1; then
    success "Database '${DB_NAME}' already exists"
else
    "$PG_BIN/psql" -h localhost -p "$PG_PORT" -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};" postgres
    success "Database '${DB_NAME}' created"
fi

# Create schema
"$PG_BIN/psql" -h localhost -p "$PG_PORT" -U "$DB_USER" -d "$DB_NAME" -c \
    "CREATE SCHEMA IF NOT EXISTS developer_schema AUTHORIZATION ${DB_USER};" 2>/dev/null || true
success "Schema 'developer_schema' ensured"

echo ""

# ============================================================================
# STEP 2 · PostgreSQL Extensions
# ============================================================================

section "Step 2 · PostgreSQL Extensions"

# ── 2a. pg_trgm (built-in) ──────────────────────────────────────────────────
echo -e "${BOLD}  2a · pg_trgm (fuzzy text search)${NC}"

# pg_trgm ships with the standard postgresql contrib package
# Just needs to be enabled via CREATE EXTENSION
info "Enabling pg_trgm extension..."
"$PG_BIN/psql" -h localhost -p "$PG_PORT" -U "$DB_USER" -d "$DB_NAME" -c \
    "CREATE EXTENSION IF NOT EXISTS pg_trgm;" 2>/dev/null
success "pg_trgm extension enabled"
INSTALLED_ITEMS+=("pg_trgm (built-in)")
echo ""

# ── 2b. pgvector ────────────────────────────────────────────────────────────
echo -e "${BOLD}  2b · pgvector (vector similarity search)${NC}"

if pg_ext_installed "vector"; then
    success "pgvector is already installed on disk"
    SKIPPED_ITEMS+=("pgvector (already on disk)")
else
    info "Installing pgvector via Homebrew..."
    brew install pgvector
    success "pgvector installed"
    INSTALLED_ITEMS+=("pgvector")
fi

info "Enabling vector extension in ${DB_NAME}..."
"$PG_BIN/psql" -h localhost -p "$PG_PORT" -U "$DB_USER" -d "$DB_NAME" -c \
    "CREATE EXTENSION IF NOT EXISTS vector;" 2>/dev/null
success "vector extension enabled"
echo ""

# ── 2c. pg_cron (compiled from source) ──────────────────────────────────────
echo -e "${BOLD}  2c · pg_cron (in-database job scheduler)${NC}"

if pg_ext_installed "pg_cron"; then
    success "pg_cron is already installed on disk"
    SKIPPED_ITEMS+=("pg_cron (already on disk)")
else
    info "pg_cron is not available via Homebrew — compiling from source..."
    gear "This requires git and a C compiler (from Xcode CLT)"

    PG_CRON_BUILD_DIR=$(mktemp -d)
    trap "rm -rf $PG_CRON_BUILD_DIR" EXIT

    info "Cloning pg_cron repository..."
    git clone --depth 1 https://github.com/citusdata/pg_cron.git "$PG_CRON_BUILD_DIR/pg_cron"

    info "Building pg_cron against PostgreSQL ${PG_VERSION}..."
    pushd "$PG_CRON_BUILD_DIR/pg_cron" > /dev/null

    # Ensure pg_config is found by the Makefile
    export PG_CONFIG="$PG_CONFIG"
    make clean 2>/dev/null || true
    make PG_CONFIG="$PG_CONFIG"

    info "Installing pg_cron into PostgreSQL ${PG_VERSION}..."
    make install PG_CONFIG="$PG_CONFIG"

    popd > /dev/null
    success "pg_cron compiled and installed"
    INSTALLED_ITEMS+=("pg_cron (from source)")
fi

# pg_cron requires shared_preload_libraries configuration
PG_CONF="$PG_DATA/postgresql.conf"
if [[ -f "$PG_CONF" ]]; then
    if grep -q "shared_preload_libraries.*pg_cron" "$PG_CONF" 2>/dev/null; then
        success "pg_cron already in shared_preload_libraries"
    else
        info "Adding pg_cron to shared_preload_libraries in postgresql.conf..."

        # Check if shared_preload_libraries is already set
        if grep -qE "^shared_preload_libraries" "$PG_CONF" 2>/dev/null; then
            # Append pg_cron to the existing value
            sed -i.bak "s/^shared_preload_libraries = '\(.*\)'/shared_preload_libraries = '\1,pg_cron'/" "$PG_CONF"
        else
            # Add new line
            echo "" >> "$PG_CONF"
            echo "# Added by mac-setup.sh for Synapse" >> "$PG_CONF"
            echo "shared_preload_libraries = 'pg_cron'" >> "$PG_CONF"
        fi

        # Set the database pg_cron should use
        if ! grep -q "cron.database_name" "$PG_CONF" 2>/dev/null; then
            echo "cron.database_name = '${DB_NAME}'" >> "$PG_CONF"
        fi

        warn "PostgreSQL needs a restart for pg_cron to load"
        info "Restarting PostgreSQL..."
        brew services restart "postgresql@${PG_VERSION}"
        if wait_for_pg 30; then
            success "PostgreSQL restarted with pg_cron loaded"
        else
            fail "PostgreSQL failed to restart after pg_cron config change"
            FAILED_ITEMS+=("PostgreSQL restart for pg_cron")
        fi
    fi
else
    warn "postgresql.conf not found at expected path: $PG_CONF"
    warn "You may need to manually add: shared_preload_libraries = 'pg_cron'"
fi

# Enable pg_cron extension in the database
info "Enabling pg_cron extension in ${DB_NAME}..."
"$PG_BIN/psql" -h localhost -p "$PG_PORT" -U "$DB_USER" -d "$DB_NAME" -c \
    "CREATE EXTENSION IF NOT EXISTS pg_cron;" 2>/dev/null && \
    success "pg_cron extension enabled" || \
    warn "pg_cron CREATE EXTENSION failed — may need PostgreSQL restart first"
echo ""

# ── Verify all extensions ────────────────────────────────────────────────────
echo -e "${BOLD}  Verifying installed extensions...${NC}"
EXT_LIST=$("$PG_BIN/psql" -h localhost -p "$PG_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc \
    "SELECT extname || ' (' || extversion || ')' FROM pg_extension WHERE extname IN ('pg_trgm','vector','pg_cron') ORDER BY extname;" 2>/dev/null)

if [[ -n "$EXT_LIST" ]]; then
    while IFS= read -r ext; do
        success "Extension active: ${ext}"
    done <<< "$EXT_LIST"
else
    warn "Could not verify extensions — check manually with: \\dx in psql"
fi
echo ""

# ============================================================================
# STEP 3 · PgBouncer (Connection Pooler)
# ============================================================================

section "Step 3 · PgBouncer (port ${PGBOUNCER_PORT})"

if brew_installed "pgbouncer"; then
    success "PgBouncer is already installed"
    SKIPPED_ITEMS+=("PgBouncer")
else
    info "Installing PgBouncer..."
    brew install pgbouncer
    success "PgBouncer installed"
    INSTALLED_ITEMS+=("PgBouncer")
fi

# --- Configure PgBouncer ---
info "Configuring PgBouncer for Synapse..."

# Create userlist.txt
cat > "$PGBOUNCER_USERLIST" <<USERLIST
"${DB_USER}" "${DB_PASS}"
USERLIST
chmod 600 "$PGBOUNCER_USERLIST"
success "PgBouncer userlist created at ${PGBOUNCER_USERLIST}"

# Create pgbouncer.ini
cat > "$PGBOUNCER_INI" <<PGBCONF
;; ============================================================================
;; PgBouncer Configuration for Synapse
;; Generated by mac-setup.sh on $(date '+%Y-%m-%d %H:%M:%S')
;; ============================================================================

[databases]
${DB_NAME} = host=localhost port=${PG_PORT} dbname=${DB_NAME} user=${DB_USER}

[pgbouncer]
;; --- Networking ---
listen_addr = 127.0.0.1
listen_port = ${PGBOUNCER_PORT}

;; --- Authentication ---
auth_type = trust
auth_file = ${PGBOUNCER_USERLIST}

;; --- Pooling ---
pool_mode = transaction
;; Transaction pooling is recommended for FastAPI/asyncpg.
;; Note: LISTEN/NOTIFY does NOT work through transaction pooling!
;; Synapse uses a separate PG_LISTEN_DSN (port 5432) for that.

default_pool_size = 20
min_pool_size = 5
reserve_pool_size = 5
reserve_pool_timeout = 3
max_client_conn = 200
max_db_connections = 50

;; --- Timeouts ---
server_idle_timeout = 600
server_lifetime = 3600
server_connect_timeout = 15
query_timeout = 300
query_wait_timeout = 120
client_idle_timeout = 0

;; --- Logging ---
log_connections = 0
log_disconnections = 0
log_pooler_errors = 1
stats_period = 60

;; --- Admin ---
admin_users = ${DB_USER}
stats_users = ${DB_USER}

;; --- Paths ---
logfile = ${HOMEBREW_PREFIX}/var/log/pgbouncer.log
pidfile = ${HOMEBREW_PREFIX}/var/run/pgbouncer.pid
PGBCONF
success "PgBouncer config written to ${PGBOUNCER_INI}"

# Ensure log/pid directories exist
mkdir -p "$HOMEBREW_PREFIX/var/log" "$HOMEBREW_PREFIX/var/run"

# Start PgBouncer
info "Starting PgBouncer..."
brew services start pgbouncer 2>/dev/null || true
sleep 2

# Verify PgBouncer is listening
if "$PG_BIN/pg_isready" -h localhost -p "$PGBOUNCER_PORT" &>/dev/null; then
    success "PgBouncer is running on port ${PGBOUNCER_PORT}"
else
    warn "PgBouncer may not be running. Check: brew services list"
    warn "Manual start: pgbouncer -d ${PGBOUNCER_INI}"
    FAILED_ITEMS+=("PgBouncer start")
fi
echo ""

# ============================================================================
# STEP 4 · Qdrant (Vector Database)
# ============================================================================

section "Step 4 · Qdrant (ports ${QDRANT_PORT} / ${QDRANT_GRPC_PORT})"

if command_exists qdrant; then
    success "Qdrant binary already found: $(which qdrant)"
    SKIPPED_ITEMS+=("Qdrant")
else
    info "Qdrant has no official Homebrew formula — downloading binary from GitHub..."

    # Determine latest version
    if [[ "$QDRANT_VERSION" == "latest" ]]; then
        info "Fetching latest Qdrant release tag..."
        QDRANT_VERSION=$(curl -sL "https://api.github.com/repos/qdrant/qdrant/releases/latest" \
            | grep '"tag_name"' | head -1 | sed -E 's/.*"v?([^"]+)".*/\1/')
        if [[ -z "$QDRANT_VERSION" ]]; then
            fail "Could not determine latest Qdrant version from GitHub API"
            warn "Falling back to v1.13.2"
            QDRANT_VERSION="1.13.2"
        fi
        success "Latest Qdrant version: ${QDRANT_VERSION}"
    fi

    QDRANT_TARBALL="qdrant-${QDRANT_ARCH}.tar.gz"
    QDRANT_URL="https://github.com/qdrant/qdrant/releases/download/v${QDRANT_VERSION}/${QDRANT_TARBALL}"

    info "Downloading Qdrant v${QDRANT_VERSION} for ${QDRANT_ARCH}..."
    QDRANT_TMP=$(mktemp -d)

    if curl -fSL --progress-bar -o "$QDRANT_TMP/$QDRANT_TARBALL" "$QDRANT_URL"; then
        success "Downloaded ${QDRANT_TARBALL}"
    else
        fail "Failed to download Qdrant from: ${QDRANT_URL}"
        warn "You can manually download from: https://github.com/qdrant/qdrant/releases"
        FAILED_ITEMS+=("Qdrant download")
        QDRANT_TMP=""
    fi

    if [[ -n "$QDRANT_TMP" ]]; then
        info "Extracting Qdrant binary..."
        tar -xzf "$QDRANT_TMP/$QDRANT_TARBALL" -C "$QDRANT_TMP"

        # The tarball usually contains just the 'qdrant' binary
        if [[ -f "$QDRANT_TMP/qdrant" ]]; then
            cp "$QDRANT_TMP/qdrant" "$QDRANT_INSTALL_DIR/qdrant"
            chmod +x "$QDRANT_INSTALL_DIR/qdrant"
            success "Qdrant binary installed to ${QDRANT_INSTALL_DIR}/qdrant"
            INSTALLED_ITEMS+=("Qdrant v${QDRANT_VERSION}")
        else
            fail "Could not find 'qdrant' binary in tarball"
            FAILED_ITEMS+=("Qdrant install")
        fi
        rm -rf "$QDRANT_TMP"
    fi
fi

# Create Qdrant data directory
mkdir -p "$QDRANT_DATA_DIR"
success "Qdrant data directory: ${QDRANT_DATA_DIR}"

# Create a launchd plist for Qdrant to run as a service
QDRANT_PLIST="$HOME/Library/LaunchAgents/com.qdrant.qdrant.plist"
if [[ ! -f "$QDRANT_PLIST" ]]; then
    info "Creating launchd service for Qdrant..."
    mkdir -p "$HOME/Library/LaunchAgents"
    cat > "$QDRANT_PLIST" <<QDPLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.qdrant.qdrant</string>
    <key>ProgramArguments</key>
    <array>
        <string>${QDRANT_INSTALL_DIR}/qdrant</string>
        <string>--storage-path</string>
        <string>${QDRANT_DATA_DIR}</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>${HOME}/.qdrant/qdrant.log</string>
    <key>StandardErrorPath</key>
    <string>${HOME}/.qdrant/qdrant.err</string>
    <key>WorkingDirectory</key>
    <string>${HOME}/.qdrant</string>
</dict>
</plist>
QDPLIST
    success "Qdrant launchd plist created"
fi

# Load the Qdrant service
info "Starting Qdrant service..."
launchctl unload "$QDRANT_PLIST" 2>/dev/null || true
launchctl load "$QDRANT_PLIST" 2>/dev/null || true
sleep 3

# Verify Qdrant is running
if curl -sf http://localhost:${QDRANT_PORT}/healthz &>/dev/null; then
    success "Qdrant is running on port ${QDRANT_PORT}"
else
    warn "Qdrant may not be responding yet on port ${QDRANT_PORT}"
    warn "Check: curl http://localhost:${QDRANT_PORT}/healthz"
    warn "Logs: cat ${HOME}/.qdrant/qdrant.log"
    FAILED_ITEMS+=("Qdrant start")
fi
echo ""

# ============================================================================
# STEP 5 · Redis
# ============================================================================

section "Step 5 · Redis (port ${REDIS_PORT})"

if brew_installed "redis"; then
    success "Redis is already installed"
    SKIPPED_ITEMS+=("Redis")
else
    info "Installing Redis..."
    brew install redis
    success "Redis installed"
    INSTALLED_ITEMS+=("Redis")
fi

# Start Redis if not running
if redis-cli -h localhost -p "$REDIS_PORT" ping &>/dev/null 2>&1; then
    success "Redis is already running on port ${REDIS_PORT}"
else
    info "Starting Redis..."
    brew services start redis
    sleep 2
    if redis-cli -h localhost -p "$REDIS_PORT" ping &>/dev/null 2>&1; then
        success "Redis is running on port ${REDIS_PORT}"
    else
        warn "Redis may not be running. Check: brew services list"
        FAILED_ITEMS+=("Redis start")
    fi
fi
echo ""

# ============================================================================
# STEP 6 · Verification
# ============================================================================

section "Step 6 · Final Verification"

PASS_COUNT=0
TOTAL_COUNT=0

verify_service() {
    local name="$1"
    local check_cmd="$2"
    ((TOTAL_COUNT++))
    echo -n "  ${name}: "
    if eval "$check_cmd" &>/dev/null; then
        echo -e "${CHECK} ${GREEN}Running${NC}"
        ((PASS_COUNT++))
    else
        echo -e "${CROSS} ${RED}Not Running${NC}"
    fi
}

echo -e "${BOLD}Service Health:${NC}"
echo ""
verify_service "PostgreSQL ${PG_VERSION}  (port ${PG_PORT})" \
    "'$PG_BIN/pg_isready' -h localhost -p $PG_PORT"
verify_service "PgBouncer          (port ${PGBOUNCER_PORT})" \
    "'$PG_BIN/pg_isready' -h localhost -p $PGBOUNCER_PORT"
verify_service "Qdrant             (port ${QDRANT_PORT})" \
    "curl -sf http://localhost:${QDRANT_PORT}/healthz"
verify_service "Redis              (port ${REDIS_PORT})" \
    "redis-cli -h localhost -p $REDIS_PORT ping"
echo ""

echo -e "${BOLD}PostgreSQL Extensions in '${DB_NAME}':${NC}"
echo ""
"$PG_BIN/psql" -h localhost -p "$PG_PORT" -U "$DB_USER" -d "$DB_NAME" -c \
    "SELECT extname AS extension, extversion AS version FROM pg_extension WHERE extname IN ('pg_trgm','vector','pg_cron') ORDER BY extname;" 2>/dev/null || \
    warn "Could not query extensions"
echo ""

echo -e "${BOLD}Connection test through PgBouncer:${NC}"
echo ""
if "$PG_BIN/psql" -h localhost -p "$PGBOUNCER_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT 'PgBouncer connection OK';" 2>/dev/null; then
    success "Application can reach PostgreSQL through PgBouncer"
else
    warn "PgBouncer connection test failed — check pgbouncer.ini and userlist"
fi
echo ""

# ============================================================================
# SUMMARY
# ============================================================================

banner "Installation Summary"

if (( ${#INSTALLED_ITEMS[@]} > 0 )); then
    echo -e "  ${GREEN}Installed:${NC}"
    for item in "${INSTALLED_ITEMS[@]}"; do
        echo -e "    ${CHECK} ${item}"
    done
    echo ""
fi

if (( ${#SKIPPED_ITEMS[@]} > 0 )); then
    echo -e "  ${BLUE}Already present (skipped):${NC}"
    for item in "${SKIPPED_ITEMS[@]}"; do
        echo -e "    ${DIM}● ${item}${NC}"
    done
    echo ""
fi

if (( ${#FAILED_ITEMS[@]} > 0 )); then
    echo -e "  ${RED}Failed:${NC}"
    for item in "${FAILED_ITEMS[@]}"; do
        echo -e "    ${CROSS} ${item}"
    done
    echo ""
fi

echo -e "  ${BOLD}Services: ${PASS_COUNT}/${TOTAL_COUNT} running${NC}"
echo ""

# ============================================================================
# STEP 7 · User Customization Prompt
# ============================================================================

section "Step 7 · Customization"

echo -e "${BOLD}Your Synapse infrastructure is ready!${NC}"
echo ""
echo -e "The following defaults were used. You may want to customize them"
echo -e "in your ${CYAN}backend/.env${NC} file:"
echo ""
echo -e "  ${BOLD}DATABASE_URL${NC}       = postgresql+asyncpg://${DB_USER}:${DB_PASS}@localhost:${PGBOUNCER_PORT}/${DB_NAME}"
echo -e "  ${BOLD}PG_LISTEN_DSN${NC}      = postgresql://${DB_USER}:${DB_PASS}@localhost:${PG_PORT}/${DB_NAME}"
echo -e "  ${BOLD}Redis${NC}              = localhost:${REDIS_PORT}"
echo -e "  ${BOLD}Qdrant HTTP${NC}        = http://localhost:${QDRANT_PORT}"
echo -e "  ${BOLD}Qdrant gRPC${NC}        = http://localhost:${QDRANT_GRPC_PORT}"
echo ""

echo -e "${CYAN}────────────────────────────────────────────────────────────────${NC}"
echo -e "${BOLD}Would you like to customize any of these values now?${NC}"
echo -e "${CYAN}────────────────────────────────────────────────────────────────${NC}"
echo ""

if confirm "Customize database credentials?" "n"; then
    echo ""
    read -rp "  Database user [${DB_USER}]: " CUSTOM_USER
    CUSTOM_USER="${CUSTOM_USER:-$DB_USER}"

    read -rsp "  Database password [${DB_PASS}]: " CUSTOM_PASS
    echo ""
    CUSTOM_PASS="${CUSTOM_PASS:-$DB_PASS}"

    read -rp "  Database name [${DB_NAME}]: " CUSTOM_DB
    CUSTOM_DB="${CUSTOM_DB:-$DB_NAME}"

    if [[ "$CUSTOM_USER" != "$DB_USER" ]] || [[ "$CUSTOM_PASS" != "$DB_PASS" ]] || [[ "$CUSTOM_DB" != "$DB_NAME" ]]; then
        echo ""
        info "Creating new role and database with custom values..."

        if [[ "$CUSTOM_USER" != "$DB_USER" ]]; then
            "$PG_BIN/psql" -h localhost -p "$PG_PORT" -c \
                "CREATE ROLE ${CUSTOM_USER} WITH LOGIN PASSWORD '${CUSTOM_PASS}' CREATEDB SUPERUSER;" postgres 2>/dev/null || true
        fi
        if [[ "$CUSTOM_PASS" != "$DB_PASS" ]]; then
            "$PG_BIN/psql" -h localhost -p "$PG_PORT" -c \
                "ALTER ROLE ${CUSTOM_USER} WITH PASSWORD '${CUSTOM_PASS}';" postgres 2>/dev/null || true
        fi
        if [[ "$CUSTOM_DB" != "$DB_NAME" ]]; then
            "$PG_BIN/psql" -h localhost -p "$PG_PORT" -c \
                "CREATE DATABASE ${CUSTOM_DB} OWNER ${CUSTOM_USER};" postgres 2>/dev/null || true
        fi

        DB_USER="$CUSTOM_USER"
        DB_PASS="$CUSTOM_PASS"
        DB_NAME="$CUSTOM_DB"

        success "Custom credentials applied"

        # Update PgBouncer config with new credentials
        info "Updating PgBouncer config..."
        cat > "$PGBOUNCER_USERLIST" <<USERLIST2
"${DB_USER}" "${DB_PASS}"
USERLIST2
        chmod 600 "$PGBOUNCER_USERLIST"
        sed -i.bak "s/^${DB_NAME}.*/${DB_NAME} = host=localhost port=${PG_PORT} dbname=${DB_NAME} user=${DB_USER}/" "$PGBOUNCER_INI" 2>/dev/null || true
        brew services restart pgbouncer 2>/dev/null || true
        success "PgBouncer updated with new credentials"
    fi
fi

echo ""

# --- Print final .env values ---
echo -e "${CYAN}────────────────────────────────────────────────────────────────${NC}"
echo -e "${BOLD}  Copy these into your backend/.env:${NC}"
echo -e "${CYAN}────────────────────────────────────────────────────────────────${NC}"
echo ""
echo -e "  ${GREEN}DATABASE_URL${NC}=postgresql+asyncpg://${DB_USER}:${DB_PASS}@localhost:${PGBOUNCER_PORT}/${DB_NAME}"
echo -e "  ${GREEN}PG_LISTEN_DSN${NC}=postgresql://${DB_USER}:${DB_PASS}@localhost:${PG_PORT}/${DB_NAME}"
echo ""

# --- Useful commands ---
echo -e "${CYAN}────────────────────────────────────────────────────────────────${NC}"
echo -e "${BOLD}  Useful Commands:${NC}"
echo -e "${CYAN}────────────────────────────────────────────────────────────────${NC}"
echo ""
echo -e "  ${DIM}# Service management${NC}"
echo -e "  brew services list                          ${DIM}# All services${NC}"
echo -e "  brew services restart postgresql@${PG_VERSION}       ${DIM}# Restart PG${NC}"
echo -e "  brew services restart pgbouncer             ${DIM}# Restart PgBouncer${NC}"
echo -e "  brew services restart redis                 ${DIM}# Restart Redis${NC}"
echo -e "  launchctl unload ~/Library/LaunchAgents/com.qdrant.qdrant.plist  ${DIM}# Stop Qdrant${NC}"
echo -e "  launchctl load   ~/Library/LaunchAgents/com.qdrant.qdrant.plist  ${DIM}# Start Qdrant${NC}"
echo ""
echo -e "  ${DIM}# Connect to database${NC}"
echo -e "  psql -h localhost -p ${PG_PORT} -U ${DB_USER} -d ${DB_NAME}       ${DIM}# Direct PG${NC}"
echo -e "  psql -h localhost -p ${PGBOUNCER_PORT} -U ${DB_USER} -d ${DB_NAME}       ${DIM}# Via PgBouncer${NC}"
echo ""
echo -e "  ${DIM}# Run Alembic migrations${NC}"
echo -e "  cd backend && alembic upgrade head"
echo ""
echo -e "  ${DIM}# Health check${NC}"
echo -e "  ./scripts/health-check.sh"
echo ""

banner "Setup Complete! 🎉"
