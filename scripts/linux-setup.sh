#!/usr/bin/env bash
# ============================================================================
# SYNAPSE — Linux Full Infrastructure Setup Script
# ============================================================================
#
# Supported distro families:
#   • Debian / Ubuntu   (apt)
#   • Arch / Manjaro    (pacman + yay AUR helper)
#
# Components installed:
#   1. PostgreSQL 16
#   2. PostgreSQL Extensions:
#      - pgvector    (vector similarity search)
#      - pg_trgm     (fuzzy text search — built-in contrib)
#      - pg_cron     (in-database job scheduler)
#   3. PgBouncer     (connection pooling on port 6432)
#   4. Qdrant        (vector database — binary from GitHub releases)
#   5. Redis / Valkey (caching / task queue)
#
# Usage:
#   chmod +x scripts/linux-setup.sh
#   ./scripts/linux-setup.sh
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
# Configuration — Defaults
# ============================================================================
PG_VERSION="16"
DB_NAME="synapse"
DB_USER="synapse_user"
DB_PASS="synapse_pass"
PGBOUNCER_PORT="6432"
PG_PORT="5432"
QDRANT_VERSION="latest"
QDRANT_PORT="6333"
QDRANT_GRPC_PORT="6334"
QDRANT_DATA_DIR="/var/lib/qdrant/storage"
QDRANT_INSTALL_DIR="/usr/local/bin"
REDIS_PORT="6379"

# Detect architecture
ARCH_HW=$(uname -m)
if [[ "$ARCH_HW" == "aarch64" || "$ARCH_HW" == "arm64" ]]; then
    QDRANT_ARCH="aarch64-unknown-linux-gnu"
else
    QDRANT_ARCH="x86_64-unknown-linux-gnu"
fi

# Track what we installed
declare -a INSTALLED_ITEMS=()
declare -a SKIPPED_ITEMS=()
declare -a FAILED_ITEMS=()

# Distro detection
DISTRO="unknown"
PKG_MGR="unknown"

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

pg_ext_installed() {
    local ext_name="$1"
    local share_dir
    share_dir=$(pg_config --sharedir 2>/dev/null || echo "/usr/share/postgresql/${PG_VERSION}")
    [[ -f "${share_dir}/extension/${ext_name}.control" ]]
}

wait_for_pg() {
    local max_wait="${1:-30}"
    local count=0
    while ! pg_isready -h localhost -p "$PG_PORT" &>/dev/null; do
        if (( count >= max_wait )); then
            fail "PostgreSQL did not start within ${max_wait}s"
            return 1
        fi
        sleep 1
        ((count++))
    done
    return 0
}

ensure_sudo() {
    if [[ $EUID -ne 0 ]]; then
        if ! sudo -v 2>/dev/null; then
            fail "This script requires sudo privileges"
            exit 1
        fi
    fi
}

run_as_postgres() {
    sudo -u postgres "$@"
}

# ============================================================================
# Distro Detection
# ============================================================================

detect_distro() {
    if [[ -f /etc/os-release ]]; then
        # shellcheck disable=SC1091
        source /etc/os-release
        case "$ID" in
            debian|ubuntu|linuxmint|pop|elementary|zorin|kali|raspbian)
                DISTRO="debian"
                PKG_MGR="apt"
                ;;
            arch|manjaro|endeavouros|garuda|artix)
                DISTRO="arch"
                PKG_MGR="pacman"
                ;;
            *)
                # Check ID_LIKE for derivatives
                case "${ID_LIKE:-}" in
                    *debian*|*ubuntu*)
                        DISTRO="debian"
                        PKG_MGR="apt"
                        ;;
                    *arch*)
                        DISTRO="arch"
                        PKG_MGR="pacman"
                        ;;
                    *)
                        fail "Unsupported distribution: ${ID} (${ID_LIKE:-none})"
                        echo ""
                        echo "This script supports:"
                        echo "  • Debian / Ubuntu / Mint / Pop!_OS  (apt)"
                        echo "  • Arch / Manjaro / EndeavourOS       (pacman)"
                        exit 1
                        ;;
                esac
                ;;
        esac
        success "Detected: ${PRETTY_NAME:-$ID} (using ${PKG_MGR})"
    else
        fail "Cannot detect distribution (/etc/os-release not found)"
        exit 1
    fi
}

# ============================================================================
# Package installation wrappers
# ============================================================================

