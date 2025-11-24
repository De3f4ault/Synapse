-- ============================================================================
-- SYNAPSE: Learning Insights Materialized View
-- File: app/sql/views/learning_insights.sql
--
-- Pre-computed learning insights for AI context and dashboard.
-- Includes weak areas, learning patterns, and recommendations.
-- ============================================================================

-- Drop existing view if exists
DROP MATERIALIZED VIEW IF EXISTS developer_schema.learning_insights CASCADE;

-- Create the materialized view
CREATE MATERIALIZED VIEW developer_schema.learning_insights AS
WITH
-- Weak areas: decks with below-average performance
weak_areas AS (
    SELECT
        d.user_id,
        'weak_areas'::VARCHAR(50) AS insight_type,
        jsonb_agg(
            jsonb_build_object(
                'deck_id', d.id,
                'deck_name', d.name,
                'accuracy', ROUND((wa.accuracy * 100)::NUMERIC, 1),
                'review_count', wa.review_count,
                'weakness_score', wa.weakness_score
            )
            ORDER BY wa.weakness_score DESC
        ) FILTER (WHERE wa.weakness_score IS NOT NULL) AS insight_data,
        COUNT(*) FILTER (WHERE wa.weakness_score IS NOT NULL) AS item_count
    FROM developer_schema.decks d
    LEFT JOIN LATERAL (
        SELECT
            AVG(CASE WHEN r.quality >= 3 THEN 1.0 ELSE 0.0 END)::NUMERIC AS accuracy,
            COUNT(r.id) AS review_count,
            CASE
                WHEN COUNT(r.id) >= 5
                     AND AVG(CASE WHEN r.quality >= 3 THEN 1.0 ELSE 0.0 END) < 0.7
                THEN ROUND(
                    ((1 - AVG(CASE WHEN r.quality >= 3 THEN 1.0 ELSE 0.0 END))
                    * (1 + 0.2 * LN(COUNT(r.id) + 1)))::NUMERIC,
                    3
                )
                ELSE NULL
            END AS weakness_score
        FROM developer_schema.reviews r
        INNER JOIN developer_schema.flashcards f ON r.card_id = f.id
        WHERE f.deck_id = d.id
          AND r.reviewed_at >= NOW() - INTERVAL '30 days'
    ) wa ON TRUE
    WHERE d.deleted_at IS NULL
    GROUP BY d.user_id
),

-- Learning streaks and consistency
study_patterns AS (
    SELECT
        r.user_id,
        'study_patterns'::VARCHAR(50) AS insight_type,
        jsonb_build_object(
            'total_study_days', COUNT(DISTINCT DATE(r.reviewed_at)),
            'avg_reviews_per_day', ROUND((COUNT(*)::NUMERIC / NULLIF(COUNT(DISTINCT DATE(r.reviewed_at)), 0)), 1),
            'most_active_hour', MODE() WITHIN GROUP (ORDER BY EXTRACT(HOUR FROM r.reviewed_at)),
            'most_active_day', MODE() WITHIN GROUP (ORDER BY EXTRACT(DOW FROM r.reviewed_at)),
            'longest_session_reviews', MAX(session_reviews),
            'avg_session_reviews', ROUND(AVG(session_reviews)::NUMERIC, 1)
        ) AS insight_data,
        1 AS item_count
    FROM developer_schema.reviews r
    LEFT JOIN LATERAL (
        -- Calculate session sizes (reviews within 30 min gaps)
        SELECT COUNT(*) AS session_reviews
        FROM developer_schema.reviews r2
        WHERE r2.user_id = r.user_id
          AND r2.reviewed_at BETWEEN r.reviewed_at - INTERVAL '30 minutes'
                                  AND r.reviewed_at + INTERVAL '30 minutes'
    ) sessions ON TRUE
    WHERE r.reviewed_at >= NOW() - INTERVAL '30 days'
    GROUP BY r.user_id
),

