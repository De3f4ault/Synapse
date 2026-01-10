-- =============================================================================
-- Production-Grade Search Function for Chat Conversations (v2)
-- Features: BM25, ILIKE fallback, Trigram fuzzy search
-- =============================================================================
DROP FUNCTION IF EXISTS developer_schema.search_conversations_v2(INT, TEXT, INT, BOOLEAN, BOOLEAN, INT);
CREATE OR REPLACE FUNCTION developer_schema.search_conversations_v2(
        p_user_id INT,
        p_query TEXT,
        p_limit INT DEFAULT 20,
        p_include_inactive BOOLEAN DEFAULT FALSE,
        p_fuzzy BOOLEAN DEFAULT TRUE,
        p_fuzzy_distance INT DEFAULT 1
    ) RETURNS TABLE (
        session_id INT,
        session_title VARCHAR(500),
        message_id INT,
        message_role TEXT,
        message_content TEXT,
        message_snippet TEXT,
        relevance_score REAL,
        match_type TEXT,
        created_at TIMESTAMPTZ
    ) LANGUAGE plpgsql STABLE AS $func$
DECLARE v_op TEXT := '@' || '@' || '@';
-- pg_search operator
v_inactive_filter TEXT;
BEGIN -- Build inactive filter
IF p_include_inactive THEN v_inactive_filter := '';
ELSE v_inactive_filter := 'AND m.is_active = true';
END IF;
-- ==== STAGE 1: BM25 exact match (highest quality) ====
RETURN QUERY EXECUTE format(
    '
        SELECT 
            m.session_id,
            s.title::VARCHAR(500) AS session_title,
            m.id AS message_id,
            m.role::TEXT AS message_role,
            LEFT(m.content, 200) AS message_content,
            COALESCE(
                pdb.snippet(m.content, max_num_chars => 150),
                LEFT(m.content, 150)
            ) AS message_snippet,
            pdb.score(m.id)::REAL AS relevance_score,
            ''exact''::TEXT AS match_type,
            m.created_at
        FROM developer_schema.chat_messages m
        INNER JOIN developer_schema.chat_sessions s ON m.session_id = s.id
        WHERE s.user_id = %L
          AND s.deleted_at IS NULL
          AND m.content %s %L
          %s
        ORDER BY pdb.score(m.id) DESC
        LIMIT %L
    ',
    p_user_id,
    v_op,
    p_query,
    v_inactive_filter,
    p_limit
);
-- ==== STAGE 2: ILIKE substring match ====
RETURN QUERY EXECUTE format(
    '
        SELECT 
            m.session_id,
            s.title::VARCHAR(500) AS session_title,
            m.id AS message_id,
            m.role::TEXT AS message_role,
            LEFT(m.content, 200) AS message_content,
            LEFT(m.content, 150) AS message_snippet,
            0.5::REAL AS relevance_score,
            ''substring''::TEXT AS match_type,
            m.created_at
        FROM developer_schema.chat_messages m
        INNER JOIN developer_schema.chat_sessions s ON m.session_id = s.id
        WHERE s.user_id = %L
          AND s.deleted_at IS NULL
          AND m.content ILIKE %L
          AND NOT (m.content %s %L)
          %s
        ORDER BY m.created_at DESC
        LIMIT %L
    ',
    p_user_id,
    '%' || p_query || '%',
    v_op,
    p_query,
    v_inactive_filter,
    p_limit
);
-- ==== STAGE 3: Trigram fuzzy match (catches typos) ====
IF p_fuzzy
AND length(p_query) >= 3 THEN RETURN QUERY EXECUTE format(
    '
            SELECT 
                m.session_id,
                s.title::VARCHAR(500) AS session_title,
                m.id AS message_id,
                m.role::TEXT AS message_role,
                LEFT(m.content, 200) AS message_content,
                LEFT(m.content, 150) AS message_snippet,
                similarity(m.content, %L)::REAL AS relevance_score,
                ''fuzzy''::TEXT AS match_type,
                m.created_at
            FROM developer_schema.chat_messages m
            INNER JOIN developer_schema.chat_sessions s ON m.session_id = s.id
            WHERE s.user_id = %L
              AND s.deleted_at IS NULL
              AND m.content %s %L
              AND NOT (m.content %s %L)
              AND NOT (m.content ILIKE %L)
              %s
            ORDER BY similarity(m.content, %L) DESC
            LIMIT %L
        ',
    p_query,
    p_user_id,
    '%',
    p_query,
    v_op,
    p_query,
    '%' || p_query || '%',
    v_inactive_filter,
    p_query,
    p_limit
);
END IF;
RETURN;
END;
$func$;
-- Grant permissions
GRANT EXECUTE ON FUNCTION developer_schema.search_conversations_v2(INT, TEXT, INT, BOOLEAN, BOOLEAN, INT) TO synapse_user;
-- Comment
COMMENT ON FUNCTION developer_schema.search_conversations_v2 IS 'Production search with 3-stage fallback: BM25 → ILIKE → Trigram';