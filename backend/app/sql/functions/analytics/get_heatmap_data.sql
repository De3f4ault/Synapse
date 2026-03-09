-- ============================================================================
-- SYNAPSE: Activity Heatmap
-- File: app/sql/functions/analytics/get_heatmap_data.sql
--
-- Returns JSON array of {date, activity_count} for activity heatmap.
-- ============================================================================
CREATE OR REPLACE FUNCTION developer_schema.get_heatmap_data(p_user_id INT, p_days INT DEFAULT 365) RETURNS JSON LANGUAGE sql STABLE AS $$
SELECT COALESCE(
        json_agg(
            json_build_object(
                'date',
                review_date::TEXT,
                'activity_count',
                activity_count
            )
            ORDER BY review_date
        ),
        '[]'::JSON
    )
FROM (
        SELECT DATE(reviewed_at) AS review_date,
            COUNT(*) AS activity_count
        FROM developer_schema.reviews
        WHERE user_id = p_user_id
            AND reviewed_at >= NOW() - (p_days || ' days')::INTERVAL
        GROUP BY DATE(reviewed_at)
    ) sub;
$$;
GRANT EXECUTE ON FUNCTION developer_schema.get_heatmap_data(INT, INT) TO synapse_user;