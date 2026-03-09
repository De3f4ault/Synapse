-- ============================================================================
-- SYNAPSE: Dashboard Overview (fallback when materialized view unavailable)
-- File: app/sql/functions/analytics/get_dashboard_overview.sql
--
-- Returns JSON with all dashboard metrics for a user.
-- Prefers the materialized view; falls back to direct aggregation.
-- ============================================================================
CREATE OR REPLACE FUNCTION developer_schema.get_dashboard_overview(p_user_id INT) RETURNS JSON LANGUAGE plpgsql STABLE AS $$
DECLARE result JSON;
BEGIN -- Try materialized view first
BEGIN
SELECT json_build_object(
        'total_cards',
        COALESCE(total_cards, 0),
        'due_cards',
        COALESCE(due_cards, 0),
        'total_decks',
        COALESCE(total_decks, 0),
        'total_notes',
        COALESCE(total_notes, 0),
        'total_documents',
        COALESCE(total_documents, 0),
        'study_streak_days',
        COALESCE(study_days_last_30, 0),
        'overall_accuracy',
        COALESCE(overall_accuracy, 0),
        'total_study_time_minutes',
        COALESCE(estimated_study_seconds / 60, 0),
        'flashcard_accuracy',
        COALESCE(flashcard_accuracy, 0),
        'flashcard_study_time_minutes',
        COALESCE(flashcard_study_seconds / 60, 0),
        'total_flashcard_reviews',
        COALESCE(total_flashcard_reviews, 0),
        'total_quizzes',
        COALESCE(total_quizzes, 0),
        'total_quiz_attempts',
        COALESCE(total_quiz_attempts, 0),
        'quiz_accuracy',
        COALESCE(quiz_accuracy, 0),
        'quiz_study_time_minutes',
        COALESCE(quiz_study_seconds / 60, 0),
        'total_learning_events',
        COALESCE(total_learning_events, 0),
        'cards_reviewed_today',
        (
            SELECT COUNT(*)
            FROM developer_schema.reviews
            WHERE user_id = p_user_id
                AND reviewed_at >= date_trunc('day', NOW())
        ),
        'data_source',
        'materialized_view'
    ) INTO result
FROM developer_schema.user_dashboard_stats
WHERE user_id = p_user_id;
IF result IS NOT NULL THEN RETURN result;
END IF;
EXCEPTION
WHEN undefined_table THEN -- View doesn't exist, fall through to direct queries
NULL;
END;
-- Fallback: direct aggregation (single query)
SELECT json_build_object(
        'total_cards',
        COALESCE(COUNT(DISTINCT f.id), 0),
        'due_cards',
        COALESCE(
            COUNT(DISTINCT f.id) FILTER (
                WHERE f.next_review IS NULL
                    OR f.next_review <= NOW()
            ),
            0
        ),
        'total_decks',
        COALESCE(COUNT(DISTINCT d.id), 0),
        'total_notes',
        (
            SELECT COUNT(*)
            FROM developer_schema.notes
            WHERE user_id = p_user_id
                AND deleted_at IS NULL
        ),
        'total_documents',
        (
            SELECT COUNT(*)
            FROM developer_schema.documents
            WHERE user_id = p_user_id
                AND deleted_at IS NULL
        ),
        'study_streak_days',
        (
            SELECT COALESCE(COUNT(DISTINCT DATE(reviewed_at)), 0)
            FROM developer_schema.reviews
            WHERE user_id = p_user_id
                AND reviewed_at >= NOW() - INTERVAL '30 days'
        ),
        'overall_accuracy',
        ROUND(
            COALESCE(
                (
                    SELECT AVG(
                            CASE
                                WHEN quality >= 3 THEN 1.0
                                ELSE 0.0
                            END
                        )
                    FROM developer_schema.reviews
                    WHERE user_id = p_user_id
                ),
                0
            )::NUMERIC,
            3
        ),
        'total_study_time_minutes',
        COALESCE(
            (
                SELECT SUM(time_spent_seconds) / 60
                FROM developer_schema.study_sessions
                WHERE user_id = p_user_id
            ),
            0
        ),
        'flashcard_accuracy',
        0,
        'flashcard_study_time_minutes',
        0,
        'total_flashcard_reviews',
        COALESCE(SUM(f.times_reviewed), 0),
        'total_quizzes',
        (
            SELECT COUNT(*)
            FROM developer_schema.quizzes
            WHERE user_id = p_user_id
                AND deleted_at IS NULL
        ),
        'total_quiz_attempts',
        0,
        'quiz_accuracy',
        0,
        'quiz_study_time_minutes',
        0,
        'total_learning_events',
        COALESCE(SUM(f.times_reviewed), 0),
        'cards_reviewed_today',
        (
            SELECT COUNT(*)
            FROM developer_schema.reviews
            WHERE user_id = p_user_id
                AND reviewed_at >= date_trunc('day', NOW())
        ),
        'data_source',
        'direct_query_fallback'
    ) INTO result
FROM developer_schema.decks d
    LEFT JOIN developer_schema.flashcards f ON f.deck_id = d.id
    AND f.deleted_at IS NULL
WHERE d.user_id = p_user_id
    AND d.deleted_at IS NULL;
RETURN COALESCE(result, '{}'::JSON);
END;
$$;
GRANT EXECUTE ON FUNCTION developer_schema.get_dashboard_overview(INT) TO synapse_user;