-- Mastery progress (improvement over time)
mastery_progress AS (
    SELECT
        d.user_id,
        'mastery_progress'::VARCHAR(50) AS insight_type,
        jsonb_build_object(
            'decks_improving', COUNT(*) FILTER (WHERE mp.trend = 'improving'),
            'decks_stable', COUNT(*) FILTER (WHERE mp.trend = 'stable'),
            'decks_declining', COUNT(*) FILTER (WHERE mp.trend = 'declining'),
            'overall_trend', CASE
                WHEN COUNT(*) FILTER (WHERE mp.trend = 'improving') >
                     COUNT(*) FILTER (WHERE mp.trend = 'declining')
                THEN 'improving'
                WHEN COUNT(*) FILTER (WHERE mp.trend = 'declining') >
                     COUNT(*) FILTER (WHERE mp.trend = 'improving')
                THEN 'declining'
                ELSE 'stable'
            END,
            'top_improving', (
                SELECT jsonb_agg(deck_info ORDER BY change_pct DESC)
                FROM (
                    SELECT jsonb_build_object(
                        'deck_name', d2.name,
                        'change_pct', ROUND(((recent_acc - older_acc) * 100)::NUMERIC, 1)
                    ) AS deck_info,
                    (recent_acc - older_acc) AS change_pct
                    FROM developer_schema.decks d2
                    INNER JOIN LATERAL (
                        SELECT
                            AVG(CASE WHEN r.quality >= 3 THEN 1.0 ELSE 0.0 END) FILTER (
                                WHERE r.reviewed_at >= NOW() - INTERVAL '7 days'
                            ) AS recent_acc,
                            AVG(CASE WHEN r.quality >= 3 THEN 1.0 ELSE 0.0 END) FILTER (
                                WHERE r.reviewed_at < NOW() - INTERVAL '7 days'
                                  AND r.reviewed_at >= NOW() - INTERVAL '14 days'
                            ) AS older_acc
                        FROM developer_schema.reviews r
                        INNER JOIN developer_schema.flashcards f ON r.card_id = f.id
                        WHERE f.deck_id = d2.id
                    ) trend ON TRUE
                    WHERE d2.user_id = d.user_id
                      AND d2.deleted_at IS NULL
                      AND recent_acc > older_acc
                    ORDER BY change_pct DESC
                    LIMIT 3
                ) top
            )
        ) AS insight_data,
        1 AS item_count
    FROM developer_schema.decks d
    LEFT JOIN LATERAL (
        SELECT
            CASE
                WHEN AVG(CASE WHEN r.quality >= 3 THEN 1.0 ELSE 0.0 END) FILTER (
                    WHERE r.reviewed_at >= NOW() - INTERVAL '7 days'
                ) > AVG(CASE WHEN r.quality >= 3 THEN 1.0 ELSE 0.0 END) FILTER (
                    WHERE r.reviewed_at < NOW() - INTERVAL '7 days'
                ) + 0.05 THEN 'improving'
                WHEN AVG(CASE WHEN r.quality >= 3 THEN 1.0 ELSE 0.0 END) FILTER (
                    WHERE r.reviewed_at >= NOW() - INTERVAL '7 days'
                ) < AVG(CASE WHEN r.quality >= 3 THEN 1.0 ELSE 0.0 END) FILTER (
                    WHERE r.reviewed_at < NOW() - INTERVAL '7 days'
                ) - 0.05 THEN 'declining'
                ELSE 'stable'
            END AS trend
        FROM developer_schema.reviews r
        INNER JOIN developer_schema.flashcards f ON r.card_id = f.id
        WHERE f.deck_id = d.id
          AND r.reviewed_at >= NOW() - INTERVAL '14 days'
        HAVING COUNT(r.id) >= 10
    ) mp ON TRUE
    WHERE d.deleted_at IS NULL
    GROUP BY d.user_id
),

