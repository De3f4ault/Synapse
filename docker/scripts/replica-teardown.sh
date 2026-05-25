#!/usr/bin/env env bash
# =============================================================================
# docker/scripts/replica-teardown.sh
#
# Safe teardown for the analytics replica.
#
# Run this BEFORE `docker compose -f docker-compose.analytics.yml down`
# to drop the logical replication slot from the primary. Without this,
# the primary keeps WAL segments indefinitely for a replica that no longer
# exists — disk fills, primary eventually panics.
#
# Usage:
#   bash docker/scripts/replica-teardown.sh
#
# What it does:
#   1. Refuses to run if the replica container is still running (safety gate).
#   2. Connects to the primary postgres container.
#   3. Lists all slots matching synapse_replica_%.
#   4. Drops each active slot.
#   5. Prints a verification summary.
#
# Idempotent: safe to re-run. Dropping a non-existent slot is a no-op.
# =============================================================================

set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
REPLICA_CONTAINER="${REPLICA_CONTAINER:-synapse-replica}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-synapse-postgres-1}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-synapse}"
SLOT_PREFIX="${SLOT_PREFIX:-synapse_replica}"

# ── 1. Safety gate: refuse to run while replica is alive ─────────────────────
echo ""
echo "=== Synapse Replica Teardown ==="
echo ""

if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^${REPLICA_CONTAINER}$"; then
    echo "ERROR: Replica container '${REPLICA_CONTAINER}' is still running."
    echo ""
    echo "  Stop the replica first:"
    echo "    docker compose -f docker-compose.analytics.yml stop"
    echo ""
    echo "  Then re-run this script."
    exit 1
fi

echo "✓ Replica container is stopped — safe to drop replication slots."
echo ""

# ── 2. Check primary is reachable ────────────────────────────────────────────
if ! docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^${POSTGRES_CONTAINER}$"; then
    echo "ERROR: Primary postgres container '${POSTGRES_CONTAINER}' is not running."
    echo "  Start the primary first: docker compose up -d postgres"
    exit 1
fi

# ── 3. List current slots matching prefix ────────────────────────────────────
echo "Current replication slots on primary:"
docker exec "${POSTGRES_CONTAINER}" psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" \
    -c "SELECT slot_name, active, pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), confirmed_flush_lsn)) AS wal_behind
        FROM pg_replication_slots
        WHERE slot_name LIKE '${SLOT_PREFIX}%'
        ORDER BY slot_name;"

echo ""

# ── 4. Drop each matching slot ────────────────────────────────────────────────
SLOTS=$(docker exec "${POSTGRES_CONTAINER}" psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -At \
    -c "SELECT slot_name FROM pg_replication_slots WHERE slot_name LIKE '${SLOT_PREFIX}%';")

if [ -z "${SLOTS}" ]; then
    echo "No slots matching '${SLOT_PREFIX}%' found — nothing to drop."
else
    while IFS= read -r slot; do
        echo -n "  Dropping slot '${slot}'... "
        docker exec "${POSTGRES_CONTAINER}" psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" \
            -c "SELECT pg_drop_replication_slot('${slot}');" > /dev/null
        echo "done."
    done <<< "${SLOTS}"
fi

echo ""

# ── 5. Verify ─────────────────────────────────────────────────────────────────
REMAINING=$(docker exec "${POSTGRES_CONTAINER}" psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -At \
    -c "SELECT COUNT(*) FROM pg_replication_slots WHERE slot_name LIKE '${SLOT_PREFIX}%';")

if [ "${REMAINING}" -eq 0 ]; then
    echo "✓ All ${SLOT_PREFIX}% replication slots dropped."
    echo "  Primary is free to reclaim WAL storage."
else
    echo "WARNING: ${REMAINING} slot(s) still present. Manual inspection needed:"
    docker exec "${POSTGRES_CONTAINER}" psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" \
        -c "SELECT * FROM pg_replication_slots WHERE slot_name LIKE '${SLOT_PREFIX}%';"
    exit 1
fi

echo ""
echo "=== Teardown complete. Safe to run: docker compose -f docker-compose.analytics.yml down ==="
echo ""
