-- ============================================================================
-- SYNAPSE: Learning Velocity (Window Functions for Trends)
-- File: app/sql/functions/analytics/learning_velocity.sql
--
-- Calculates learning velocity using window functions to analyze trends
-- in performance over time. Provides moving averages and rate of improvement.
-- ============================================================================

-- Drop existing function if exists
DROP FUNCTION IF EXISTS developer_schema.learning_velocity(INT, INT);

-- Create the learning velocity function
CREATE OR REPLACE FUNCTION developer_schema.learning_velocity(
    p_user_id INT,                   -- ID of the user
    p_window_days INT DEFAULT 7      -- Window size for moving average
)
RETURNS TABLE (
    period_date DATE,
    reviews_count INT,
    accuracy_pct DECIMAL(5,2),
    avg_quality DECIMAL(3,2),
    moving_avg_accuracy DECIMAL(5,2),
    moving_avg_quality DECIMAL(3,2),
    velocity DECIMAL(6,3),
    trend VARCHAR(20),
    cumulative_reviews INT,
    cumulative_accuracy DECIMAL(5,2)
)
LANGUAGE plpgsql
STABLE
PARALLEL SAFE
AS $$
BEGIN
    RETURN QUERY
    WITH
    -- Daily aggregates
    daily_stats AS (
        SELECT
            DATE(r.reviewed_at) AS period_date,
            COUNT(*) AS reviews_count,
            ROUND(
                AVG(CASE WHEN r.quality >= 3 THEN 1.0 ELSE 0.0 END) * 100,
                2
            ) AS accuracy_pct,
            ROUND(AVG(r.quality), 2) AS avg_quality
        FROM developer_schema.reviews r
        WHERE r.user_id = p_user_id
          AND r.reviewed_at >= NOW() - INTERVAL '90 days'
        GROUP BY DATE(r.reviewed_at)
    ),

    -- Apply window functions for moving averages and velocity
    windowed_stats AS (
        SELECT
            ds.period_date,
            ds.reviews_count,
            ds.accuracy_pct,
            ds.avg_quality,

            -- Moving average accuracy (over window)
            ROUND(
                AVG(ds.accuracy_pct) OVER (
                    ORDER BY ds.period_date
                    ROWS BETWEEN (p_window_days - 1) PRECEDING AND CURRENT ROW
                ),
                2
            ) AS moving_avg_accuracy,

            -- Moving average quality (over window)
            ROUND(
                AVG(ds.avg_quality) OVER (
                    ORDER BY ds.period_date
                    ROWS BETWEEN (p_window_days - 1) PRECEDING AND CURRENT ROW
                ),
                2
            ) AS moving_avg_quality,

            -- Velocity: rate of change in accuracy
            -- (current moving avg - previous window moving avg) / window size
            ROUND(
                (
                    AVG(ds.accuracy_pct) OVER (
                        ORDER BY ds.period_date
                        ROWS BETWEEN (p_window_days - 1) PRECEDING AND CURRENT ROW
                    )
                    - COALESCE(
                        AVG(ds.accuracy_pct) OVER (
                            ORDER BY ds.period_date
                            ROWS BETWEEN (2 * p_window_days - 1) PRECEDING AND p_window_days PRECEDING
                        ),
                        AVG(ds.accuracy_pct) OVER (
                            ORDER BY ds.period_date
                            ROWS BETWEEN (p_window_days - 1) PRECEDING AND CURRENT ROW
                        )
                    )
                ) / p_window_days,
                3
            ) AS velocity,

            -- Cumulative reviews
            SUM(ds.reviews_count) OVER (
                ORDER BY ds.period_date
                ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
            )::INT AS cumulative_reviews,

            -- Cumulative accuracy (weighted by review count)
            ROUND(
                SUM(ds.accuracy_pct * ds.reviews_count) OVER (
                    ORDER BY ds.period_date
                    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
                ) / NULLIF(
                    SUM(ds.reviews_count) OVER (
                        ORDER BY ds.period_date
                        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
                    ),
                    0
                ),
                2
            ) AS cumulative_accuracy,

            -- Previous moving average for trend calculation
            LAG(
                AVG(ds.accuracy_pct) OVER (
                    ORDER BY ds.period_date
                    ROWS BETWEEN (p_window_days - 1) PRECEDING AND CURRENT ROW
                ),
                1
            ) OVER (ORDER BY ds.period_date) AS prev_moving_avg

        FROM daily_stats ds
    )

    SELECT
        ws.period_date,
        ws.reviews_count::INT,
        ws.accuracy_pct,
        ws.avg_quality,
        ws.moving_avg_accuracy,
        ws.moving_avg_quality,
        ws.velocity,
        -- Trend based on velocity
        CASE
            WHEN ws.velocity > 0.5 THEN 'accelerating'
            WHEN ws.velocity > 0.1 THEN 'improving'
            WHEN ws.velocity > -0.1 THEN 'stable'
            WHEN ws.velocity > -0.5 THEN 'declining'
            ELSE 'struggling'
        END::VARCHAR(20) AS trend,
        ws.cumulative_reviews,
        ws.cumulative_accuracy
    FROM windowed_stats ws
    ORDER BY ws.period_date DESC;
END;
$$;

-- Add function comment
COMMENT ON FUNCTION developer_schema.learning_velocity(INT, INT) IS
'Calculates learning velocity using window functions.

Uses window functions to compute:
- Moving average accuracy and quality
- Velocity: rate of change in accuracy
- Cumulative metrics

Velocity Interpretation:
  > 0.5: accelerating (rapid improvement)
  > 0.1: improving (steady progress)
  > -0.1: stable (maintaining performance)
  > -0.5: declining (losing ground)
  <= -0.5: struggling (significant regression)

Parameters:
  - p_user_id: ID of the user
  - p_window_days: Moving average window size (default 7)

Returns time series with:
  - Daily metrics: reviews, accuracy, quality
  - Moving averages over window
  - Velocity (rate of change)
  - Trend classification
  - Cumulative totals

Example:
  -- Last 90 days with 7-day moving average
  SELECT * FROM developer_schema.learning_velocity(1, 7);

  -- With 14-day window for smoother trends
  SELECT * FROM developer_schema.learning_velocity(1, 14);
';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION developer_schema.learning_velocity(INT, INT)
    TO synapse_user;
