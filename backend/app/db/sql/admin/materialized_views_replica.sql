-- =============================================================================
-- Synapse Admin Dashboard — Materialized Views (Replica Only)
-- =============================================================================
--
-- APPLY TO: Logical Replica ONLY via:
--   psql -h localhost -p 5434 -U synapse_replica -d synapse \
--     -f app/db/sql/admin/materialized_views_replica.sql
--
-- DO NOT apply via Alembic — these are analytics-layer DDL, not application
-- schema DDL. They live outside the migration chain by design.
--
-- REFRESH: All views are refreshed by pg_cron on the replica.
-- Install pg_cron on the replica and schedule:
--   SELECT cron.schedule('refresh-admin-views', '*/15 * * * *',
--     $$SELECT developer_schema.refresh_admin_views()$$);
--
-- DATA FRESHNESS: Every query against these views should also fetch:
--   SELECT latest_end_time FROM pg_stat_subscription
--   WHERE subname = 'synapse_telemetry_sub';
-- Include this timestamp in every API response so the React layer can
-- display "Data as of X minutes ago."
-- =============================================================================

SET search_path TO developer_schema, public;


-- =============================================================================
-- 1. AI Usage Daily Costs
-- Source: ai_usage table (LOGGED, replicates from Primary)
-- Refreshed every 15 minutes via pg_cron
-- =============================================================================

DROP MATERIALIZED VIEW IF EXISTS admin_ai_usage_daily_costs;

CREATE MATERIALIZED VIEW admin_ai_usage_daily_costs AS
SELECT
    date_trunc('day', created_at)                               AS metric_date,
    COUNT(DISTINCT user_id)                                     AS daily_active_users,
    SUM(tokens_total)                                           AS total_tokens_burned,
    SUM(cost)                                                   AS total_cost_usd,
    ROUND(AVG(cost)::numeric, 6)                                AS avg_cost_per_call,
    COUNT(*)                                                    AS total_api_calls,
    COUNT(*) FILTER (WHERE success = false)                     AS failed_calls,
    ROUND(
        COUNT(*) FILTER (WHERE success = false)::numeric
        / NULLIF(COUNT(*), 0) * 100, 2
    )                                                           AS failure_rate_pct,
    COUNT(*) FILTER (WHERE grounding_used)                      AS grounding_invocations,
    ROUND(AVG(duration_ms)::numeric, 2)                         AS avg_latency_ms,
    COUNT(*) FILTER (WHERE model_used LIKE '%flash%')           AS flash_model_calls,
    COUNT(*) FILTER (WHERE model_used LIKE '%pro%')             AS pro_model_calls
FROM ai_usage
GROUP BY date_trunc('day', created_at)
ORDER BY metric_date DESC;

CREATE UNIQUE INDEX ON admin_ai_usage_daily_costs (metric_date);
CREATE INDEX ON admin_ai_usage_daily_costs (metric_date DESC);


-- =============================================================================
-- 2. AI Agent Performance by Type
-- Source: agent_metrics (now LOGGED after migration f7e3a2b1c9d0)
-- Refreshed every 15 minutes via pg_cron
-- =============================================================================

DROP MATERIALIZED VIEW IF EXISTS admin_agent_perf_by_type;

CREATE MATERIALIZED VIEW admin_agent_perf_by_type AS
SELECT
    agent_type,
    date_trunc('day', created_at)                               AS day,
    COUNT(*)                                                    AS total_runs,
    COUNT(*) FILTER (WHERE success = false)                     AS failed_runs,
    ROUND(
        COUNT(*) FILTER (WHERE success = false)::numeric
        / NULLIF(COUNT(*), 0) * 100, 2
    )                                                           AS failure_rate_pct,
    ROUND(AVG(iterations)::numeric, 2)                          AS avg_react_iterations,
    ROUND((AVG(execution_time_ms) / 1000.0)::numeric, 2)       AS avg_execution_seconds,
    ROUND(AVG(total_tokens)::numeric, 0)                        AS avg_tokens_per_run,
    SUM(estimated_cost)                                         AS total_cost_usd,
    -- Most frequently occurring error type in the window — single pass, no Python groupby
    mode() WITHIN GROUP (ORDER BY error_type)                   AS most_common_error
FROM agent_metrics
WHERE created_at >= now() - interval '90 days'
GROUP BY agent_type, date_trunc('day', created_at)
ORDER BY day DESC, total_runs DESC;

CREATE INDEX ON admin_agent_perf_by_type (agent_type, day);
CREATE INDEX ON admin_agent_perf_by_type (day DESC);


-- =============================================================================
-- 3. Document Pipeline Status
-- Source: documents table
-- Shows the ingestion funnel: PENDING→PARSING→PARSED→CHUNKING→COMPLETED/FAILED
-- Refreshed every 15 minutes via pg_cron
-- =============================================================================

DROP MATERIALIZED VIEW IF EXISTS admin_document_pipeline_status;

CREATE MATERIALIZED VIEW admin_document_pipeline_status AS
SELECT
    processing_status,
    COUNT(*)                                                    AS document_count,
    SUM(file_size)                                              AS total_bytes,
    pg_size_pretty(SUM(file_size))                             AS total_size_human,
    ROUND(AVG(file_size)::numeric)                              AS avg_file_size_bytes,
    COUNT(*) FILTER (WHERE ocr_performed)                      AS ocr_processed_count,
    MIN(created_at)                                            AS oldest_in_status,
    MAX(updated_at)                                            AS newest_update
