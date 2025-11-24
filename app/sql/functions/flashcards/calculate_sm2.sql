-- ============================================================================
-- SYNAPSE: SM-2 Spaced Repetition Algorithm
-- File: app/sql/functions/flashcards/calculate_sm2.sql
--
-- Implements the SuperMemo 2 algorithm as a pure PostgreSQL function.
-- This is the core algorithm for calculating spaced repetition intervals.
--
-- SM-2 Algorithm Reference:
-- - Quality 0-5 rating scale (0=blackout, 5=perfect)
-- - Ease factor minimum: 1.3, default: 2.5
-- - First interval: 1 day, second: 6 days, then: interval * ease_factor
-- ============================================================================

-- Drop existing function if exists (for clean deployments)
DROP FUNCTION IF EXISTS developer_schema.calculate_sm2(DECIMAL, INT, INT, INT);

-- Create the SM-2 calculation function
CREATE OR REPLACE FUNCTION developer_schema.calculate_sm2(
    p_ease_factor DECIMAL(4,2),     -- Current ease factor (1.3 - 5.0, default 2.5)
    p_repetitions INT,               -- Number of successful repetitions in a row
    p_interval INT,                  -- Current interval in days
    p_quality INT                    -- Quality of response (0-5)
)
RETURNS TABLE (
    new_ease_factor DECIMAL(4,2),
    new_repetitions INT,
    new_interval INT
)
LANGUAGE plpgsql
IMMUTABLE                           -- Same inputs always produce same outputs
PARALLEL SAFE                       -- Safe for parallel query execution
AS $$
DECLARE
    v_ease_factor DECIMAL(4,2);
    v_repetitions INT;
    v_interval INT;
BEGIN
    -- Validate quality rating (must be 0-5)
    IF p_quality < 0 OR p_quality > 5 THEN
        RAISE EXCEPTION 'Quality rating must be between 0 and 5, got: %', p_quality;
    END IF;

    -- Validate ease factor (must be >= 1.3)
    IF p_ease_factor < 1.3 THEN
        p_ease_factor := 1.3;
    END IF;

    -- Calculate new ease factor using SM-2 formula:
    -- EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    -- This adjusts ease factor based on how easily the card was recalled
    v_ease_factor := p_ease_factor + (0.1 - (5.0 - p_quality) * (0.08 + (5.0 - p_quality) * 0.02));

    -- Enforce minimum ease factor of 1.3
    IF v_ease_factor < 1.3 THEN
        v_ease_factor := 1.3;
    END IF;

    -- Handle quality rating response
    IF p_quality >= 3 THEN
        -- Correct response: increment repetitions and calculate new interval
        v_repetitions := p_repetitions + 1;

        -- Calculate interval based on repetition number
        CASE v_repetitions
            WHEN 1 THEN
                -- First successful repetition: 1 day
                v_interval := 1;
            WHEN 2 THEN
                -- Second successful repetition: 6 days
                v_interval := 6;
            ELSE
                -- Subsequent repetitions: previous interval * ease factor
                v_interval := CEIL(p_interval * v_ease_factor)::INT;
        END CASE;
    ELSE
        -- Incorrect response (quality < 3): reset to beginning
        v_repetitions := 0;
        v_interval := 1;
        -- Note: We still update ease factor even on incorrect response
    END IF;

    -- Return the calculated values
    new_ease_factor := ROUND(v_ease_factor, 2);
    new_repetitions := v_repetitions;
    new_interval := v_interval;

    RETURN NEXT;
END;
$$;

-- Add function comment for documentation
COMMENT ON FUNCTION developer_schema.calculate_sm2(DECIMAL, INT, INT, INT) IS
'SM-2 Spaced Repetition Algorithm.

Calculates the next review interval based on recall quality.

Parameters:
  - p_ease_factor: Current ease factor (1.3-5.0, default 2.5)
  - p_repetitions: Number of consecutive successful reviews
  - p_interval: Current interval in days
  - p_quality: Recall quality rating (0-5)
    0 = Complete blackout
    1 = Incorrect, but remembered when shown answer
    2 = Incorrect, answer seemed easy to recall
    3 = Correct with serious difficulty
    4 = Correct after hesitation
    5 = Perfect response

Returns:
  - new_ease_factor: Updated ease factor
  - new_repetitions: Updated repetition count
  - new_interval: Days until next review

Example:
  SELECT * FROM developer_schema.calculate_sm2(2.5, 0, 0, 4);
  -- Returns: (2.36, 1, 1)
';

-- Grant execute permission to application user
GRANT EXECUTE ON FUNCTION developer_schema.calculate_sm2(DECIMAL, INT, INT, INT)
    TO synapse_user;
