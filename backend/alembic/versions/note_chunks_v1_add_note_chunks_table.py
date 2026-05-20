"""add note_chunks table for semantic sub-note retrieval

Revision ID: note_chunks_v1
Revises: webhook_subscriptions_v1
Create Date: 2026-05-06 00:00:00.000000

Each note is chunked by AdvancedSemanticChunker (LlamaIndex SemanticSplitterNodeParser)
on save/update. Chunks are stored here alongside their embeddings for scoped pgvector
similarity search during @mention hydration.

NOTE: The HNSW index on note_chunks.embedding is intentionally deferred to a
separate migration (note_chunks_hnsw_v1). It should be created once row count
exceeds ~1000 via a one-time Celery backfill task, not inline here.

The note-level embedding on the notes table is NOT replaced — it continues to
serve cross-note search. Chunk-level embeddings are exclusively for sub-note
semantic retrieval during @mention hydration.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = "note_chunks_v1"
down_revision = "webhook_subscriptions_v1"
branch_labels = None
depends_on = None

# Embedding dimension — resolved at generation time (not imported) to ensure
# this migration remains runnable even if boundary.py changes in the future.
_EMBEDDING_DIM = 768
_SCHEMA = "developer_schema"


def upgrade():
    # ── Create note_chunks table ───────────────────────────────────────────────
    op.execute(f"""
        CREATE TABLE IF NOT EXISTS {_SCHEMA}.note_chunks (
            id              BIGSERIAL PRIMARY KEY,
            note_id         INTEGER NOT NULL
                                REFERENCES {_SCHEMA}.notes(id)
                                ON DELETE CASCADE,
            user_id         INTEGER NOT NULL,
            chunk_index     INTEGER NOT NULL,
            content         TEXT NOT NULL,
            embedding       vector({_EMBEDDING_DIM}),
            chunking_method TEXT NOT NULL DEFAULT 'semantic',
            created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

            -- Enforce unique chunk positions per note (idempotent re-indexing)
            CONSTRAINT uq_note_chunk_position UNIQUE (note_id, chunk_index)
        )
    """)

    # ── Indexes (separate statements — PostgreSQL does not support INDEX inside
    #    CREATE TABLE) ──────────────────────────────────────────────────────────

    # Primary lookup: WHERE note_id = :id (used by hydrator for scoped search)
    op.execute(f"""
        CREATE INDEX IF NOT EXISTS idx_note_chunks_note_id
            ON {_SCHEMA}.note_chunks (note_id)
    """)

    # Ownership scoping: WHERE user_id = :uid (secondary filter for security)
    op.execute(f"""
        CREATE INDEX IF NOT EXISTS idx_note_chunks_user_id
            ON {_SCHEMA}.note_chunks (user_id)
    """)

    # Ordered chunk reconstruction: ORDER BY chunk_index (used when re-sorting
    # similarity results back into document order before stitching)
    op.execute(f"""
        CREATE INDEX IF NOT EXISTS idx_note_chunks_order
            ON {_SCHEMA}.note_chunks (note_id, chunk_index)
    """)

    # NOTE: The pgvector IVFFlat/HNSW index on `embedding` is intentionally
    # omitted here. See migration note_chunks_hnsw_v1 for that step.


def downgrade():
    op.execute(f"""
        DROP TABLE IF EXISTS {_SCHEMA}.note_chunks
    """)
