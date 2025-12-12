-- ============================================================================
-- SYNAPSE: Get Cards Due for Review
-- File: app/sql/functions/flashcards/get_due_cards.sql
--
-- Retrieves flashcards that are due for review, ordered by priority.
-- Supports filtering by deck and limiting results.
-- ============================================================================

-- Drop existing function if exists
DROP FUNCTION IF EXISTS developer_schema.get_due_cards(INT, INT, INT);

-- Create the get due cards function
CREATE OR REPLACE FUNCTION developer_schema.get_due_cards(
    p_user_id INT,                   -- ID of the user
    p_deck_id INT DEFAULT NULL,      -- Optional: filter by specific deck
    p_limit INT DEFAULT 20           -- Maximum number of cards to return
)
RETURNS TABLE (
    card_id INT,
    deck_id INT,
    deck_name VARCHAR(255),
    front_text TEXT,
    back_text TEXT,
    ease_factor DECIMAL(4,2),
    interval_days INT,               -- RENAMED from 'interval' (reserved keyword)
    repetitions INT,
    last_review TIMESTAMP WITH TIME ZONE,
    next_review TIMESTAMP WITH TIME ZONE,
    learning_state VARCHAR(20),
    times_reviewed INT,
    accuracy DECIMAL(5,2),
    overdue_days INT,
    priority_score DECIMAL(10,4)
)
LANGUAGE plpgsql
STABLE                              -- Function doesn't modify data, reads only
PARALLEL SAFE                       -- Safe for parallel execution
AS $$
BEGIN
    RETURN QUERY
    WITH due_cards AS (
        SELECT
            f.id AS card_id,
            f.deck_id,
            d.name AS deck_name,
            f.front_text,
            f.back_text,
            COALESCE(f.ease_factor, 2.5) AS ease_factor,
            COALESCE(f.interval, 0) AS interval_days,  -- RENAMED from 'interval'
            COALESCE(f.repetitions, 0) AS repetitions,
            f.last_review,
            f.next_review,
            COALESCE(f.learning_state, 'new')::VARCHAR(20) AS learning_state,
            COALESCE(f.times_reviewed, 0) AS times_reviewed,
            -- Calculate accuracy percentage
            CASE
                WHEN COALESCE(f.times_reviewed, 0) = 0 THEN 0.00
                ELSE ROUND(
                    (COALESCE(f.times_correct, 0)::DECIMAL / f.times_reviewed) * 100,
                    2
                )
            END AS accuracy,
            -- Calculate how many days overdue (negative = not yet due)
            CASE
                WHEN f.next_review IS NULL THEN 0
                ELSE (EXTRACT(EPOCH FROM (NOW() - f.next_review)) / 86400.0)::INT
            END AS overdue_days,
            -- Priority score: higher = more urgent
            -- Factors: overdue days, low ease factor, learning state
            CASE
                -- New cards get high priority
                WHEN f.next_review IS NULL THEN 1000.0
                -- Overdue cards: base priority + days overdue
                WHEN f.next_review <= NOW() THEN
                    500.0 + EXTRACT(EPOCH FROM (NOW() - f.next_review)) / 86400.0
                -- Not yet due: negative priority (still include for preview)
                ELSE
                    EXTRACT(EPOCH FROM (NOW() - f.next_review)) / 86400.0
            END
            -- Boost priority for cards with low ease factor (harder cards)
            * (1.0 + (2.5 - COALESCE(f.ease_factor, 2.5)) * 0.2)
            -- Boost priority for cards in learning state
            * CASE COALESCE(f.learning_state, 'new')
                WHEN 'new' THEN 1.5
                WHEN 'learning' THEN 1.3
                WHEN 'review' THEN 1.0
                WHEN 'mastered' THEN 0.8
                ELSE 1.0
            END AS priority_score
        FROM developer_schema.flashcards f
        INNER JOIN developer_schema.decks d ON f.deck_id = d.id
        WHERE d.user_id = p_user_id
          AND f.deleted_at IS NULL
          AND d.deleted_at IS NULL
          -- Filter by deck if specified
          AND (p_deck_id IS NULL OR f.deck_id = p_deck_id)
          -- Include cards that are due (next_review <= NOW) or new (next_review IS NULL)
          AND (f.next_review IS NULL OR f.next_review <= NOW())
    )
    SELECT
        dc.card_id,
        dc.deck_id,
        dc.deck_name,
        dc.front_text,
        dc.back_text,
        dc.ease_factor,
        dc.interval_days,                -- RENAMED from 'interval'
        dc.repetitions,
        dc.last_review,
        dc.next_review,
        dc.learning_state,
        dc.times_reviewed,
        dc.accuracy,
        dc.overdue_days,
        ROUND(dc.priority_score, 4) AS priority_score
    FROM due_cards dc
    -- Order by priority (highest first)
    ORDER BY dc.priority_score DESC
    LIMIT p_limit;
END;
$$;

-- Add function comment for documentation
COMMENT ON FUNCTION developer_schema.get_due_cards(INT, INT, INT) IS
'Retrieves flashcards due for review with priority scoring.

Priority factors:
- New cards (no reviews): highest priority
- Overdue days: more overdue = higher priority
- Ease factor: harder cards (lower EF) get boosted
- Learning state: new/learning cards prioritized over mastered

Parameters:
  - p_user_id: ID of the user
  - p_deck_id: Optional deck filter (NULL = all decks)
  - p_limit: Maximum cards to return (default 20)

Returns table with columns:
  - card_id, deck_id, deck_name
  - front_text, back_text
  - SM-2 values: ease_factor, interval_days, repetitions
  - Review history: last_review, next_review, times_reviewed
  - Calculated: accuracy, overdue_days, priority_score

Example:
  -- Get 20 due cards for user 1 across all decks
  SELECT * FROM developer_schema.get_due_cards(1);

  -- Get 10 due cards from a specific deck
  SELECT * FROM developer_schema.get_due_cards(1, 5, 10);
';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION developer_schema.get_due_cards(INT, INT, INT)
    TO synapse_user;
