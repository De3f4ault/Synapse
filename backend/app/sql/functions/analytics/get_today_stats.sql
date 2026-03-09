-- ============================================================================
-- SYNAPSE: Today's Study Stats
-- File: app/sql/functions/analytics/get_today_stats.sql
--
-- Returns JSON with today's study time, event count, and accuracy
-- from the Learning Ledger (activity_logs).
-- ============================================================================
CREATE OR REPLACE FUNCTION developer_schema.get_today_stats(p_user_id INT) RETURNS JSON LANGUAGE sql STABLE AS $$
SELECT json_build_object(
        'study_time_minutes',
        COALESCE(SUM(duration_seconds), 0) / 60,
        'learning_events',
        COUNT(*),
        'reviews_completed',
        COUNT(*),
        'average_accuracy',
        ROUND(COALESCE(AVG(accuracy), 0)::NUMERIC, 3)
    )
FROM developer_schema.activity_logs
WHERE user_id = p_user_id
    AND is_learning_event = TRUE
    AND created_at >= date_trunc('day', NOW());
$$;
GRANT EXECUTE ON FUNCTION developer_schema.get_today_stats(INT) TO synapse_user;