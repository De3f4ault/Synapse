#!/usr/bin/env bash
# =============================================================================
# docker/scripts/first-run.sh
#
# Complete Synapse stack bootstrap for a clean machine.
# Idempotent: safe to re-run on partial failure.
# Alembic handles re-run gracefully. Model download is skipped if already
# present. Qdrant collection creation is idempotent (checks existence first).
#
# Prerequisites:
#   - Docker Engine + Compose plugin installed
#   - backend/.env.docker populated (no CHANGE_ME placeholders)
#   - Ollama running on host with required models pulled
#
# Usage:
#   bash docker/scripts/first-run.sh
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "${PROJECT_ROOT}"

COMPOSE="docker compose"
ENV_FILE="backend/.env.docker"

# ── Colour helpers ─────────────────────────────────────────────────────────────
ok()   { echo -e "\033[0;32m✓\033[0m $*"; }
warn() { echo -e "\033[1;33m⚠\033[0m  $*"; }
die()  { echo -e "\033[0;31m✗\033[0m $*" >&2; exit 1; }
step() { echo ""; echo "▶ $*"; }

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║        Synapse First-Run Bootstrap                   ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ── 0. Preflight ───────────────────────────────────────────────────────────────
step "Step 0/9 — Preflight checks..."

[ -f "${ENV_FILE}" ] \
    || die "Missing ${ENV_FILE}. Copy from backend/.env.docker and fill in secrets."

grep -q "CHANGE_ME" "${ENV_FILE}" \
    && die "${ENV_FILE} still has CHANGE_ME placeholders. Fill them in first."

command -v docker >/dev/null 2>&1 || die "Docker not installed."
docker compose version >/dev/null 2>&1 || die "Docker Compose plugin not installed."

ok "Preflight passed."

# ── 1. Build images ────────────────────────────────────────────────────────────
step "Step 1/9 — Building images (parallel)..."
${COMPOSE} build --parallel
ok "Images built."

# ── 2. Populate model cache (idempotent — skipped if cache volume already full) ─
step "Step 2/9 — Populating model cache..."
echo "   Downloads ~2GB on first run. Skipped if all 5 models already present."

# Run validate first (offline=1 — checks files only, no network)
# If it exits 0, cache is already complete — skip expensive download step.
# If it exits 1, some models are missing — proceed with download.
if ${COMPOSE} run --rm \
    -e HF_HUB_OFFLINE=1 \
    -e TRANSFORMERS_OFFLINE=1 \
    api python docker/scripts/validate_model_cache.py > /dev/null 2>&1; then
    ok "Model cache already complete — skipping download."
else
    warn "Model cache incomplete. Downloading ~2GB from HuggingFace (internet required)..."

    ${COMPOSE} run --rm \
        -e HF_HUB_OFFLINE=0 \
        -e TRANSFORMERS_OFFLINE=0 \
        api python - <<'PYEOF'
import os, sys
cache_dir = os.environ.get("SYNAPSE_MODEL_CACHE_DIR", "/app/.model_cache")
print(f"  Cache dir: {cache_dir}")

from sentence_transformers import SentenceTransformer, CrossEncoder

print("  Downloading nomic-embed-text-v1.5 (~550MB)...")
SentenceTransformer("nomic-ai/nomic-embed-text-v1.5", cache_folder=cache_dir)
print("  ✓ nomic-embed-text-v1.5")

print("  Downloading all-MiniLM-L6-v2 (~90MB)...")
SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2", cache_folder=cache_dir)
print("  ✓ all-MiniLM-L6-v2")

print("  Downloading ms-marco-MiniLM-L-6-v2 (~90MB cross-encoder)...")
CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2", cache_folder=cache_dir)
print("  ✓ ms-marco-MiniLM-L-6-v2")

from transformers import AutoImageProcessor, AutoModel, AutoTokenizer

print("  Downloading nomic-embed-vision-v1.5 (~370MB)...")
AutoImageProcessor.from_pretrained("nomic-ai/nomic-embed-vision-v1.5", cache_dir=cache_dir)
AutoModel.from_pretrained("nomic-ai/nomic-embed-vision-v1.5", cache_dir=cache_dir, trust_remote_code=True)
print("  ✓ nomic-embed-vision-v1.5")

print("  Downloading answerai-colbert-small-v1 (~100MB)...")
AutoTokenizer.from_pretrained("answerdotai/answerai-colbert-small-v1", cache_dir=cache_dir)
AutoModel.from_pretrained("answerdotai/answerai-colbert-small-v1", cache_dir=cache_dir)
print("  ✓ answerai-colbert-small-v1")

print("  All 5 models cached (~1.2GB total).")
PYEOF
    ok "Model cache populated."
fi

