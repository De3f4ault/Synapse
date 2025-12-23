-- ============================================================================
-- SYNAPSE: Document Statistics Materialized View
-- File: app/sql/views/document_stats.sql
--
-- Pre-computed document statistics for fast loading.
-- Refreshed periodically (recommended: every 30 minutes).
-- ============================================================================
-- Drop existing view if exists
DROP MATERIALIZED VIEW IF EXISTS developer_schema.document_stats CASCADE;
-- Create the materialized view
CREATE MATERIALIZED VIEW developer_schema.document_stats AS
SELECT d.id AS document_id,
    d.user_id,
    d.filename,
    d.file_path,
    d.file_type,
    d.file_size,
    d.gemini_file_uri,
    d.gemini_file_expires_at,
    d.processing_status,
    d.page_count,
    d.word_count,
    d.ocr_performed,
    d.sector,
    d.notes,
    d.ai_summary,
    d.reading_progress,
    d.created_at,
    d.updated_at,
    -- Related chat sessions count
    COUNT(DISTINCT cs.id) AS chat_session_count,
    -- Related flashcards (if any deck linked)
    0 AS flashcard_count,
    -- Placeholder for future relationship
    -- Snapshot timestamp
    NOW() AS snapshot_at
FROM developer_schema.documents d
    LEFT JOIN developer_schema.chat_sessions cs ON cs.document_id = d.id
    AND cs.deleted_at IS NULL
WHERE d.deleted_at IS NULL
GROUP BY d.id;
-- Create unique index for CONCURRENTLY refresh support
CREATE UNIQUE INDEX idx_document_stats_document_id ON developer_schema.document_stats (document_id);
-- Create additional indexes for common queries
CREATE INDEX idx_document_stats_user_id ON developer_schema.document_stats (user_id);
CREATE INDEX idx_document_stats_user_created ON developer_schema.document_stats (user_id, created_at DESC);
CREATE INDEX idx_document_stats_sector ON developer_schema.document_stats (sector)
WHERE sector IS NOT NULL;
-- Add view comment
COMMENT ON MATERIALIZED VIEW developer_schema.document_stats IS 'Pre-computed document statistics per document.

Columns:
- document_id: Document identifier
- user_id: User who owns the document
- Core document fields (filename, file_type, etc.)
- chat_session_count: Number of chat sessions using this document
- snapshot_at: When this data was generated

Refresh command:
  REFRESH MATERIALIZED VIEW CONCURRENTLY developer_schema.document_stats;

Recommended refresh interval: Every 30 minutes
';
-- Grant permissions
GRANT SELECT ON developer_schema.document_stats TO synapse_user;
-- Function to refresh this view
CREATE OR REPLACE FUNCTION developer_schema.refresh_document_stats() RETURNS void LANGUAGE plpgsql AS $$ BEGIN REFRESH MATERIALIZED VIEW CONCURRENTLY developer_schema.document_stats;
END;
$$;
GRANT EXECUTE ON FUNCTION developer_schema.refresh_document_stats() TO synapse_user;