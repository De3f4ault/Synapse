-- ============================================================================
-- SYNAPSE: User Dashboard Statistics Materialized View
-- File: app/sql/views/user_dashboard_stats.sql
--
-- Pre-computed dashboard statistics for fast loading.
-- Includes both flashcard AND quiz metrics for unified dashboard.
-- Refreshed periodically (recommended: every hour).
-- ============================================================================
-- Drop existing view if exists
DROP MATERIALIZED VIEW IF EXISTS developer_schema.user_dashboard_stats CASCADE;
-- Create the materialized view
CREATE MATERIALIZED VIEW developer_schema.user_dashboard_stats AS
SELECT u.id AS user_id,
    -- ============ FLASHCARD METRICS ============
    COUNT(DISTINCT f.id) AS total_cards,
    COUNT(DISTINCT f.id) FILTER (
        WHERE f.next_review IS NULL
            OR f.next_review <= NOW()
    ) AS due_cards,
    COUNT(DISTINCT f.id) FILTER (
        WHERE f.learning_state = 'new'
    ) AS new_cards,
    COUNT(DISTINCT f.id) FILTER (
        WHERE f.learning_state = 'learning'
    ) AS learning_cards,
    COUNT(DISTINCT f.id) FILTER (
        WHERE f.learning_state = 'review'
    ) AS review_cards,
    COUNT(DISTINCT f.id) FILTER (
        WHERE f.learning_state = 'mastered'
    ) AS mastered_cards,
    COUNT(DISTINCT d.id) AS total_decks,
    ROUND(AVG(f.ease_factor), 2) AS avg_ease_factor,
    -- Flashcard accuracy
    ROUND(
        COALESCE(
            SUM(f.times_correct)::DECIMAL / NULLIF(SUM(f.times_reviewed), 0) * 100,
            0
        ),
        1
    ) AS flashcard_accuracy,
    -- Total flashcard reviews
    COALESCE(SUM(f.times_reviewed), 0) AS total_flashcard_reviews,
    -- Flashcard study time (from ActivityLog learning events)
    COALESCE(
        (
            SELECT SUM(al.duration_seconds)
            FROM developer_schema.activity_logs al
            WHERE al.user_id = u.id
                AND al.activity_type = 'flashcard_review'
                AND al.is_learning_event = TRUE
        ),
        0
    ) AS flashcard_study_seconds,
    -- ============ QUIZ METRICS ============
    COUNT(DISTINCT q.id) AS total_quizzes,
    -- Quiz attempts (completed)
    COALESCE(
        (
            SELECT COUNT(*)
            FROM developer_schema.quiz_attempts qa
            WHERE qa.user_id = u.id
                AND qa.completed_at IS NOT NULL
        ),
        0
    ) AS total_quiz_attempts,
    -- Quiz accuracy (average percentage)
    COALESCE(
        (
            SELECT ROUND(
                    AVG(qa.score::DECIMAL / NULLIF(qa.max_score, 0)) * 100,
                    1
                )
            FROM developer_schema.quiz_attempts qa
            WHERE qa.user_id = u.id
                AND qa.completed_at IS NOT NULL
        ),
        0
    )::DECIMAL AS quiz_accuracy,
    -- Quiz study time
    COALESCE(
        (
            SELECT SUM(qa.time_taken_seconds)
            FROM developer_schema.quiz_attempts qa
            WHERE qa.user_id = u.id
                AND qa.completed_at IS NOT NULL
        ),
        0
    ) AS quiz_study_seconds,
    -- ============ COMBINED METRICS ============
    -- Overall accuracy (simple average of flashcard + quiz accuracy)
    ROUND(
        (
            COALESCE(
                SUM(f.times_correct)::DECIMAL / NULLIF(SUM(f.times_reviewed), 0) * 100,
                0
            ) + COALESCE(
                (
                    SELECT AVG(qa.score::DECIMAL / NULLIF(qa.max_score, 0)) * 100
                    FROM developer_schema.quiz_attempts qa
                    WHERE qa.user_id = u.id
                        AND qa.completed_at IS NOT NULL
                ),
                0
            )
        ) / 2,
        1
    ) AS overall_accuracy,
    -- Total learning events
    COALESCE(SUM(f.times_reviewed), 0) + COALESCE(
        (
            SELECT COUNT(*)
            FROM developer_schema.quiz_attempts qa
            WHERE qa.user_id = u.id
                AND qa.completed_at IS NOT NULL
        ),
        0
    ) AS total_learning_events,
    -- Total study time (from ActivityLog - actual learning events)
    COALESCE(
        (
            SELECT SUM(al.duration_seconds)
            FROM developer_schema.activity_logs al
            WHERE al.user_id = u.id
                AND al.is_learning_event = TRUE
        ),
        0
    ) AS estimated_study_seconds,
    -- ============ OTHER METRICS ============
    COUNT(DISTINCT n.id) AS total_notes,
    COUNT(DISTINCT doc.id) AS total_documents,
    -- Reviews activity
    COALESCE(
        (
            SELECT COUNT(*)
            FROM developer_schema.reviews r
            WHERE r.user_id = u.id
                AND r.reviewed_at >= NOW() - INTERVAL '7 days'
        ),
        0
    ) AS reviews_last_7_days,
    COALESCE(
        (
            SELECT COUNT(*)
            FROM developer_schema.reviews r
            WHERE r.user_id = u.id
                AND r.reviewed_at >= NOW() - INTERVAL '30 days'
        ),
        0
    ) AS reviews_last_30_days,
    COALESCE(
        (
            SELECT COUNT(DISTINCT DATE(r.reviewed_at))
            FROM developer_schema.reviews r
            WHERE r.user_id = u.id
                AND r.reviewed_at >= NOW() - INTERVAL '30 days'
        ),
        0
    ) AS study_days_last_30,
    -- Last study date (most recent flashcard or quiz)
    GREATEST(
        (
            SELECT MAX(r.reviewed_at)
            FROM developer_schema.reviews r
            WHERE r.user_id = u.id
        ),
        (
            SELECT MAX(qa.completed_at)
            FROM developer_schema.quiz_attempts qa
            WHERE qa.user_id = u.id
        )
    ) AS last_study_date,
    u.created_at AS member_since,
    NOW() AS snapshot_at
