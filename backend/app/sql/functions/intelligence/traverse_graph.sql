-- ============================================================================
-- SYNAPSE: Graph Traversal  (Recursive CTE with CYCLE detection)
-- File: app/sql/functions/intelligence/traverse_graph.sql
--
-- PostgreSQL 14+ recursive CTE that traverses the knowledge graph
-- starting from a given entity, expanding outward by N hops.
--
-- Replaces Python N+1 traversal with a single SQL round-trip.
-- ============================================================================
DROP FUNCTION IF EXISTS developer_schema.traverse_graph(INT, VARCHAR, INT, INT, VARCHAR);
CREATE OR REPLACE FUNCTION developer_schema.traverse_graph(
        p_user_id INT,
        -- User scope
        p_start_type VARCHAR,
        -- Starting entity type
        p_start_id INT,
        -- Starting entity ID
        p_max_depth INT DEFAULT 3,
        -- Maximum hops
        p_link_type VARCHAR DEFAULT NULL -- Filter by link_type (NULL = all)
    ) RETURNS TABLE (
        depth INT,
        entity_type VARCHAR,
        entity_id INT,
        via_link_type VARCHAR,
        via_strength DECIMAL(4, 3),
        path TEXT [] -- Full path as array of "type:id" strings
    ) LANGUAGE plpgsql STABLE PARALLEL SAFE AS $$ BEGIN RETURN QUERY WITH RECURSIVE graph AS (
        -- Base case: the starting node
        SELECT 0 AS g_depth,
            p_start_type::VARCHAR AS g_entity_type,
            p_start_id AS g_entity_id,
            NULL::VARCHAR AS g_via_link_type,
            NULL::DECIMAL(4, 3) AS g_via_strength,
            ARRAY [p_start_type || ':' || p_start_id] AS g_path
        UNION ALL
        -- Recursive case: combine outgoing + incoming via a lateral join
        -- that normalizes both edge directions into a unified row set
        SELECT g.g_depth + 1,
            edge.neighbor_type::VARCHAR,
            edge.neighbor_id,
            edge.edge_link_type::VARCHAR,
            ROUND(edge.edge_strength::NUMERIC, 3)::DECIMAL(4, 3),
            g.g_path || (edge.neighbor_type || ':' || edge.neighbor_id)
        FROM graph g
            JOIN LATERAL (
                -- Outgoing: current node is the source
                SELECT l.target_type AS neighbor_type,
                    l.target_id AS neighbor_id,
                    l.link_type AS edge_link_type,
                    l.strength AS edge_strength
                FROM links l
                WHERE l.source_type = g.g_entity_type
                    AND l.source_id = g.g_entity_id
                    AND l.user_id = p_user_id
                    AND (
                        p_link_type IS NULL
                        OR l.link_type = p_link_type
                    )
                UNION ALL
                -- Incoming: current node is the target (backlinks)
                SELECT l.source_type AS neighbor_type,
                    l.source_id AS neighbor_id,
                    l.link_type AS edge_link_type,
                    l.strength AS edge_strength
                FROM links l
                WHERE l.target_type = g.g_entity_type
                    AND l.target_id = g.g_entity_id
                    AND l.user_id = p_user_id
                    AND (
                        p_link_type IS NULL
                        OR l.link_type = p_link_type
                    )
            ) edge ON true
        WHERE g.g_depth < p_max_depth -- Cycle detection: don't revisit nodes already in the path
            AND NOT (edge.neighbor_type || ':' || edge.neighbor_id) = ANY(g.g_path)
    )
SELECT graph.g_depth,
    graph.g_entity_type,
    graph.g_entity_id,
    graph.g_via_link_type,
    graph.g_via_strength,
    graph.g_path
FROM graph
WHERE graph.g_depth > 0 -- Exclude the starting node itself
ORDER BY graph.g_depth,
    graph.g_via_strength DESC NULLS LAST;
END;
$$;
COMMENT ON FUNCTION developer_schema.traverse_graph(INT, VARCHAR, INT, INT, VARCHAR) IS 'Recursive graph traversal with cycle detection.

Walks outgoing AND incoming edges from a starting entity up to p_max_depth hops.
Returns all reachable nodes with the traversal path.

Parameters:
  - p_user_id: User scope (row-level isolation)
  - p_start_type: Starting entity type (e.g., ''document'')
  - p_start_id: Starting entity ID
  - p_max_depth: Maximum hops (default 3)
  - p_link_type: Optional filter by link_type (NULL = all types)

Example:
  SELECT * FROM developer_schema.traverse_graph(1, ''document'', 5, 2);
';
GRANT EXECUTE ON FUNCTION developer_schema.traverse_graph(INT, VARCHAR, INT, INT, VARCHAR) TO synapse_user;