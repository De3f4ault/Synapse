-- =============================================================================
-- Hybrid Search Function for Notes
-- Combines BM25 (pg_search) and Semantic (pgvector) search using RRF
-- Based on official ParadeDB documentation patterns
--
-- NOTE: Vector dimension (768) must match boundary.EMBEDDING_DIM.
-- If the embedding model changes, update the parameter type here and
-- run the corresponding Alembic migration to ALTER column types.
-- =============================================================================
CREATE OR REPLACE FUNCTION developer_schema.hybrid_search_notes(
        p_user_id INT,
        p_query TEXT,
        p_query_embedding VECTOR(768) DEFAULT NULL,
        p_limit INT DEFAULT 20,
        p_k INT DEFAULT 60,
        p_search_mode TEXT DEFAULT 'hybrid',
        p_bm25_weight REAL DEFAULT 1.0,
        p_semantic_weight REAL DEFAULT 1.0
    ) RETURNS TABLE (
        id INT,
        title VARCHAR(500),
        content_preview TEXT,
        bm25_rank INT,
        semantic_rank INT,
        rrf_score REAL,
        snippet TEXT
    ) LANGUAGE plpgsql STABLE PARALLEL SAFE AS $func$
DECLARE v_bm25_sql TEXT;
v_semantic_sql TEXT;
v_main_sql TEXT;
v_op TEXT := '@' || '@' || '@';
v_embedding_str TEXT;
v_do_bm25 BOOLEAN;
v_do_semantic BOOLEAN;
v_safe_query TEXT;
BEGIN -- Determine which search modes to use
v_safe_query := substring(trim(regexp_replace(p_query, '[^a-zA-Z0-9\s]', ' ', 'g')) from 1 for 200);

IF v_safe_query = '' THEN
    v_do_bm25 := FALSE;
ELSE
    v_do_bm25 := p_search_mode IN ('bm25', 'hybrid');
END IF;

v_do_semantic := p_search_mode IN ('semantic', 'hybrid')
AND p_query_embedding IS NOT NULL;
-- Convert embedding to string format for SQL
IF p_query_embedding IS NOT NULL THEN v_embedding_str := '''' || p_query_embedding::TEXT || '''::vector(768)';
ELSE v_embedding_str := 'NULL::vector(768)';
END IF;
-- Build BM25 CTE - use subquery to avoid RANK() OVER pdb.score() issue
IF v_do_bm25 THEN v_bm25_sql := '
        bm25_raw AS (
            SELECT 
                n.id,
                n.title,
                LEFT(n.content::text, 200) as content_preview,
                pdb.score(n.id) as score,
                pdb.snippet(n.title) as snippet
            FROM developer_schema.notes n
            WHERE n.user_id = ' || p_user_id || '
              AND n.deleted_at IS NULL
              AND n.title ' || v_op || ' ' || quote_literal(v_safe_query) || '
            ORDER BY pdb.score(n.id) DESC
            LIMIT ' || (p_limit * 2) || '
        ),
        fulltext AS (
            SELECT id, title, content_preview, score, snippet,
                   ROW_NUMBER() OVER (ORDER BY score DESC)::INT as rank
            FROM bm25_raw
        )';
ELSE v_bm25_sql := '
        bm25_raw AS (
            SELECT NULL::INT as id, NULL::VARCHAR(500) as title, 
                   NULL::TEXT as content_preview, NULL::REAL as score,
                   NULL::TEXT as snippet WHERE FALSE
        ),
        fulltext AS (
            SELECT id, title, content_preview, score, snippet,
                   NULL::INT as rank FROM bm25_raw
        )';
END IF;
-- Build Semantic CTE  
IF v_do_semantic THEN v_semantic_sql := '
        semantic AS (
            SELECT
                n.id,
                n.title,
                LEFT(n.content::text, 200) as content_preview,
                (1.0 - (n.embedding <=> ' || v_embedding_str || '))::REAL as score,
                ROW_NUMBER() OVER (ORDER BY n.embedding <=> ' || v_embedding_str || ')::INT AS rank,
                NULL::TEXT as snippet
            FROM developer_schema.notes n
            WHERE n.user_id = ' || p_user_id || '
              AND n.deleted_at IS NULL
              AND n.embedding IS NOT NULL
            ORDER BY n.embedding <=> ' || v_embedding_str || '
            LIMIT ' || (p_limit * 2) || '
        )';
ELSE v_semantic_sql := '
        semantic AS (
            SELECT NULL::INT as id, NULL::VARCHAR(500) as title,
                   NULL::TEXT as content_preview, NULL::REAL as score,
                   NULL::INT as rank, NULL::TEXT as snippet
            WHERE FALSE
        )';
END IF;
-- Build main query
v_main_sql := 'WITH ' || v_bm25_sql || ', ' || v_semantic_sql || ',
        -- Calculate weighted RRF contributions
        rrf AS (
            SELECT 
                f.id, f.title, f.content_preview, 
                f.rank as bm25_rank,
                NULL::INT as semantic_rank,
                (' || p_bm25_weight || '::REAL / (' || p_k || ' + f.rank))::REAL AS rrf_contribution,
                f.snippet
            FROM fulltext f
            WHERE f.id IS NOT NULL
            
            UNION ALL
            
            SELECT 
                s.id, s.title, s.content_preview,
                NULL::INT as bm25_rank,
                s.rank as semantic_rank,
                (' || p_semantic_weight || '::REAL / (' || p_k || ' + s.rank))::REAL AS rrf_contribution,
                s.snippet
            FROM semantic s
            WHERE s.id IS NOT NULL
        )
        
        -- Aggregate and return final results
        SELECT 
            r.id,
            MAX(r.title)::VARCHAR(500) as title,
            MAX(r.content_preview) as content_preview,
            MIN(r.bm25_rank) as bm25_rank,
            MIN(r.semantic_rank) as semantic_rank,
            SUM(r.rrf_contribution)::REAL as rrf_score,
            MAX(r.snippet) as snippet
        FROM rrf r
        GROUP BY r.id
        ORDER BY SUM(r.rrf_contribution) DESC
        LIMIT ' || p_limit;
RETURN QUERY EXECUTE v_main_sql;
END;
$func$;
COMMENT ON FUNCTION developer_schema.hybrid_search_notes(
    INT,
    TEXT,
    VECTOR(768),
    INT,
    INT,
    TEXT,
    REAL,
    REAL
) IS 'Hybrid search combining BM25 (pg_search) and semantic (pgvector) search using Reciprocal Rank Fusion.
Uses two-stage approach for BM25 to avoid pg_search RANK() OVER limitations.
Parameters:
  - p_user_id: Filter results by user
  - p_query: Text search query  
  - p_query_embedding: Vector embedding (768d, must match boundary.EMBEDDING_DIM)
  - p_limit: Maximum results to return (default 20)
  - p_k: RRF smoothing constant (default 60)
  - p_search_mode: bm25|semantic|hybrid (default hybrid)
  - p_bm25_weight: Weight for BM25 results (default 1.0)
  - p_semantic_weight: Weight for semantic results (default 1.0)
';