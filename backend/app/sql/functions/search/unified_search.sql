-- ============================================================================
-- SYNAPSE: Unified Search Across All Content Types (Upgraded to pg_search BM25)
-- File: app/sql/functions/search/unified_search.sql
--
-- Searches flashcards, notes using pg_search BM25, and documents via filename.
-- Returns unified results sorted by relevance.
-- ============================================================================
-- Drop existing function if exists
DROP FUNCTION IF EXISTS developer_schema.unified_search(INT, TEXT, INT);
-- Create the unified search function
CREATE OR REPLACE FUNCTION developer_schema.unified_search(
        p_user_id INT,
        p_query TEXT,
        p_limit INT DEFAULT 20
    ) RETURNS TABLE (
        result_type VARCHAR(20),
        id INT,
        title TEXT,
        content TEXT,
        headline TEXT,
        relevance_score REAL,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE,
        updated_at TIMESTAMP WITH TIME ZONE
    ) LANGUAGE plpgsql STABLE PARALLEL SAFE AS $func$
DECLARE v_sql TEXT;
v_op TEXT := '@' || '@' || '@';
v_tsquery tsquery;
BEGIN -- Handle empty query
IF p_query IS NULL
OR TRIM(p_query) = '' THEN RETURN;
END IF;
-- Create tsquery for document filename search (fallback)
BEGIN v_tsquery := plainto_tsquery('english', p_query);
EXCEPTION
WHEN OTHERS THEN v_tsquery := websearch_to_tsquery('english', p_query);
END;
-- Build dynamic SQL for BM25 searches
v_sql := '
    WITH 
    -- =========================================================================
    -- FLASHCARDS via pg_search BM25
    -- =========================================================================
    flashcard_results AS (
        SELECT
            ''flashcard''::VARCHAR(20) AS result_type,
            f.id,
            f.front_text AS title,
            LEFT(f.back_text, 200) AS content,
            pdb.snippet(f.front_text) AS headline,
            pdb.score(f.id) AS relevance_score,
            jsonb_build_object(
                ''deck_id'', f.deck_id,
                ''deck_name'', d.name,
                ''learning_state'', COALESCE(f.learning_state, ''new'')::TEXT,
                ''times_reviewed'', COALESCE(f.times_reviewed, 0),
                ''ease_factor'', COALESCE(f.ease_factor, 2.5)
            ) AS metadata,
            f.created_at,
            f.updated_at
        FROM developer_schema.flashcards f
        INNER JOIN developer_schema.decks d ON f.deck_id = d.id
        WHERE d.user_id = ' || p_user_id || '
          AND f.deleted_at IS NULL
          AND d.deleted_at IS NULL
          AND f.front_text ' || v_op || ' ' || quote_literal(p_query) || '
        ORDER BY pdb.score(f.id) DESC
        LIMIT ' || p_limit || '
    ),

    -- =========================================================================
    -- NOTES via pg_search BM25
    -- =========================================================================
    note_results AS (
        SELECT
            ''note''::VARCHAR(20) AS result_type,
            n.id,
            n.title::TEXT,
            LEFT(n.content, 200) AS content,
            pdb.snippet(n.title) AS headline,
            pdb.score(n.id) AS relevance_score,
            jsonb_build_object(
                ''format'', COALESCE(n.format, ''markdown'')::TEXT,
                ''parent_id'', n.parent_id,
                ''has_children'', EXISTS(
                    SELECT 1 FROM developer_schema.notes child
                    WHERE child.parent_id = n.id AND child.deleted_at IS NULL
                )
            ) AS metadata,
            n.created_at,
            n.updated_at
        FROM developer_schema.notes n
        WHERE n.user_id = ' || p_user_id || '
          AND n.deleted_at IS NULL
          AND n.title ' || v_op || ' ' || quote_literal(p_query) || '
        ORDER BY pdb.score(n.id) DESC
        LIMIT ' || p_limit || '
    ),

    -- =========================================================================
    -- DOCUMENTS via filename (ILIKE fallback - no BM25 index)
    -- =========================================================================
    document_results AS (
        SELECT
            ''document''::VARCHAR(20) AS result_type,
            d.id,
            d.filename AS title,
            NULL::TEXT AS content,
            d.filename AS headline,
            CASE 
                WHEN d.filename ILIKE ' || quote_literal('%' || p_query || '%') || ' THEN 1.0 
                ELSE 0.5 
            END::REAL AS relevance_score,
            jsonb_build_object(
                ''file_type'', COALESCE(d.file_type, ''unknown'')::TEXT,
                ''file_size'', COALESCE(d.file_size, 0),
                ''page_count'', d.page_count,
                ''processing_status'', COALESCE(d.processing_status, ''pending'')::TEXT,
                ''file_path'', d.file_path
            ) AS metadata,
            d.created_at,
            d.updated_at
        FROM developer_schema.documents d
        WHERE d.user_id = ' || p_user_id || '
          AND d.deleted_at IS NULL
          AND d.filename ILIKE ' || quote_literal('%' || p_query || '%') || '
        LIMIT ' || p_limit || '
    ),

    combined_results AS (
        SELECT * FROM flashcard_results
        UNION ALL
        SELECT * FROM note_results
        UNION ALL
        SELECT * FROM document_results
    )

    SELECT *
    FROM combined_results
    ORDER BY
        relevance_score DESC,
        updated_at DESC
    LIMIT ' || p_limit;
RETURN QUERY EXECUTE v_sql;
END;
$func$;
-- Add function comment
COMMENT ON FUNCTION developer_schema.unified_search(INT, TEXT, INT) IS 'Unified search across flashcards, notes (pg_search BM25), and documents (filename ILIKE).

Features:
- BM25 ranking for flashcards and notes
- Highlighted snippets via pdb.snippet()
- Type-specific metadata in JSONB format

Parameters:
  - p_user_id: ID of the user
  - p_query: Search query
  - p_limit: Maximum results (default 20)

Returns:
  - result_type: flashcard|note|document
  - id, title, content, headline
  - relevance_score: BM25 score for notes/flashcards
  - metadata: Type-specific JSONB data
  - created_at, updated_at

Example:
  SELECT * FROM developer_schema.unified_search(1, ''machine learning'', 20);
';
-- Grant execute permission
GRANT EXECUTE ON FUNCTION developer_schema.unified_search(INT, TEXT, INT) TO synapse_user;