-- =============================================================================
-- Intelligent Search Function V3
-- Features: Exact/Prefix/Substring/Fuzzy ranking, Multi-word, Context awareness
-- =============================================================================
DROP FUNCTION IF EXISTS developer_schema.search_conversations_v3(INT, TEXT, INT, BOOLEAN);
CREATE OR REPLACE FUNCTION developer_schema.search_conversations_v3(
        p_user_id INT,
        p_query TEXT,
        p_limit INT DEFAULT 30,
        p_include_inactive BOOLEAN DEFAULT FALSE
    ) RETURNS TABLE (
        session_id INT,
        session_title VARCHAR(500),
        message_id INT,
        message_role TEXT,
        message_content TEXT,
        message_snippet TEXT,
        relevance_score REAL,
        match_type TEXT,
        match_context TEXT,
        created_at TIMESTAMPTZ
    ) LANGUAGE plpgsql STABLE AS $func$
DECLARE v_op TEXT := '@' || '@' || '@';
v_query_lower TEXT := lower(trim(p_query));
v_safe_query TEXT;
v_inactive_filter TEXT;
BEGIN IF p_include_inactive THEN v_inactive_filter := '';
ELSE v_inactive_filter := 'AND m.is_active = true';
END IF;

v_safe_query := substring(trim(regexp_replace(p_query, '[^a-zA-Z0-9\s]', ' ', 'g')) from 1 for 200);

-- ==== STAGE 1: Title Exact Matches (score: 10.0) ====
RETURN QUERY
SELECT s.id AS session_id,
    s.title::VARCHAR(500) AS session_title,
    NULL::INT AS message_id,
    'title'::TEXT AS message_role,
    s.title::TEXT AS message_content,
    s.title::TEXT AS message_snippet,
    10.0::REAL AS relevance_score,
    'exact'::TEXT AS match_type,
    'title'::TEXT AS match_context,
    s.created_at
FROM developer_schema.chat_sessions s
WHERE s.user_id = p_user_id
    AND s.deleted_at IS NULL
    AND lower(s.title) = v_query_lower
LIMIT p_limit / 6;
-- ==== STAGE 2: Title Prefix Matches (score: 8.0) ====
RETURN QUERY
SELECT s.id AS session_id,
    s.title::VARCHAR(500) AS session_title,
    NULL::INT AS message_id,
    'title'::TEXT AS message_role,
    s.title::TEXT AS message_content,
    s.title::TEXT AS message_snippet,
    8.0::REAL AS relevance_score,
    'prefix'::TEXT AS match_type,
    'title'::TEXT AS match_context,
    s.created_at
FROM developer_schema.chat_sessions s
WHERE s.user_id = p_user_id
    AND s.deleted_at IS NULL
    AND lower(s.title) LIKE v_query_lower || '%'
    AND lower(s.title) != v_query_lower -- Exclude exact matches
ORDER BY length(s.title)
LIMIT p_limit / 6;
-- ==== STAGE 3: BM25 Message Matches (score: 5.0 + pdb.score) ====
RETURN QUERY EXECUTE format(
    '
        SELECT 
            m.session_id,
            s.title::VARCHAR(500) AS session_title,
            m.id AS message_id,
            m.role::TEXT AS message_role,
            LEFT(m.content, 200) AS message_content,
            COALESCE(pdb.snippet(m.content, max_num_chars => 150), LEFT(m.content, 150)) AS message_snippet,
            (5.0 + pdb.score(m.id))::REAL AS relevance_score,
            ''bm25''::TEXT AS match_type,
            CASE WHEN m.role = ''user'' THEN ''user_message'' ELSE ''assistant_message'' END AS match_context,
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
    v_safe_query,
    v_inactive_filter,
    p_limit / 3
);
-- ==== STAGE 4: Title Substring Matches (score: 3.0) ====
RETURN QUERY
SELECT s.id AS session_id,
    s.title::VARCHAR(500) AS session_title,
    NULL::INT AS message_id,
    'title'::TEXT AS message_role,
    s.title::TEXT AS message_content,
    s.title::TEXT AS message_snippet,
    3.0::REAL AS relevance_score,
    'substring'::TEXT AS match_type,
    'title'::TEXT AS match_context,
    s.created_at
