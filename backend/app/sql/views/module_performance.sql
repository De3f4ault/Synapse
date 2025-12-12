-- ============================================================================
-- SYNAPSE: Module Performance Materialized View
-- File: app/sql/views/module_performance.sql
--
-- Pre-computed per-module performance metrics.
-- Tracks flashcards, notes, documents, and quizzes performance.
-- ============================================================================

-- Drop existing view if exists
DROP MATERIALIZED VIEW IF EXISTS developer_schema.module_performance CASCADE;

-- Create the materialized view
CREATE MATERIALIZED VIEW developer_schema.module_performance AS

-- Flashcards module performance
SELECT
    u.id AS user_id,
    'flashcards'::VARCHAR(50) AS module,
    COUNT(DISTINCT f.id) AS item_count,
    COUNT(DISTINCT d.id) AS collection_count,  -- Deck count
    ROUND(
        AVG(
            CASE WHEN f.times_reviewed > 0
            THEN (f.times_correct::DECIMAL / f.times_reviewed)
            ELSE NULL END
        ),
        3
    ) AS avg_mastery,
    COALESCE(SUM(f.times_reviewed), 0) AS total_interactions,
    ROUND(
        AVG(
            CASE WHEN f.times_reviewed > 0
            THEN (f.times_correct::DECIMAL / f.times_reviewed) * 100
            ELSE NULL END
        ),
        1
    ) AS accuracy_pct,
    MAX(f.updated_at) AS last_activity,
    COUNT(DISTINCT f.id) FILTER (
        WHERE f.next_review IS NULL OR f.next_review <= NOW()
    ) AS pending_items,
    NOW() AS snapshot_at
FROM developer_schema.users u
LEFT JOIN developer_schema.decks d ON d.user_id = u.id AND d.deleted_at IS NULL
LEFT JOIN developer_schema.flashcards f ON f.deck_id = d.id AND f.deleted_at IS NULL
GROUP BY u.id

UNION ALL

-- Notes module performance
SELECT
    u.id AS user_id,
    'notes'::VARCHAR(50) AS module,
    COUNT(DISTINCT n.id) AS item_count,
    COUNT(DISTINCT n.id) FILTER (WHERE n.parent_id IS NULL) AS collection_count,  -- Root notes
    NULL::DECIMAL AS avg_mastery,  -- Notes don't have mastery
    0 AS total_interactions,  -- Could track views if implemented
    NULL::DECIMAL AS accuracy_pct,
    MAX(n.updated_at) AS last_activity,
    0 AS pending_items,  -- Notes don't have pending state
    NOW() AS snapshot_at
FROM developer_schema.users u
LEFT JOIN developer_schema.notes n ON n.user_id = u.id AND n.deleted_at IS NULL
GROUP BY u.id

UNION ALL

-- Documents module performance
SELECT
    u.id AS user_id,
    'documents'::VARCHAR(50) AS module,
    COUNT(DISTINCT doc.id) AS item_count,
    0 AS collection_count,  -- Documents don't have collections
    NULL::DECIMAL AS avg_mastery,
    0 AS total_interactions,
    NULL::DECIMAL AS accuracy_pct,
    MAX(doc.updated_at) AS last_activity,
    COUNT(DISTINCT doc.id) FILTER (
        WHERE doc.processing_status = 'pending'
    ) AS pending_items,
    NOW() AS snapshot_at
FROM developer_schema.users u
LEFT JOIN developer_schema.documents doc ON doc.user_id = u.id AND doc.deleted_at IS NULL
GROUP BY u.id

UNION ALL

-- Quizzes module performance
SELECT
    u.id AS user_id,
    'quizzes'::VARCHAR(50) AS module,
    COUNT(DISTINCT q.id) AS item_count,
    0 AS collection_count,
    ROUND(
        AVG(
            CASE WHEN qa.max_score > 0
            THEN (qa.score::DECIMAL / qa.max_score)
            ELSE NULL END
        ),
        3
    ) AS avg_mastery,
    COUNT(qa.id) AS total_interactions,  -- Quiz attempts
    ROUND(
        AVG(
            CASE WHEN qa.max_score > 0
            THEN (qa.score::DECIMAL / qa.max_score) * 100
            ELSE NULL END
        ),
        1
    ) AS accuracy_pct,
    GREATEST(MAX(q.updated_at), MAX(qa.completed_at)) AS last_activity,
    0 AS pending_items,
    NOW() AS snapshot_at
FROM developer_schema.users u
LEFT JOIN developer_schema.quizzes q ON q.user_id = u.id AND q.deleted_at IS NULL
LEFT JOIN developer_schema.quiz_attempts qa ON qa.quiz_id = q.id AND qa.completed_at IS NOT NULL
GROUP BY u.id;

-- Create indexes for efficient querying
CREATE INDEX idx_module_performance_user_module
    ON developer_schema.module_performance (user_id, module);

CREATE INDEX idx_module_performance_module
    ON developer_schema.module_performance (module);

-- Add view comment
COMMENT ON MATERIALIZED VIEW developer_schema.module_performance IS
'Pre-computed performance metrics per module per user.

Modules tracked:
- flashcards: Cards, decks, mastery, accuracy, due cards
- notes: Notes count, root notes
- documents: Documents count, processing status
- quizzes: Quizzes, attempts, accuracy

Columns:
- user_id: User identifier
- module: Module name (flashcards, notes, documents, quizzes)
- item_count: Total items in module
- collection_count: Collections (decks, root notes, etc.)
- avg_mastery: Average mastery score (0-1)
- total_interactions: Reviews, attempts, etc.
- accuracy_pct: Accuracy percentage
- last_activity: Most recent activity timestamp
- pending_items: Items needing attention
- snapshot_at: When this data was generated

Refresh command:
  REFRESH MATERIALIZED VIEW developer_schema.module_performance;

Recommended refresh interval: Every hour
';

-- Grant permissions
GRANT SELECT ON developer_schema.module_performance TO synapse_user;

-- Function to refresh this view
CREATE OR REPLACE FUNCTION developer_schema.refresh_module_performance()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW developer_schema.module_performance;
END;
$$;

GRANT EXECUTE ON FUNCTION developer_schema.refresh_module_performance() TO synapse_user;
