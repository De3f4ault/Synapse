-- PostgreSQL Hybrid Search Indexes
-- Notes and Flashcards: pg_search (BM25) + pgvector (HNSW)
--
-- Run with: psql -U synapse_user -d synapse -f app/sql/indexes/create_hybrid_indexes.sql
--
-- NOTE: DiskANN (vectorscale) indexes have been removed. The HNSW indexes below
-- serve identical queries at current data scale. vectorscale is not available
-- in the paradedb/paradedb Docker image.
-- ============================================
-- 1. BM25 INDEXES (pg_search / ParadeDB)
-- ============================================
-- These enable fast full-text keyword search with BM25 ranking
-- Drop existing BM25 indexes if they exist
DROP INDEX IF EXISTS developer_schema.notes_bm25_idx;
DROP INDEX IF EXISTS developer_schema.flashcards_bm25_idx;
-- Create BM25 index on notes (title + content)
-- pg_search v0.20+ syntax: CREATE INDEX ... USING bm25()
CREATE INDEX notes_bm25_idx ON developer_schema.notes USING bm25 (id, title, content) WITH (key_field = 'id');
-- Create BM25 index on flashcards (front_text + back_text)
CREATE INDEX flashcards_bm25_idx ON developer_schema.flashcards USING bm25 (id, front_text, back_text) WITH (key_field = 'id');
-- ============================================
-- 2. VECTOR INDEXES (pgvector / HNSW)
-- ============================================
-- HNSW indexes are created by Alembic migrations and already exist.
-- At current data scale (<1000 rows), HNSW and DiskANN are equivalent.
-- This section is intentionally empty — do not add DiskANN indexes here;
-- vectorscale is not available in the paradedb/paradedb Docker image.
-- ============================================
-- 3. SUPPORTING INDEXES
-- ============================================
-- User ID indexes for filtering (if not exists)
CREATE INDEX IF NOT EXISTS notes_user_id_idx ON developer_schema.notes (user_id)
WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS flashcards_deck_id_idx ON developer_schema.flashcards (deck_id)
WHERE deleted_at IS NULL;
-- ============================================
-- VERIFICATION
-- ============================================
-- Run this to verify indexes were created:
-- SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'developer_schema';