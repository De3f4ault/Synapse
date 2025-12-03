-- ============================================================================
-- SYNAPSE: Calculate Mastery
-- File: app/sql/functions/context/calculate_mastery.sql
--
-- Calculates mastery scores per topic/deck for a user.
-- Mastery = accuracy * confidence_factor (based on review count)
-- Normalized to 0.0 - 1.0 scale.
--
-- FIXED: All ROUND() calls now cast to NUMERIC
-- ============================================================================

-- Drop existing function if exists
DROP FUNCTION IF EXISTS developer_schema.calculate_mastery(INT, INT);

-- Create the calculate mastery function
CREATE OR REPLACE FUNCTION developer_schema.calculate_mastery(
    p_user_id INT,                   -- ID of the user
    p_deck_id INT DEFAULT NULL       -- Optional: specific deck (NULL = all decks)
)
RETURNS TABLE (
    deck_id INT,
    deck_name VARCHAR(255),
    mastery_score DECIMAL(4,3),
    raw_accuracy DECIMAL(4,3),
    confidence_factor DECIMAL(4,3),
    card_count INT,
    mastered_cards INT,
    learning_cards INT,
    review_count INT,
    mastery_level VARCHAR(20),
    next_milestone JSONB
)
LANGUAGE plpgsql
STABLE
PARALLEL SAFE
AS $$
BEGIN
    RETURN QUERY
    WITH
    -- Calculate raw metrics per deck
    deck_metrics AS (
        SELECT
            d.id AS deck_id,
            d.name AS deck_name,
            -- Raw accuracy: correct / total (for cards with reviews)
            COALESCE(
                AVG(
                    CASE WHEN f.times_reviewed > 0
                    THEN f.times_correct::DECIMAL / f.times_reviewed
                    ELSE NULL END
                ),
                0.0
            ) AS raw_accuracy,
            -- Total cards
            COUNT(f.id) AS card_count,
            -- Cards in mastered state
            COUNT(f.id) FILTER (WHERE f.learning_state = 'mastered') AS mastered_cards,
            -- Cards still learning
            COUNT(f.id) FILTER (WHERE f.learning_state IN ('learning', 'new')) AS learning_cards,
            -- Total reviews
            COALESCE(SUM(f.times_reviewed), 0) AS review_count,
            -- Average ease factor (indicator of overall ease)
            COALESCE(AVG(f.ease_factor), 2.5) AS avg_ease_factor
        FROM developer_schema.decks d
        LEFT JOIN developer_schema.flashcards f ON f.deck_id = d.id AND f.deleted_at IS NULL
        WHERE d.user_id = p_user_id
          AND d.deleted_at IS NULL
          AND (p_deck_id IS NULL OR d.id = p_deck_id)
        GROUP BY d.id, d.name
    ),

    -- Calculate mastery scores
    mastery_calc AS (
        SELECT
            dm.*,
            -- Confidence factor: increases with more reviews (logarithmic growth)
            -- Capped at 1.2 to prevent over-weighting
            LEAST(
                1.0 + 0.1 * LN(GREATEST(dm.review_count, 1)),
                1.2
            ) AS confidence_factor,
            -- Card completion factor: what percentage of cards are mastered
            CASE
                WHEN dm.card_count > 0
                THEN dm.mastered_cards::DECIMAL / dm.card_count
                ELSE 0.0
            END AS completion_factor
        FROM deck_metrics dm
    ),

    -- Final mastery calculation
    final_mastery AS (
        SELECT
            mc.deck_id,
            mc.deck_name,
            mc.raw_accuracy,
            mc.confidence_factor,
            mc.card_count,
            mc.mastered_cards,
            mc.learning_cards,
            mc.review_count,
            -- Mastery score formula:
            -- accuracy * confidence * (0.7 + 0.3 * completion)
            -- This rewards both accuracy AND progress through the deck
            ROUND(
                (
                    LEAST(
                        mc.raw_accuracy
                        * mc.confidence_factor
                        * (0.7 + 0.3 * mc.completion_factor),
                        1.0  -- Cap at 1.0
                    )
                )::NUMERIC,
                3
            ) AS mastery_score
        FROM mastery_calc mc
    )

    SELECT
        fm.deck_id,
        fm.deck_name,
        fm.mastery_score,
        ROUND(fm.raw_accuracy::NUMERIC, 3) AS raw_accuracy,
        ROUND(fm.confidence_factor::NUMERIC, 3) AS confidence_factor,
        fm.card_count::INT,
        fm.mastered_cards::INT,
        fm.learning_cards::INT,
        fm.review_count::INT,
        -- Mastery level label
        CASE
            WHEN fm.mastery_score >= 0.9 THEN 'expert'
            WHEN fm.mastery_score >= 0.75 THEN 'proficient'
            WHEN fm.mastery_score >= 0.5 THEN 'intermediate'
            WHEN fm.mastery_score >= 0.25 THEN 'beginner'
            ELSE 'novice'
        END::VARCHAR(20) AS mastery_level,
        -- Next milestone info
        jsonb_build_object(
            'current_score', fm.mastery_score,
            'next_level', CASE
                WHEN fm.mastery_score >= 0.9 THEN 'expert (max)'
                WHEN fm.mastery_score >= 0.75 THEN 'expert (0.9)'
                WHEN fm.mastery_score >= 0.5 THEN 'proficient (0.75)'
                WHEN fm.mastery_score >= 0.25 THEN 'intermediate (0.5)'
                ELSE 'beginner (0.25)'
            END,
            'points_needed', CASE
                WHEN fm.mastery_score >= 0.9 THEN 0
                WHEN fm.mastery_score >= 0.75 THEN ROUND(((0.9 - fm.mastery_score) * 100)::NUMERIC, 1)
                WHEN fm.mastery_score >= 0.5 THEN ROUND(((0.75 - fm.mastery_score) * 100)::NUMERIC, 1)
                WHEN fm.mastery_score >= 0.25 THEN ROUND(((0.5 - fm.mastery_score) * 100)::NUMERIC, 1)
                ELSE ROUND(((0.25 - fm.mastery_score) * 100)::NUMERIC, 1)
            END,
            'cards_to_master', fm.card_count - fm.mastered_cards,
            'suggestion', CASE
                WHEN fm.card_count = 0 THEN 'Add cards to this deck to start learning'
                WHEN fm.review_count < 10 THEN 'Keep reviewing to build confidence'
                WHEN fm.raw_accuracy < 0.6 THEN 'Focus on accuracy - review fundamentals'
                WHEN fm.mastered_cards::DECIMAL / NULLIF(fm.card_count, 0) < 0.5 THEN 'Keep practicing - you''re making progress'
                ELSE 'Great progress! Keep up the consistent reviews'
            END
        ) AS next_milestone
    FROM final_mastery fm
    ORDER BY fm.mastery_score DESC;
