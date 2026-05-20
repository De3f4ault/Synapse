-- RAG Semantic Query Cache
-- Replaces exact-match MD5 cache with vector-similarity-based caching.
-- A new query that is semantically close (cosine sim > 0.92) to a cached query
-- returns the stored result immediately, bypassing Gemini, Qdrant, and the
-- cross-encoder entirely.
--
-- Expected hit rate: 60-80% on repeat-pattern queries (same student, similar
-- phrasing of the same conceptual question across sessions).
--
-- Dependencies: pgvector (already installed for embedding storage)

CREATE TABLE IF NOT EXISTS developer_schema.rag_semantic_cache (
    id          BIGSERIAL PRIMARY KEY,
    user_id     INTEGER       NOT NULL,
    source_type TEXT          NOT NULL DEFAULT 'documents',
    query_text  TEXT          NOT NULL,
    embedding   vector(768)   NOT NULL,
    cached_result JSONB       NOT NULL,
    hit_count   INTEGER       NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    expires_at  TIMESTAMPTZ   NOT NULL
);

-- HNSW index for fast approximate nearest-neighbour cosine searches.
-- ef_construction=64 balances index build time vs recall quality.
CREATE INDEX IF NOT EXISTS rag_semantic_cache_embedding_hnsw_idx
    ON developer_schema.rag_semantic_cache
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- Supporting index for user-scoped expiry sweeps.
CREATE INDEX IF NOT EXISTS rag_semantic_cache_user_expires_idx
    ON developer_schema.rag_semantic_cache (user_id, expires_at);

-- Periodic cleanup: remove expired entries (run via pg_cron or Celery beat).
-- Manual: DELETE FROM developer_schema.rag_semantic_cache WHERE expires_at < NOW();

COMMENT ON TABLE developer_schema.rag_semantic_cache IS
    'Semantic query result cache: stores RAG pipeline results indexed by query embedding for near-miss retrieval.';