pkg_install_debian() {
    sudo apt-get install -y "$@"
}

pkg_install_arch() {
    # Try pacman first, fall back to yay for AUR packages
    if sudo pacman -S --needed --noconfirm "$@" 2>/dev/null; then
        return 0
    fi
    # If pacman fails, try yay (AUR helper)
    if command_exists yay; then
        yay -S --needed --noconfirm "$@"
    else
        fail "Package not in official repos and 'yay' AUR helper not found"
        info "Install yay: https://github.com/Jguer/yay"
        return 1
    fi
}

pkg_install() {
    case "$DISTRO" in
        debian) pkg_install_debian "$@" ;;
        arch)   pkg_install_arch "$@" ;;
    esac
}

# ============================================================================
# PREFLIGHT CHECKS
# ============================================================================

banner "SYNAPSE — Linux Infrastructure Setup"

echo -e "${DIM}Architecture: ${BOLD}${ARCH_HW}${NC}"
echo -e "${DIM}Date:         ${BOLD}$(date '+%Y-%m-%d %H:%M:%S')${NC}"
echo ""

section "Step 0 · Preflight Checks"

detect_distro
ensure_sudo

# Install essential build tools
info "Ensuring essential build tools are present..."
case "$DISTRO" in
    debian)
        sudo apt-get update -qq
        pkg_install_debian build-essential curl wget git gnupg lsb-release ca-certificates
        ;;
    arch)
        sudo pacman -Sy --noconfirm --needed base-devel curl wget git
        # Ensure yay is available for AUR packages
        if ! command_exists yay; then
            warn "yay (AUR helper) not found — installing it..."
            TMPYAY=$(mktemp -d)
            git clone https://aur.archlinux.org/yay-bin.git "$TMPYAY/yay-bin"
            pushd "$TMPYAY/yay-bin" > /dev/null
            makepkg -si --noconfirm
            popd > /dev/null
            rm -rf "$TMPYAY"
            success "yay installed"
        fi
        ;;
esac
success "Build tools ready"
echo ""

# ============================================================================
# STEP 1 · PostgreSQL
# ============================================================================

section "Step 1 · PostgreSQL ${PG_VERSION}"

case "$DISTRO" in
    debian)
        if dpkg -l "postgresql-${PG_VERSION}" 2>/dev/null | grep -q "^ii"; then
            success "PostgreSQL ${PG_VERSION} is already installed"
            SKIPPED_ITEMS+=("PostgreSQL ${PG_VERSION}")
        else
            info "Adding official PostgreSQL APT repository..."
            sudo install -d /usr/share/postgresql-common/pgdg
            sudo curl -fsSL -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc \
                https://www.postgresql.org/media/keys/ACCC4CF8.asc
            echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] \
https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" | \
                sudo tee /etc/apt/sources.list.d/pgdg.list > /dev/null
            sudo apt-get update -qq

            info "Installing PostgreSQL ${PG_VERSION}..."
            pkg_install_debian "postgresql-${PG_VERSION}" "postgresql-client-${PG_VERSION}" "postgresql-contrib-${PG_VERSION}"
            success "PostgreSQL ${PG_VERSION} installed"
            INSTALLED_ITEMS+=("PostgreSQL ${PG_VERSION}")
        fi
        ;;
    arch)
        if pacman -Qi postgresql 2>/dev/null | grep -q "^Name"; then
            success "PostgreSQL is already installed"
            SKIPPED_ITEMS+=("PostgreSQL")
        else
            info "Installing PostgreSQL..."
            sudo pacman -S --needed --noconfirm postgresql postgresql-libs
            success "PostgreSQL installed"

            # Arch requires manual initdb
            if [[ ! -d /var/lib/postgres/data/base ]]; then
                info "Initializing PostgreSQL data directory..."
                sudo -u postgres initdb -D /var/lib/postgres/data --locale=en_US.UTF-8
                success "Database cluster initialized"
            fi
            INSTALLED_ITEMS+=("PostgreSQL")
        fi
        ;;
esac

# Start and enable PostgreSQL
info "Ensuring PostgreSQL is running..."
sudo systemctl enable postgresql &>/dev/null || true
sudo systemctl start postgresql &>/dev/null || true
if wait_for_pg 30; then
    success "PostgreSQL is running on port ${PG_PORT}"
else
    fail "PostgreSQL failed to start"
    FAILED_ITEMS+=("PostgreSQL start")
