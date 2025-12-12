-- ============================================================================
-- SYNAPSE: User Dashboard Statistics Materialized View
-- File: app/sql/views/user_dashboard_stats.sql
--
-- Pre-computed dashboard statistics for fast loading.
-- Refreshed periodically (recommended: every hour).
-- ============================================================================

-- Drop existing view if exists
DROP MATERIALIZED VIEW IF EXISTS developer_schema.user_dashboard_stats CASCADE;

-- Create the materialized view
CREATE MATERIALIZED VIEW developer_schema.user_dashboard_stats AS
SELECT
    u.id AS user_id,

    -- Flashcard counts
    COUNT(DISTINCT f.id) AS total_cards,
    COUNT(DISTINCT f.id) FILTER (
        WHERE f.next_review IS NULL OR f.next_review <= NOW()
    ) AS due_cards,
    COUNT(DISTINCT f.id) FILTER (WHERE f.learning_state = 'new') AS new_cards,
    COUNT(DISTINCT f.id) FILTER (WHERE f.learning_state = 'learning') AS learning_cards,
    COUNT(DISTINCT f.id) FILTER (WHERE f.learning_state = 'review') AS review_cards,
    COUNT(DISTINCT f.id) FILTER (WHERE f.learning_state = 'mastered') AS mastered_cards,

    -- Deck counts
    COUNT(DISTINCT d.id) AS total_decks,

    -- Note counts
    COUNT(DISTINCT n.id) AS total_notes,

    -- Document counts
    COUNT(DISTINCT doc.id) AS total_documents,

    -- Average ease factor across all cards
    ROUND(AVG(f.ease_factor), 2) AS avg_ease_factor,

    -- Overall accuracy (correct / total reviews)
    ROUND(
        COALESCE(
            SUM(f.times_correct)::DECIMAL / NULLIF(SUM(f.times_reviewed), 0) * 100,
            0
        ),
        1
    ) AS overall_accuracy,

    -- Total reviews ever
    COALESCE(SUM(f.times_reviewed), 0) AS total_reviews,

    -- Reviews in last 7 days
    COALESCE((
        SELECT COUNT(*)
        FROM developer_schema.reviews r
        WHERE r.user_id = u.id
          AND r.reviewed_at >= NOW() - INTERVAL '7 days'
    ), 0) AS reviews_last_7_days,

    -- Reviews in last 30 days
    COALESCE((
        SELECT COUNT(*)
        FROM developer_schema.reviews r
        WHERE r.user_id = u.id
          AND r.reviewed_at >= NOW() - INTERVAL '30 days'
    ), 0) AS reviews_last_30_days,

    -- Study streak (consecutive days with reviews)
    COALESCE((
        SELECT COUNT(DISTINCT DATE(r.reviewed_at))
        FROM developer_schema.reviews r
        WHERE r.user_id = u.id
          AND r.reviewed_at >= NOW() - INTERVAL '30 days'
    ), 0) AS study_days_last_30,

    -- Last study date
    (
        SELECT MAX(r.reviewed_at)
        FROM developer_schema.reviews r
        WHERE r.user_id = u.id
    ) AS last_study_date,

    -- Total study time (estimated: avg 10 seconds per review)
    COALESCE(SUM(f.times_reviewed) * 10, 0) AS estimated_study_seconds,

    -- Account creation date
    u.created_at AS member_since,

    -- Snapshot timestamp
    NOW() AS snapshot_at

FROM developer_schema.users u
LEFT JOIN developer_schema.decks d ON d.user_id = u.id AND d.deleted_at IS NULL
LEFT JOIN developer_schema.flashcards f ON f.deck_id = d.id AND f.deleted_at IS NULL
LEFT JOIN developer_schema.notes n ON n.user_id = u.id AND n.deleted_at IS NULL
LEFT JOIN developer_schema.documents doc ON doc.user_id = u.id AND doc.deleted_at IS NULL
GROUP BY u.id, u.created_at;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX idx_user_dashboard_stats_user_id
    ON developer_schema.user_dashboard_stats (user_id);

-- Create additional indexes for common queries
CREATE INDEX idx_user_dashboard_stats_due_cards
    ON developer_schema.user_dashboard_stats (due_cards DESC);

-- Add view comment
COMMENT ON MATERIALIZED VIEW developer_schema.user_dashboard_stats IS
'Pre-computed dashboard statistics per user.

Columns:
- user_id: User identifier
- Card counts: total, due, new, learning, review, mastered
- Deck/note/document counts
- Performance: avg_ease_factor, overall_accuracy, total_reviews
- Activity: reviews last 7/30 days, study_days, last_study_date
- Time: estimated_study_seconds, member_since
- snapshot_at: When this data was generated

Refresh command:
  REFRESH MATERIALIZED VIEW CONCURRENTLY developer_schema.user_dashboard_stats;

Recommended refresh interval: Every hour
';

-- Grant permissions
GRANT SELECT ON developer_schema.user_dashboard_stats TO synapse_user;

-- Function to refresh this view
CREATE OR REPLACE FUNCTION developer_schema.refresh_user_dashboard_stats()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY developer_schema.user_dashboard_stats;
END;
$$;

GRANT EXECUTE ON FUNCTION developer_schema.refresh_user_dashboard_stats() TO synapse_user;
