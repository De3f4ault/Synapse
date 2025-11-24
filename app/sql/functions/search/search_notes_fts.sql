-- ============================================================================
-- SYNAPSE: Full-Text Search for Notes
-- File: app/sql/functions/search/search_notes_fts.sql
--
-- Implements full-text search on notes using PostgreSQL's tsvector/tsquery.
-- Supports ranking by relevance and highlighting matched terms.
-- ============================================================================

-- Drop existing function if exists
DROP FUNCTION IF EXISTS developer_schema.search_notes_fts(INT, TEXT, INT);

-- Create the full-text search function
CREATE OR REPLACE FUNCTION developer_schema.search_notes_fts(
    p_user_id INT,                   -- ID of the user
    p_query TEXT,                    -- Search query string
    p_limit INT DEFAULT 20           -- Maximum results to return
)
RETURNS TABLE (
    id INT,
    title VARCHAR(500),
    content_preview TEXT,
    format VARCHAR(20),
    parent_id INT,
    rank REAL,
    headline TEXT,
    matched_title BOOLEAN,
    matched_content BOOLEAN,
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
            n.id,
            n.title,
            n.content,
            COALESCE(n.format, 'markdown')::VARCHAR(20) AS format,
            n.parent_id,
            n.created_at,
            n.updated_at,

            -- Create tsvector from title (weight A - highest) and content (weight B)
            -- Title matches are weighted more heavily
            setweight(to_tsvector('english', COALESCE(n.title, '')), 'A') ||
            setweight(to_tsvector('english', COALESCE(n.content, '')), 'B') AS document_vector,

            -- Check if title specifically matched
            to_tsvector('english', COALESCE(n.title, '')) @@ v_tsquery AS title_match,

            -- Check if content specifically matched
            to_tsvector('english', COALESCE(n.content, '')) @@ v_tsquery AS content_match

        FROM developer_schema.notes n
        WHERE n.user_id = p_user_id
          AND n.deleted_at IS NULL
          -- Filter to only matching documents
          AND (
              to_tsvector('english', COALESCE(n.title, '')) @@ v_tsquery
              OR to_tsvector('english', COALESCE(n.content, '')) @@ v_tsquery
          )
    )

    SELECT
        sr.id,
        sr.title,
        -- Content preview (first 300 chars)
        LEFT(sr.content, 300)::TEXT AS content_preview,
        sr.format,
        sr.parent_id,
        -- Rank using ts_rank_cd (cover density ranking)
        -- Normalization: 32 = rank/(rank+1), prevents outliers
        ts_rank_cd(sr.document_vector, v_tsquery, 32) AS rank,
        -- Generate headline with matched terms highlighted
        ts_headline(
            'english',
            COALESCE(sr.title, '') || ' ' || COALESCE(sr.content, ''),
            v_tsquery,
            'StartSel=<mark>, StopSel=</mark>, MaxWords=50, MinWords=20, MaxFragments=3'
        ) AS headline,
        sr.title_match AS matched_title,
        sr.content_match AS matched_content,
        sr.created_at,
        sr.updated_at
    FROM search_results sr
    ORDER BY
        -- Prioritize title matches
        sr.title_match DESC,
        -- Then by relevance rank
        ts_rank_cd(sr.document_vector, v_tsquery, 32) DESC,
        -- Then by recency
        sr.updated_at DESC
    LIMIT p_limit;
END;
$$;

-- Create a helper function for prefix/wildcard search
DROP FUNCTION IF EXISTS developer_schema.search_notes_prefix(INT, TEXT, INT);

CREATE OR REPLACE FUNCTION developer_schema.search_notes_prefix(
    p_user_id INT,                   -- ID of the user
    p_prefix TEXT,                   -- Search prefix (for autocomplete)
    p_limit INT DEFAULT 10           -- Maximum results
)
RETURNS TABLE (
    id INT,
    title VARCHAR(500),
    match_type VARCHAR(20)
)
LANGUAGE plpgsql
STABLE
PARALLEL SAFE
AS $$
BEGIN
    -- Handle empty prefix
    IF p_prefix IS NULL OR LENGTH(TRIM(p_prefix)) < 2 THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        n.id,
        n.title,
        CASE
            WHEN n.title ILIKE p_prefix || '%' THEN 'prefix'
            WHEN n.title ILIKE '%' || p_prefix || '%' THEN 'contains'
            ELSE 'content'
        END::VARCHAR(20) AS match_type
    FROM developer_schema.notes n
    WHERE n.user_id = p_user_id
      AND n.deleted_at IS NULL
      AND (
          -- Title prefix match (highest priority)
          n.title ILIKE p_prefix || '%'
          OR
          -- Title contains match
          n.title ILIKE '%' || p_prefix || '%'
          OR
          -- Content contains match
          n.content ILIKE '%' || p_prefix || '%'
      )
    ORDER BY
        CASE
            WHEN n.title ILIKE p_prefix || '%' THEN 1
            WHEN n.title ILIKE '%' || p_prefix || '%' THEN 2
            ELSE 3
        END,
        n.updated_at DESC
    LIMIT p_limit;
END;
$$;

-- Add function comments
COMMENT ON FUNCTION developer_schema.search_notes_fts(INT, TEXT, INT) IS
'Full-text search on notes using PostgreSQL tsvector/tsquery.

Features:
- Stemming and stop word removal (English)
- Weighted ranking: title matches > content matches
- Highlighted excerpts showing matched terms
- Cover density ranking for relevance

Parameters:
  - p_user_id: ID of the user
  - p_query: Search query (natural language)
  - p_limit: Maximum results (default 20)

Returns:
  - id, title, content_preview, format, parent_id
  - rank: Relevance score (higher = more relevant)
  - headline: Excerpt with <mark> tags around matches
  - matched_title, matched_content: Boolean flags
  - created_at, updated_at (TIMESTAMP WITH TIME ZONE)

Supported query syntax:
  - Simple words: "biology cells"
  - Phrases: "cell membrane"
  - Boolean (via websearch): "biology -chemistry"

Example:
  SELECT * FROM developer_schema.search_notes_fts(1, ''machine learning'', 10);
';

COMMENT ON FUNCTION developer_schema.search_notes_prefix(INT, TEXT, INT) IS
'Prefix search for autocomplete suggestions.

Parameters:
  - p_user_id: ID of the user
  - p_prefix: Search prefix (min 2 chars)
  - p_limit: Maximum results (default 10)

Returns:
  - id, title
  - match_type: ''prefix'', ''contains'', or ''content''

Example:
  SELECT * FROM developer_schema.search_notes_prefix(1, ''bio'', 5);
';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION developer_schema.search_notes_fts(INT, TEXT, INT)
    TO synapse_user;
GRANT EXECUTE ON FUNCTION developer_schema.search_notes_prefix(INT, TEXT, INT)
    TO synapse_user;