fi

# --- Create Synapse user and database ---
info "Setting up database user '${DB_USER}' and database '${DB_NAME}'..."

if run_as_postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" 2>/dev/null | grep -q 1; then
    success "Role '${DB_USER}' already exists"
else
    run_as_postgres psql -c "CREATE ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASS}' CREATEDB SUPERUSER;"
    success "Role '${DB_USER}' created"
fi

if run_as_postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" 2>/dev/null | grep -q 1; then
    success "Database '${DB_NAME}' already exists"
else
    run_as_postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"
    success "Database '${DB_NAME}' created"
fi

# Create schema
run_as_postgres psql -d "$DB_NAME" -c \
    "CREATE SCHEMA IF NOT EXISTS developer_schema AUTHORIZATION ${DB_USER};" 2>/dev/null || true
success "Schema 'developer_schema' ensured"
echo ""

# ============================================================================
# STEP 2 · PostgreSQL Extensions
# ============================================================================

section "Step 2 · PostgreSQL Extensions"

# ── 2a. pg_trgm (contrib — built-in) ────────────────────────────────────────
echo -e "${BOLD}  2a · pg_trgm (fuzzy text search)${NC}"
info "Enabling pg_trgm extension..."
run_as_postgres psql -d "$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;" 2>/dev/null
success "pg_trgm extension enabled"
INSTALLED_ITEMS+=("pg_trgm (built-in)")
echo ""

# ── 2b. pgvector ────────────────────────────────────────────────────────────
echo -e "${BOLD}  2b · pgvector (vector similarity search)${NC}"

case "$DISTRO" in
    debian)
        if dpkg -l "postgresql-${PG_VERSION}-pgvector" 2>/dev/null | grep -q "^ii"; then
            success "pgvector package already installed"
            SKIPPED_ITEMS+=("pgvector")
        else
            info "Installing pgvector from PostgreSQL APT repo..."
            pkg_install_debian "postgresql-${PG_VERSION}-pgvector"
            success "pgvector installed"
            INSTALLED_ITEMS+=("pgvector")
        fi
        ;;
    arch)
        if pg_ext_installed "vector"; then
            success "pgvector already installed on disk"
            SKIPPED_ITEMS+=("pgvector")
        else
            info "Installing pgvector from AUR..."
            if command_exists yay; then
                yay -S --needed --noconfirm pgvector
            else
                # Compile from source as fallback
                info "Compiling pgvector from source..."
                PGVEC_TMP=$(mktemp -d)
                git clone --depth 1 https://github.com/pgvector/pgvector.git "$PGVEC_TMP/pgvector"
                pushd "$PGVEC_TMP/pgvector" > /dev/null
                make PG_CONFIG="$(which pg_config)"
                sudo make install PG_CONFIG="$(which pg_config)"
                popd > /dev/null
                rm -rf "$PGVEC_TMP"
            fi
            success "pgvector installed"
            INSTALLED_ITEMS+=("pgvector")
        fi
        ;;
esac

info "Enabling vector extension in ${DB_NAME}..."
run_as_postgres psql -d "$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS vector;" 2>/dev/null
success "vector extension enabled"
echo ""

# ── 2c. pg_cron ─────────────────────────────────────────────────────────────
echo -e "${BOLD}  2c · pg_cron (in-database job scheduler)${NC}"

case "$DISTRO" in
    debian)
        if dpkg -l "postgresql-${PG_VERSION}-cron" 2>/dev/null | grep -q "^ii"; then
            success "pg_cron package already installed"
            SKIPPED_ITEMS+=("pg_cron")
        else
            info "Installing pg_cron from PostgreSQL APT repo..."
            pkg_install_debian "postgresql-${PG_VERSION}-cron"
            success "pg_cron installed"
            INSTALLED_ITEMS+=("pg_cron")
        fi
        ;;
    arch)
        if pg_ext_installed "pg_cron"; then
            success "pg_cron already installed on disk"
            SKIPPED_ITEMS+=("pg_cron")
        else
            info "Installing pg_cron from AUR..."
            if command_exists yay; then
                yay -S --needed --noconfirm pg_cron
            else
                info "Compiling pg_cron from source..."
                PGCRON_TMP=$(mktemp -d)
                git clone --depth 1 https://github.com/citusdata/pg_cron.git "$PGCRON_TMP/pg_cron"
                pushd "$PGCRON_TMP/pg_cron" > /dev/null
                make PG_CONFIG="$(which pg_config)"
                sudo make install PG_CONFIG="$(which pg_config)"
                popd > /dev/null
                rm -rf "$PGCRON_TMP"
            fi
            success "pg_cron installed"
            INSTALLED_ITEMS+=("pg_cron (from source)")
        fi
        ;;
