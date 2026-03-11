-- ============================================================================
-- SYNAPSE: Recent Activity Feed
-- File: app/sql/functions/get_recent_activity.sql
--
-- Derives activity entries from existing document data.
-- No new tables required — computed from created_at / updated_at timestamps.
-- Returns: action, filename, file_type, timestamp, document_id
-- ============================================================================
CREATE OR REPLACE FUNCTION developer_schema.get_recent_activity(p_user_id INT, p_limit INT DEFAULT 15) RETURNS TABLE(
        action_type TEXT,
        filename TEXT,
        file_type TEXT,
        action_time TIMESTAMPTZ,
        document_id INT
    ) LANGUAGE sql STABLE AS $$ -- Union of different activity types, all derived from existing columns
    (
        -- Recently uploaded documents (created within last 7 days)
        SELECT 'uploaded'::TEXT AS action_type,
            d.filename,
            d.file_type,
            d.created_at AS action_time,
            d.id AS document_id
        FROM developer_schema.documents d
        WHERE d.user_id = p_user_id
            AND d.deleted_at IS NULL
            AND d.created_at >= NOW() - INTERVAL '7 days'
    )
UNION ALL
(
    -- Recently modified documents (updated_at differs from created_at by >1 min)
    SELECT 'modified'::TEXT AS action_type,
        d.filename,
        d.file_type,
        d.updated_at AS action_time,
        d.id AS document_id
    FROM developer_schema.documents d
    WHERE d.user_id = p_user_id
        AND d.deleted_at IS NULL
        AND d.updated_at > d.created_at + INTERVAL '1 minute'
        AND d.updated_at >= NOW() - INTERVAL '7 days'
)
UNION ALL
(
    -- Recently favorited documents
    SELECT 'favorited'::TEXT AS action_type,
        d.filename,
        d.file_type,
        d.updated_at AS action_time,
        d.id AS document_id
    FROM developer_schema.documents d
    WHERE d.user_id = p_user_id
        AND d.deleted_at IS NULL
        AND d.is_favorite = TRUE
        AND d.updated_at >= NOW() - INTERVAL '7 days'
)
ORDER BY action_time DESC
LIMIT p_limit;
$$;
COMMENT ON FUNCTION developer_schema.get_recent_activity(INT, INT) IS 'Returns recent user activity derived from document timestamps.
No separate activity log table — pragmatic approach using existing data.';
GRANT EXECUTE ON FUNCTION developer_schema.get_recent_activity(INT, INT) TO synapse_user;