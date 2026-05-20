-- =============================================================================
-- Synapse Admin Dashboard — Primary pg_stat_* Query Library
-- =============================================================================
--
-- These queries run against the PRIMARY via a direct asyncpg connection
-- (app/db/primary_health_connection.py), bypassing PgBouncer.
--
-- WHY DIRECT CONNECTION:
--   PgBouncer's connection pooling makes pg_stat_activity show pooler
--   connections rather than real backend connections. Cache hit ratios
--   in pg_stat_database are also inaccurate through a pooler. A direct
--   asyncpg connection gives accurate, real system catalog data.
--
-- These are reference SQL for the admin.py endpoints. They are executed
-- via asyncpg's conn.fetchrow() / conn.fetch() methods, not SQLAlchemy.
-- =============================================================================


-- =============================================================================
-- 1. DATABASE SERVER HEALTH
-- Endpoint: GET /admin/db-health
-- =============================================================================

-- Full server health snapshot
SELECT
    -- Storage
    pg_size_pretty(pg_database_size(current_database()))       AS db_size_human,
    pg_database_size(current_database())                        AS db_size_bytes,

    -- Connection pressure
    (SELECT count(*)
     FROM pg_stat_activity
     WHERE state = 'active')                                   AS active_connections,

    (SELECT count(*)
     FROM pg_stat_activity
     WHERE state = 'idle in transaction')                      AS idle_in_transaction,

    (SELECT count(*)
     FROM pg_stat_activity
     WHERE state = 'active'
       AND now() - query_start > interval '30 seconds')       AS long_running_queries,

    -- Table cache efficiency (meaningful only on Primary)
    -- Target: > 0.99 (99%). Below 0.95 = add shared_buffers.
    ROUND(
        (blks_hit::numeric / NULLIF(blks_hit + blks_read, 0))::numeric,
        4
    )                                                          AS table_cache_hit_ratio,

    -- Index cache efficiency (granular — catches ignored indexes)
    -- A high table hit ratio can mask poorly-cached index pages.
    ROUND((
        SELECT sum(idx_blks_hit)::numeric
               / NULLIF(sum(idx_blks_hit + idx_blks_read), 0)
        FROM pg_statio_user_tables
    )::numeric, 4)                                             AS index_cache_hit_ratio,

    -- Dead tuple bloat — triggers manual VACUUM if autovacuum is falling behind
    (SELECT sum(n_dead_tup) FROM pg_stat_user_tables)         AS total_dead_tuples,
    (SELECT sum(n_live_tup) FROM pg_stat_user_tables)         AS total_live_tuples,

    -- Autovacuum activity
    (SELECT count(*)
     FROM pg_stat_activity
     WHERE query LIKE 'autovacuum:%')                          AS autovacuum_workers_active

FROM pg_stat_database
WHERE datname = current_database();


-- =============================================================================
-- 2. REPLICATION SLOT HEALTH (WAL Bloat Kill Switch)
-- Endpoint: GET /admin/replication-health
-- =============================================================================

-- Primary side — slot status and WAL lag
SELECT
    slot_name,
    plugin,
    slot_type,
    active,
    active_pid,
    pg_size_pretty(
        pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)
    )                                                          AS wal_lag_human,
    pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)       AS wal_lag_bytes
FROM pg_replication_slots
WHERE slot_type = 'logical';

-- Alert thresholds (applied in admin.py):
--   wal_lag_bytes > 10_737_418_240 (10 GB)  → WARNING
--   wal_lag_bytes > 53_687_091_200 (50 GB)  → CRITICAL + auto-drop slot


-- =============================================================================
-- 3. LONG-RUNNING QUERIES
-- Endpoint: GET /admin/active-queries
-- =============================================================================

SELECT
    pid,
    now() - query_start                                        AS duration,
    state,
    wait_event_type,
    wait_event,
    left(query, 200)                                           AS query_preview,
    application_name,
    client_addr
FROM pg_stat_activity
WHERE state = 'active'
  AND query_start IS NOT NULL
  AND now() - query_start > interval '5 seconds'
  AND query NOT LIKE '%pg_stat_activity%'   -- Exclude this query itself
ORDER BY duration DESC
LIMIT 20;


-- =============================================================================
-- 4. TABLE BLOAT CANDIDATES
-- Endpoint: GET /admin/db-health (included in health response)
-- =============================================================================

SELECT
    schemaname,
    relname                                                    AS table_name,
    n_live_tup,
    n_dead_tup,
    ROUND(
        n_dead_tup::numeric / NULLIF(n_live_tup + n_dead_tup, 0) * 100,
        2
    )                                                          AS dead_pct,
    last_autovacuum,
    last_autoanalyze
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY dead_pct DESC NULLS LAST
LIMIT 10;
