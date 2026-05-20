-- ============================================================================
-- SYNAPSE: Full-Text Search for Flashcards (Upgraded to pg_search BM25)
-- File: app/sql/functions/search/search_flashcards_fts.sql
--
-- Implements full-text search on flashcards using ParadeDB pg_search BM25.
-- Uses flashcards_bm25_idx index on (id, front_text, back_text).
-- ============================================================================
-- Drop existing function if exists
DROP FUNCTION IF EXISTS developer_schema.search_flashcards_fts(INT, TEXT, INT);
-- Create the full-text search function using pg_search BM25
CREATE OR REPLACE FUNCTION developer_schema.search_flashcards_fts(
        p_user_id INT,
        p_query TEXT,
        p_limit INT DEFAULT 20
    ) RETURNS TABLE (
        id INT,
        deck_id INT,
        deck_name VARCHAR(255),
        front_text TEXT,
        back_text TEXT,
        front_media_url VARCHAR,
        back_media_url VARCHAR,
        ease_factor DECIMAL(4, 2),
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
    ) LANGUAGE plpgsql STABLE PARALLEL SAFE AS $func$
DECLARE v_sql TEXT;
v_op TEXT := '@' || '@' || '@';
v_safe_query TEXT;
-- Build @@@ operator dynamically
BEGIN -- Handle empty query
IF p_query IS NULL
OR TRIM(p_query) = '' THEN RETURN;
END IF;

v_safe_query := substring(trim(regexp_replace(p_query, '[^a-zA-Z0-9\s]', ' ', 'g')) from 1 for 200);
IF v_safe_query = '' THEN
    RETURN;
END IF;

-- Build dynamic SQL to avoid pg_search parsing issues
v_sql := '
    WITH bm25_search AS (
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
            COALESCE(f.learning_state, ''new'')::VARCHAR(20) AS learning_state,
            COALESCE(f.times_reviewed, 0) AS times_reviewed,
            f.created_at,
            f.updated_at,
            pdb.score(f.id) as bm25_score,
            pdb.snippet(f.front_text) as snippet
        FROM developer_schema.flashcards f
        INNER JOIN developer_schema.decks d ON f.deck_id = d.id
        WHERE d.user_id = ' || p_user_id || '
          AND f.deleted_at IS NULL
          AND d.deleted_at IS NULL
          AND f.front_text ' || v_op || ' ' || quote_literal(v_safe_query) || '
        ORDER BY pdb.score(f.id) DESC
        LIMIT ' || (p_limit * 2) || '
    )
    SELECT
        bs.id,
        bs.deck_id,
        bs.deck_name,
        bs.front_text,
        LEFT(bs.back_text, 200)::TEXT AS back_text,
        bs.front_media_url,
        bs.back_media_url,
        bs.ease_factor::DECIMAL(4,2),
        bs.interval_days,
        bs.repetitions,
        bs.learning_state,
        bs.times_reviewed,
        bs.bm25_score AS rank,
        bs.snippet AS headline,
        TRUE AS matched_front,
        FALSE AS matched_back,
        bs.created_at,
        bs.updated_at
    FROM bm25_search bs
    ORDER BY bs.bm25_score DESC
    LIMIT ' || p_limit;
RETURN QUERY EXECUTE v_sql;
END;
$func$;
-- Add function comment
COMMENT ON FUNCTION developer_schema.search_flashcards_fts(INT, TEXT, INT) IS 'Full-text search on flashcards using ParadeDB pg_search BM25.

Features:
- BM25 ranking algorithm for relevance
- Highlighted snippets showing matched terms
- Fast indexed search via flashcards_bm25_idx

Parameters:
  - p_user_id: ID of the user
  - p_query: Search query (natural language)
  - p_limit: Maximum results (default 20)

Returns:
  - id, deck_id, deck_name
  - front_text, back_text (preview), media URLs
  - SM-2 values: ease_factor, interval_days, repetitions
  - learning_state, times_reviewed
  - rank: BM25 relevance score (higher = more relevant)
  - headline: Highlighted excerpt
  - matched_front, matched_back: Boolean flags
  - created_at, updated_at

Example:
  SELECT * FROM developer_schema.search_flashcards_fts(1, ''biology'', 10);
';
-- Grant execute permission
GRANT EXECUTE ON FUNCTION developer_schema.search_flashcards_fts(INT, TEXT, INT) TO synapse_user;