FROM documents
WHERE deleted_at IS NULL
GROUP BY processing_status
ORDER BY
    CASE processing_status
        WHEN 'failed'    THEN 1
        WHEN 'pending'   THEN 2
        WHEN 'parsing'   THEN 3
        WHEN 'parsed'    THEN 4
        WHEN 'chunking'  THEN 5
        WHEN 'completed' THEN 6
        ELSE 7
    END;

CREATE UNIQUE INDEX ON admin_document_pipeline_status (processing_status);


-- =============================================================================
-- 4. Webhook Delivery Rates
-- Source: webhook_events table
-- Refreshed every 15 minutes via pg_cron
-- =============================================================================

DROP MATERIALIZED VIEW IF EXISTS admin_webhook_delivery_rates;

CREATE MATERIALIZED VIEW admin_webhook_delivery_rates AS
SELECT
    date_trunc('day', created_at)                               AS day,
    event_type,
    COUNT(*)                                                    AS total_deliveries,
    COUNT(*) FILTER (WHERE status = 'sent')                    AS successful,
    COUNT(*) FILTER (WHERE status = 'failed')                  AS failed,
    COUNT(*) FILTER (WHERE status = 'pending')                 AS pending,
    ROUND(
        COUNT(*) FILTER (WHERE status = 'sent')::numeric
        / NULLIF(COUNT(*), 0) * 100, 2
    )                                                           AS success_rate_pct,
    ROUND(AVG(attempts)::numeric, 2)                            AS avg_attempts_per_delivery,
    MAX(attempts)                                               AS max_attempts_seen
FROM webhook_events
GROUP BY date_trunc('day', created_at), event_type
ORDER BY day DESC, failed DESC;

CREATE INDEX ON admin_webhook_delivery_rates (day DESC, event_type);


-- =============================================================================
-- 5. Automation Workflow Execution Stats
-- Source: workflow_runs table
-- trigger_type is INTEGER: 1=CONSUMPTION, 2=DOCUMENT_ADDED,
--                          3=DOCUMENT_UPDATED, 4=SCHEDULED
-- Verified: workflow_runs.trigger_type = Mapped[int] = mapped_column(Integer)
-- Refreshed every hour via pg_cron (weekly data changes slowly)
-- =============================================================================

DROP MATERIALIZED VIEW IF EXISTS admin_workflow_execution_stats;

CREATE MATERIALIZED VIEW admin_workflow_execution_stats AS
SELECT
    date_trunc('week', wr.run_at)                               AS week,
    t.trigger_label,
    COUNT(*)                                                    AS total_executions,
    COUNT(DISTINCT wr.document_id)                              AS unique_docs_processed
FROM workflow_runs wr
JOIN LATERAL (
    VALUES
        (1, 'CONSUMPTION'),
        (2, 'DOCUMENT_ADDED'),
        (3, 'DOCUMENT_UPDATED'),
        (4, 'SCHEDULED')
) AS t(trigger_type_id, trigger_label)
    ON wr.trigger_type = t.trigger_type_id
GROUP BY date_trunc('week', wr.run_at), t.trigger_label
ORDER BY week DESC, total_executions DESC;

CREATE INDEX ON admin_workflow_execution_stats (week DESC);


-- =============================================================================
-- 6. Platform Learning Activity Daily
-- Source: activity_logs table (LOGGED, replicates from Primary)
-- Only learning events (is_learning_event = true) contribute to metrics
-- Refreshed every 15 minutes via pg_cron
-- =============================================================================

DROP MATERIALIZED VIEW IF EXISTS admin_platform_learning_daily;

CREATE MATERIALIZED VIEW admin_platform_learning_daily AS
SELECT
    date_trunc('day', created_at)                               AS day,
    COUNT(DISTINCT user_id)                                     AS active_learners,
    SUM(duration_seconds) / 60                                  AS total_study_minutes,
    ROUND(
        AVG(accuracy) FILTER (WHERE accuracy IS NOT NULL)::numeric,
        4
    )                                                           AS platform_avg_accuracy,
    COUNT(*) FILTER (WHERE activity_type = 'flashcard_review') AS flashcard_reviews,
    COUNT(*) FILTER (WHERE activity_type = 'quiz_question_attempt') AS quiz_attempts,
    COUNT(*) FILTER (WHERE activity_type = 'grounded_answer')  AS grounded_answers,
    COUNT(*) FILTER (WHERE activity_type = 'session_end')      AS completed_sessions
FROM activity_logs
WHERE is_learning_event = true
GROUP BY date_trunc('day', created_at)
ORDER BY day DESC;

CREATE UNIQUE INDEX ON admin_platform_learning_daily (day);
CREATE INDEX ON admin_platform_learning_daily (day DESC);


-- =============================================================================
-- Helper function: refresh all admin materialized views concurrently
-- CONCURRENTLY = view remains readable during refresh, no locked reads
-- =============================================================================

CREATE OR REPLACE FUNCTION developer_schema.refresh_admin_views()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY developer_schema.admin_ai_usage_daily_costs;
    REFRESH MATERIALIZED VIEW CONCURRENTLY developer_schema.admin_agent_perf_by_type;
    REFRESH MATERIALIZED VIEW CONCURRENTLY developer_schema.admin_document_pipeline_status;
    REFRESH MATERIALIZED VIEW CONCURRENTLY developer_schema.admin_webhook_delivery_rates;
    REFRESH MATERIALIZED VIEW CONCURRENTLY developer_schema.admin_workflow_execution_stats;
    REFRESH MATERIALIZED VIEW CONCURRENTLY developer_schema.admin_platform_learning_daily;
END;
$$;
