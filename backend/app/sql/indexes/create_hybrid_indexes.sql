-- PostgreSQL Hybrid Search Indexes
-- Created for Notes and Flashcards using pg_search (BM25) and vectorscale (DiskANN)
--
-- Run with: psql -U synapse_user -d synapse -f app/sql/indexes/create_hybrid_indexes.sql
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
-- 2. VECTOR INDEXES (vectorscale / DiskANN)
-- ============================================
-- These enable fast approximate nearest neighbor search
-- DiskANN provides 10x faster queries than standard IVFFlat
-- Drop existing vector indexes if they exist
DROP INDEX IF EXISTS developer_schema.notes_embedding_diskann_idx;
DROP INDEX IF EXISTS developer_schema.flashcards_embedding_diskann_idx;
-- Create DiskANN index on notes embeddings
-- Only for rows that have embeddings (partial index)
CREATE INDEX notes_embedding_diskann_idx ON developer_schema.notes USING diskann (embedding)
WHERE embedding IS NOT NULL;
-- Create DiskANN index on flashcards embeddings
CREATE INDEX flashcards_embedding_diskann_idx ON developer_schema.flashcards USING diskann (content_embedding)
WHERE content_embedding IS NOT NULL;
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