END;
$$;

-- Add function comment
COMMENT ON FUNCTION developer_schema.calculate_mastery(INT, INT) IS
'Calculates mastery scores per deck for a user.

FIXED: All ROUND() calls cast to NUMERIC to prevent double precision errors.

Mastery Score Formula:
  mastery = accuracy * confidence * (0.7 + 0.3 * completion)

Where:
  - accuracy: correct answers / total reviews
  - confidence: 1.0 + 0.1 * ln(review_count), capped at 1.2
  - completion: mastered_cards / total_cards

Mastery Levels:
  - expert: >= 0.90
  - proficient: >= 0.75
  - intermediate: >= 0.50
  - beginner: >= 0.25
  - novice: < 0.25

Parameters:
  - p_user_id: ID of the user
  - p_deck_id: Optional specific deck (NULL = all decks)

Returns:
  - deck_id, deck_name
  - mastery_score (0.0 - 1.0)
  - raw_accuracy, confidence_factor
  - card_count, mastered_cards, learning_cards, review_count
  - mastery_level (text label)
  - next_milestone (JSONB with progress info)

Example:
  -- All decks for user
  SELECT * FROM developer_schema.calculate_mastery(1);

  -- Specific deck
  SELECT * FROM developer_schema.calculate_mastery(1, 5);
';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION developer_schema.calculate_mastery(INT, INT)
    TO synapse_user;
