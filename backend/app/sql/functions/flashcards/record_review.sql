-- ============================================================================
-- SYNAPSE: Record Review Atomically
-- File: app/sql/functions/flashcards/record_review.sql
--
-- Records a flashcard review atomically, updating the card and creating
-- a review history record in a single transaction.
-- Uses row-level locking to prevent race conditions.
-- ============================================================================

-- Drop existing function if exists
DROP FUNCTION IF EXISTS developer_schema.record_review(INT, INT, INT);

-- Create the record review function
CREATE OR REPLACE FUNCTION developer_schema.record_review(
    p_card_id INT,                   -- ID of the flashcard being reviewed
    p_user_id INT,                   -- ID of the user performing review
    p_quality INT                    -- Quality of response (0-5)
)
RETURNS JSONB
LANGUAGE plpgsql
VOLATILE                            -- Function modifies data
AS $$
DECLARE
    v_card RECORD;
    v_sm2_result RECORD;
    v_next_review_date TIMESTAMP;
    v_review_id INT;
    v_result JSONB;
BEGIN
    -- Validate quality rating
    IF p_quality < 0 OR p_quality > 5 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Quality rating must be between 0 and 5',
            'error_code', 'INVALID_QUALITY'
        );
    END IF;

    -- Lock the card row to prevent concurrent updates (SELECT FOR UPDATE)
    -- This ensures atomic updates in high-concurrency scenarios
    SELECT
        id,
        deck_id,
        ease_factor,
        repetitions,
        interval,
        last_review,
        next_review,
        times_reviewed,
        times_correct,
        times_incorrect,
        learning_state
    INTO v_card
    FROM developer_schema.flashcards
    WHERE id = p_card_id
      AND deleted_at IS NULL
    FOR UPDATE;

    -- Check if card exists
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Flashcard not found or has been deleted',
            'error_code', 'CARD_NOT_FOUND'
        );
    END IF;

    -- Verify user owns this card (through deck ownership)
    IF NOT EXISTS (
        SELECT 1 FROM developer_schema.decks d
        WHERE d.id = v_card.deck_id
          AND d.user_id = p_user_id
          AND d.deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User does not own this flashcard',
            'error_code', 'UNAUTHORIZED'
        );
    END IF;

    -- Calculate new SM-2 values
    SELECT * INTO v_sm2_result
    FROM developer_schema.calculate_sm2(
        COALESCE(v_card.ease_factor, 2.5),
        COALESCE(v_card.repetitions, 0),
        COALESCE(v_card.interval, 0),
        p_quality
    );

    -- Calculate next review date
    v_next_review_date := NOW() + (v_sm2_result.new_interval || ' days')::INTERVAL;

    -- Insert review history record
    INSERT INTO developer_schema.reviews (
        card_id,
        user_id,
        quality,
        ease_factor_before,
        ease_factor_after,
        interval_before,
        interval_after,
        reviewed_at
    ) VALUES (
        p_card_id,
        p_user_id,
        p_quality,
        COALESCE(v_card.ease_factor, 2.5),
        v_sm2_result.new_ease_factor,
        COALESCE(v_card.interval, 0),
        v_sm2_result.new_interval,
        NOW()
    )
    RETURNING id INTO v_review_id;

    -- Update flashcard with new values
    UPDATE developer_schema.flashcards
    SET
        ease_factor = v_sm2_result.new_ease_factor,
        repetitions = v_sm2_result.new_repetitions,
        interval = v_sm2_result.new_interval,
        last_review = NOW(),
        next_review = v_next_review_date,
        times_reviewed = COALESCE(times_reviewed, 0) + 1,
        times_correct = CASE
            WHEN p_quality >= 3 THEN COALESCE(times_correct, 0) + 1
            ELSE COALESCE(times_correct, 0)
        END,
        times_incorrect = CASE
            WHEN p_quality < 3 THEN COALESCE(times_incorrect, 0) + 1
            ELSE COALESCE(times_incorrect, 0)
        END,
        learning_state = CASE
            WHEN v_sm2_result.new_repetitions = 0 THEN 'learning'
            WHEN v_sm2_result.new_interval >= 21 AND v_sm2_result.new_ease_factor >= 2.5 THEN 'mastered'
            WHEN v_sm2_result.new_repetitions >= 1 THEN 'review'
            ELSE 'learning'
        END,
        updated_at = NOW()
    WHERE id = p_card_id;

    -- Build and return success response
    v_result := jsonb_build_object(
        'success', true,
        'review_id', v_review_id,
        'card_id', p_card_id,
        'quality', p_quality,
        'next_review_date', v_next_review_date,
        'new_interval', v_sm2_result.new_interval,
        'new_ease_factor', v_sm2_result.new_ease_factor,
        'new_repetitions', v_sm2_result.new_repetitions,
        'is_correct', p_quality >= 3,
        'learning_state', CASE
            WHEN v_sm2_result.new_repetitions = 0 THEN 'learning'
            WHEN v_sm2_result.new_interval >= 21 AND v_sm2_result.new_ease_factor >= 2.5 THEN 'mastered'
            WHEN v_sm2_result.new_repetitions >= 1 THEN 'review'
            ELSE 'learning'
        END
    );

    RETURN v_result;
END;
$$;

-- Add function comment for documentation
COMMENT ON FUNCTION developer_schema.record_review(INT, INT, INT) IS
'Records a flashcard review atomically.

Performs the following in a single transaction:
1. Locks the card row to prevent concurrent updates
2. Validates user ownership
3. Calculates new SM-2 values using calculate_sm2()
4. Creates review history record
5. Updates flashcard with new scheduling data

Parameters:
  - p_card_id: ID of the flashcard being reviewed
  - p_user_id: ID of the user performing the review
  - p_quality: Quality rating (0-5)

Returns JSONB:
  Success: {
    "success": true,
    "review_id": 123,
    "card_id": 456,
    "quality": 4,
    "next_review_date": "2025-11-08T12:00:00",
    "new_interval": 6,
    "new_ease_factor": 2.36,
    "new_repetitions": 2,
    "is_correct": true,
    "learning_state": "review"
  }

  Error: {
    "success": false,
    "error": "Error message",
    "error_code": "ERROR_CODE"
  }

Example:
  SELECT developer_schema.record_review(123, 1, 4);
';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION developer_schema.record_review(INT, INT, INT)
    TO synapse_user;
