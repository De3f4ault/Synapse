-- =============================================================================
-- docker/postgres/wal_monitor.sql
--
-- pg_cron job: monitors replication slot WAL lag hourly.
-- Logs NOTICE for normal lag, WARNING when a slot exceeds 1GB behind.
-- A slot > 1GB means the replica is significantly behind or dead,
-- and the primary is holding WAL that should be freed.
--
-- Installed by: first-run.sh (step 6)
-- Mounted at:   /docker-entrypoint-initdb.d/wal_monitor.sql
-- Prerequisite: pg_cron extension loaded (shared_preload_libraries='pg_cron')
-- =============================================================================

-- Install pg_cron extension if not already present
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove existing job before re-creating (idempotent re-run).
-- Must use DO block — cron.unschedule() errors if the job doesn't exist
-- in some pg_cron versions, and SELECT...WHERE EXISTS is unreliable here.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'wal-slot-monitor') THEN
        PERFORM cron.unschedule('wal-slot-monitor');
        RAISE NOTICE '[WAL Monitor] Removed existing wal-slot-monitor job (re-install).';
    END IF;
END;
$$;

-- Schedule the WAL monitor to run every hour
SELECT cron.schedule(
    'wal-slot-monitor',
    '0 * * * *',
    $cron$
    DO $body$
    DECLARE
        rec RECORD;
    BEGIN
        -- Query uses confirmed_flush_lsn which is valid on PG10+.
        -- pg_wal_lsn_diff returns bytes; pg_size_pretty formats it.
        -- active=false means no replica is consuming this slot — highest risk.
        FOR rec IN
            SELECT
                slot_name,
                slot_type,
                active,
                pg_size_pretty(
                    pg_wal_lsn_diff(pg_current_wal_lsn(), confirmed_flush_lsn)
                ) AS wal_behind,
                pg_wal_lsn_diff(pg_current_wal_lsn(), confirmed_flush_lsn) AS wal_bytes
            FROM pg_replication_slots
            WHERE confirmed_flush_lsn IS NOT NULL
            ORDER BY wal_bytes DESC
        LOOP
            IF rec.wal_bytes > 1073741824 THEN
                -- > 1GB: WARNING level — operator should investigate
                RAISE WARNING
                    '[WAL Monitor] SLOT LAG HIGH: slot=% type=% active=% behind=%',
                    rec.slot_name, rec.slot_type, rec.active, rec.wal_behind;
            ELSE
                RAISE NOTICE
                    '[WAL Monitor] slot=% type=% active=% behind=%',
                    rec.slot_name, rec.slot_type, rec.active, rec.wal_behind;
            END IF;
        END LOOP;

        -- Log if no slots exist (expected during normal ops without replica)
        IF NOT FOUND THEN
            RAISE NOTICE '[WAL Monitor] No active replication slots.';
        END IF;
    END;
    $body$;
    $cron$
);

-- Verify installation
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'wal-slot-monitor') THEN
        RAISE NOTICE '[WAL Monitor] Cron job installed successfully (hourly).';
    ELSE
        RAISE EXCEPTION '[WAL Monitor] Failed to install cron job.';
    END IF;
END;
$$;