# ── 3. Fix volume permissions ──────────────────────────────────────────────────
step "Step 3/9 — Fixing volume permissions for uid 1001 (synapse user)..."
${COMPOSE} run --rm init-volumes
ok "Volume permissions set."

# ── 4. Start infrastructure ────────────────────────────────────────────────────
step "Step 4/9 — Starting postgres + qdrant..."
${COMPOSE} up -d postgres qdrant

echo "   Waiting for postgres to be healthy..."
RETRIES=0; MAX=30
until ${COMPOSE} exec -T postgres pg_isready -U postgres -d synapse >/dev/null 2>&1; do
    RETRIES=$((RETRIES+1))
    [ ${RETRIES} -ge ${MAX} ] && die "Postgres never became healthy. Check: docker compose logs postgres"
    echo "   Not ready yet (${RETRIES}/${MAX})..."; sleep 3
done
ok "Postgres healthy."

# ── 5. Verify pg_cron ─────────────────────────────────────────────────────────
step "Step 5/9 — Verifying pg_cron..."

PG_CRON_LOADED=$(${COMPOSE} exec -T postgres psql -U postgres -d synapse -At \
    -c "SELECT COUNT(*) FROM pg_available_extensions WHERE name='pg_cron';" 2>/dev/null || echo "0")

[ "${PG_CRON_LOADED}" = "1" ] || die "pg_cron extension not available in this Postgres build."

# Install extension if not already installed
${COMPOSE} exec -T postgres psql -U postgres -d synapse \
    -c "CREATE EXTENSION IF NOT EXISTS pg_cron;" >/dev/null

# Verify cron.job table is accessible (proves shared_preload_libraries loaded it)
${COMPOSE} exec -T postgres psql -U postgres -d synapse \
    -c "SELECT COUNT(*) FROM cron.job;" >/dev/null 2>&1 \
    || die "pg_cron loaded but cron.job inaccessible. Check shared_preload_libraries in postgresql.conf."

ok "pg_cron verified."

# ── 6. Run migrations ─────────────────────────────────────────────────────────
step "Step 6/9 — Running Alembic migrations (idempotent)..."
${COMPOSE} run --rm migrate
ok "Migrations complete."

# ── 7. Install WAL monitor ─────────────────────────────────────────────────────
step "Step 7/9 — Installing WAL monitor cron job..."
if ${COMPOSE} exec -T postgres test -f /docker-entrypoint-initdb.d/wal_monitor.sql 2>/dev/null; then
    ${COMPOSE} exec -T postgres psql -U postgres -d synapse \
        -f /docker-entrypoint-initdb.d/wal_monitor.sql >/dev/null
    ok "WAL monitor installed."
else
    warn "wal_monitor.sql not mounted — skipping. Mount docker/postgres/wal_monitor.sql as an init script."
fi

# ── 8. Start full stack ────────────────────────────────────────────────────────
step "Step 8/9 — Starting full stack..."
${COMPOSE} up -d

echo "   Waiting for API health check..."
RETRIES=0; MAX=24
until ${COMPOSE} exec -T api curl -sf http://localhost:8000/ping >/dev/null 2>&1; do
    RETRIES=$((RETRIES+1))
    [ ${RETRIES} -ge ${MAX} ] && die "API never became healthy. Check: docker compose logs api"
    echo "   Not ready yet (${RETRIES}/${MAX})..."; sleep 5
done
ok "API healthy."

# ── 9. Bootstrap Qdrant collections ───────────────────────────────────────────
step "Step 9/9 — Bootstrapping Qdrant collections (retry loop)..."

RETRIES=0; MAX=12  # 12 × 5s = 60s timeout
until ${COMPOSE} exec -T api python - <<'PYEOF' 2>/dev/null
from app.core.ai.rag.vector_store.qdrant.client import get_qdrant_client
from app.core.ai.rag.vector_store.qdrant.collection_manager import CollectionManager
cm = CollectionManager(get_qdrant_client().get_client())
name = cm.create_shared_collection()
print(f"Collection ready: {name}")
PYEOF
do
    RETRIES=$((RETRIES+1))
    if [ ${RETRIES} -ge ${MAX} ]; then
        die "Qdrant bootstrap failed after ${MAX} attempts. Check: docker compose logs api"
    fi
    echo "   Waiting for Qdrant client to initialise (${RETRIES}/${MAX})..."; sleep 5
done
ok "Qdrant collections ready."

# ── Done ───────────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║           Bootstrap Complete                         ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
echo "  Frontend:  http://localhost"
echo "  API:       http://localhost/api/v1"
echo "  Logs:      docker compose logs -f"
echo ""
echo "  Rollback to bare-metal at any time:"
echo "    docker compose down && cd backend && make start"
echo ""
