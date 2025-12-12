-- ============================================================================
-- SYNAPSE: Full-Text Search for Documents
-- File: app/sql/functions/search/search_documents_fts.sql
--
-- Implements full-text search on documents using PostgreSQL's tsvector/tsquery.
-- Searches filename and metadata with relevance ranking.
-- ============================================================================

-- Drop existing function if exists
DROP FUNCTION IF EXISTS developer_schema.search_documents_fts(INT, TEXT, INT);

-- Create the full-text search function
CREATE OR REPLACE FUNCTION developer_schema.search_documents_fts(
    p_user_id INT,                   -- ID of the user
    p_query TEXT,                    -- Search query string
    p_limit INT DEFAULT 20           -- Maximum results to return
)
RETURNS TABLE (
    id INT,
    filename VARCHAR(255),
    file_type VARCHAR(50),
    file_size INT,
    page_count INT,
    processing_status VARCHAR(20),
    file_path VARCHAR,
    rank REAL,
    headline TEXT,
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
            d.id,
            d.filename,
            COALESCE(d.file_type, 'unknown')::VARCHAR(50) AS file_type,
            COALESCE(d.file_size, 0) AS file_size,
            d.page_count,
            COALESCE(d.processing_status, 'pending')::VARCHAR(20) AS processing_status,
            d.file_path,
            d.created_at,
            d.updated_at,

            -- Create tsvector from filename
            to_tsvector('english', COALESCE(d.filename, '')) AS document_vector

        FROM developer_schema.documents d
        WHERE d.user_id = p_user_id
          AND d.deleted_at IS NULL
          -- Filter to only matching documents
          AND to_tsvector('english', COALESCE(d.filename, '')) @@ v_tsquery
    )

    SELECT
        sr.id,
        sr.filename,
        sr.file_type,
        sr.file_size,
        sr.page_count,
        sr.processing_status,
        sr.file_path,
        -- Rank using ts_rank_cd (cover density ranking)
        ts_rank_cd(sr.document_vector, v_tsquery, 32) AS rank,
        -- Generate headline with matched terms highlighted
        ts_headline(
            'english',
            COALESCE(sr.filename, ''),
            v_tsquery,
            'StartSel=<mark>, StopSel=</mark>, MaxWords=10, MinWords=3'
        ) AS headline,
        sr.created_at,
        sr.updated_at
    FROM search_results sr
    ORDER BY
        -- Sort by relevance rank
        ts_rank_cd(sr.document_vector, v_tsquery, 32) DESC,
        -- Then by recency
        sr.created_at DESC
    LIMIT p_limit;
END;
$$;

-- Add function comment
COMMENT ON FUNCTION developer_schema.search_documents_fts(INT, TEXT, INT) IS
'Full-text search on documents using PostgreSQL tsvector/tsquery.

Features:
- Stemming and stop word removal (English)
- Searches filename for matches
- Relevance ranking
- Highlighted excerpts showing matched terms

Parameters:
  - p_user_id: ID of the user
  - p_query: Search query (natural language)
  - p_limit: Maximum results (default 20)

Returns:
  - id, filename, file_type, file_size
  - page_count, processing_status, file_path
  - rank: Relevance score (higher = more relevant)
  - headline: Filename with <mark> tags around matches
  - created_at, updated_at

Supported query syntax:
  - Simple words: "thesis biology"
  - Phrases: "machine learning"
  - Boolean (via websearch): "thesis -draft"

Example:
  SELECT * FROM developer_schema.search_documents_fts(1, ''thesis'', 10);
';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION developer_schema.search_documents_fts(INT, TEXT, INT)
    TO synapse_user;
