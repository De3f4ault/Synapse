-- ============================================================================
-- SYNAPSE: Build Complete User Context
-- File: app/sql/functions/context/build_user_context.sql
--
-- Builds a complete user learning context in a single database query.
-- Uses CTEs to gather data from multiple tables efficiently.
-- This is the CRITICAL function for AI context injection.
--
-- FIXED: All JSON operations now use JSONB consistently
-- FIXED: Removed u.deleted_at check (users table has no soft delete)
-- FIXED: All ROUND() calls now cast to NUMERIC
-- ============================================================================
-- Drop existing function if exists
DROP FUNCTION IF EXISTS developer_schema.build_user_context(INT, VARCHAR);
-- Create the build user context function
CREATE OR REPLACE FUNCTION developer_schema.build_user_context(
        p_user_id INT,
        -- ID of the user
        p_focus VARCHAR(255) DEFAULT NULL -- Optional: focus topic/module
    ) RETURNS JSONB LANGUAGE plpgsql STABLE -- Function doesn't modify data
    PARALLEL SAFE AS $$
DECLARE v_result JSONB;
BEGIN WITH ------------------------------------------------------------------------
-- User basic information
------------------------------------------------------------------------
user_info AS (
    SELECT u.id,
        u.email,
        u.full_name,
        COALESCE(u.preferences::JSONB, '{}'::JSONB) AS preferences,
        u.timezone,
        u.created_at
    FROM developer_schema.users u
    WHERE u.id = p_user_id -- REMOVED: AND u.deleted_at IS NULL (users table has no soft delete)
),
------------------------------------------------------------------------
-- Flashcard statistics
------------------------------------------------------------------------
flashcard_stats AS (
    SELECT COUNT(DISTINCT f.id) AS total_cards,
        COUNT(DISTINCT f.id) FILTER (
            WHERE f.next_review IS NULL
                OR f.next_review <= NOW()
        ) AS due_cards,
        COUNT(DISTINCT f.id) FILTER (
            WHERE f.learning_state = 'new'
        ) AS new_cards,
        COUNT(DISTINCT f.id) FILTER (
            WHERE f.learning_state = 'learning'
        ) AS learning_cards,
        COUNT(DISTINCT f.id) FILTER (
            WHERE f.learning_state = 'mastered'
        ) AS mastered_cards,
        ROUND(AVG(f.ease_factor)::NUMERIC, 2) AS avg_ease_factor,
        ROUND(
            AVG(
                CASE
                    WHEN COALESCE(f.times_reviewed, 0) > 0 THEN (
                        COALESCE(f.times_correct, 0)::DECIMAL / f.times_reviewed
                    ) * 100
                    ELSE NULL
                END
            )::NUMERIC,
            1
        ) AS avg_accuracy
    FROM developer_schema.flashcards f
        INNER JOIN developer_schema.decks d ON f.deck_id = d.id
    WHERE d.user_id = p_user_id
        AND f.deleted_at IS NULL
        AND d.deleted_at IS NULL
),
------------------------------------------------------------------------
-- Deck overview
------------------------------------------------------------------------
deck_summary AS (
    SELECT COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'id',
                    d.id,
                    'name',
                    d.name,
                    'card_count',
                    COALESCE(card_counts.cnt, 0),
                    'due_count',
                    COALESCE(card_counts.due_cnt, 0),
                    'mastery',
                    COALESCE(card_counts.avg_mastery, 0)
                )
                ORDER BY COALESCE(card_counts.due_cnt, 0) DESC
            ),
            '[]'::JSONB
        ) AS decks
    FROM developer_schema.decks d
        LEFT JOIN LATERAL (
            SELECT COUNT(*) AS cnt,
                COUNT(*) FILTER (
                    WHERE f.next_review IS NULL
                        OR f.next_review <= NOW()
                ) AS due_cnt,
                ROUND(
                    AVG(
                        CASE
                            WHEN f.times_reviewed > 0 THEN (f.times_correct::DECIMAL / f.times_reviewed) * 100
                            ELSE 0
                        END
                    )::NUMERIC,
                    1
                ) AS avg_mastery
            FROM developer_schema.flashcards f
            WHERE f.deck_id = d.id
                AND f.deleted_at IS NULL
        ) card_counts ON TRUE
    WHERE d.user_id = p_user_id
        AND d.deleted_at IS NULL
),
------------------------------------------------------------------------
-- Weak areas (topics with low performance)
------------------------------------------------------------------------
weak_areas AS (
    SELECT COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'deck_name',
                    wa.deck_name,
                    'accuracy',
                    wa.accuracy,
                    'review_count',
                    wa.review_count,
                    'weakness_score',
                    wa.weakness_score
                )
                ORDER BY wa.weakness_score DESC
            ),
            '[]'::JSONB
        ) AS topics
    FROM (
            SELECT d.name AS deck_name,
                ROUND(
                    (
                        AVG(
                            CASE
                                WHEN r.quality >= 3 THEN 1.0
                                ELSE 0.0
                            END
                        ) * 100
                    )::NUMERIC,
                    1
                ) AS accuracy,
                COUNT(r.id) AS review_count,
                ROUND(
                    (
                        (
                            1 - AVG(
                                CASE
                                    WHEN r.quality >= 3 THEN 1.0
                                    ELSE 0.0
                                END
                            )
                        ) * (1 + LN(COUNT(r.id) + 1))
                    )::NUMERIC,
                    3
                ) AS weakness_score
            FROM developer_schema.reviews r
                INNER JOIN developer_schema.flashcards f ON r.card_id = f.id
                INNER JOIN developer_schema.decks d ON f.deck_id = d.id
            WHERE r.user_id = p_user_id
                AND r.reviewed_at >= NOW() - INTERVAL '30 days'
            GROUP BY d.id,
                d.name
            HAVING AVG(
                    CASE
                        WHEN r.quality >= 3 THEN 1.0
                        ELSE 0.0
                    END
                ) < 0.7
                AND COUNT(r.id) >= 5
            ORDER BY weakness_score DESC
            LIMIT 5
        ) wa
), ------------------------------------------------------------------------
-- Recent activity (last 7 days)
------------------------------------------------------------------------
recent_activity AS (
    SELECT jsonb_build_object(
            'total_reviews',
            COALESCE(COUNT(*), 0),
            'correct_reviews',
            COALESCE(
                COUNT(*) FILTER (
                    WHERE r.quality >= 3
                ),
                0
            ),
            'accuracy',
            COALESCE(
                ROUND(
                    (
                        AVG(
                            CASE
                                WHEN r.quality >= 3 THEN 1.0
                                ELSE 0.0
                            END
                        ) * 100
                    )::NUMERIC,
                    1
                ),
                0
            ),
            'study_days',
            COALESCE(COUNT(DISTINCT DATE(r.reviewed_at)), 0),
            'avg_quality',
            COALESCE(ROUND(AVG(r.quality)::NUMERIC, 2), 0),
            'cards_reviewed',
            COALESCE(COUNT(DISTINCT r.card_id), 0),
            'last_study_date',
            MAX(r.reviewed_at)
        ) AS activity
    FROM developer_schema.reviews r
    WHERE r.user_id = p_user_id
        AND r.reviewed_at >= NOW() - INTERVAL '7 days'
),
------------------------------------------------------------------------
-- Learning velocity (improvement trend)
------------------------------------------------------------------------
learning_velocity AS (
    SELECT jsonb_build_object(
            'trend',
            CASE
                WHEN recent_avg > previous_avg THEN 'improving'
                WHEN recent_avg < previous_avg THEN 'declining'
                ELSE 'stable'
            END,
            'recent_accuracy',
            COALESCE(ROUND((recent_avg * 100)::NUMERIC, 1), 0),
            'previous_accuracy',
            COALESCE(ROUND((previous_avg * 100)::NUMERIC, 1), 0),
            'change_pct',
            COALESCE(
                ROUND(((recent_avg - previous_avg) * 100)::NUMERIC, 1),
                0
            )
        ) AS velocity
    FROM (
            SELECT COALESCE(
                    AVG(
                        CASE
                            WHEN r.quality >= 3 THEN 1.0
                            ELSE 0.0
                        END
                    ) FILTER (
                        WHERE r.reviewed_at >= NOW() - INTERVAL '7 days'
                    ),
                    0
                ) AS recent_avg,
                COALESCE(
                    AVG(
                        CASE
                            WHEN r.quality >= 3 THEN 1.0
                            ELSE 0.0
                        END
                    ) FILTER (
                        WHERE r.reviewed_at >= NOW() - INTERVAL '14 days'
                            AND r.reviewed_at < NOW() - INTERVAL '7 days'
                    ),
                    0
                ) AS previous_avg
            FROM developer_schema.reviews r
            WHERE r.user_id = p_user_id
        ) trends
),
------------------------------------------------------------------------
-- Note statistics
------------------------------------------------------------------------
note_stats AS (
    SELECT jsonb_build_object(
            'total_notes',
            COALESCE(COUNT(*), 0),
            'recent_notes',
            COALESCE(
                COUNT(*) FILTER (
                    WHERE n.created_at >= NOW() - INTERVAL '7 days'
                ),
                0
            )
        ) AS notes
    FROM developer_schema.notes n
    WHERE n.user_id = p_user_id
        AND n.deleted_at IS NULL
),
------------------------------------------------------------------------
-- Mastery by deck (for focused learning)
------------------------------------------------------------------------
mastery_scores AS (
    SELECT COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'deck_name',
                    ms.deck_name,
                    'mastery_score',
                    ms.mastery_score,
                    'card_count',
                    ms.card_count,
                    'review_count',
                    ms.review_count
                )
                ORDER BY ms.mastery_score ASC
            ),
            '[]'::JSONB
        ) AS scores
    FROM (
            SELECT d.name AS deck_name,
                ROUND(
                    (
                        AVG(
                            CASE
                                WHEN f.times_reviewed > 0 THEN (f.times_correct::DECIMAL / f.times_reviewed)
                                ELSE 0
                            END
                        ) * (
                            1 + 0.1 * LN(COALESCE(SUM(f.times_reviewed), 1) + 1)
                        )
                    )::NUMERIC,
                    3
                ) AS mastery_score,
                COUNT(DISTINCT f.id) AS card_count,
                SUM(f.times_reviewed) AS review_count
            FROM developer_schema.decks d
                LEFT JOIN developer_schema.flashcards f ON f.deck_id = d.id
                AND f.deleted_at IS NULL
            WHERE d.user_id = p_user_id
                AND d.deleted_at IS NULL
            GROUP BY d.id,
                d.name
            HAVING COUNT(f.id) > 0
            ORDER BY mastery_score ASC
            LIMIT 10
        ) ms
) ------------------------------------------------------------------------
-- Build final context JSON (ALL JSONB)
------------------------------------------------------------------------
SELECT jsonb_build_object(
        'user',
        (
            SELECT jsonb_build_object(
                    'id',
                    ui.id,
                    'email',
                    ui.email,
                    'full_name',
                    ui.full_name,
                    'preferences',
                    ui.preferences,
                    'timezone',
                    ui.timezone,
                    'created_at',
                    ui.created_at
                )
            FROM user_info ui
        ),
        'flashcards',
        jsonb_build_object(
            'stats',
            (
                SELECT jsonb_build_object(
                        'total_cards',
                        COALESCE(fs.total_cards, 0),
                        'due_cards',
                        COALESCE(fs.due_cards, 0),
                        'new_cards',
                        COALESCE(fs.new_cards, 0),
                        'learning_cards',
                        COALESCE(fs.learning_cards, 0),
                        'mastered_cards',
                        COALESCE(fs.mastered_cards, 0),
                        'avg_ease_factor',
                        COALESCE(fs.avg_ease_factor, 0),
                        'avg_accuracy',
                        COALESCE(fs.avg_accuracy, 0)
                    )
                FROM flashcard_stats fs
            ),
            'decks',
            (
                SELECT decks
                FROM deck_summary
            )
        ),
        'analytics',
        jsonb_build_object(
            'weak_areas',
            (
                SELECT topics
                FROM weak_areas
            ),
            'recent_activity',
            (
                SELECT activity
                FROM recent_activity
            ),
            'learning_velocity',
            (
                SELECT velocity
                FROM learning_velocity
            ),
            'mastery_by_deck',
            (
                SELECT scores
                FROM mastery_scores
            )
        ),
        'notes',
        (
            SELECT notes
            FROM note_stats
        ),
        'metadata',
        jsonb_build_object(
            'generated_at',
            NOW(),
            'focus',
            p_focus,
            'cache_ttl_seconds',
            300
        )
    ) INTO v_result;
