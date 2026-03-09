-- ============================================================================
-- SYNAPSE: Review Forecast
-- File: app/sql/functions/analytics/get_review_forecast.sql
--
-- Returns JSON with due_today, due_tomorrow, due_this_week, overdue counts.
-- Replaces 4 separate Python db.scalar() calls with 1 SQL query.
-- ============================================================================
CREATE OR REPLACE FUNCTION developer_schema.get_review_forecast(p_user_id INT) RETURNS JSON LANGUAGE sql STABLE AS $$ WITH boundaries AS (
        SELECT date_trunc('day', NOW()) AS today_start,
            date_trunc('day', NOW()) + INTERVAL '1 day' AS tomorrow_start,
            date_trunc('day', NOW()) + INTERVAL '2 days' AS tomorrow_end,
            date_trunc('day', NOW()) + INTERVAL '7 days' AS week_end
    ),
    user_cards AS (
        SELECT f.id,
            f.next_review
        FROM developer_schema.flashcards f
            JOIN developer_schema.decks d ON f.deck_id = d.id
        WHERE d.user_id = p_user_id
            AND f.deleted_at IS NULL
            AND d.deleted_at IS NULL
    )
SELECT json_build_object(
        'overdue',
        COUNT(*) FILTER (
            WHERE next_review < b.today_start
                AND next_review IS NOT NULL
        ),
        'due_today',
        COUNT(*) FILTER (
            WHERE next_review IS NULL
                OR (
                    next_review >= b.today_start
                    AND next_review < b.tomorrow_start
                )
        ),
        'due_tomorrow',
        COUNT(*) FILTER (
            WHERE next_review >= b.tomorrow_start
                AND next_review < b.tomorrow_end
        ),
        'due_this_week',
        COUNT(*) FILTER (
            WHERE next_review IS NULL
                OR (
                    next_review >= b.today_start
                    AND next_review < b.week_end
                )
        )
    )
FROM user_cards,
    boundaries b;
$$;
GRANT EXECUTE ON FUNCTION developer_schema.get_review_forecast(INT) TO synapse_user;