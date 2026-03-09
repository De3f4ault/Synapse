-- ============================================================================
-- SYNAPSE: Calculate Mastery v2  (Multi-Signal, Adaptive Weights)
-- File: app/sql/functions/context/calculate_mastery_v2.sql
--
-- Replaces plain flashcard-only mastery with a multi-signal score that
-- incorporates quiz performance via the knowledge-graph `links` table.
--
-- Signals:
--   1. Flashcard accuracy × confidence × completion  (weight: adaptive)
--   2. Quiz attempt score / max_score                 (weight: adaptive)
--
-- Weight Logic:
--   - Both signals present  → flashcard 0.65, quiz 0.35
--   - Flashcard only        → flashcard 1.00
--   - Quiz only             → quiz 1.00
--   - Neither               → 0.0
--
-- The `links` table bridges Quizzes → Decks (via shared Documents).
-- ============================================================================
-- Drop existing v2 if present
DROP FUNCTION IF EXISTS developer_schema.calculate_mastery_v2(INT, INT);
CREATE OR REPLACE FUNCTION developer_schema.calculate_mastery_v2(
        p_user_id INT,
        -- ID of the user
        p_deck_id INT DEFAULT NULL -- Optional: specific deck (NULL = all)
    ) RETURNS TABLE (
        deck_id INT,
        deck_name VARCHAR(255),
        mastery_score DECIMAL(4, 3),
        flashcard_signal DECIMAL(4, 3),
        quiz_signal DECIMAL(4, 3),
        fc_weight DECIMAL(3, 2),
        qz_weight DECIMAL(3, 2),
        card_count INT,
        mastered_cards INT,
        learning_cards INT,
        review_count INT,
        quiz_attempts INT,
        mastery_level VARCHAR(20),
        next_milestone JSONB
    ) LANGUAGE plpgsql STABLE PARALLEL SAFE AS $$ BEGIN RETURN QUERY WITH -- ================================================================
    -- S1: Flashcard signal  (same formula as v1)
    -- ================================================================
    deck_fc_metrics AS (
        SELECT d.id AS deck_id,
            d.name AS deck_name,
            COALESCE(
                AVG(
                    CASE
                        WHEN f.times_reviewed > 0 THEN f.times_correct::DECIMAL / f.times_reviewed
                        ELSE NULL
                    END
                ),
                0.0
            ) AS raw_accuracy,
            COUNT(f.id)::INT AS card_count,
            COUNT(f.id) FILTER (
                WHERE f.learning_state = 'mastered'
            )::INT AS mastered_cards,
            COUNT(f.id) FILTER (
                WHERE f.learning_state IN ('learning', 'new')
            )::INT AS learning_cards,
            COALESCE(SUM(f.times_reviewed), 0)::INT AS review_count
        FROM developer_schema.decks d
            LEFT JOIN developer_schema.flashcards f ON f.deck_id = d.id
            AND f.deleted_at IS NULL
        WHERE d.user_id = p_user_id
            AND d.deleted_at IS NULL
            AND (
                p_deck_id IS NULL
                OR d.id = p_deck_id
            )
        GROUP BY d.id,
            d.name
    ),
    fc_signal AS (
        SELECT m.deck_id,
            m.deck_name,
            m.card_count,
            m.mastered_cards,
            m.learning_cards,
            m.review_count,
            -- Confidence factor (log growth, cap 1.2)
            LEAST(1.0 + 0.1 * LN(GREATEST(m.review_count, 1)), 1.2) AS confidence,
            -- Completion factor
            CASE
                WHEN m.card_count > 0 THEN m.mastered_cards::DECIMAL / m.card_count
                ELSE 0.0
            END AS completion,
            -- Signal = accuracy × confidence × (0.7 + 0.3 × completion)
            ROUND(
                LEAST(
                    m.raw_accuracy * LEAST(1.0 + 0.1 * LN(GREATEST(m.review_count, 1)), 1.2) * (
                        0.7 + 0.3 * (
                            CASE
                                WHEN m.card_count > 0 THEN m.mastered_cards::DECIMAL / m.card_count
                                ELSE 0.0
                            END
                        )
                    ),
                    1.0
                )::NUMERIC,
                3
            ) AS signal
        FROM deck_fc_metrics m
    ),
    -- ================================================================
    -- S2: Quiz signal  (via links: Document → Deck, Document → Quiz)
    --
    -- For each deck, find linked quizzes by traversing:
    --   deck ← DERIVED(document) → DERIVED(quiz)
    -- Then average the best attempt score per quiz.
    -- ================================================================
    -- Step 1: Documents linked TO each deck
    deck_documents AS (
        SELECT l.target_id AS deck_id,
            -- target = deck
            l.source_id AS document_id -- source = document
        FROM developer_schema.links l
        WHERE l.user_id = p_user_id
            AND l.target_type = 'deck'
            AND l.source_type = 'document'
            AND (
                p_deck_id IS NULL
                OR l.target_id = p_deck_id
            )
    ),
    -- Step 2: Quizzes linked FROM the same documents
    deck_quizzes AS (
        SELECT DISTINCT dd.deck_id,
            l.target_id AS quiz_id
        FROM deck_documents dd
            JOIN developer_schema.links l ON l.source_type = 'document'
            AND l.source_id = dd.document_id
            AND l.target_type = 'quiz'
            AND l.user_id = p_user_id
    ),
    -- Step 3: Best attempt per quiz
    quiz_best AS (
        SELECT dq.deck_id,
            dq.quiz_id,
            MAX(
                CASE
                    WHEN qa.max_score > 0 THEN qa.score::DECIMAL / qa.max_score
                    ELSE 0.0
                END
            ) AS best_score
        FROM deck_quizzes dq
            JOIN developer_schema.quiz_attempts qa ON qa.quiz_id = dq.quiz_id
            AND qa.user_id = p_user_id
            AND qa.completed_at IS NOT NULL
        GROUP BY dq.deck_id,
            dq.quiz_id
    ),
    -- Step 4: Aggregate quiz signal per deck
    qz_signal AS (
        SELECT qb.deck_id,
            ROUND(AVG(qb.best_score)::NUMERIC, 3) AS signal,
            COUNT(*)::INT AS attempt_count
        FROM quiz_best qb
        GROUP BY qb.deck_id
    ),
    -- ================================================================
    -- COMBINE: adaptive-weighted blend
    -- ================================================================
    combined AS (
        SELECT fc.deck_id,
            fc.deck_name,
            fc.card_count,
            fc.mastered_cards,
            fc.learning_cards,
            fc.review_count,
            fc.signal AS fc_signal,
            COALESCE(qz.signal, 0.0) AS qz_signal,
            COALESCE(qz.attempt_count, 0)::INT AS quiz_attempts,
            -- Adaptive weights
            CASE
                -- Both signals have data
                WHEN fc.review_count > 0
                AND COALESCE(qz.attempt_count, 0) > 0 THEN 0.65 -- Only flashcards
                WHEN fc.review_count > 0 THEN 1.00 -- Only quizzes (no flashcard reviews yet)
                ELSE 0.00
            END AS w_fc,
            CASE
                WHEN fc.review_count > 0
                AND COALESCE(qz.attempt_count, 0) > 0 THEN 0.35
                WHEN COALESCE(qz.attempt_count, 0) > 0 THEN 1.00
                ELSE 0.00
            END AS w_qz
        FROM fc_signal fc
            LEFT JOIN qz_signal qz ON qz.deck_id = fc.deck_id
    ),
    -- ================================================================
    -- FINAL: blended mastery score
    -- ================================================================
    final AS (
        SELECT c.*,
            ROUND(
                LEAST(
                    c.fc_signal * c.w_fc + c.qz_signal * c.w_qz,
                    1.0
                )::NUMERIC,
                3
            ) AS mastery
        FROM combined c
    )
