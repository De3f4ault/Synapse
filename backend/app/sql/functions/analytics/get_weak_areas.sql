-- ============================================================================
-- SYNAPSE: Weak Areas
-- File: app/sql/functions/analytics/get_weak_areas.sql
--
-- Identifies decks with accuracy < 70%, ranked by weakest first.
-- Includes severity classification (high/medium/low).
-- ============================================================================
CREATE OR REPLACE FUNCTION developer_schema.get_weak_areas(p_user_id INT, p_limit INT DEFAULT 10) RETURNS JSON LANGUAGE sql STABLE AS $$
SELECT COALESCE(json_agg(row_data), '[]'::JSON)
FROM (
        SELECT json_build_object(
                'topic',
                d.name,
                'accuracy',
                ROUND(
                    AVG(
                        CASE
                            WHEN r.quality >= 3 THEN 1.0
                            ELSE 0.0
                        END
                    )::NUMERIC,
                    3
                ),
                'review_count',
                COUNT(r.id),
                'severity',
                CASE
                    WHEN AVG(
                        CASE
                            WHEN r.quality >= 3 THEN 1.0
                            ELSE 0.0
                        END
                    ) < 0.5 THEN 'high'
                    WHEN AVG(
                        CASE
                            WHEN r.quality >= 3 THEN 1.0
                            ELSE 0.0
                        END
                    ) < 0.6 THEN 'medium'
                    ELSE 'low'
                END
            ) AS row_data
        FROM developer_schema.decks d
            JOIN developer_schema.flashcards f ON f.deck_id = d.id
            JOIN developer_schema.reviews r ON r.card_id = f.id
        WHERE d.user_id = p_user_id
            AND d.deleted_at IS NULL
            AND f.deleted_at IS NULL
        GROUP BY d.id,
            d.name
        HAVING AVG(
                CASE
                    WHEN r.quality >= 3 THEN 1.0
                    ELSE 0.0
                END
            ) < 0.7
        ORDER BY AVG(
                CASE
                    WHEN r.quality >= 3 THEN 1.0
                    ELSE 0.0
                END
            ) ASC
        LIMIT p_limit
    ) sub;
$$;
GRANT EXECUTE ON FUNCTION developer_schema.get_weak_areas(INT, INT) TO synapse_user;