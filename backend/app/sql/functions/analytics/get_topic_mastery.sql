-- ============================================================================
-- SYNAPSE: Topic Mastery
-- File: app/sql/functions/analytics/get_topic_mastery.sql
--
-- Returns JSON array of {topic, mastery_score, card_count, avg_ease_factor}
-- per deck. Mastery = 50% normalized ease + 50% success rate.
-- ============================================================================
CREATE OR REPLACE FUNCTION developer_schema.get_topic_mastery(p_user_id INT) RETURNS JSON LANGUAGE sql STABLE AS $$
SELECT COALESCE(
        json_agg(
            row_data
            ORDER BY mastery_score DESC
        ),
        '[]'::JSON
    )
FROM (
        SELECT json_build_object(
                'topic',
                d.name,
                'mastery_score',
                ROUND(
                    LEAST(
                        1.0,
                        GREATEST(
                            0.0,
                            (
                                (COALESCE(AVG(f.ease_factor), 2.5) - 1.3) / (5.0 - 1.3)
                            ) * 0.5 + COALESCE(
                                AVG(
                                    f.times_correct::DECIMAL / NULLIF(f.times_reviewed, 0)
                                ),
                                0
                            ) * 0.5
                        )
                    )::NUMERIC,
                    3
                ),
                'card_count',
                COUNT(f.id),
                'avg_ease_factor',
                ROUND(COALESCE(AVG(f.ease_factor), 2.5)::NUMERIC, 2)
            ) AS row_data,
            -- For ordering
            LEAST(
                1.0,
                GREATEST(
                    0.0,
                    (
                        (COALESCE(AVG(f.ease_factor), 2.5) - 1.3) / (5.0 - 1.3)
                    ) * 0.5 + COALESCE(
                        AVG(
                            f.times_correct::DECIMAL / NULLIF(f.times_reviewed, 0)
                        ),
                        0
                    ) * 0.5
                )
            ) AS mastery_score
        FROM developer_schema.decks d
            JOIN developer_schema.flashcards f ON f.deck_id = d.id
        WHERE d.user_id = p_user_id
            AND d.deleted_at IS NULL
            AND f.deleted_at IS NULL
            AND f.times_reviewed > 0
        GROUP BY d.id,
            d.name
    ) sub;
$$;
GRANT EXECUTE ON FUNCTION developer_schema.get_topic_mastery(INT) TO synapse_user;