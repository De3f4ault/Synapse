-- ============================================================================
-- SYNAPSE: Deploy All Materialized Views
-- File: app/sql/migrations/create_views.sql
--
-- Master deployment script for all PostgreSQL materialized views.
-- Run this script AFTER tables are created and data is seeded.
--
-- Usage:
--   psql -U synapse_user -d synapse -f app/sql/migrations/create_views.sql
-- ============================================================================

-- Set schema search path
SET search_path TO developer_schema, public;

-- Start transaction for atomic deployment
BEGIN;

-- ============================================================================
-- MATERIALIZED VIEWS
-- ============================================================================

\echo '>>> Deploying materialized views...'

-- User Dashboard Statistics
\echo '    - user_dashboard_stats'
\ir ../views/user_dashboard_stats.sql

-- Module Performance
\echo '    - module_performance'
\ir ../views/module_performance.sql

-- Learning Insights
\echo '    - learning_insights'
\ir ../views/learning_insights.sql

\echo '>>> Materialized views deployed successfully'

-- ============================================================================
-- REFRESH ALL VIEWS
-- ============================================================================

\echo '>>> Creating master refresh function...'

-- Create a function to refresh all views at once
CREATE OR REPLACE FUNCTION developer_schema.refresh_all_materialized_views()
RETURNS TABLE (
    view_name TEXT,
    refresh_status TEXT,
    refresh_time INTERVAL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_start_time TIMESTAMP;
    v_end_time TIMESTAMP;
BEGIN
    -- Refresh user_dashboard_stats
    v_start_time := clock_timestamp();
    BEGIN
        REFRESH MATERIALIZED VIEW CONCURRENTLY developer_schema.user_dashboard_stats;
        v_end_time := clock_timestamp();
        view_name := 'user_dashboard_stats';
        refresh_status := 'success';
        refresh_time := v_end_time - v_start_time;
        RETURN NEXT;
    EXCEPTION WHEN OTHERS THEN
        view_name := 'user_dashboard_stats';
        refresh_status := 'failed: ' || SQLERRM;
        refresh_time := NULL;
        RETURN NEXT;
    END;

    -- Refresh module_performance
    v_start_time := clock_timestamp();
    BEGIN
        REFRESH MATERIALIZED VIEW developer_schema.module_performance;
        v_end_time := clock_timestamp();
        view_name := 'module_performance';
        refresh_status := 'success';
        refresh_time := v_end_time - v_start_time;
        RETURN NEXT;
    EXCEPTION WHEN OTHERS THEN
        view_name := 'module_performance';
        refresh_status := 'failed: ' || SQLERRM;
        refresh_time := NULL;
        RETURN NEXT;
    END;

    -- Refresh learning_insights
    v_start_time := clock_timestamp();
    BEGIN
        REFRESH MATERIALIZED VIEW developer_schema.learning_insights;
        v_end_time := clock_timestamp();
        view_name := 'learning_insights';
        refresh_status := 'success';
        refresh_time := v_end_time - v_start_time;
        RETURN NEXT;
    EXCEPTION WHEN OTHERS THEN
        view_name := 'learning_insights';
        refresh_status := 'failed: ' || SQLERRM;
        refresh_time := NULL;
        RETURN NEXT;
    END;
END;
$$;

GRANT EXECUTE ON FUNCTION developer_schema.refresh_all_materialized_views() TO synapse_user;

COMMENT ON FUNCTION developer_schema.refresh_all_materialized_views() IS
'Refreshes all materialized views and returns status for each.

Usage:
  SELECT * FROM developer_schema.refresh_all_materialized_views();

Returns:
  view_name | refresh_status | refresh_time
';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

\echo '>>> Verifying view deployment...'

-- Verify all views exist
DO $$
DECLARE
    v_missing_views TEXT[];
    v_view_list TEXT[] := ARRAY[
        'user_dashboard_stats',
        'module_performance',
        'learning_insights'
    ];
    v_view TEXT;
BEGIN
    FOREACH v_view IN ARRAY v_view_list LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_matviews
            WHERE schemaname = 'developer_schema'
              AND matviewname = v_view
        ) THEN
            v_missing_views := array_append(v_missing_views, v_view);
        END IF;
    END LOOP;

    IF array_length(v_missing_views, 1) > 0 THEN
        RAISE EXCEPTION 'Missing views: %', array_to_string(v_missing_views, ', ');
    END IF;

    RAISE NOTICE 'All % materialized views verified successfully', array_length(v_view_list, 1);
END;
$$;

-- ============================================================================
-- INITIAL REFRESH
-- ============================================================================

\echo '>>> Performing initial refresh of all views...'

SELECT * FROM developer_schema.refresh_all_materialized_views();

-- Commit transaction
COMMIT;

\echo ''
\echo '============================================================================'
\echo 'SYNAPSE Materialized Views Deployment Complete!'
\echo ''
\echo 'Deployed views:'
\echo '  - user_dashboard_stats (with CONCURRENTLY support)'
\echo '  - module_performance'
\echo '  - learning_insights'
\echo ''
\echo 'Utility functions:'
\echo '  - refresh_all_materialized_views()'
\echo '  - refresh_user_dashboard_stats()'
\echo '  - refresh_module_performance()'
\echo '  - refresh_learning_insights()'
\echo ''
\echo 'Recommended refresh schedule (add to cron or pg_cron):'
\echo '  Every hour: SELECT developer_schema.refresh_all_materialized_views();'
\echo ''
\echo 'Query examples:'
\echo '  SELECT * FROM developer_schema.user_dashboard_stats WHERE user_id = 1;'
\echo '  SELECT * FROM developer_schema.module_performance WHERE user_id = 1;'
\echo '  SELECT * FROM developer_schema.learning_insights WHERE user_id = 1;'
\echo '============================================================================'
