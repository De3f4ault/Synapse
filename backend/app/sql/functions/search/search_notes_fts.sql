-- ============================================================================
-- SYNAPSE: Full-Text Search for Notes (Upgraded to pg_search BM25)
-- File: app/sql/functions/search/search_notes_fts.sql
--
-- Implements full-text search on notes using ParadeDB pg_search BM25.
-- Supports ranking by relevance and highlighting matched terms.
-- ============================================================================
-- Drop existing function if exists
DROP FUNCTION IF EXISTS developer_schema.search_notes_fts(INT, TEXT, INT);
-- Create the full-text search function using pg_search BM25
CREATE OR REPLACE FUNCTION developer_schema.search_notes_fts(
        p_user_id INT,
        p_query TEXT,
        p_limit INT DEFAULT 20
    ) RETURNS TABLE (
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
    ) LANGUAGE plpgsql STABLE PARALLEL SAFE AS $func$
DECLARE v_sql TEXT;
v_op TEXT := '@' || '@' || '@';
-- Build @@@ operator dynamically
BEGIN -- Handle empty query
IF p_query IS NULL
OR TRIM(p_query) = '' THEN RETURN;
END IF;
-- Build dynamic SQL to avoid pg_search parsing issues
v_sql := '
    WITH bm25_search AS (
        SELECT 
            n.id,
            n.title,
            n.content,
            COALESCE(n.format, ''markdown'')::VARCHAR(20) AS format,
            n.parent_id,
            n.created_at,
            n.updated_at,
            pdb.score(n.id) as bm25_score,
            pdb.snippet(n.title) as snippet
        FROM developer_schema.notes n
        WHERE n.user_id = ' || p_user_id || '
          AND n.deleted_at IS NULL
          AND n.title ' || v_op || ' ' || quote_literal(p_query) || '
        ORDER BY pdb.score(n.id) DESC
        LIMIT ' || (p_limit * 2) || '
    )
    SELECT
        bs.id,
        bs.title,
        LEFT(bs.content, 300)::TEXT AS content_preview,
        bs.format,
        bs.parent_id,
        bs.bm25_score AS rank,
        bs.snippet AS headline,
        TRUE AS matched_title,
        FALSE AS matched_content,
        bs.created_at,
        bs.updated_at
    FROM bm25_search bs
    ORDER BY bs.bm25_score DESC
    LIMIT ' || p_limit;
RETURN QUERY EXECUTE v_sql;
END;
$func$;
-- Create a helper function for prefix/wildcard search (keeps native approach)
DROP FUNCTION IF EXISTS developer_schema.search_notes_prefix(INT, TEXT, INT);
CREATE OR REPLACE FUNCTION developer_schema.search_notes_prefix(
        p_user_id INT,
        p_prefix TEXT,
        p_limit INT DEFAULT 10
    ) RETURNS TABLE (
        id INT,
        title VARCHAR(500),
        match_type VARCHAR(20)
    ) LANGUAGE plpgsql STABLE PARALLEL SAFE AS $$ BEGIN IF p_prefix IS NULL
    OR LENGTH(TRIM(p_prefix)) < 2 THEN RETURN;
END IF;
RETURN QUERY
SELECT n.id,
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
        n.title ILIKE p_prefix || '%'
        OR n.title ILIKE '%' || p_prefix || '%'
        OR n.content ILIKE '%' || p_prefix || '%'
    )
ORDER BY CASE
        WHEN n.title ILIKE p_prefix || '%' THEN 1
        WHEN n.title ILIKE '%' || p_prefix || '%' THEN 2
        ELSE 3
    END,
    n.updated_at DESC
LIMIT p_limit;
END;
$$;
-- Add function comments
COMMENT ON FUNCTION developer_schema.search_notes_fts(INT, TEXT, INT) IS 'Full-text search on notes using ParadeDB pg_search BM25.

Features:
- BM25 ranking algorithm for relevance
- Highlighted snippets showing matched terms
- Fast indexed search via notes_bm25_idx

Parameters:
  - p_user_id: ID of the user
  - p_query: Search query (natural language)
  - p_limit: Maximum results (default 20)

Returns:
  - id, title, content_preview, format, parent_id
  - rank: BM25 relevance score (higher = more relevant)
  - headline: Highlighted excerpt
  - matched_title, matched_content: Boolean flags
  - created_at, updated_at

Example:
  SELECT * FROM developer_schema.search_notes_fts(1, ''machine learning'', 10);
';
COMMENT ON FUNCTION developer_schema.search_notes_prefix(INT, TEXT, INT) IS 'Prefix search for autocomplete suggestions (ILIKE-based).';
-- Grant execute permissions
GRANT EXECUTE ON FUNCTION developer_schema.search_notes_fts(INT, TEXT, INT) TO synapse_user;
GRANT EXECUTE ON FUNCTION developer_schema.search_notes_prefix(INT, TEXT, INT) TO synapse_user;