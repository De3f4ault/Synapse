-- Hybrid Search Functions for Notes and Flashcards
-- Combines BM25 (keyword) + Vector (semantic) search using RRF fusion
-- ParadeDB 0.20.0+ syntax: ||| for disjunction, pdb.score()
--
-- Run with: psql -U synapse_user -d synapse -f app/sql/functions/hybrid_search.sql
-- ============================================
-- HYBRID SEARCH FOR NOTES
-- Uses simpler BM25 on content column only (most comprehensive)
-- ============================================
DROP FUNCTION IF EXISTS developer_schema.hybrid_search_notes(TEXT, vector, INT, INT, FLOAT, FLOAT, INT);
CREATE OR REPLACE FUNCTION developer_schema.hybrid_search_notes(
        query_text TEXT,
        query_embedding vector(384),
        user_id_filter INT,
        result_limit INT DEFAULT 10,
        bm25_weight FLOAT DEFAULT 0.5,
        vector_weight FLOAT DEFAULT 0.5,
        rrf_k INT DEFAULT 60
    ) RETURNS TABLE (
        id INT,
        title TEXT,
        content TEXT,
        bm25_rank INT,
        bm25_score FLOAT,
        vector_rank INT,
        vector_score FLOAT,
        hybrid_score FLOAT
    ) AS $$
DECLARE bm25_temp_table TEXT := 'temp_bm25_' || md5(random()::text);
vector_temp_table TEXT := 'temp_vector_' || md5(random()::text);
BEGIN -- Create temp table for BM25 results (search content only for simplicity)
EXECUTE format(
    '
        CREATE TEMP TABLE %I AS
        SELECT 
            n.id,
            n.title,
            n.content,
            ROW_NUMBER() OVER (ORDER BY pdb.score(n.id) DESC) AS rank,
            pdb.score(n.id)::FLOAT AS score
        FROM developer_schema.notes n
        WHERE 
            n.user_id = %L
            AND n.deleted_at IS NULL
            AND n.content ||| %L
        ORDER BY pdb.score(n.id) DESC
        LIMIT %L
    ',
    bm25_temp_table,
    user_id_filter,
    query_text,
    result_limit * 2
);
-- Create temp table for vector results
EXECUTE format(
    '
        CREATE TEMP TABLE %I AS
        SELECT 
            n.id,
            n.title,
            n.content,
            ROW_NUMBER() OVER (ORDER BY n.embedding <=> %L::vector) AS rank,
            (1 - (n.embedding <=> %L::vector))::FLOAT AS score
        FROM developer_schema.notes n
        WHERE 
            n.user_id = %L
            AND n.deleted_at IS NULL
            AND n.embedding IS NOT NULL
        ORDER BY n.embedding <=> %L::vector
        LIMIT %L
    ',
    vector_temp_table,
    query_embedding::text,
    query_embedding::text,
    user_id_filter,
    query_embedding::text,
    result_limit * 2
);
-- Combine using RRF and return
RETURN QUERY EXECUTE format(
    '
        WITH combined AS (
            SELECT 
                COALESCE(b.id, v.id) AS id,
                COALESCE(b.title, v.title)::TEXT AS title,
                COALESCE(b.content, v.content)::TEXT AS content,
                COALESCE(b.rank, %L * 3)::INT AS bm25_rank,
                COALESCE(b.score, 0)::FLOAT AS bm25_score,
                COALESCE(v.rank, %L * 3)::INT AS vector_rank,
                COALESCE(v.score, 0)::FLOAT AS vector_score,
                (%L * (1.0 / (%L + COALESCE(b.rank, %L * 3))) +
                 %L * (1.0 / (%L + COALESCE(v.rank, %L * 3))))::FLOAT AS hybrid_score
            FROM %I b
            FULL OUTER JOIN %I v ON b.id = v.id
        )
        SELECT 
            c.id::INT,
            c.title::TEXT,
            c.content::TEXT,
            c.bm25_rank,
            c.bm25_score,
            c.vector_rank,
            c.vector_score,
            c.hybrid_score
        FROM combined c
        ORDER BY c.hybrid_score DESC
        LIMIT %L
    ',
    result_limit,
    result_limit,
    bm25_weight,
    rrf_k,
    result_limit,
    vector_weight,
    rrf_k,
    result_limit,
    bm25_temp_table,
    vector_temp_table,
    result_limit
);
-- Cleanup
EXECUTE format('DROP TABLE IF EXISTS %I', bm25_temp_table);
EXECUTE format('DROP TABLE IF EXISTS %I', vector_temp_table);
END;
$$ LANGUAGE plpgsql;
-- ============================================
-- HYBRID SEARCH FOR FLASHCARDS
-- ============================================
DROP FUNCTION IF EXISTS developer_schema.hybrid_search_flashcards(TEXT, vector, INT, INT, FLOAT, FLOAT, INT);
CREATE OR REPLACE FUNCTION developer_schema.hybrid_search_flashcards(
        query_text TEXT,
        query_embedding vector(384),
        user_id_filter INT,
        result_limit INT DEFAULT 10,
        bm25_weight FLOAT DEFAULT 0.5,
        vector_weight FLOAT DEFAULT 0.5,
        rrf_k INT DEFAULT 60
    ) RETURNS TABLE (
        id INT,
        front_text TEXT,
        back_text TEXT,
        deck_id INT,
        bm25_rank INT,
        bm25_score FLOAT,
        vector_rank INT,
        vector_score FLOAT,
        hybrid_score FLOAT
    ) AS $$
