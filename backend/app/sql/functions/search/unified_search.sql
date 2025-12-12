-- ============================================================================
-- SYNAPSE: Unified Search Across All Content Types
-- File: app/sql/functions/search/unified_search.sql
--
-- Searches flashcards, notes, and documents in a single query.
-- Returns unified results sorted by relevance.
-- ============================================================================

-- Drop existing function if exists
DROP FUNCTION IF EXISTS developer_schema.unified_search(INT, TEXT, INT);

-- Create the unified search function
CREATE OR REPLACE FUNCTION developer_schema.unified_search(
    p_user_id INT,                   -- ID of the user
    p_query TEXT,                    -- Search query string
    p_limit INT DEFAULT 20           -- Maximum results to return
)
RETURNS TABLE (
    result_type VARCHAR(20),
    id INT,
    title TEXT,
    content TEXT,
    headline TEXT,
    relevance_score REAL,
    metadata JSONB,
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
    BEGIN
        v_tsquery := plainto_tsquery('english', p_query);
    EXCEPTION WHEN OTHERS THEN
        v_tsquery := websearch_to_tsquery('english', p_query);
    END;

    -- Return empty if query resulted in empty tsquery
    IF v_tsquery IS NULL OR v_tsquery = ''::tsquery THEN
        RETURN;
    END IF;

    RETURN QUERY
    WITH combined_results AS (
        -- =====================================================================
        -- FLASHCARDS
        -- =====================================================================
        SELECT
            'flashcard'::VARCHAR(20) AS result_type,
            f.id,
            f.front_text AS title,
            LEFT(f.back_text, 200) AS content,
            ts_headline(
                'english',
                COALESCE(f.front_text, '') || ' ' || COALESCE(f.back_text, ''),
                v_tsquery,
                'StartSel=<mark>, StopSel=</mark>, MaxWords=30, MinWords=10'
            ) AS headline,
            ts_rank_cd(
                setweight(to_tsvector('english', COALESCE(f.front_text, '')), 'A') ||
                setweight(to_tsvector('english', COALESCE(f.back_text, '')), 'B'),
                v_tsquery,
                32
            ) AS relevance_score,
            jsonb_build_object(
                'deck_id', f.deck_id,
                'deck_name', d.name,
                'learning_state', COALESCE(f.learning_state, 'new')::TEXT,
                'times_reviewed', COALESCE(f.times_reviewed, 0),
                'ease_factor', COALESCE(f.ease_factor, 2.5),
                'front_media_url', f.front_media_url,
                'back_media_url', f.back_media_url
            ) AS metadata,
            f.created_at,
            f.updated_at
        FROM developer_schema.flashcards f
        INNER JOIN developer_schema.decks d ON f.deck_id = d.id
        WHERE d.user_id = p_user_id
          AND f.deleted_at IS NULL
          AND d.deleted_at IS NULL
          AND (
              to_tsvector('english', COALESCE(f.front_text, '')) @@ v_tsquery
              OR to_tsvector('english', COALESCE(f.back_text, '')) @@ v_tsquery
          )

        UNION ALL

        -- =====================================================================
        -- NOTES
        -- =====================================================================
        SELECT
            'note'::VARCHAR(20) AS result_type,
            n.id,
            n.title,
            LEFT(n.content, 200) AS content,
            ts_headline(
                'english',
                COALESCE(n.title, '') || ' ' || COALESCE(n.content, ''),
                v_tsquery,
                'StartSel=<mark>, StopSel=</mark>, MaxWords=30, MinWords=10'
            ) AS headline,
            ts_rank_cd(
                setweight(to_tsvector('english', COALESCE(n.title, '')), 'A') ||
                setweight(to_tsvector('english', COALESCE(n.content, '')), 'B'),
                v_tsquery,
                32
            ) AS relevance_score,
            jsonb_build_object(
                'format', COALESCE(n.format, 'markdown')::TEXT,
                'parent_id', n.parent_id,
                'has_children', EXISTS(
                    SELECT 1 FROM developer_schema.notes child
                    WHERE child.parent_id = n.id AND child.deleted_at IS NULL
                )
            ) AS metadata,
            n.created_at,
            n.updated_at
        FROM developer_schema.notes n
        WHERE n.user_id = p_user_id
          AND n.deleted_at IS NULL
          AND (
              to_tsvector('english', COALESCE(n.title, '')) @@ v_tsquery
              OR to_tsvector('english', COALESCE(n.content, '')) @@ v_tsquery
          )

        UNION ALL

        -- =====================================================================
        -- DOCUMENTS
        -- =====================================================================
        SELECT
            'document'::VARCHAR(20) AS result_type,
            d.id,
            d.filename AS title,
            NULL::TEXT AS content,
            ts_headline(
                'english',
                COALESCE(d.filename, ''),
                v_tsquery,
                'StartSel=<mark>, StopSel=</mark>, MaxWords=10, MinWords=3'
            ) AS headline,
            ts_rank_cd(
                to_tsvector('english', COALESCE(d.filename, '')),
                v_tsquery,
                32
            ) AS relevance_score,
            jsonb_build_object(
                'file_type', COALESCE(d.file_type, 'unknown')::TEXT,
                'file_size', COALESCE(d.file_size, 0),
                'page_count', d.page_count,
                'processing_status', COALESCE(d.processing_status, 'pending')::TEXT,
                'file_path', d.file_path
            ) AS metadata,
            d.created_at,
            d.updated_at
        FROM developer_schema.documents d
        WHERE d.user_id = p_user_id
          AND d.deleted_at IS NULL
          AND to_tsvector('english', COALESCE(d.filename, '')) @@ v_tsquery
    )

    SELECT *
    FROM combined_results
    ORDER BY
        relevance_score DESC,
        updated_at DESC
    LIMIT p_limit;
END;
$$;

-- Add function comment
COMMENT ON FUNCTION developer_schema.unified_search(INT, TEXT, INT) IS
'Unified full-text search across flashcards, notes, and documents.

Features:
- Single query searches all content types
- Weighted ranking: title/front text > content/back text
- Highlighted excerpts with matched terms
- Type-specific metadata in JSONB format

Parameters:
  - p_user_id: ID of the user
  - p_query: Search query (natural language)
  - p_limit: Maximum results (default 20)

Returns:
  - result_type: ''flashcard'', ''note'', or ''document''
  - id: Content ID
  - title: Main text (front_text, title, or filename)
  - content: Preview of body content
  - headline: Excerpt with <mark> tags around matches
  - relevance_score: Relevance ranking (higher = more relevant)
  - metadata: Type-specific data in JSONB
  - created_at, updated_at

Supported query syntax:
  - Simple words: "biology cells"
  - Phrases: "cell membrane"
  - Boolean (via websearch): "biology -chemistry"

Example:
  -- Search everything for "machine learning"
  SELECT * FROM developer_schema.unified_search(1, ''machine learning'', 20);

  -- Access metadata fields
  SELECT
    result_type,
    title,
    metadata->''deck_name'' AS deck_name,
    relevance_score
  FROM developer_schema.unified_search(1, ''biology'', 10);
';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION developer_schema.unified_search(INT, TEXT, INT)
    TO synapse_user;
