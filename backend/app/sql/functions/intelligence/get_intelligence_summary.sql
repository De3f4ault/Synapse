-- ============================================================================
-- SYNAPSE: Get Intelligence Summary
-- File: app/sql/functions/intelligence/get_intelligence_summary.sql
--
-- Returns weak concepts, fragile concepts, and high-ROI reinforcements for a user.
-- This is the core query for the Graph Intelligence Engine (GIE).
-- ============================================================================
-- Drop existing function if exists
DROP FUNCTION IF EXISTS developer_schema.get_intelligence_summary(INT, INT);
-- Create the intelligence summary function
CREATE OR REPLACE FUNCTION developer_schema.get_intelligence_summary(
        p_user_id INT,
        -- ID of the user
        p_limit INT DEFAULT 10 -- Max concepts to return per category
    ) RETURNS TABLE (
        category VARCHAR(20),
        -- 'weak', 'fragile', 'high_roi'
        concept_id VARCHAR(255),
        concept_name VARCHAR(255),
        mastery DECIMAL(4, 3),
        stability DECIMAL(4, 3),
        volatility DECIMAL(4, 3),
        last_reinforced_at TIMESTAMPTZ,
        weakness_evidence JSONB
    ) LANGUAGE plpgsql STABLE PARALLEL SAFE AS $$ BEGIN RETURN QUERY WITH -- Get mastery data from calculate_mastery
    mastery_data AS (
        SELECT d.id AS deck_id,
            d.name AS concept_name,
            cm.mastery_score,
            cm.card_count,
            cm.review_count,
            cm.mastered_cards
        FROM developer_schema.calculate_mastery_v2(p_user_id, NULL) cm
            JOIN developer_schema.decks d ON d.id = cm.deck_id
    ),
    -- Calculate stability: based on review recency and frequency
    stability_calc AS (
        SELECT md.deck_id,
            md.concept_name,
            md.mastery_score,
            -- Stability: higher review count = more stable
            -- Decays if no recent reviews
            LEAST(
                1.0,
                GREATEST(
                    0.0,
                    0.3 + 0.7 * (
                        CASE
                            WHEN md.review_count > 50 THEN 1.0
                            WHEN md.review_count > 20 THEN 0.8
                            WHEN md.review_count > 10 THEN 0.6
                            WHEN md.review_count > 5 THEN 0.4
                            ELSE 0.2
                        END
                    )
                )
            ) AS stability,
            -- Volatility: if mastered_cards / card_count is low relative to mastery, inconsistent
            CASE
                WHEN md.card_count = 0 THEN 0.5
                ELSE LEAST(
                    1.0,
                    ABS(
                        md.mastery_score - (md.mastered_cards::DECIMAL / md.card_count)
                    ) * 2
                )
            END AS volatility,
            md.review_count,
            md.card_count
        FROM mastery_data md
    ),
    -- Get last reinforcement timestamps from flashcards table
    -- Flashcards link to users via decks, not directly
    last_review AS (
        SELECT f.deck_id,
            MAX(f.last_review) AS last_reinforced_at
        FROM developer_schema.flashcards f
            JOIN developer_schema.decks d ON d.id = f.deck_id
        WHERE d.user_id = p_user_id
            AND f.deleted_at IS NULL
            AND d.deleted_at IS NULL
        GROUP BY f.deck_id
    ),
    -- Build evidence for weak concepts
    weakness_evidence_data AS (
        SELECT f.deck_id,
            jsonb_agg(
                jsonb_build_object(
                    'source',
                    'flashcard',
                    'reference_id',
                    f.id::TEXT,
                    'reason',
                    'Low accuracy (' || ROUND(
                        (
                            f.times_correct::DECIMAL / NULLIF(f.times_reviewed, 0) * 100
                        )::NUMERIC,
                        0
                    ) || '%) on card: ' || LEFT(f.front_text, 50)
                )
            ) FILTER (
                WHERE f.times_reviewed > 0
                    AND f.times_correct::DECIMAL / f.times_reviewed < 0.5
            ) AS evidence
        FROM developer_schema.flashcards f
            JOIN developer_schema.decks d ON d.id = f.deck_id
        WHERE d.user_id = p_user_id
            AND f.deleted_at IS NULL
            AND d.deleted_at IS NULL
        GROUP BY f.deck_id
    ),
    -- Combine all data
    combined AS (
        SELECT sc.deck_id,
            sc.concept_name,
            sc.mastery_score AS mastery,
            sc.stability,
            sc.volatility,
            lr.last_reinforced_at,
            COALESCE(wed.evidence, '[]'::JSONB) AS weakness_evidence,
            -- Categorize
            CASE
                WHEN sc.mastery_score < 0.3 THEN 'weak'
                WHEN sc.mastery_score >= 0.3
                AND sc.mastery_score < 0.7
                AND sc.stability < 0.5 THEN 'fragile'
                WHEN sc.mastery_score >= 0.5
                AND sc.stability < 0.4 THEN 'high_roi'
                ELSE NULL
            END AS category
        FROM stability_calc sc
            LEFT JOIN last_review lr ON lr.deck_id = sc.deck_id
            LEFT JOIN weakness_evidence_data wed ON wed.deck_id = sc.deck_id
    ) -- Return weak concepts
SELECT c.category::VARCHAR(20),
    c.deck_id::VARCHAR(255) AS concept_id,
    c.concept_name::VARCHAR(255),
    ROUND(c.mastery::NUMERIC, 3)::DECIMAL(4, 3) AS mastery,
    ROUND(c.stability::NUMERIC, 3)::DECIMAL(4, 3) AS stability,
    ROUND(c.volatility::NUMERIC, 3)::DECIMAL(4, 3) AS volatility,
    c.last_reinforced_at,
    c.weakness_evidence
FROM combined c
WHERE c.category IS NOT NULL
ORDER BY CASE
        c.category
        WHEN 'weak' THEN 1
        WHEN 'fragile' THEN 2
        WHEN 'high_roi' THEN 3
    END,
    c.mastery ASC
LIMIT p_limit * 3;
-- Up to p_limit per category
END;
$$;
-- Add function comment
COMMENT ON FUNCTION developer_schema.get_intelligence_summary(INT, INT) IS 'Returns intelligence summary for GIE (Graph Intelligence Engine).

Categories:
  - weak: mastery < 0.3 (needs immediate attention)
  - fragile: mastery 0.3-0.7 with stability < 0.5 (at risk of decay)
  - high_roi: mastery >= 0.5 with low stability (reinforce now for best ROI)

Parameters:
  - p_user_id: ID of the user
  - p_limit: Max concepts per category (default 10)

Returns:
  - category, concept_id, concept_name
  - mastery, stability, volatility
  - last_reinforced_at, weakness_evidence (JSONB)

Example:
  SELECT * FROM developer_schema.get_intelligence_summary(1, 5);
';
-- Grant execute permission
GRANT EXECUTE ON FUNCTION developer_schema.get_intelligence_summary(INT, INT) TO synapse_user;