SELECT f.deck_id,
    f.deck_name,
    f.mastery AS mastery_score,
    f.fc_signal::DECIMAL(4, 3) AS flashcard_signal,
    f.qz_signal::DECIMAL(4, 3) AS quiz_signal,
    f.w_fc::DECIMAL(3, 2) AS fc_weight,
    f.w_qz::DECIMAL(3, 2) AS qz_weight,
    f.card_count,
    f.mastered_cards,
    f.learning_cards,
    f.review_count,
    f.quiz_attempts,
    -- Mastery level label
    CASE
        WHEN f.mastery >= 0.9 THEN 'expert'
        WHEN f.mastery >= 0.75 THEN 'proficient'
        WHEN f.mastery >= 0.5 THEN 'intermediate'
        WHEN f.mastery >= 0.25 THEN 'beginner'
        ELSE 'novice'
    END::VARCHAR(20) AS mastery_level,
    -- Next milestone info
    jsonb_build_object(
        'current_score',
        f.mastery,
        'next_level',
        CASE
            WHEN f.mastery >= 0.9 THEN 'expert (max)'
            WHEN f.mastery >= 0.75 THEN 'expert (0.9)'
            WHEN f.mastery >= 0.5 THEN 'proficient (0.75)'
            WHEN f.mastery >= 0.25 THEN 'intermediate (0.5)'
            ELSE 'beginner (0.25)'
        END,
        'points_needed',
        CASE
            WHEN f.mastery >= 0.9 THEN 0
            WHEN f.mastery >= 0.75 THEN ROUND(((0.9 - f.mastery) * 100)::NUMERIC, 1)
            WHEN f.mastery >= 0.5 THEN ROUND(((0.75 - f.mastery) * 100)::NUMERIC, 1)
            WHEN f.mastery >= 0.25 THEN ROUND(((0.5 - f.mastery) * 100)::NUMERIC, 1)
            ELSE ROUND(((0.25 - f.mastery) * 100)::NUMERIC, 1)
        END,
        'cards_to_master',
        f.card_count - f.mastered_cards,
        'signals',
        jsonb_build_object(
            'flashcard',
            jsonb_build_object(
                'value',
                f.fc_signal,
                'weight',
                f.w_fc,
                'reviews',
                f.review_count
            ),
            'quiz',
            jsonb_build_object(
                'value',
                f.qz_signal,
                'weight',
                f.w_qz,
                'attempts',
                f.quiz_attempts
            )
        ),
        'suggestion',
        CASE
            WHEN f.card_count = 0 THEN 'Add cards to this deck to start learning'
            WHEN f.review_count < 10 THEN 'Keep reviewing to build confidence'
            WHEN f.fc_signal < 0.6
            AND f.qz_signal >= 0.6 THEN 'Your quiz scores are strong — focus on flashcard reviews'
            WHEN f.fc_signal >= 0.6
            AND f.qz_signal < 0.6 THEN 'Great flashcard progress — try quizzes to deepen understanding'
            WHEN f.fc_signal < 0.6 THEN 'Focus on accuracy — review fundamentals'
            WHEN f.mastered_cards::DECIMAL / NULLIF(f.card_count, 0) < 0.5 THEN 'Keep practicing — you''re making progress'
            ELSE 'Great progress! Keep up the consistent reviews'
        END
    ) AS next_milestone
