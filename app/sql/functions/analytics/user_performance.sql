-- ============================================================================
-- SYNAPSE: User Performance Metrics
-- File: app/sql/functions/analytics/user_performance.sql
--
-- Calculates comprehensive user performance metrics for analytics
-- and dashboard display. Includes daily, weekly, and monthly breakdowns.
-- ============================================================================

-- Drop existing function if exists
DROP FUNCTION IF EXISTS developer_schema.user_performance(INT, VARCHAR);

-- Create the user performance function
CREATE OR REPLACE FUNCTION developer_schema.user_performance(
    p_user_id INT,                   -- ID of the user
    p_period VARCHAR(20) DEFAULT 'month' -- 'day', 'week', 'month', 'year', 'all'
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
PARALLEL SAFE
AS $$
DECLARE
    v_start_date TIMESTAMP;
    v_result JSONB;
BEGIN
    -- Determine start date based on period
    v_start_date := CASE p_period
        WHEN 'day' THEN NOW() - INTERVAL '1 day'
        WHEN 'week' THEN NOW() - INTERVAL '7 days'
        WHEN 'month' THEN NOW() - INTERVAL '30 days'
        WHEN 'year' THEN NOW() - INTERVAL '365 days'
        ELSE '1970-01-01'::TIMESTAMP  -- 'all'
    END;

    WITH
    -- Review statistics for the period
    review_stats AS (
        SELECT
            COUNT(*) AS total_reviews,
            COUNT(*) FILTER (WHERE r.quality >= 3) AS correct_reviews,
            COUNT(*) FILTER (WHERE r.quality < 3) AS incorrect_reviews,
            COUNT(DISTINCT r.card_id) AS unique_cards_reviewed,
            COUNT(DISTINCT DATE(r.reviewed_at)) AS study_days,
            ROUND(AVG(r.quality), 2) AS avg_quality,
            ROUND(
                AVG(CASE WHEN r.quality >= 3 THEN 1.0 ELSE 0.0 END) * 100,
                1
            ) AS accuracy_pct,
            MIN(r.reviewed_at) AS first_review,
            MAX(r.reviewed_at) AS last_review,
            -- Quality distribution
            COUNT(*) FILTER (WHERE r.quality = 0) AS quality_0,
            COUNT(*) FILTER (WHERE r.quality = 1) AS quality_1,
            COUNT(*) FILTER (WHERE r.quality = 2) AS quality_2,
            COUNT(*) FILTER (WHERE r.quality = 3) AS quality_3,
            COUNT(*) FILTER (WHERE r.quality = 4) AS quality_4,
            COUNT(*) FILTER (WHERE r.quality = 5) AS quality_5
        FROM developer_schema.reviews r
        WHERE r.user_id = p_user_id
          AND r.reviewed_at >= v_start_date
    ),

    -- Daily breakdown for the period (last 30 data points max)
    daily_breakdown AS (
        SELECT
            jsonb_agg(
                jsonb_build_object(
                    'date', day_data.review_date,
                    'reviews', day_data.review_count,
                    'accuracy', day_data.accuracy,
                    'avg_quality', day_data.avg_quality
                )
                ORDER BY day_data.review_date
            ) AS daily_data
        FROM (
            SELECT
                DATE(r.reviewed_at) AS review_date,
                COUNT(*) AS review_count,
                ROUND(
                    AVG(CASE WHEN r.quality >= 3 THEN 1.0 ELSE 0.0 END) * 100,
                    1
                ) AS accuracy,
                ROUND(AVG(r.quality), 2) AS avg_quality
            FROM developer_schema.reviews r
            WHERE r.user_id = p_user_id
              AND r.reviewed_at >= v_start_date
            GROUP BY DATE(r.reviewed_at)
            ORDER BY review_date DESC
            LIMIT 30
        ) day_data
    ),

    -- Streak calculation
    streak_calc AS (
        SELECT
            MAX(streak_length) AS current_streak,
            MAX(streak_length) AS longest_streak
        FROM (
            SELECT
                review_date,
                COUNT(*) OVER (
                    PARTITION BY grp
                    ORDER BY review_date
                    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
                ) AS streak_length
            FROM (
                SELECT
                    review_date,
                    review_date - (ROW_NUMBER() OVER (ORDER BY review_date))::INT AS grp
                FROM (
                    SELECT DISTINCT DATE(r.reviewed_at) AS review_date
                    FROM developer_schema.reviews r
                    WHERE r.user_id = p_user_id
                      AND r.reviewed_at >= NOW() - INTERVAL '365 days'
                ) dates
            ) grouped
        ) streaks
    ),

    -- Deck performance breakdown
    deck_performance AS (
        SELECT
            jsonb_agg(
                jsonb_build_object(
                    'deck_id', perf.deck_id,
                    'deck_name', perf.deck_name,
                    'reviews', perf.review_count,
                    'accuracy', perf.accuracy,
                    'improvement', perf.improvement
                )
                ORDER BY perf.review_count DESC
            ) AS deck_data
        FROM (
            SELECT
                d.id AS deck_id,
                d.name AS deck_name,
                COUNT(r.id) AS review_count,
                ROUND(
                    AVG(CASE WHEN r.quality >= 3 THEN 1.0 ELSE 0.0 END) * 100,
                    1
                ) AS accuracy,
                -- Improvement: recent vs older accuracy
                ROUND(
                    (
                        AVG(CASE WHEN r.quality >= 3 THEN 1.0 ELSE 0.0 END) FILTER (
                            WHERE r.reviewed_at >= NOW() - (EXTRACT(EPOCH FROM (NOW() - v_start_date)) / 2 || ' seconds')::INTERVAL
                        )
                        - COALESCE(
                            AVG(CASE WHEN r.quality >= 3 THEN 1.0 ELSE 0.0 END) FILTER (
                                WHERE r.reviewed_at < NOW() - (EXTRACT(EPOCH FROM (NOW() - v_start_date)) / 2 || ' seconds')::INTERVAL
                            ),
                            0
                        )
                    ) * 100,
                    1
                ) AS improvement
            FROM developer_schema.reviews r
            INNER JOIN developer_schema.flashcards f ON r.card_id = f.id
            INNER JOIN developer_schema.decks d ON f.deck_id = d.id
            WHERE r.user_id = p_user_id
              AND r.reviewed_at >= v_start_date
            GROUP BY d.id, d.name
            HAVING COUNT(r.id) >= 5
            ORDER BY review_count DESC
            LIMIT 10
        ) perf
    ),

    -- Comparison to previous period
    comparison AS (
        SELECT
            jsonb_build_object(
                'reviews_change', ROUND(
                    ((current_reviews - previous_reviews)::DECIMAL / NULLIF(previous_reviews, 0)) * 100,
                    1
                ),
                'accuracy_change', ROUND(current_accuracy - previous_accuracy, 1),
                'previous_reviews', previous_reviews,
                'previous_accuracy', previous_accuracy
            ) AS comparison_data
        FROM (
            SELECT
                COUNT(*) FILTER (WHERE r.reviewed_at >= v_start_date) AS current_reviews,
                COUNT(*) FILTER (
                    WHERE r.reviewed_at < v_start_date
                      AND r.reviewed_at >= v_start_date - (NOW() - v_start_date)
                ) AS previous_reviews,
                ROUND(
                    AVG(CASE WHEN r.quality >= 3 THEN 1.0 ELSE 0.0 END) FILTER (
                        WHERE r.reviewed_at >= v_start_date
                    ) * 100,
                    1
                ) AS current_accuracy,
                ROUND(
                    AVG(CASE WHEN r.quality >= 3 THEN 1.0 ELSE 0.0 END) FILTER (
                        WHERE r.reviewed_at < v_start_date
                          AND r.reviewed_at >= v_start_date - (NOW() - v_start_date)
                    ) * 100,
                    1
                ) AS previous_accuracy
            FROM developer_schema.reviews r
            WHERE r.user_id = p_user_id
        ) periods
    )

    SELECT jsonb_build_object(
        'period', p_period,
        'start_date', v_start_date,
        'end_date', NOW(),
        'summary', jsonb_build_object(
            'total_reviews', COALESCE((SELECT total_reviews FROM review_stats), 0),
            'correct_reviews', COALESCE((SELECT correct_reviews FROM review_stats), 0),
            'incorrect_reviews', COALESCE((SELECT incorrect_reviews FROM review_stats), 0),
            'unique_cards', COALESCE((SELECT unique_cards_reviewed FROM review_stats), 0),
            'study_days', COALESCE((SELECT study_days FROM review_stats), 0),
            'accuracy_pct', COALESCE((SELECT accuracy_pct FROM review_stats), 0),
            'avg_quality', COALESCE((SELECT avg_quality FROM review_stats), 0)
        ),
        'quality_distribution', jsonb_build_object(
            'blackout', COALESCE((SELECT quality_0 FROM review_stats), 0),
            'incorrect_remembered', COALESCE((SELECT quality_1 FROM review_stats), 0),
            'incorrect_easy', COALESCE((SELECT quality_2 FROM review_stats), 0),
            'correct_difficult', COALESCE((SELECT quality_3 FROM review_stats), 0),
            'correct_hesitation', COALESCE((SELECT quality_4 FROM review_stats), 0),
            'perfect', COALESCE((SELECT quality_5 FROM review_stats), 0)
        ),
        'streak', jsonb_build_object(
            'current', COALESCE((SELECT current_streak FROM streak_calc), 0),
            'longest', COALESCE((SELECT longest_streak FROM streak_calc), 0)
        ),
        'daily_breakdown', COALESCE((SELECT daily_data FROM daily_breakdown), '[]'::JSONB),
        'deck_performance', COALESCE((SELECT deck_data FROM deck_performance), '[]'::JSONB),
        'comparison', (SELECT comparison_data FROM comparison),
        'generated_at', NOW()
    ) INTO v_result;

    RETURN v_result;
END;
$$;

-- Add function comment
COMMENT ON FUNCTION developer_schema.user_performance(INT, VARCHAR) IS
'Calculates comprehensive user performance metrics.

Provides:
- Summary stats: reviews, accuracy, study days
- Quality distribution (0-5 breakdown)
- Study streaks (current and longest)
- Daily breakdown with trends
- Per-deck performance comparison
- Period-over-period comparison

Parameters:
  - p_user_id: ID of the user
  - p_period: ''day'', ''week'', ''month'', ''year'', ''all''

Returns JSONB:
{
  "period": "month",
  "summary": { total_reviews, accuracy_pct, ... },
  "quality_distribution": { blackout, perfect, ... },
  "streak": { current, longest },
  "daily_breakdown": [...],
  "deck_performance": [...],
  "comparison": { reviews_change, accuracy_change, ... }
}

Example:
  SELECT developer_schema.user_performance(1, ''week'');
';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION developer_schema.user_performance(INT, VARCHAR)
    TO synapse_user;
