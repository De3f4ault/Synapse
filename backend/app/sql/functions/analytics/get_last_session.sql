-- ============================================================================
-- SYNAPSE: Last Study Session Stats
-- File: app/sql/functions/analytics/get_last_session.sql
--
-- Session boundary: all learning events within 45 min of most recent event.
-- Returns JSON with cards_reviewed, duration, accuracy, quality_label.
-- ============================================================================
CREATE OR REPLACE FUNCTION developer_schema.get_last_session(
        p_user_id INT,
        p_window_minutes INT DEFAULT 45
    ) RETURNS JSON LANGUAGE plpgsql STABLE AS $$
DECLARE v_last_event_time TIMESTAMPTZ;
result JSON;
BEGIN -- Find most recent learning event
SELECT created_at INTO v_last_event_time
FROM developer_schema.activity_logs
WHERE user_id = p_user_id
    AND is_learning_event = TRUE
ORDER BY created_at DESC
LIMIT 1;
IF v_last_event_time IS NULL THEN RETURN json_build_object(
    'cards_reviewed',
    0,
    'duration_minutes',
    0,
    'accuracy_percent',
    0.0,
    'quality_label',
    'No sessions yet',
    'ended_at',
    NULL,
    'has_session',
    FALSE
);
END IF;
-- Aggregate events within session window
SELECT json_build_object(
        'cards_reviewed',
        COUNT(*),
        'duration_minutes',
        COALESCE(SUM(duration_seconds), 0) / 60,
        'accuracy_percent',
        ROUND(COALESCE(AVG(accuracy), 0)::NUMERIC * 100, 1),
        'quality_label',
        CASE
            WHEN COALESCE(AVG(accuracy), 0) * 100 >= 90 THEN 'Strong recall'
            WHEN COALESCE(AVG(accuracy), 0) * 100 >= 70 THEN 'Good practice'
            WHEN COUNT(*) > 0 THEN 'Needs review'
            ELSE 'No sessions yet'
        END,
        'ended_at',
        v_last_event_time::TEXT,
        'has_session',
        COUNT(*) > 0
    ) INTO result
FROM developer_schema.activity_logs
WHERE user_id = p_user_id
    AND is_learning_event = TRUE
    AND created_at >= v_last_event_time - (p_window_minutes || ' minutes')::INTERVAL
    AND created_at <= v_last_event_time;
RETURN result;
END;
$$;
GRANT EXECUTE ON FUNCTION developer_schema.get_last_session(INT, INT) TO synapse_user;