esac

# Configure shared_preload_libraries for pg_cron
PG_CONF_CANDIDATES=(
    "/etc/postgresql/${PG_VERSION}/main/postgresql.conf"
    "/var/lib/postgres/data/postgresql.conf"
    "/var/lib/postgresql/${PG_VERSION}/main/postgresql.conf"
)
PG_CONF=""
for candidate in "${PG_CONF_CANDIDATES[@]}"; do
    if [[ -f "$candidate" ]]; then
        PG_CONF="$candidate"
        break
    fi
done

if [[ -n "$PG_CONF" ]]; then
    if grep -q "shared_preload_libraries.*pg_cron" "$PG_CONF" 2>/dev/null; then
        success "pg_cron already in shared_preload_libraries"
    else
        info "Adding pg_cron to shared_preload_libraries..."
        if grep -qE "^shared_preload_libraries" "$PG_CONF" 2>/dev/null; then
            sudo sed -i.bak "s/^shared_preload_libraries = '\(.*\)'/shared_preload_libraries = '\1,pg_cron'/" "$PG_CONF"
        else
            echo "" | sudo tee -a "$PG_CONF" > /dev/null
            echo "# Added by linux-setup.sh for Synapse" | sudo tee -a "$PG_CONF" > /dev/null
            echo "shared_preload_libraries = 'pg_cron'" | sudo tee -a "$PG_CONF" > /dev/null
        fi

        if ! grep -q "cron.database_name" "$PG_CONF" 2>/dev/null; then
            echo "cron.database_name = '${DB_NAME}'" | sudo tee -a "$PG_CONF" > /dev/null
        fi

        warn "Restarting PostgreSQL for pg_cron..."
        sudo systemctl restart postgresql
        if wait_for_pg 30; then
            success "PostgreSQL restarted with pg_cron loaded"
        else
            fail "PostgreSQL failed to restart"
            FAILED_ITEMS+=("PostgreSQL restart for pg_cron")
        fi
    fi
else
    warn "Could not find postgresql.conf — you must manually add:"
    warn "  shared_preload_libraries = 'pg_cron'"
fi

info "Enabling pg_cron extension in ${DB_NAME}..."
run_as_postgres psql -d "$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS pg_cron;" 2>/dev/null && \
    success "pg_cron extension enabled" || \
    warn "pg_cron CREATE EXTENSION failed — may need a PostgreSQL restart"
echo ""

# ── Verify all extensions ────────────────────────────────────────────────────
echo -e "${BOLD}  Verifying installed extensions...${NC}"
EXT_LIST=$(run_as_postgres psql -d "$DB_NAME" -tAc \
    "SELECT extname || ' (' || extversion || ')' FROM pg_extension WHERE extname IN ('pg_trgm','vector','pg_cron') ORDER BY extname;" 2>/dev/null || true)

if [[ -n "$EXT_LIST" ]]; then
    while IFS= read -r ext; do
        success "Extension active: ${ext}"
    done <<< "$EXT_LIST"
else
    warn "Could not verify extensions"
fi
echo ""

# ============================================================================
# STEP 3 · PgBouncer
# ============================================================================

section "Step 3 · PgBouncer (port ${PGBOUNCER_PORT})"

case "$DISTRO" in
    debian)
        if dpkg -l pgbouncer 2>/dev/null | grep -q "^ii"; then
            success "PgBouncer is already installed"
            SKIPPED_ITEMS+=("PgBouncer")
        else
            info "Installing PgBouncer..."
            pkg_install_debian pgbouncer
            success "PgBouncer installed"
            INSTALLED_ITEMS+=("PgBouncer")
        fi
        PGBOUNCER_INI="/etc/pgbouncer/pgbouncer.ini"
        PGBOUNCER_USERLIST="/etc/pgbouncer/userlist.txt"
        ;;
    arch)
        if pacman -Qi pgbouncer 2>/dev/null | grep -q "^Name"; then
            success "PgBouncer is already installed"
            SKIPPED_ITEMS+=("PgBouncer")
        else
            info "Installing PgBouncer..."
            sudo pacman -S --needed --noconfirm pgbouncer
            success "PgBouncer installed"
            INSTALLED_ITEMS+=("PgBouncer")
        fi
        PGBOUNCER_INI="/etc/pgbouncer/pgbouncer.ini"
        PGBOUNCER_USERLIST="/etc/pgbouncer/userlist.txt"
        ;;
