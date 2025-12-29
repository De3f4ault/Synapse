-- =============================================================================
-- Full-Text Search Function for Chat Conversations
-- Uses pg_search BM25 indexing for keyword search across chat messages
-- Returns sessions + matched messages with snippets
-- =============================================================================
-- Drop existing function if it exists
DROP FUNCTION IF EXISTS developer_schema.search_conversations(INT, TEXT, INT, BOOLEAN);
CREATE OR REPLACE FUNCTION developer_schema.search_conversations(
        p_user_id INT,
        p_query TEXT,
        p_limit INT DEFAULT 20,
        p_include_inactive BOOLEAN DEFAULT FALSE
    ) RETURNS TABLE (
        session_id INT,
        session_title VARCHAR(500),
        message_id INT,
        message_role TEXT,
        message_content TEXT,
        message_snippet TEXT,
        relevance_score REAL,
        created_at TIMESTAMPTZ
    ) LANGUAGE plpgsql STABLE PARALLEL SAFE AS $func$
DECLARE v_op TEXT := '@' || '@' || '@';
-- pg_search match operator
BEGIN RETURN QUERY EXECUTE format(
    '
        WITH matched_messages AS (
            SELECT 
                m.id AS message_id,
                m.session_id,
                m.role::TEXT AS message_role,
                m.content AS message_content,
                pdb.score(m.id) AS score,
                pdb.snippet(m.content, max_num_chars => 150) AS snippet,
                m.created_at,
                m.is_active
            FROM developer_schema.chat_messages m
            INNER JOIN developer_schema.chat_sessions s ON m.session_id = s.id
            WHERE 
                s.user_id = %L
                AND s.deleted_at IS NULL
                AND m.content %s %L
                %s
            ORDER BY pdb.score(m.id) DESC
            LIMIT %L
        )
        SELECT 
            mm.session_id,
            s.title::VARCHAR(500) AS session_title,
            mm.message_id,
            mm.message_role,
            LEFT(mm.message_content, 200) AS message_content,
            mm.snippet AS message_snippet,
            mm.score::REAL AS relevance_score,
            mm.created_at
        FROM matched_messages mm
        INNER JOIN developer_schema.chat_sessions s ON mm.session_id = s.id
        ORDER BY mm.score DESC
    ',
    p_user_id,
    v_op,
    p_query,
    CASE
        WHEN p_include_inactive THEN ''
        ELSE 'AND m.is_active = true'
    END,
    p_limit * 2 -- Fetch more to account for dedup by session
);
END;
$func$;
-- Add comment
COMMENT ON FUNCTION developer_schema.search_conversations(INT, TEXT, INT, BOOLEAN) IS 'Full-text search across chat conversations using pg_search BM25.
Returns matching messages with session context and highlighted snippets.
Parameters:
  - p_user_id: Filter by user
  - p_query: Search query
  - p_limit: Max results (default 20)
  - p_include_inactive: Include inactive branch messages (default false)
';
-- Grant permissions
GRANT EXECUTE ON FUNCTION developer_schema.search_conversations(INT, TEXT, INT, BOOLEAN) TO synapse_user;