DECLARE bm25_temp_table TEXT := 'temp_fc_bm25_' || md5(random()::text);
vector_temp_table TEXT := 'temp_fc_vector_' || md5(random()::text);
BEGIN -- Create temp table for BM25 results (search both front and back text)
EXECUTE format(
    '
        CREATE TEMP TABLE %I AS
        SELECT 
            f.id,
            f.front_text,
            f.back_text,
            f.deck_id,
            ROW_NUMBER() OVER (ORDER BY pdb.score(f.id) DESC) AS rank,
            pdb.score(f.id)::FLOAT AS score
        FROM developer_schema.flashcards f
        INNER JOIN developer_schema.decks d ON f.deck_id = d.id
        WHERE 
            d.user_id = %L
            AND f.deleted_at IS NULL
            AND d.deleted_at IS NULL
            AND f.front_text ||| %L
        ORDER BY pdb.score(f.id) DESC
        LIMIT %L
    ',
    bm25_temp_table,
    user_id_filter,
    query_text,
    result_limit * 2
);
-- Create temp table for vector results
EXECUTE format(
    '
        CREATE TEMP TABLE %I AS
        SELECT 
            f.id,
            f.front_text,
            f.back_text,
            f.deck_id,
            ROW_NUMBER() OVER (ORDER BY f.content_embedding <=> %L::vector) AS rank,
            (1 - (f.content_embedding <=> %L::vector))::FLOAT AS score
        FROM developer_schema.flashcards f
        INNER JOIN developer_schema.decks d ON f.deck_id = d.id
        WHERE 
            d.user_id = %L
            AND f.deleted_at IS NULL
            AND d.deleted_at IS NULL
            AND f.content_embedding IS NOT NULL
        ORDER BY f.content_embedding <=> %L::vector
        LIMIT %L
    ',
    vector_temp_table,
    query_embedding::text,
    query_embedding::text,
    user_id_filter,
    query_embedding::text,
    result_limit * 2
);
-- Combine using RRF
RETURN QUERY EXECUTE format(
    '
        WITH combined AS (
            SELECT 
                COALESCE(b.id, v.id) AS id,
                COALESCE(b.front_text, v.front_text) AS front_text,
                COALESCE(b.back_text, v.back_text) AS back_text,
                COALESCE(b.deck_id, v.deck_id) AS deck_id,
                COALESCE(b.rank, %L * 3)::INT AS bm25_rank,
                COALESCE(b.score, 0)::FLOAT AS bm25_score,
                COALESCE(v.rank, %L * 3)::INT AS vector_rank,
                COALESCE(v.score, 0)::FLOAT AS vector_score,
                (%L * (1.0 / (%L + COALESCE(b.rank, %L * 3))) +
                 %L * (1.0 / (%L + COALESCE(v.rank, %L * 3))))::FLOAT AS hybrid_score
            FROM %I b
            FULL OUTER JOIN %I v ON b.id = v.id
        )
        SELECT 
            c.id::INT,
            c.front_text,
            c.back_text,
            c.deck_id::INT,
            c.bm25_rank,
            c.bm25_score,
            c.vector_rank,
            c.vector_score,
            c.hybrid_score
        FROM combined c
        ORDER BY c.hybrid_score DESC
        LIMIT %L
    ',
    result_limit,
    result_limit,
    bm25_weight,
    rrf_k,
    result_limit,
    vector_weight,
    rrf_k,
    result_limit,
    bm25_temp_table,
    vector_temp_table,
    result_limit
);
-- Cleanup
EXECUTE format('DROP TABLE IF EXISTS %I', bm25_temp_table);
EXECUTE format('DROP TABLE IF EXISTS %I', vector_temp_table);
END;
$$ LANGUAGE plpgsql;
-- ============================================
-- SIMPLE VECTOR-ONLY SEARCH (for comparison)
-- ============================================
DROP FUNCTION IF EXISTS developer_schema.vector_search_notes(vector, INT, INT);
CREATE OR REPLACE FUNCTION developer_schema.vector_search_notes(
        query_embedding vector(384),
        user_id_filter INT,
        result_limit INT DEFAULT 10
    ) RETURNS TABLE (
        id INT,
        title TEXT,
        content TEXT,
        similarity FLOAT
    ) AS $$ BEGIN RETURN QUERY
SELECT n.id,
    n.title,
    n.content,
    (1 - (n.embedding <=> query_embedding))::FLOAT AS similarity
FROM developer_schema.notes n
WHERE n.user_id = user_id_filter
    AND n.deleted_at IS NULL
    AND n.embedding IS NOT NULL
ORDER BY n.embedding <=> query_embedding
LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;
-- Grant permissions
GRANT EXECUTE ON FUNCTION developer_schema.hybrid_search_notes(TEXT, vector, INT, INT, FLOAT, FLOAT, INT) TO synapse_user;
GRANT EXECUTE ON FUNCTION developer_schema.hybrid_search_flashcards(TEXT, vector, INT, INT, FLOAT, FLOAT, INT) TO synapse_user;
GRANT EXECUTE ON FUNCTION developer_schema.vector_search_notes(vector, INT, INT) TO synapse_user;