esac

# Configure PgBouncer
info "Configuring PgBouncer for Synapse..."
sudo mkdir -p /etc/pgbouncer /var/log/pgbouncer /var/run/pgbouncer

sudo tee "$PGBOUNCER_USERLIST" > /dev/null <<USERLIST
"${DB_USER}" "${DB_PASS}"
USERLIST
sudo chmod 640 "$PGBOUNCER_USERLIST"

# Determine pgbouncer user (varies by distro)
PGBOUNCER_USER="pgbouncer"
if ! id "$PGBOUNCER_USER" &>/dev/null; then
    PGBOUNCER_USER="postgres"
fi
sudo chown "$PGBOUNCER_USER":"$PGBOUNCER_USER" "$PGBOUNCER_USERLIST" 2>/dev/null || true

sudo tee "$PGBOUNCER_INI" > /dev/null <<PGBCONF
;; ============================================================================
;; PgBouncer Configuration for Synapse
;; Generated by linux-setup.sh on $(date '+%Y-%m-%d %H:%M:%S')
;; ============================================================================

[databases]
${DB_NAME} = host=127.0.0.1 port=${PG_PORT} dbname=${DB_NAME} user=${DB_USER}

[pgbouncer]
;; --- Networking ---
listen_addr = 127.0.0.1
listen_port = ${PGBOUNCER_PORT}

;; --- Authentication ---
auth_type = md5
auth_file = ${PGBOUNCER_USERLIST}

;; --- Pooling ---
pool_mode = transaction

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
logfile = /var/log/pgbouncer/pgbouncer.log
pidfile = /var/run/pgbouncer/pgbouncer.pid
unix_socket_dir = /var/run/pgbouncer
PGBCONF

sudo chown "$PGBOUNCER_USER":"$PGBOUNCER_USER" "$PGBOUNCER_INI" 2>/dev/null || true
sudo chown -R "$PGBOUNCER_USER":"$PGBOUNCER_USER" /var/log/pgbouncer /var/run/pgbouncer 2>/dev/null || true
success "PgBouncer config written"

# Also need to configure PostgreSQL pg_hba.conf for md5 auth from PgBouncer
PG_HBA_CANDIDATES=(
    "/etc/postgresql/${PG_VERSION}/main/pg_hba.conf"
    "/var/lib/postgres/data/pg_hba.conf"
    "/var/lib/postgresql/${PG_VERSION}/main/pg_hba.conf"
)
PG_HBA=""
for candidate in "${PG_HBA_CANDIDATES[@]}"; do
    if [[ -f "$candidate" ]]; then
        PG_HBA="$candidate"
        break
    fi
done

if [[ -n "$PG_HBA" ]]; then
    if ! grep -q "${DB_USER}" "$PG_HBA" 2>/dev/null; then
        info "Adding ${DB_USER} to pg_hba.conf for md5 auth..."
        echo "" | sudo tee -a "$PG_HBA" > /dev/null
        echo "# Added by linux-setup.sh for Synapse" | sudo tee -a "$PG_HBA" > /dev/null
        echo "host    ${DB_NAME}    ${DB_USER}    127.0.0.1/32    md5" | sudo tee -a "$PG_HBA" > /dev/null
        echo "host    ${DB_NAME}    ${DB_USER}    ::1/128         md5" | sudo tee -a "$PG_HBA" > /dev/null
        sudo systemctl reload postgresql
        success "pg_hba.conf updated"
    else
        success "${DB_USER} already in pg_hba.conf"
    fi
fi

# Start PgBouncer
info "Starting PgBouncer..."
sudo systemctl enable pgbouncer &>/dev/null || true
sudo systemctl restart pgbouncer &>/dev/null || true
sleep 2

if pg_isready -h localhost -p "$PGBOUNCER_PORT" &>/dev/null; then
    success "PgBouncer is running on port ${PGBOUNCER_PORT}"
else
    warn "PgBouncer may not be running. Check: systemctl status pgbouncer"
    FAILED_ITEMS+=("PgBouncer start")
