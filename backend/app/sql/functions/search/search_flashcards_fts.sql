-- ============================================================================
-- SYNAPSE: Full-Text Search for Flashcards
-- File: app/sql/functions/search/search_flashcards_fts.sql
--
-- Implements full-text search on flashcards using PostgreSQL's tsvector/tsquery.
-- Supports ranking by relevance and highlighting matched terms.
-- ============================================================================

-- Drop existing function if exists
DROP FUNCTION IF EXISTS developer_schema.search_flashcards_fts(INT, TEXT, INT);

-- Create the full-text search function
CREATE OR REPLACE FUNCTION developer_schema.search_flashcards_fts(
    p_user_id INT,                   -- ID of the user
    p_query TEXT,                    -- Search query string
    p_limit INT DEFAULT 20           -- Maximum results to return
)
RETURNS TABLE (
    id INT,
    deck_id INT,
    deck_name VARCHAR(255),
    front_text TEXT,
    back_text TEXT,
    front_media_url VARCHAR,
    back_media_url VARCHAR,
    ease_factor DECIMAL(4,2),
    interval_days INT,
    repetitions INT,
    learning_state VARCHAR(20),
    times_reviewed INT,
    rank REAL,
    headline TEXT,
    matched_front BOOLEAN,
    matched_back BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
STABLE
PARALLEL SAFE
AS $$
DECLARE
    v_tsquery tsquery;
BEGIN
    -- Handle empty query
    IF p_query IS NULL OR TRIM(p_query) = '' THEN
        RETURN;
    END IF;

    -- Convert search query to tsquery
    -- Using plainto_tsquery for user-friendly input (handles spaces, etc.)
    -- Using 'english' configuration for stemming and stop word removal
    BEGIN
        v_tsquery := plainto_tsquery('english', p_query);
    EXCEPTION WHEN OTHERS THEN
        -- If query parsing fails, try websearch format
        v_tsquery := websearch_to_tsquery('english', p_query);
    END;

    -- Return empty if query resulted in empty tsquery
    IF v_tsquery IS NULL OR v_tsquery = ''::tsquery THEN
        RETURN;
    END IF;

    RETURN QUERY
    WITH search_results AS (
        SELECT
            f.id,
            f.deck_id,
            d.name AS deck_name,
            f.front_text,
            f.back_text,
            f.front_media_url,
            f.back_media_url,
            COALESCE(f.ease_factor, 2.5) AS ease_factor,
            COALESCE(f.interval, 0) AS interval_days,
            COALESCE(f.repetitions, 0) AS repetitions,
            COALESCE(f.learning_state, 'new')::VARCHAR(20) AS learning_state,
            COALESCE(f.times_reviewed, 0) AS times_reviewed,
            f.created_at,
            f.updated_at,

            -- Create tsvector from front (weight A - highest) and back (weight B)
            -- Front text matches are weighted more heavily
            setweight(to_tsvector('english', COALESCE(f.front_text, '')), 'A') ||
            setweight(to_tsvector('english', COALESCE(f.back_text, '')), 'B') AS document_vector,

            -- Check if front text specifically matched
            to_tsvector('english', COALESCE(f.front_text, '')) @@ v_tsquery AS front_match,

            -- Check if back text specifically matched
            to_tsvector('english', COALESCE(f.back_text, '')) @@ v_tsquery AS back_match

        FROM developer_schema.flashcards f
        INNER JOIN developer_schema.decks d ON f.deck_id = d.id
        WHERE d.user_id = p_user_id
          AND f.deleted_at IS NULL
          AND d.deleted_at IS NULL
          -- Filter to only matching documents
          AND (
              to_tsvector('english', COALESCE(f.front_text, '')) @@ v_tsquery
              OR to_tsvector('english', COALESCE(f.back_text, '')) @@ v_tsquery
          )
    )

    SELECT
        sr.id,
        sr.deck_id,
        sr.deck_name,
        sr.front_text,
        -- Back text preview (first 200 chars)
        LEFT(sr.back_text, 200)::TEXT AS back_text,
        sr.front_media_url,
        sr.back_media_url,
        sr.ease_factor,
        sr.interval_days,
        sr.repetitions,
        sr.learning_state,
        sr.times_reviewed,
        -- Rank using ts_rank_cd (cover density ranking)
        -- Normalization: 32 = rank/(rank+1), prevents outliers
        ts_rank_cd(sr.document_vector, v_tsquery, 32) AS rank,
        -- Generate headline with matched terms highlighted
        ts_headline(
            'english',
            COALESCE(sr.front_text, '') || ' ' || COALESCE(sr.back_text, ''),
            v_tsquery,
            'StartSel=<mark>, StopSel=</mark>, MaxWords=30, MinWords=10, MaxFragments=2'
        ) AS headline,
        sr.front_match AS matched_front,
        sr.back_match AS matched_back,
        sr.created_at,
        sr.updated_at
    FROM search_results sr
    ORDER BY
        -- Prioritize front text matches
        sr.front_match DESC,
        -- Then by relevance rank
        ts_rank_cd(sr.document_vector, v_tsquery, 32) DESC,
        -- Then by recency
        sr.updated_at DESC
    LIMIT p_limit;
END;
$$;

-- Add function comment
COMMENT ON FUNCTION developer_schema.search_flashcards_fts(INT, TEXT, INT) IS
'Full-text search on flashcards using PostgreSQL tsvector/tsquery.

Features:
- Stemming and stop word removal (English)
- Weighted ranking: front text matches > back text matches
- Highlighted excerpts showing matched terms
- Cover density ranking for relevance

Parameters:
  - p_user_id: ID of the user
  - p_query: Search query (natural language)
  - p_limit: Maximum results (default 20)

Returns:
  - id, deck_id, deck_name
  - front_text, back_text (preview), media URLs
  - SM-2 values: ease_factor, interval_days, repetitions
  - learning_state, times_reviewed
  - rank: Relevance score (higher = more relevant)
  - headline: Excerpt with <mark> tags around matches
  - matched_front, matched_back: Boolean flags
  - created_at, updated_at

Supported query syntax:
  - Simple words: "biology cells"
  - Phrases: "cell membrane"
  - Boolean (via websearch): "biology -chemistry"

Example:
  SELECT * FROM developer_schema.search_flashcards_fts(1, ''machine learning'', 10);
';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION developer_schema.search_flashcards_fts(INT, TEXT, INT)
    TO synapse_user;