FROM developer_schema.chat_sessions s
WHERE s.user_id = p_user_id
    AND s.deleted_at IS NULL
    AND lower(s.title) LIKE '%' || v_query_lower || '%'
    AND lower(s.title) NOT LIKE v_query_lower || '%' -- Exclude prefix/exact
ORDER BY s.created_at DESC
LIMIT p_limit / 6;
-- ==== STAGE 5: Message Substring Matches (score: 2.0) ====
RETURN QUERY EXECUTE format(
    '
        SELECT 
            m.session_id,
            s.title::VARCHAR(500) AS session_title,
            m.id AS message_id,
            m.role::TEXT AS message_role,
            LEFT(m.content, 200) AS message_content,
            LEFT(m.content, 150) AS message_snippet,
            2.0::REAL AS relevance_score,
            ''substring''::TEXT AS match_type,
            CASE WHEN m.role = ''user'' THEN ''user_message'' ELSE ''assistant_message'' END AS match_context,
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
    v_safe_query,
    v_inactive_filter,
    p_limit / 3
);
-- ==== STAGE 6: Trigram Fuzzy Matches (word_similarity for long text) ====
IF length(p_query) >= 3 THEN -- Title fuzzy
RETURN QUERY
SELECT s.id AS session_id,
    s.title::VARCHAR(500) AS session_title,
    NULL::INT AS message_id,
    'title'::TEXT AS message_role,
    s.title::TEXT AS message_content,
    s.title::TEXT AS message_snippet,
    (
        word_similarity(v_query_lower, lower(s.title)) * 2.0
    )::REAL AS relevance_score,
    'fuzzy'::TEXT AS match_type,
    'title'::TEXT AS match_context,
    s.created_at
FROM developer_schema.chat_sessions s
WHERE s.user_id = p_user_id
    AND s.deleted_at IS NULL
    AND word_similarity(v_query_lower, lower(s.title)) > 0.3
    AND lower(s.title) NOT LIKE '%' || v_query_lower || '%' -- Exclude substring
ORDER BY word_similarity(v_query_lower, lower(s.title)) DESC
LIMIT p_limit / 6;
-- Message fuzzy using word_similarity (works well for typos in long text)
RETURN QUERY EXECUTE format(
    '
    SELECT 
        m.session_id,
        s.title::VARCHAR(500) AS session_title,
        m.id AS message_id,
        m.role::TEXT AS message_role,
        LEFT(m.content, 200) AS message_content,
        LEFT(m.content, 150) AS message_snippet,
        (word_similarity(%L, m.content) * 2.0)::REAL AS relevance_score,
        ''fuzzy''::TEXT AS match_type,
        CASE WHEN m.role = ''user'' THEN ''user_message'' ELSE ''assistant_message'' END AS match_context,
        m.created_at
    FROM developer_schema.chat_messages m
    INNER JOIN developer_schema.chat_sessions s ON m.session_id = s.id
    WHERE s.user_id = %L
      AND s.deleted_at IS NULL
      AND word_similarity(%L, m.content) > 0.3
      AND NOT (m.content ILIKE %L)
      %s
    ORDER BY word_similarity(%L, m.content) DESC
    LIMIT %L
',
    p_query,
    p_user_id,
    p_query,
    '%' || p_query || '%',
    v_inactive_filter,
    p_query,
    p_limit / 6
);
END IF;
RETURN;
END;
$func$;
-- Grant permissions
GRANT EXECUTE ON FUNCTION developer_schema.search_conversations_v3(INT, TEXT, INT, BOOLEAN) TO synapse_user;
-- Comment
COMMENT ON FUNCTION developer_schema.search_conversations_v3 IS 'Intelligent search with ranked results:
- Exact title match: 10.0
- Prefix match: 8.0
- BM25 full-word: 5.0 + score
- Substring: 3.0 (title) / 2.0 (message)
- Fuzzy (trigram): similarity * 2.0

Returns match_type and match_context for grouping.';