fi
echo ""

# ============================================================================
# STEP 4 · Qdrant
# ============================================================================

section "Step 4 · Qdrant (ports ${QDRANT_PORT} / ${QDRANT_GRPC_PORT})"

if command_exists qdrant; then
    success "Qdrant binary already found: $(which qdrant)"
    SKIPPED_ITEMS+=("Qdrant")
else
    info "Downloading Qdrant binary from GitHub releases..."

    # Resolve latest version
    if [[ "$QDRANT_VERSION" == "latest" ]]; then
        info "Fetching latest Qdrant release tag..."
        QDRANT_VERSION=$(curl -sL "https://api.github.com/repos/qdrant/qdrant/releases/latest" \
            | grep '"tag_name"' | head -1 | sed -E 's/.*"v?([^"]+)".*/\1/')
        if [[ -z "$QDRANT_VERSION" ]]; then
            warn "Could not determine latest version, falling back to v1.13.2"
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
        info "Extracting..."
        tar -xzf "$QDRANT_TMP/$QDRANT_TARBALL" -C "$QDRANT_TMP"

        if [[ -f "$QDRANT_TMP/qdrant" ]]; then
            sudo cp "$QDRANT_TMP/qdrant" "$QDRANT_INSTALL_DIR/qdrant"
            sudo chmod +x "$QDRANT_INSTALL_DIR/qdrant"
            success "Qdrant binary installed to ${QDRANT_INSTALL_DIR}/qdrant"
            INSTALLED_ITEMS+=("Qdrant v${QDRANT_VERSION}")
        else
            fail "Could not find 'qdrant' binary in tarball"
            FAILED_ITEMS+=("Qdrant install")
        fi
        rm -rf "$QDRANT_TMP"
    else
        fail "Failed to download Qdrant from: ${QDRANT_URL}"
        FAILED_ITEMS+=("Qdrant download")
    fi
fi

# Create data directory
sudo mkdir -p "$QDRANT_DATA_DIR"
sudo chown "$(id -u):$(id -g)" "$QDRANT_DATA_DIR" 2>/dev/null || true
success "Qdrant data directory: ${QDRANT_DATA_DIR}"

# Create systemd service
QDRANT_SERVICE="/etc/systemd/system/qdrant.service"
if [[ ! -f "$QDRANT_SERVICE" ]]; then
    info "Creating Qdrant systemd service..."
    sudo tee "$QDRANT_SERVICE" > /dev/null <<QDSVC
[Unit]
Description=Qdrant Vector Database
After=network.target

[Service]
Type=simple
ExecStart=${QDRANT_INSTALL_DIR}/qdrant --storage-path ${QDRANT_DATA_DIR}
Restart=always
RestartSec=5
LimitNOFILE=65536
WorkingDirectory=${QDRANT_DATA_DIR}

[Install]
WantedBy=multi-user.target
QDSVC
    sudo systemctl daemon-reload
    success "Qdrant systemd service created"
fi

# Start Qdrant
info "Starting Qdrant..."
sudo systemctl enable qdrant &>/dev/null || true
sudo systemctl start qdrant &>/dev/null || true
sleep 3

if curl -sf "http://localhost:${QDRANT_PORT}/healthz" &>/dev/null; then
    success "Qdrant is running on port ${QDRANT_PORT}"
else
    warn "Qdrant may not be responding. Check: sudo systemctl status qdrant"
    FAILED_ITEMS+=("Qdrant start")
fi
echo ""

# ============================================================================
# STEP 5 · Redis / Valkey
# ============================================================================

section "Step 5 · Redis (port ${REDIS_PORT})"

REDIS_PKG=""
case "$DISTRO" in
    debian)
        if dpkg -l redis-server 2>/dev/null | grep -q "^ii"; then
            success "Redis is already installed"
            SKIPPED_ITEMS+=("Redis")
            REDIS_PKG="skip"
        elif dpkg -l valkey 2>/dev/null | grep -q "^ii"; then
            success "Valkey is already installed"
            SKIPPED_ITEMS+=("Valkey")
            REDIS_PKG="skip"
        fi
        if [[ "$REDIS_PKG" != "skip" ]]; then
            info "Installing Redis..."
            pkg_install_debian redis-server
            success "Redis installed"
            INSTALLED_ITEMS+=("Redis")
        fi
        ;;
    arch)
        if pacman -Qi redis 2>/dev/null | grep -q "^Name"; then
            success "Redis is already installed"
            SKIPPED_ITEMS+=("Redis")
            REDIS_PKG="skip"
        elif pacman -Qi valkey 2>/dev/null | grep -q "^Name"; then
            success "Valkey is already installed"
            SKIPPED_ITEMS+=("Valkey")
            REDIS_PKG="skip"
        fi
        if [[ "$REDIS_PKG" != "skip" ]]; then
            info "Installing Redis..."
            sudo pacman -S --needed --noconfirm redis
            success "Redis installed"
            INSTALLED_ITEMS+=("Redis")
        fi
        ;;
