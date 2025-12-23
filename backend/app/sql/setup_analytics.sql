-- ============================================================================
-- SYNAPSE: Complete Analytics Setup Script (Fixed)
-- File: app/sql/setup_analytics.sql
--
-- One-shot script to deploy materialized views, indexes, and optional pg_cron.
-- Run this script as a superuser or user with required privileges.
--
-- Usage:
--   psql -U synapse_user -d synapse -f app/sql/setup_analytics.sql
-- ============================================================================
SET search_path TO developer_schema,
    public;
-- ============================================================================
-- STEP 1: Deploy Materialized Views
-- ============================================================================
-- The individual view files have already been run via create_views.sql
-- This script assumes views exist. If not, run each view file manually:
--   psql -f app/sql/views/user_dashboard_stats.sql
--   psql -f app/sql/views/learning_insights.sql
--   etc.
-- Verify views exist
SELECT 'Materialized Views:' AS step;
SELECT matviewname,
    pg_size_pretty(
        pg_total_relation_size('developer_schema.' || matviewname)
    ) as size
FROM pg_matviews
WHERE schemaname = 'developer_schema'
ORDER BY matviewname;
-- ============================================================================
-- STEP 2: Performance Indexes (run outside transaction)
-- ============================================================================
-- Note: CREATE INDEX CONCURRENTLY cannot run in a transaction
-- Run these manually if needed:
/*
 CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_flashcards_due_partial
 ON developer_schema.flashcards (deck_id, next_review)
 WHERE deleted_at IS NULL AND (next_review IS NULL OR next_review <= NOW());
 
 CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_brin
 ON developer_schema.reviews USING BRIN (reviewed_at)
 WITH (pages_per_range = 32);
 
 CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_covering
 ON developer_schema.reviews (user_id, reviewed_at DESC)
 INCLUDE (quality, card_id);
 
 CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_recent_partial  
 ON developer_schema.reviews (user_id, reviewed_at DESC, quality)
 WHERE reviewed_at >= NOW() - INTERVAL '90 days';
 */
-- Non-concurrent indexes (can run in script)
CREATE INDEX IF NOT EXISTS idx_flashcards_due_basic ON developer_schema.flashcards (deck_id, next_review)
WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_reviews_user_date ON developer_schema.reviews (user_id, reviewed_at DESC);
SELECT 'Performance indexes created' AS step;
-- ============================================================================
-- STEP 3: Refresh All Views
-- ============================================================================
SELECT 'Refreshing all materialized views...' AS step;
SELECT *
FROM developer_schema.refresh_all_materialized_views();
-- ============================================================================
-- STEP 4: pg_cron Setup (Optional - requires system installation)
-- ============================================================================
-- Check if pg_cron is available
DO $$ BEGIN IF EXISTS (
    SELECT 1
    FROM pg_available_extensions
    WHERE name = 'pg_cron'
) THEN CREATE EXTENSION IF NOT EXISTS pg_cron;
-- Schedule refresh every 5 minutes
PERFORM cron.schedule(
    'refresh-analytics-views',
    '*/5 * * * *',
    'SELECT developer_schema.refresh_all_materialized_views()'
);
RAISE NOTICE 'pg_cron scheduled: refresh every 5 minutes';
ELSE RAISE NOTICE 'pg_cron not available - use Celery or manual refresh instead';
RAISE NOTICE 'Manual refresh: SELECT developer_schema.refresh_all_materialized_views();';
END IF;
END;
$$;
-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT 'Verification - Sample Dashboard Stats (user_id=1):' AS step;
SELECT user_id,
    total_cards,
    due_cards,
    total_decks,
    overall_accuracy,
    snapshot_at
FROM developer_schema.user_dashboard_stats
WHERE user_id = 1;
SELECT '============================================' AS info;
SELECT 'SYNAPSE Analytics Setup Complete!' AS info;
SELECT 'Views: user_dashboard_stats, learning_insights, module_performance,' AS info;
SELECT '       chat_session_stats, document_stats' AS info;
SELECT '' AS info;
SELECT 'Refresh command: SELECT developer_schema.refresh_all_materialized_views();' AS info;