FROM final f
ORDER BY f.mastery DESC;
END;
$$;
-- ============================================================================
-- Documentation
-- ============================================================================
COMMENT ON FUNCTION developer_schema.calculate_mastery_v2(INT, INT) IS 'Multi-signal mastery calculation (v2).

Blends flashcard and quiz signals with adaptive weights via the knowledge graph.

Mastery Formula:
  mastery = w_fc × fc_signal  +  w_qz × qz_signal

Adaptive Weights:
  - Both signals present  → fc=0.65, qz=0.35
  - Flashcard only        → fc=1.00
  - Quiz only             → qz=1.00

Flashcard Signal:
  accuracy × confidence × (0.7 + 0.3 × completion)

Quiz Signal:
  AVG(best_attempt_score / max_score) for linked quizzes.
  Quiz → Deck bridging uses links table: Document → Deck, Document → Quiz.

Parameters:
  - p_user_id: ID of the user
  - p_deck_id: Optional specific deck (NULL = all)

Returns:
  - deck_id, deck_name
  - mastery_score (0.0 - 1.0), flashcard_signal, quiz_signal
  - fc_weight, qz_weight
  - card_count, mastered_cards, learning_cards, review_count, quiz_attempts
  - mastery_level (text label)
  - next_milestone (JSONB with progress + signal breakdown)

Example:
  -- All decks
  SELECT * FROM developer_schema.calculate_mastery_v2(1);

  -- Specific deck
  SELECT * FROM developer_schema.calculate_mastery_v2(1, 5);
';
GRANT EXECUTE ON FUNCTION developer_schema.calculate_mastery_v2(INT, INT) TO synapse_user;