esac

# Start Redis
info "Ensuring Redis/Valkey is running..."
sudo systemctl enable redis 2>/dev/null || sudo systemctl enable valkey 2>/dev/null || true
sudo systemctl start redis 2>/dev/null || sudo systemctl start valkey 2>/dev/null || true
sleep 1

if redis-cli -h localhost -p "$REDIS_PORT" ping &>/dev/null 2>&1; then
    success "Redis is running on port ${REDIS_PORT}"
else
    warn "Redis may not be running. Check: systemctl status redis"
    FAILED_ITEMS+=("Redis start")
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
    "pg_isready -h localhost -p $PG_PORT"
verify_service "PgBouncer          (port ${PGBOUNCER_PORT})" \
    "pg_isready -h localhost -p $PGBOUNCER_PORT"
verify_service "Qdrant             (port ${QDRANT_PORT})" \
    "curl -sf http://localhost:${QDRANT_PORT}/healthz"
verify_service "Redis              (port ${REDIS_PORT})" \
    "redis-cli -h localhost -p $REDIS_PORT ping"
echo ""

echo -e "${BOLD}PostgreSQL Extensions in '${DB_NAME}':${NC}"
echo ""
run_as_postgres psql -d "$DB_NAME" -c \
    "SELECT extname AS extension, extversion AS version FROM pg_extension WHERE extname IN ('pg_trgm','vector','pg_cron') ORDER BY extname;" 2>/dev/null || \
    warn "Could not query extensions"
echo ""

echo -e "${BOLD}Connection test through PgBouncer:${NC}"
echo ""
if PGPASSWORD="$DB_PASS" psql -h localhost -p "$PGBOUNCER_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT 'PgBouncer connection OK';" 2>/dev/null; then
    success "Application can reach PostgreSQL through PgBouncer"
else
    warn "PgBouncer connection test failed"
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
        info "Applying custom credentials..."

        if [[ "$CUSTOM_USER" != "$DB_USER" ]]; then
            run_as_postgres psql -c \
                "CREATE ROLE ${CUSTOM_USER} WITH LOGIN PASSWORD '${CUSTOM_PASS}' CREATEDB SUPERUSER;" 2>/dev/null || true
        fi
        if [[ "$CUSTOM_PASS" != "$DB_PASS" ]]; then
            run_as_postgres psql -c \
                "ALTER ROLE ${CUSTOM_USER:-$DB_USER} WITH PASSWORD '${CUSTOM_PASS}';" 2>/dev/null || true
        fi
        if [[ "$CUSTOM_DB" != "$DB_NAME" ]]; then
            run_as_postgres psql -c \
                "CREATE DATABASE ${CUSTOM_DB} OWNER ${CUSTOM_USER:-$DB_USER};" 2>/dev/null || true
        fi

        DB_USER="${CUSTOM_USER}"
        DB_PASS="${CUSTOM_PASS}"
        DB_NAME="${CUSTOM_DB}"

        success "Custom credentials applied"

        # Update PgBouncer
        info "Updating PgBouncer config..."
        sudo tee "$PGBOUNCER_USERLIST" > /dev/null <<USERLIST2
"${DB_USER}" "${DB_PASS}"
USERLIST2
        sudo systemctl restart pgbouncer 2>/dev/null || true
        success "PgBouncer updated"
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
echo -e "  sudo systemctl status postgresql        ${DIM}# PG status${NC}"
echo -e "  sudo systemctl status pgbouncer         ${DIM}# PgBouncer status${NC}"
echo -e "  sudo systemctl status qdrant            ${DIM}# Qdrant status${NC}"
echo -e "  sudo systemctl status redis             ${DIM}# Redis status${NC}"
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
