-- ============================================================================
-- SYNAPSE: Performance Trends
-- File: app/sql/functions/analytics/get_performance_trends.sql
--
-- Returns JSON array of {date, reviews_count, accuracy, study_time_minutes}
-- for a given time bucket (day/week/month) and lookback window.
-- Replaces 2 separate raw SQL queries in Python.
-- ============================================================================
CREATE OR REPLACE FUNCTION developer_schema.get_performance_trends(
        p_user_id INT,
        p_days INT DEFAULT 30,
        p_bucket TEXT DEFAULT 'day' -- 'day', 'week', 'month'
    ) RETURNS JSON LANGUAGE plpgsql STABLE AS $$
DECLARE result JSON;
v_start_date TIMESTAMPTZ := NOW() - (p_days || ' days')::INTERVAL;
BEGIN
SELECT COALESCE(
        json_agg(
            row_data
            ORDER BY bucket_start
        ),
        '[]'::JSON
    ) INTO result
FROM (
        SELECT r.bucket_start,
            json_build_object(
                'date',
                r.bucket_start::TEXT,
                'reviews_count',
                r.reviews_count,
                'accuracy',
                ROUND(r.accuracy::NUMERIC, 3),
                'study_time_minutes',
                COALESCE(s.total_minutes, 0)
            ) AS row_data
        FROM (
                SELECT date_trunc(p_bucket, reviewed_at) AS bucket_start,
                    COUNT(*) AS reviews_count,
                    AVG(
                        CASE
                            WHEN quality >= 3 THEN 1.0
                            ELSE 0.0
                        END
                    ) AS accuracy
                FROM developer_schema.reviews
                WHERE user_id = p_user_id
                    AND reviewed_at >= v_start_date
                GROUP BY date_trunc(p_bucket, reviewed_at)
            ) r
            LEFT JOIN (
                SELECT date_trunc(p_bucket, started_at) AS bucket_start,
                    SUM(time_spent_seconds) / 60 AS total_minutes
                FROM developer_schema.study_sessions
                WHERE user_id = p_user_id
                    AND started_at >= v_start_date
                GROUP BY date_trunc(p_bucket, started_at)
            ) s ON s.bucket_start = r.bucket_start
    ) sub;
RETURN result;
END;
$$;
GRANT EXECUTE ON FUNCTION developer_schema.get_performance_trends(INT, INT, TEXT) TO synapse_user;