-- ============================================================================
-- SYNAPSE: Chat Session Statistics Materialized View
-- File: app/sql/views/chat_session_stats.sql
--
-- Pre-computed chat session statistics for fast loading.
-- Refreshed periodically (recommended: every 15 minutes).
-- ============================================================================
-- Drop existing view if exists
DROP MATERIALIZED VIEW IF EXISTS developer_schema.chat_session_stats CASCADE;
-- Create the materialized view
CREATE MATERIALIZED VIEW developer_schema.chat_session_stats AS
SELECT cs.id AS session_id,
    cs.user_id,
    cs.title,
    cs.document_id,
    cs.context_modules,
    cs.total_tokens_used,
    cs.total_cost,
    cs.created_at,
    cs.updated_at,
    -- Message count
    COUNT(cm.id) AS message_count,
    -- Last message timestamp
    MAX(cm.created_at) AS last_message_at,
    -- User messages count
    COUNT(cm.id) FILTER (
        WHERE cm.role = 'user'
    ) AS user_message_count,
    -- Assistant messages count
    COUNT(cm.id) FILTER (
        WHERE cm.role = 'assistant'
    ) AS assistant_message_count,
    -- Snapshot timestamp
    NOW() AS snapshot_at
FROM developer_schema.chat_sessions cs
    LEFT JOIN developer_schema.chat_messages cm ON cm.session_id = cs.id
WHERE cs.deleted_at IS NULL
GROUP BY cs.id;
-- Create unique index for CONCURRENTLY refresh support
CREATE UNIQUE INDEX idx_chat_session_stats_session_id ON developer_schema.chat_session_stats (session_id);
-- Create additional indexes for common queries
CREATE INDEX idx_chat_session_stats_user_id ON developer_schema.chat_session_stats (user_id);
CREATE INDEX idx_chat_session_stats_user_updated ON developer_schema.chat_session_stats (user_id, updated_at DESC);
-- Add view comment
COMMENT ON MATERIALIZED VIEW developer_schema.chat_session_stats IS 'Pre-computed chat session statistics per session.

Columns:
- session_id: Chat session identifier
- user_id: User who owns the session
- title: Session title
- document_id: Optional linked document
- message_count: Total messages in session
- last_message_at: Timestamp of last message
- user_message_count: User messages count
- assistant_message_count: AI responses count
- snapshot_at: When this data was generated

Refresh command:
  REFRESH MATERIALIZED VIEW CONCURRENTLY developer_schema.chat_session_stats;

Recommended refresh interval: Every 15 minutes
';
-- Grant permissions
GRANT SELECT ON developer_schema.chat_session_stats TO synapse_user;
-- Function to refresh this view
CREATE OR REPLACE FUNCTION developer_schema.refresh_chat_session_stats() RETURNS void LANGUAGE plpgsql AS $$ BEGIN REFRESH MATERIALIZED VIEW CONCURRENTLY developer_schema.chat_session_stats;
END;
$$;
GRANT EXECUTE ON FUNCTION developer_schema.refresh_chat_session_stats() TO synapse_user;