-- ============================================================================
-- SYNAPSE: Retention Analysis
-- File: app/sql/functions/analytics/retention_analysis.sql
--
-- Analyzes user retention patterns: how well knowledge is retained over time,
-- and what factors influence long-term retention.
-- ============================================================================

-- Drop existing function if exists
DROP FUNCTION IF EXISTS developer_schema.retention_analysis(INT, INT);

-- Create the retention analysis function
CREATE OR REPLACE FUNCTION developer_schema.retention_analysis(
    p_user_id INT,                   -- ID of the user
    p_min_reviews INT DEFAULT 3      -- Minimum reviews per card to include
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
PARALLEL SAFE
AS $$
DECLARE
    v_result JSONB;
BEGIN
    WITH
    -- Cards with sufficient review history
    card_history AS (
        SELECT
            f.id AS card_id,
            f.deck_id,
            d.name AS deck_name,
            f.ease_factor,
            f.interval,
            f.learning_state,
            f.times_reviewed,
            f.times_correct,
            -- Calculate retention rate per card
            CASE
                WHEN f.times_reviewed > 0
                THEN ROUND((f.times_correct::DECIMAL / f.times_reviewed) * 100, 2)
                ELSE 0.00
            END AS card_retention_pct,
            f.created_at AS card_created,
            f.last_review
        FROM developer_schema.flashcards f
        INNER JOIN developer_schema.decks d ON f.deck_id = d.id
        WHERE d.user_id = p_user_id
          AND f.deleted_at IS NULL
          AND d.deleted_at IS NULL
          AND f.times_reviewed >= p_min_reviews
    ),

    -- Retention by interval length (how well do cards stick after X days)
    retention_by_interval AS (
        SELECT
            jsonb_agg(
                jsonb_build_object(
                    'interval_bucket', ri.interval_bucket,
                    'card_count', ri.card_count,
                    'avg_retention', ri.avg_retention,
                    'avg_ease_factor', ri.avg_ease_factor
                )
                ORDER BY ri.bucket_order
            ) AS data
        FROM (
            SELECT
                CASE
                    WHEN ch.interval <= 1 THEN '0-1 days'
                    WHEN ch.interval <= 7 THEN '2-7 days'
                    WHEN ch.interval <= 14 THEN '8-14 days'
                    WHEN ch.interval <= 30 THEN '15-30 days'
                    WHEN ch.interval <= 60 THEN '31-60 days'
                    ELSE '60+ days'
                END AS interval_bucket,
                CASE
                    WHEN ch.interval <= 1 THEN 1
                    WHEN ch.interval <= 7 THEN 2
                    WHEN ch.interval <= 14 THEN 3
                    WHEN ch.interval <= 30 THEN 4
                    WHEN ch.interval <= 60 THEN 5
                    ELSE 6
                END AS bucket_order,
                COUNT(*) AS card_count,
                ROUND(AVG(ch.card_retention_pct), 1) AS avg_retention,
                ROUND(AVG(ch.ease_factor), 2) AS avg_ease_factor
            FROM card_history ch
            GROUP BY
                CASE
                    WHEN ch.interval <= 1 THEN '0-1 days'
                    WHEN ch.interval <= 7 THEN '2-7 days'
                    WHEN ch.interval <= 14 THEN '8-14 days'
                    WHEN ch.interval <= 30 THEN '15-30 days'
                    WHEN ch.interval <= 60 THEN '31-60 days'
                    ELSE '60+ days'
                END,
                CASE
                    WHEN ch.interval <= 1 THEN 1
                    WHEN ch.interval <= 7 THEN 2
                    WHEN ch.interval <= 14 THEN 3
                    WHEN ch.interval <= 30 THEN 4
                    WHEN ch.interval <= 60 THEN 5
                    ELSE 6
                END
        ) ri
    ),

    -- Retention by ease factor (correlation between ease and retention)
    retention_by_ease AS (
        SELECT
            jsonb_agg(
                jsonb_build_object(
                    'ease_bucket', re.ease_bucket,
                    'card_count', re.card_count,
                    'avg_retention', re.avg_retention,
                    'avg_interval', re.avg_interval
                )
                ORDER BY re.bucket_order
            ) AS data
        FROM (
            SELECT
                CASE
                    WHEN ch.ease_factor < 1.5 THEN 'Very Hard (<1.5)'
                    WHEN ch.ease_factor < 2.0 THEN 'Hard (1.5-2.0)'
                    WHEN ch.ease_factor < 2.5 THEN 'Normal (2.0-2.5)'
                    WHEN ch.ease_factor < 3.0 THEN 'Easy (2.5-3.0)'
                    ELSE 'Very Easy (3.0+)'
                END AS ease_bucket,
                CASE
                    WHEN ch.ease_factor < 1.5 THEN 1
                    WHEN ch.ease_factor < 2.0 THEN 2
                    WHEN ch.ease_factor < 2.5 THEN 3
                    WHEN ch.ease_factor < 3.0 THEN 4
                    ELSE 5
                END AS bucket_order,
                COUNT(*) AS card_count,
                ROUND(AVG(ch.card_retention_pct), 1) AS avg_retention,
                ROUND(AVG(ch.interval), 0) AS avg_interval
            FROM card_history ch
            GROUP BY
                CASE
                    WHEN ch.ease_factor < 1.5 THEN 'Very Hard (<1.5)'
                    WHEN ch.ease_factor < 2.0 THEN 'Hard (1.5-2.0)'
                    WHEN ch.ease_factor < 2.5 THEN 'Normal (2.0-2.5)'
                    WHEN ch.ease_factor < 3.0 THEN 'Easy (2.5-3.0)'
                    ELSE 'Very Easy (3.0+)'
                END,
                CASE
                    WHEN ch.ease_factor < 1.5 THEN 1
                    WHEN ch.ease_factor < 2.0 THEN 2
                    WHEN ch.ease_factor < 2.5 THEN 3
                    WHEN ch.ease_factor < 3.0 THEN 4
                    ELSE 5
                END
        ) re
    ),

    -- Retention by deck
    retention_by_deck AS (
        SELECT
            jsonb_agg(
                jsonb_build_object(
                    'deck_id', rd.deck_id,
                    'deck_name', rd.deck_name,
                    'card_count', rd.card_count,
                    'avg_retention', rd.avg_retention,
                    'mastered_pct', rd.mastered_pct
                )
                ORDER BY rd.avg_retention DESC
            ) AS data
        FROM (
            SELECT
                ch.deck_id,
                ch.deck_name,
                COUNT(*) AS card_count,
                ROUND(AVG(ch.card_retention_pct), 1) AS avg_retention,
                ROUND(
                    COUNT(*) FILTER (WHERE ch.learning_state = 'mastered')::DECIMAL
                    / NULLIF(COUNT(*), 0) * 100,
                    1
                ) AS mastered_pct
            FROM card_history ch
            GROUP BY ch.deck_id, ch.deck_name
            HAVING COUNT(*) >= 5
        ) rd
    ),

    -- Overall retention summary
    overall_summary AS (
        SELECT
            jsonb_build_object(
                'total_cards_analyzed', COUNT(*),
                'total_reviews', SUM(ch.times_reviewed),
                'overall_retention_pct', ROUND(
                    SUM(ch.times_correct)::DECIMAL / NULLIF(SUM(ch.times_reviewed), 0) * 100,
                    1
                ),
                'avg_ease_factor', ROUND(AVG(ch.ease_factor), 2),
                'avg_interval_days', ROUND(AVG(ch.interval), 1),
                'mastered_card_count', COUNT(*) FILTER (WHERE ch.learning_state = 'mastered'),
                'mastered_pct', ROUND(
                    COUNT(*) FILTER (WHERE ch.learning_state = 'mastered')::DECIMAL
                    / NULLIF(COUNT(*), 0) * 100,
                    1
                ),
                'learning_card_count', COUNT(*) FILTER (WHERE ch.learning_state IN ('learning', 'new')),
                'oldest_card_days', EXTRACT(DAY FROM (NOW() - MIN(ch.card_created)))::INT,
                'avg_card_age_days', ROUND(
                    EXTRACT(EPOCH FROM (NOW() - AVG(ch.card_created))) / 86400,
                    0
                )::INT
            ) AS summary
        FROM card_history ch
    ),

    -- Forgetting curve estimation
    forgetting_curve AS (
        SELECT
            jsonb_agg(
                jsonb_build_object(
                    'days_since_review', fc.days_bucket,
                    'avg_recall_rate', fc.avg_recall,
                    'sample_size', fc.sample_size
                )
                ORDER BY fc.days_bucket
            ) AS data
        FROM (
            -- This estimates recall rates at different intervals after last review
            SELECT
                CASE
                    WHEN ch.interval <= 1 THEN 1
                    WHEN ch.interval <= 3 THEN 3
                    WHEN ch.interval <= 7 THEN 7
                    WHEN ch.interval <= 14 THEN 14
                    WHEN ch.interval <= 30 THEN 30
                    ELSE 60
                END AS days_bucket,
                ROUND(AVG(ch.card_retention_pct), 1) AS avg_recall,
                COUNT(*) AS sample_size
            FROM card_history ch
            GROUP BY
                CASE
                    WHEN ch.interval <= 1 THEN 1
                    WHEN ch.interval <= 3 THEN 3
                    WHEN ch.interval <= 7 THEN 7
                    WHEN ch.interval <= 14 THEN 14
                    WHEN ch.interval <= 30 THEN 30
                    ELSE 60
                END
        ) fc
    )

    SELECT jsonb_build_object(
        'summary', (SELECT summary FROM overall_summary),
        'retention_by_interval', COALESCE((SELECT data FROM retention_by_interval), '[]'::JSONB),
        'retention_by_ease', COALESCE((SELECT data FROM retention_by_ease), '[]'::JSONB),
        'retention_by_deck', COALESCE((SELECT data FROM retention_by_deck), '[]'::JSONB),
        'forgetting_curve', COALESCE((SELECT data FROM forgetting_curve), '[]'::JSONB),
        'analysis_params', jsonb_build_object(
            'min_reviews', p_min_reviews,
            'generated_at', NOW()
        ),
        'insights', jsonb_build_object(
            'best_interval_bucket', (
                SELECT ri.interval_bucket
                FROM (
                    SELECT
                        CASE
                            WHEN interval <= 1 THEN '0-1 days'
                            WHEN interval <= 7 THEN '2-7 days'
                            WHEN interval <= 14 THEN '8-14 days'
                            WHEN interval <= 30 THEN '15-30 days'
                            WHEN interval <= 60 THEN '31-60 days'
                            ELSE '60+ days'
                        END AS interval_bucket,
                        AVG(card_retention_pct) AS avg_ret
                    FROM card_history
                    GROUP BY 1
                    HAVING COUNT(*) >= 5
                    ORDER BY avg_ret DESC
                    LIMIT 1
                ) ri
            ),
            'hardest_deck', (
                SELECT deck_name
                FROM card_history
                GROUP BY deck_id, deck_name
                HAVING COUNT(*) >= 5
                ORDER BY AVG(card_retention_pct)
                LIMIT 1
            ),
            'easiest_deck', (
                SELECT deck_name
                FROM card_history
                GROUP BY deck_id, deck_name
                HAVING COUNT(*) >= 5
                ORDER BY AVG(card_retention_pct) DESC
                LIMIT 1
            )
        )
    ) INTO v_result;

    RETURN v_result;
END;
$$;

-- Add function comment
COMMENT ON FUNCTION developer_schema.retention_analysis(INT, INT) IS
'Analyzes retention patterns across cards and decks.

Provides:
- Overall retention summary
- Retention by interval length
- Retention by ease factor
- Retention by deck
- Forgetting curve estimation
- Insights (best/worst performing areas)

Parameters:
  - p_user_id: ID of the user
  - p_min_reviews: Minimum reviews per card to include (default 3)

Returns JSONB with:
{
  "summary": { overall stats },
  "retention_by_interval": [...],
  "retention_by_ease": [...],
  "retention_by_deck": [...],
  "forgetting_curve": [...],
  "insights": { best_interval, hardest_deck, ... }
}

Example:
  SELECT developer_schema.retention_analysis(1, 5);
';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION developer_schema.retention_analysis(INT, INT)
    TO synapse_user;
