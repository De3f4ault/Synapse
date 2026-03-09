-- ============================================================================
-- SYNAPSE: Graph Metrics  (Per-Node Degree + Connectivity)
-- File: app/sql/functions/intelligence/graph_metrics.sql
--
-- Computes per-node graph metrics for a user's knowledge graph:
--   - in_degree:  incoming links
--   - out_degree: outgoing links
--   - total_degree: in + out
--   - avg_strength: average link strength
--   - link_types:  distinct link types connected
--
-- Helps identify: orphaned entities, hubs, and clusters.
-- ============================================================================
DROP FUNCTION IF EXISTS developer_schema.graph_metrics(INT, INT);
CREATE OR REPLACE FUNCTION developer_schema.graph_metrics(
        p_user_id INT,
        p_limit INT DEFAULT 50
    ) RETURNS TABLE (
        node_type VARCHAR,
        node_id INT,
        in_degree INT,
        out_degree INT,
        total_degree INT,
        avg_strength DECIMAL(4, 3),
        link_types TEXT [],
        is_orphan BOOLEAN
    ) LANGUAGE plpgsql STABLE PARALLEL SAFE AS $$ BEGIN RETURN QUERY WITH -- Outgoing counts
    out_counts AS (
        SELECT l.source_type::VARCHAR AS etype,
            l.source_id AS eid,
            COUNT(*)::INT AS cnt,
            AVG(l.strength) AS avg_str,
            array_agg(DISTINCT l.link_type::TEXT) AS types
        FROM links l
        WHERE l.user_id = p_user_id
        GROUP BY l.source_type,
            l.source_id
    ),
    -- Incoming counts
    in_counts AS (
        SELECT l.target_type::VARCHAR AS etype,
            l.target_id AS eid,
            COUNT(*)::INT AS cnt,
            AVG(l.strength) AS avg_str,
            array_agg(DISTINCT l.link_type::TEXT) AS types
        FROM links l
        WHERE l.user_id = p_user_id
        GROUP BY l.target_type,
            l.target_id
    ),
    -- Merge into a single node view
    all_nodes AS (
        SELECT etype,
            eid
        FROM out_counts
        UNION
        SELECT etype,
            eid
        FROM in_counts
    )
SELECT n.etype::VARCHAR AS node_type,
    n.eid AS node_id,
    COALESCE(ic.cnt, 0) AS in_degree,
    COALESCE(oc.cnt, 0) AS out_degree,
    COALESCE(ic.cnt, 0) + COALESCE(oc.cnt, 0) AS total_degree,
    ROUND(
        COALESCE(
            (
                COALESCE(oc.avg_str, 0) * COALESCE(oc.cnt, 0) + COALESCE(ic.avg_str, 0) * COALESCE(ic.cnt, 0)
            ) / NULLIF(COALESCE(oc.cnt, 0) + COALESCE(ic.cnt, 0), 0),
            0
        )::NUMERIC,
        3
    )::DECIMAL(4, 3) AS avg_strength,
    -- Merge distinct link_types from both directions
    (
        SELECT array_agg(DISTINCT unnested)
        FROM unnest(
                COALESCE(oc.types, '{}') || COALESCE(ic.types, '{}')
            ) AS unnested
    ) AS link_types,
    -- Orphan: only 1 connection (not 2-connected)
    (COALESCE(ic.cnt, 0) + COALESCE(oc.cnt, 0)) <= 1 AS is_orphan
FROM all_nodes n
    LEFT JOIN out_counts oc ON oc.etype = n.etype
    AND oc.eid = n.eid
    LEFT JOIN in_counts ic ON ic.etype = n.etype
    AND ic.eid = n.eid
ORDER BY (COALESCE(ic.cnt, 0) + COALESCE(oc.cnt, 0)) DESC -- Hubs first
LIMIT p_limit;
END;
$$;
COMMENT ON FUNCTION developer_schema.graph_metrics(INT, INT) IS 'Per-node graph metrics for the knowledge graph.

Returns degree counts, average strength, and connected link types for each node.

Parameters:
  - p_user_id: User scope
  - p_limit: Max nodes to return (default 50, sorted by degree DESC)

Example:
  SELECT * FROM developer_schema.graph_metrics(1, 20);
';
GRANT EXECUTE ON FUNCTION developer_schema.graph_metrics(INT, INT) TO synapse_user;