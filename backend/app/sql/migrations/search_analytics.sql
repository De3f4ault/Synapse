-- =============================================================================
-- Search Analytics Table
-- Tracks every search query for observability, debugging, and future optimization.
--
-- Design principles:
--   1. Every search leaves a trace
--   2. Fire-and-forget INSERT (never blocks search response)
--   3. Lean now, enrichable later
--   4. Click signal updated async via POST /search/click
-- =============================================================================
CREATE TABLE IF NOT EXISTS developer_schema.search_queries (
    id BIGSERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES developer_schema.users(id),
    query TEXT NOT NULL,
    intent TEXT,
    -- navigate | explore | retrieve_context | diagnose
    surface TEXT,
    -- cmdk | chat | dashboard | study_hub
    -- Query understanding (cheap to compute, massive future value)
    query_length INT,
    contains_question BOOLEAN DEFAULT FALSE,
    has_typo BOOLEAN,
    -- Results
    result_count INT,
    engines_used TEXT [],
    -- Candidate counts per engine (before budget trimming — critical for diagnosis)
    candidate_count_hybrid INT,
    candidate_count_rag INT,
    candidate_count_graph INT,
    -- Latency breakdown (per-engine, not just total)
    total_latency_ms INT,
    hybrid_latency_ms INT,
    rag_latency_ms INT,
    graph_latency_ms INT,
    rerank_latency_ms INT,
    -- Click signal (updated async after user clicks a result)
    clicked_entity_id INT,
    clicked_entity_type TEXT,
    clicked_rank INT,
    -- Zero-result auto-retry tracking
    auto_retry BOOLEAN DEFAULT FALSE,
    -- Reformulation tracking
    -- Rule: same user, different query text, within 30 seconds,
    -- optionally low result_count on previous query
    reformulates_previous BOOLEAN DEFAULT FALSE,
    previous_query_id BIGINT REFERENCES developer_schema.search_queries(id),
    time_since_last_query_ms INT,
    created_at TIMESTAMP DEFAULT NOW()
);
-- ============================================================================
-- Indexes
-- ============================================================================
-- Primary access pattern: user's recent searches (dashboard, reformulation detection)
CREATE INDEX IF NOT EXISTS idx_sq_user_time ON developer_schema.search_queries(user_id, created_at DESC);
-- Zero-result queries (quality debugging, auto-retry analysis)
CREATE INDEX IF NOT EXISTS idx_sq_zero_results ON developer_schema.search_queries(query, created_at)
WHERE result_count = 0;
-- Slow queries (latency monitoring, performance debugging)
CREATE INDEX IF NOT EXISTS idx_sq_slow ON developer_schema.search_queries(total_latency_ms DESC)
WHERE total_latency_ms > 500;
-- Time-based queries (admin dashboard, trend analysis)
CREATE INDEX IF NOT EXISTS idx_sq_created_at ON developer_schema.search_queries(created_at DESC);
-- Grant access
GRANT SELECT,
    INSERT,
    UPDATE ON developer_schema.search_queries TO synapse_user;
GRANT USAGE,
    SELECT ON SEQUENCE developer_schema.search_queries_id_seq TO synapse_user;
COMMENT ON TABLE developer_schema.search_queries IS 'Search analytics table. Every search leaves a trace.
Designed for <1k/day with future extensibility.
Click signals are updated async via POST /search/click.
Reformulation detection: same user, different query, within 30s.';