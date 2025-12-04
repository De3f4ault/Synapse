-- ============================================================================
-- SYNAPSE: Deploy All SQL Functions
-- File: app/sql/migrations/create_functions.sql
--
-- Master deployment script for all PostgreSQL functions.
-- Run this script to deploy or update all SYNAPSE SQL functions.
--
-- Usage:
--   psql -U synapse_user -d synapse -f app/sql/migrations/create_functions.sql
-- ============================================================================

-- Set schema search path
SET search_path TO developer_schema, public;

-- Start transaction for atomic deployment
BEGIN;

-- ============================================================================
-- FLASHCARD FUNCTIONS
-- ============================================================================

\echo '>>> Deploying flashcard functions...'

-- SM-2 Algorithm
\echo '    - calculate_sm2'
\ir ../functions/flashcards/calculate_sm2.sql

-- Record Review (atomic)
\echo '    - record_review'
\ir ../functions/flashcards/record_review.sql

-- Get Due Cards
\echo '    - get_due_cards'
\ir ../functions/flashcards/get_due_cards.sql

\echo '>>> Flashcard functions deployed successfully'

-- ============================================================================
-- CONTEXT FUNCTIONS
-- ============================================================================

\echo '>>> Deploying context functions...'

-- Build User Context (CRITICAL for AI)
\echo '    - build_user_context'
\ir ../functions/context/build_user_context.sql

-- Detect Weak Areas
\echo '    - detect_weak_areas'
\ir ../functions/context/detect_weak_areas.sql

-- Calculate Mastery
\echo '    - calculate_mastery'
\ir ../functions/context/calculate_mastery.sql

\echo '>>> Context functions deployed successfully'

-- ============================================================================
-- ANALYTICS FUNCTIONS
-- ============================================================================

\echo '>>> Deploying analytics functions...'

-- User Performance Metrics
\echo '    - user_performance'
\ir ../functions/analytics/user_performance.sql

-- Learning Velocity (Window Functions)
\echo '    - learning_velocity'
\ir ../functions/analytics/learning_velocity.sql

-- Retention Analysis
\echo '    - retention_analysis'
\ir ../functions/analytics/retention_analysis.sql

\echo '>>> Analytics functions deployed successfully'

-- ============================================================================
-- NOTES FUNCTIONS
-- ============================================================================

\echo '>>> Deploying notes functions...'

-- Note Hierarchy (Recursive CTE)
\echo '    - get_note_hierarchy'
\ir ../functions/notes/get_note_hierarchy.sql

-- Full-Text Search
\echo '    - search_notes_fts'
\ir ../functions/notes/search_notes_fts.sql

\echo '>>> Notes functions deployed successfully'

-- ============================================================================
-- VERIFICATION
-- ============================================================================

\echo '>>> Verifying function deployment...'

-- Verify all functions exist
DO $$
DECLARE
    v_missing_functions TEXT[];
    v_function_list TEXT[] := ARRAY[
        'calculate_sm2',
        'record_review',
        'get_due_cards',
        'build_user_context',
        'detect_weak_areas',
        'calculate_mastery',
        'user_performance',
        'learning_velocity',
        'retention_analysis',
        'get_note_hierarchy',
        'search_notes_fts',
        'search_notes_prefix'
    ];
    v_func TEXT;
BEGIN
    FOREACH v_func IN ARRAY v_function_list LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'developer_schema'
              AND p.proname = v_func
        ) THEN
            v_missing_functions := array_append(v_missing_functions, v_func);
        END IF;
    END LOOP;

    IF array_length(v_missing_functions, 1) > 0 THEN
        RAISE EXCEPTION 'Missing functions: %', array_to_string(v_missing_functions, ', ');
    END IF;

    RAISE NOTICE 'All % functions verified successfully', array_length(v_function_list, 1);
END;
$$;

-- Commit transaction
COMMIT;

\echo ''
\echo '============================================================================'
\echo 'SYNAPSE SQL Functions Deployment Complete!'
\echo ''
\echo 'Deployed functions:'
\echo '  Flashcards: calculate_sm2, record_review, get_due_cards'
\echo '  Context:    build_user_context, detect_weak_areas, calculate_mastery'
\echo '  Analytics:  user_performance, learning_velocity, retention_analysis'
\echo '  Notes:      get_note_hierarchy, search_notes_fts, search_notes_prefix'
\echo ''
\echo 'Next steps:'
\echo '  1. Run create_views.sql to deploy materialized views'
\echo '  2. Seed test data if needed'
\echo '  3. Test functions with sample queries'
\echo '============================================================================'