RETURN v_result;
END;
$$;
-- ============================================================================
-- Function Comment
-- ============================================================================
COMMENT ON FUNCTION developer_schema.build_user_context(INT, VARCHAR) IS 'Builds complete user learning context in a single query.

FIXED: All JSON operations use JSONB consistently to prevent type coercion errors.
FIXED: Removed u.deleted_at check as users table has no soft delete.
FIXED: All ROUND() calls cast to NUMERIC to prevent double precision errors.

This is the CRITICAL function for AI context injection. It gathers:
- User profile and preferences
- Flashcard statistics (total, due, mastered)
- Deck summaries with mastery levels
- Weak areas (topics needing attention)
- Recent activity (last 7 days)
- Learning velocity (improvement trend)
- Note statistics
- Mastery scores by deck

Parameters:
  - p_user_id: ID of the user
  - p_focus: Optional focus topic for filtering

Returns JSONB with structure:
{
  "user": { profile data },
  "flashcards": { stats, decks },
  "analytics": { weak_areas, recent_activity, velocity, mastery },
  "notes": { stats },
  "metadata": { generated_at, cache_ttl_seconds }
}

Example:
  SELECT developer_schema.build_user_context(1);
  SELECT developer_schema.build_user_context(1, ''biology'');
';
-- ============================================================================
-- Grant execute permission
-- ============================================================================
GRANT EXECUTE ON FUNCTION developer_schema.build_user_context(INT, VARCHAR) TO synapse_user;