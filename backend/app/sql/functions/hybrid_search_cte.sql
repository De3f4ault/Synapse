-- Hybrid Search Functions using CTEs (No Temp Tables)
-- Combines BM25 (keyword) + Vector (semantic) search using RRF fusion
-- Uses OPERATOR() syntax because @@@ is tokenized incorrectly in plpgsql
--
-- Run with: psql -U synapse_user -d synapse -f app/sql/functions/hybrid_search_cte.sql
-- ============================================
-- HYBRID SEARCH FOR NOTES (CTE-based)
-- No temp tables = no OID issues
-- ============================================
DROP FUNCTION IF EXISTS developer_schema.hybrid_search_notes_v2(TEXT, vector, INT, INT, FLOAT, FLOAT, INT);
CREATE OR REPLACE FUNCTION developer_schema.hybrid_search_notes_v2(
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
    ) AS $$ BEGIN RETURN QUERY WITH bm25_results AS (
        SELECT n.id,
            n.title,
            n.content,
            ROW_NUMBER() OVER (
                ORDER BY pdb.score(n.id) DESC
            )::INT AS rank,
            pdb.score(n.id)::FLOAT AS score
        FROM developer_schema.notes n
        WHERE n.user_id = user_id_filter
            AND n.deleted_at IS NULL
            AND n.content OPERATOR(pg_catalog.@@ @) query_text
        ORDER BY pdb.score(n.id) DESC
        LIMIT result_limit * 2
    ), vector_results AS (
        SELECT n.id,
            n.title,
            n.content,
            ROW_NUMBER() OVER (
                ORDER BY n.embedding <=> query_embedding
            )::INT AS rank,
            (1 - (n.embedding <=> query_embedding))::FLOAT AS score
        FROM developer_schema.notes n
        WHERE n.user_id = user_id_filter
            AND n.deleted_at IS NULL
            AND n.embedding IS NOT NULL
        ORDER BY n.embedding <=> query_embedding
        LIMIT result_limit * 2
    ), combined AS (
        SELECT COALESCE(b.id, v.id) AS id,
            COALESCE(b.title, v.title) AS title,
            COALESCE(b.content, v.content) AS content,
            COALESCE(b.rank, result_limit * 3)::INT AS bm25_rank,
            COALESCE(b.score, 0)::FLOAT AS bm25_score,
            COALESCE(v.rank, result_limit * 3)::INT AS vector_rank,
            COALESCE(v.score, 0)::FLOAT AS vector_score,
            (
                bm25_weight * (
                    1.0 / (rrf_k + COALESCE(b.rank, result_limit * 3))
                ) + vector_weight * (
                    1.0 / (rrf_k + COALESCE(v.rank, result_limit * 3))
                )
            )::FLOAT AS hybrid_score
        FROM bm25_results b
            FULL OUTER JOIN vector_results v ON b.id = v.id
    )
SELECT c.id::INT,
    c.title::TEXT,
    c.content::TEXT,
    c.bm25_rank,
    c.bm25_score,
    c.vector_rank,
    c.vector_score,
    c.hybrid_score
FROM combined c
ORDER BY c.hybrid_score DESC
LIMIT result_limit;
END;
$$ LANGUAGE plpgsql STABLE;
-- ============================================
-- HYBRID SEARCH FOR FLASHCARDS (CTE-based)
-- ============================================
DROP FUNCTION IF EXISTS developer_schema.hybrid_search_flashcards_v2(TEXT, vector, INT, INT, FLOAT, FLOAT, INT);
CREATE OR REPLACE FUNCTION developer_schema.hybrid_search_flashcards_v2(
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
    ) AS $$ BEGIN RETURN QUERY WITH bm25_results AS (
        SELECT f.id,
            f.front_text,
            f.back_text,
            f.deck_id,
            ROW_NUMBER() OVER (
                ORDER BY pdb.score(f.id) DESC
            )::INT AS rank,
            pdb.score(f.id)::FLOAT AS score
        FROM developer_schema.flashcards f
            INNER JOIN developer_schema.decks d ON f.deck_id = d.id
        WHERE d.user_id = user_id_filter
            AND f.deleted_at IS NULL
            AND d.deleted_at IS NULL
            AND f.front_text OPERATOR(pg_catalog.@@ @) query_text
        ORDER BY pdb.score(f.id) DESC
        LIMIT result_limit * 2
    ), vector_results AS (
        SELECT f.id,
            f.front_text,
            f.back_text,
            f.deck_id,
            ROW_NUMBER() OVER (
                ORDER BY f.content_embedding <=> query_embedding
            )::INT AS rank,
            (1 - (f.content_embedding <=> query_embedding))::FLOAT AS score
        FROM developer_schema.flashcards f
            INNER JOIN developer_schema.decks d ON f.deck_id = d.id
        WHERE d.user_id = user_id_filter
            AND f.deleted_at IS NULL
            AND d.deleted_at IS NULL
            AND f.content_embedding IS NOT NULL
        ORDER BY f.content_embedding <=> query_embedding
        LIMIT result_limit * 2
    ), combined AS (
        SELECT COALESCE(b.id, v.id) AS id,
            COALESCE(b.front_text, v.front_text) AS front_text,
            COALESCE(b.back_text, v.back_text) AS back_text,
            COALESCE(b.deck_id, v.deck_id) AS deck_id,
            COALESCE(b.rank, result_limit * 3)::INT AS bm25_rank,
            COALESCE(b.score, 0)::FLOAT AS bm25_score,
            COALESCE(v.rank, result_limit * 3)::INT AS vector_rank,
            COALESCE(v.score, 0)::FLOAT AS vector_score,
            (
                bm25_weight * (
                    1.0 / (rrf_k + COALESCE(b.rank, result_limit * 3))
                ) + vector_weight * (
                    1.0 / (rrf_k + COALESCE(v.rank, result_limit * 3))
                )
            )::FLOAT AS hybrid_score
        FROM bm25_results b
            FULL OUTER JOIN vector_results v ON b.id = v.id
    )
SELECT c.id::INT,
    c.front_text::TEXT,
    c.back_text::TEXT,
    c.deck_id::INT,
    c.bm25_rank,
    c.bm25_score,
    c.vector_rank,
    c.vector_score,
    c.hybrid_score
FROM combined c
ORDER BY c.hybrid_score DESC
LIMIT result_limit;
END;
$$ LANGUAGE plpgsql STABLE;
-- Grant permissions
GRANT EXECUTE ON FUNCTION developer_schema.hybrid_search_notes_v2(TEXT, vector, INT, INT, FLOAT, FLOAT, INT) TO synapse_user;
GRANT EXECUTE ON FUNCTION developer_schema.hybrid_search_flashcards_v2(TEXT, vector, INT, INT, FLOAT, FLOAT, INT) TO synapse_user;