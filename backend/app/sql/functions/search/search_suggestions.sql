-- =============================================================================
-- Search Suggestions (Tier 1-2)
--
-- Tier 1: pg_trgm fuzzy match against recent note titles
-- Tier 2: Exact prefix match against note titles
--
-- Called when zero results are returned, or by the suggestion endpoint.
-- Returns candidate query rewrites ranked by trigram similarity.
-- =============================================================================
DROP FUNCTION IF EXISTS developer_schema.search_suggestions(INT, TEXT, INT);
CREATE OR REPLACE FUNCTION developer_schema.search_suggestions(
        p_user_id INT,
        p_query TEXT,
        p_limit INT DEFAULT 5
    ) RETURNS TABLE (
        suggestion TEXT,
        source TEXT,
        -- 'prefix' | 'fuzzy'
        similarity REAL,
        entity_type TEXT -- 'note' | 'flashcard'
    ) LANGUAGE plpgsql STABLE PARALLEL SAFE AS $func$ BEGIN -- ===== TIER 2: Exact prefix matches (higher priority) =====
    RETURN QUERY
SELECT DISTINCT n.title::TEXT AS suggestion,
    'prefix'::TEXT AS source,
    1.0::REAL AS similarity,
    'note'::TEXT AS entity_type
FROM developer_schema.notes n
WHERE n.user_id = p_user_id
    AND n.deleted_at IS NULL
    AND lower(n.title) LIKE lower(trim(p_query)) || '%'
ORDER BY suggestion
LIMIT p_limit;
-- ===== TIER 1: pg_trgm fuzzy matches =====
RETURN QUERY
SELECT DISTINCT n.title::TEXT AS suggestion,
    'fuzzy'::TEXT AS source,
    similarity(lower(n.title), lower(trim(p_query)))::REAL AS similarity,
    'note'::TEXT AS entity_type
FROM developer_schema.notes n
WHERE n.user_id = p_user_id
    AND n.deleted_at IS NULL
    AND similarity(lower(n.title), lower(trim(p_query))) > 0.15
    AND lower(n.title) NOT LIKE lower(trim(p_query)) || '%' -- exclude prefix hits (already returned)
ORDER BY similarity DESC
LIMIT p_limit;
END;
$func$;
COMMENT ON FUNCTION developer_schema.search_suggestions(INT, TEXT, INT) IS 'Tier 1-2 search suggestions using pg_trgm fuzzy matching and prefix matching.
Returns candidate query rewrites ranked by similarity.
Requires: CREATE EXTENSION IF NOT EXISTS pg_trgm;';
GRANT EXECUTE ON FUNCTION developer_schema.search_suggestions(INT, TEXT, INT) TO synapse_user;