FROM developer_schema.users u
    LEFT JOIN developer_schema.decks d ON d.user_id = u.id
    AND d.deleted_at IS NULL
    LEFT JOIN developer_schema.flashcards f ON f.deck_id = d.id
    AND f.deleted_at IS NULL
    LEFT JOIN developer_schema.quizzes q ON q.user_id = u.id
    AND q.deleted_at IS NULL
    LEFT JOIN developer_schema.notes n ON n.user_id = u.id
    AND n.deleted_at IS NULL
    LEFT JOIN developer_schema.documents doc ON doc.user_id = u.id
    AND doc.deleted_at IS NULL
GROUP BY u.id,
    u.created_at;
-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX idx_user_dashboard_stats_user_id ON developer_schema.user_dashboard_stats (user_id);
CREATE INDEX idx_user_dashboard_stats_due_cards ON developer_schema.user_dashboard_stats (due_cards DESC);
-- Add view comment
COMMENT ON MATERIALIZED VIEW developer_schema.user_dashboard_stats IS 'Pre-computed dashboard statistics per user with flashcard + quiz metrics.

Columns:
- Flashcard: total_cards, due_cards, flashcard_accuracy, flashcard_study_seconds
- Quiz: total_quizzes, total_quiz_attempts, quiz_accuracy, quiz_study_seconds
- Combined: overall_accuracy, total_learning_events, estimated_study_seconds

Refresh: REFRESH MATERIALIZED VIEW CONCURRENTLY developer_schema.user_dashboard_stats;
';
-- Grant permissions
GRANT SELECT ON developer_schema.user_dashboard_stats TO synapse_user;
-- Function to refresh this view
CREATE OR REPLACE FUNCTION developer_schema.refresh_user_dashboard_stats() RETURNS void LANGUAGE plpgsql AS $$ BEGIN REFRESH MATERIALIZED VIEW CONCURRENTLY developer_schema.user_dashboard_stats;
END;
$$;
GRANT EXECUTE ON FUNCTION developer_schema.refresh_user_dashboard_stats() TO synapse_user;