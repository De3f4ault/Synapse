-- ============================================================
-- Cache Infrastructure Tables
-- Replaces Redis with PostgreSQL-backed equivalents.
--
-- UNLOGGED tables: fastest writes (no WAL), lost on crash.
-- This is intentional — identical to Redis crash behavior.
-- ============================================================
-- 1. Key-Value Cache (replaces Redis GET/SET/DEL/EXISTS/INCR)
CREATE UNLOGGED TABLE IF NOT EXISTS kv_store (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    expires_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_kv_expires ON kv_store (expires_at)
WHERE expires_at IS NOT NULL;
-- 2. Agent Metrics (replaces Redis sorted sets: ZADD/ZRANGE)
CREATE UNLOGGED TABLE IF NOT EXISTS agent_metrics (
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    agent_name TEXT NOT NULL,
    success BOOLEAN NOT NULL DEFAULT TRUE,
    duration_ms INTEGER NOT NULL,
    tokens_used INTEGER,
    model TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_metrics_agent_time ON agent_metrics (agent_name, created_at);
-- 3. User Activity (replaces Redis SADD/SCARD/SUNIONSTORE)
CREATE UNLOGGED TABLE IF NOT EXISTS user_activity (
    user_id INTEGER NOT NULL,
    activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
    PRIMARY KEY (user_id, activity_date)
);
-- 4. Event Bus (replaces Redis PUBLISH/SUBSCRIBE)
--    Uses delivered flag to avoid MVCC visibility gaps.
CREATE UNLOGGED TABLE IF NOT EXISTS events (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    channel TEXT NOT NULL,
    payload JSONB NOT NULL,
    delivered BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_events_undelivered ON events (channel, id)
WHERE delivered = FALSE;
-- 5. Token Blacklist (LOGGED — survives crash for security)
CREATE TABLE IF NOT EXISTS token_blacklist (
    token_jti TEXT PRIMARY KEY,
    user_id INTEGER,
    expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_blacklist_expires ON token_blacklist (expires_at);
-- ============================================================
-- Cleanup function (called by pg_cron or app-level scheduler)
-- ============================================================
CREATE OR REPLACE FUNCTION cleanup_ephemeral_data() RETURNS void AS $$ BEGIN
DELETE FROM kv_store
WHERE expires_at IS NOT NULL
    AND expires_at < now();
DELETE FROM agent_metrics
WHERE created_at < now() - interval '24 hours';
DELETE FROM user_activity
WHERE activity_date < CURRENT_DATE - 90;
DELETE FROM events
WHERE delivered = TRUE
    AND created_at < now() - interval '1 hour';
DELETE FROM token_blacklist
WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;