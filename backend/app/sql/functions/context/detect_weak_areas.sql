-- ============================================================================
-- SYNAPSE: Detect Weak Areas
-- File: app/sql/functions/context/detect_weak_areas.sql
--
-- Detects topics/decks where the user is struggling using window functions
-- and trend analysis. Returns prioritized list of weak areas.
--
-- FIXED: All ROUND() calls now cast to NUMERIC
-- ============================================================================

-- Drop existing function if exists
DROP FUNCTION IF EXISTS developer_schema.detect_weak_areas(INT, INT, INT);

-- Create the detect weak areas function
CREATE OR REPLACE FUNCTION developer_schema.detect_weak_areas(
    p_user_id INT,                   -- ID of the user
    p_days INT DEFAULT 30,           -- Look back period in days
    p_limit INT DEFAULT 10           -- Maximum weak areas to return
)
RETURNS TABLE (
    deck_id INT,
    deck_name VARCHAR(255),
    accuracy_pct DECIMAL(5,2),
    review_count INT,
    unique_cards INT,
    avg_quality DECIMAL(3,2),
    trend VARCHAR(20),
    trend_change DECIMAL(5,2),
    weakness_score DECIMAL(6,3),
    evidence JSONB
)
LANGUAGE plpgsql
STABLE
PARALLEL SAFE
AS $$
BEGIN
    RETURN QUERY
    WITH
    -- Calculate performance per deck with window functions for trends
    deck_performance AS (
        SELECT
            d.id AS deck_id,
            d.name AS deck_name,
            -- Overall accuracy for the period
            ROUND(
                (AVG(CASE WHEN r.quality >= 3 THEN 1.0 ELSE 0.0 END) * 100)::NUMERIC,
                2
            ) AS accuracy_pct,
            COUNT(r.id) AS review_count,
            COUNT(DISTINCT r.card_id) AS unique_cards,
            ROUND(AVG(r.quality)::NUMERIC, 2) AS avg_quality,

            -- Calculate recent vs older performance for trend
            AVG(CASE WHEN r.quality >= 3 THEN 1.0 ELSE 0.0 END) FILTER (
                WHERE r.reviewed_at >= NOW() - (p_days / 2 || ' days')::INTERVAL
            ) AS recent_accuracy,
            AVG(CASE WHEN r.quality >= 3 THEN 1.0 ELSE 0.0 END) FILTER (
                WHERE r.reviewed_at < NOW() - (p_days / 2 || ' days')::INTERVAL
            ) AS older_accuracy,

            -- Evidence: worst performing cards
            jsonb_agg(
                DISTINCT jsonb_build_object(
                    'card_id', f.id,
                    'front_preview', LEFT(f.front_text, 50),
                    'card_accuracy', CASE
                        WHEN f.times_reviewed > 0
                        THEN ROUND(((f.times_correct::DECIMAL / f.times_reviewed) * 100)::NUMERIC, 1)
                        ELSE 0
                    END
                )
            ) FILTER (
                WHERE f.times_reviewed > 0
                  AND (f.times_correct::DECIMAL / f.times_reviewed) < 0.6
            ) AS weak_cards_evidence

        FROM developer_schema.reviews r
        INNER JOIN developer_schema.flashcards f ON r.card_id = f.id
        INNER JOIN developer_schema.decks d ON f.deck_id = d.id
        WHERE r.user_id = p_user_id
          AND r.reviewed_at >= NOW() - (p_days || ' days')::INTERVAL
          AND f.deleted_at IS NULL
          AND d.deleted_at IS NULL
        GROUP BY d.id, d.name
        -- Only include decks with enough data to be meaningful
        HAVING COUNT(r.id) >= 5
    ),

    -- Calculate weakness scores and trends
    scored_decks AS (
        SELECT
            dp.*,
            -- Determine trend direction
            CASE
                WHEN dp.recent_accuracy IS NULL OR dp.older_accuracy IS NULL THEN 'insufficient_data'
                WHEN dp.recent_accuracy > dp.older_accuracy + 0.05 THEN 'improving'
                WHEN dp.recent_accuracy < dp.older_accuracy - 0.05 THEN 'declining'
                ELSE 'stable'
            END AS trend,
            -- Calculate trend change percentage
            COALESCE(
                ROUND(((dp.recent_accuracy - dp.older_accuracy) * 100)::NUMERIC, 2),
                0.00
            ) AS trend_change,
            -- Weakness score formula:
            -- Base: (1 - accuracy) gives higher score for lower accuracy
            -- Weight: multiply by log of review count for confidence
            -- Trend boost: declining trends get boosted
            ROUND(
                (
                    (1 - (dp.accuracy_pct / 100.0))
                    * (1 + 0.2 * LN(dp.review_count + 1))
                    * CASE
                        WHEN dp.recent_accuracy < dp.older_accuracy - 0.1 THEN 1.3  -- Declining
                        WHEN dp.recent_accuracy > dp.older_accuracy + 0.1 THEN 0.7  -- Improving
                        ELSE 1.0  -- Stable
                    END
                )::NUMERIC,
                3
            ) AS weakness_score
        FROM deck_performance dp
        -- Filter to weak decks (below 70% accuracy)
        WHERE dp.accuracy_pct < 70.0
    )

    SELECT
        sd.deck_id,
        sd.deck_name,
        sd.accuracy_pct,
        sd.review_count::INT,
        sd.unique_cards::INT,
        sd.avg_quality,
        sd.trend::VARCHAR(20),
        sd.trend_change,
        sd.weakness_score,
        jsonb_build_object(
            'weak_cards', COALESCE(sd.weak_cards_evidence, '[]'::JSONB),
            'period_days', p_days,
            'analysis', CASE
                WHEN sd.trend = 'declining' THEN 'Performance is getting worse - needs immediate attention'
                WHEN sd.trend = 'stable' AND sd.accuracy_pct < 50 THEN 'Consistently struggling - consider reviewing fundamentals'
                WHEN sd.trend = 'improving' THEN 'Showing improvement but still below target'
                ELSE 'Needs more practice to reach mastery'
            END
        ) AS evidence
    FROM scored_decks sd
    ORDER BY sd.weakness_score DESC
    LIMIT p_limit;
END;
$$;

-- Add function comment
COMMENT ON FUNCTION developer_schema.detect_weak_areas(INT, INT, INT) IS
'Detects weak areas using performance analysis and trend detection.

FIXED: All ROUND() calls cast to NUMERIC to prevent double precision errors.

Uses window functions to analyze:
- Overall accuracy per deck
- Trend (improving/declining/stable)
- Weakness score combining accuracy and confidence

Weakness Score Formula:
  (1 - accuracy) * confidence_factor * trend_modifier

Where:
  - confidence_factor = 1 + 0.2 * ln(review_count + 1)
  - trend_modifier = 1.3 (declining), 1.0 (stable), 0.7 (improving)

Parameters:
  - p_user_id: ID of the user
  - p_days: Look back period (default 30)
  - p_limit: Max results (default 10)

Returns:
  - deck_id, deck_name
  - accuracy_pct, review_count, unique_cards, avg_quality
  - trend, trend_change (percentage)
  - weakness_score (higher = more attention needed)
  - evidence (JSONB with weak cards and analysis)

Example:
  SELECT * FROM developer_schema.detect_weak_areas(1, 30, 5);
';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION developer_schema.detect_weak_areas(INT, INT, INT)
    TO synapse_user;