-- AI-ready recommendations
recommendations AS (
    SELECT
        u.id AS user_id,
        'recommendations'::VARCHAR(50) AS insight_type,
        jsonb_build_object(
            'priority_actions', jsonb_build_array(
                -- Check for overdue cards
                CASE WHEN (
                    SELECT COUNT(*)
                    FROM developer_schema.flashcards f
                    INNER JOIN developer_schema.decks d ON f.deck_id = d.id
                    WHERE d.user_id = u.id
                      AND f.next_review < NOW() - INTERVAL '3 days'
                      AND f.deleted_at IS NULL
                ) > 10 THEN jsonb_build_object(
                    'action', 'review_overdue',
                    'message', 'You have overdue cards that need attention',
                    'priority', 'high'
                ) ELSE NULL END,
                -- Check for weak areas
                CASE WHEN EXISTS (
                    SELECT 1 FROM weak_areas wa
                    WHERE wa.user_id = u.id AND wa.item_count > 0
                ) THEN jsonb_build_object(
                    'action', 'focus_weak_areas',
                    'message', 'Some topics need extra practice',
                    'priority', 'medium'
                ) ELSE NULL END,
                -- Check for inactive decks
                CASE WHEN (
                    SELECT COUNT(*)
                    FROM developer_schema.decks d
                    LEFT JOIN developer_schema.flashcards f ON f.deck_id = d.id
                    WHERE d.user_id = u.id
                      AND d.deleted_at IS NULL
                      AND (f.last_review IS NULL OR f.last_review < NOW() - INTERVAL '14 days')
                ) > 0 THEN jsonb_build_object(
                    'action', 'review_inactive',
                    'message', 'Some decks haven''t been reviewed recently',
                    'priority', 'low'
                ) ELSE NULL END
            ),
            'suggested_focus', (
                SELECT d.name
                FROM developer_schema.decks d
                INNER JOIN developer_schema.flashcards f ON f.deck_id = d.id
                WHERE d.user_id = u.id
                  AND d.deleted_at IS NULL
                  AND (f.next_review IS NULL OR f.next_review <= NOW())
                GROUP BY d.id, d.name
                ORDER BY COUNT(*) DESC
                LIMIT 1
            ),
            'daily_goal_suggestion', CASE
                WHEN (SELECT COUNT(*) FROM developer_schema.flashcards f
                      INNER JOIN developer_schema.decks d ON f.deck_id = d.id
                      WHERE d.user_id = u.id AND f.deleted_at IS NULL) < 50
                THEN 10
                WHEN (SELECT COUNT(*) FROM developer_schema.flashcards f
                      INNER JOIN developer_schema.decks d ON f.deck_id = d.id
                      WHERE d.user_id = u.id AND f.deleted_at IS NULL) < 200
                THEN 20
                ELSE 30
            END
        ) AS insight_data,
        1 AS item_count
    FROM developer_schema.users u
)

-- Combine all insights
SELECT user_id, insight_type, insight_data, item_count, NOW() AS snapshot_at
FROM weak_areas
UNION ALL
SELECT user_id, insight_type, insight_data, item_count, NOW()
FROM study_patterns
UNION ALL
SELECT user_id, insight_type, insight_data, item_count, NOW()
FROM mastery_progress
UNION ALL
SELECT user_id, insight_type, insight_data, item_count, NOW()
FROM recommendations;

-- Create indexes
CREATE INDEX idx_learning_insights_user
    ON developer_schema.learning_insights (user_id);

CREATE INDEX idx_learning_insights_type
    ON developer_schema.learning_insights (insight_type);

CREATE INDEX idx_learning_insights_user_type
    ON developer_schema.learning_insights (user_id, insight_type);

-- Add view comment
COMMENT ON MATERIALIZED VIEW developer_schema.learning_insights IS
'Pre-computed learning insights for AI context and dashboard.

Insight Types:
- weak_areas: Decks with below 70% accuracy
- study_patterns: Study habits analysis
- mastery_progress: Improvement trends
- recommendations: AI-ready action items

Columns:
- user_id: User identifier
- insight_type: Type of insight
- insight_data: JSONB with insight details
- item_count: Number of items in insight
- snapshot_at: When this data was generated

Refresh command:
  REFRESH MATERIALIZED VIEW developer_schema.learning_insights;

Recommended refresh interval: Every hour
';

-- Grant permissions
GRANT SELECT ON developer_schema.learning_insights TO synapse_user;

-- Function to refresh this view
CREATE OR REPLACE FUNCTION developer_schema.refresh_learning_insights()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW developer_schema.learning_insights;
END;
$$;

GRANT EXECUTE ON FUNCTION developer_schema.refresh_learning_insights() TO synapse_user;
