-- BM25 Index for Chat Messages
-- Enables full-text search with BM25 ranking using pg_search (ParadeDB)
--
-- Run with: psql -U synapse_user -d synapse -f app/sql/indexes/chat_messages_bm25_index.sql
-- ============================================
-- Drop existing BM25 index if it exists
DROP INDEX IF EXISTS developer_schema.chat_messages_bm25_idx;
-- Create BM25 index on chat_messages (content)
CREATE INDEX chat_messages_bm25_idx ON developer_schema.chat_messages USING bm25 (id, content) WITH (key_field = id);
-- Verify
SELECT indexname
FROM pg_indexes
WHERE schemaname = 'developer_schema'
    AND indexname LIKE '%chat_messages%';