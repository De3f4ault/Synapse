"""Migrate pgvector columns from 384d to 768d

Revision ID: migrate_pgvector_384_to_768
Revises: add_chat_message_attachments_001
Create Date: 2026-04-06

Aligns all pgvector embedding columns with boundary.EMBEDDING_DIM (768).

The boundary embedder was upgraded from all-MiniLM-L6-v2 (384d) to
nomic-embed-text-v1.5 (768d), but the PostgreSQL columns and SQL
functions were never migrated. This creates a dimension mismatch
where embed_text_sync() produces 768d vectors that PostgreSQL
rejects because columns expect 384d.

This migration:
1. NULLs all existing 384d embeddings (incompatible with new model)
2. ALTERs all 5 vector columns from vector(384) to vector(768)
3. Drops and recreates pgvector indexes for the new dimension
4. Re-deploys the hybrid_search_notes SQL function with vector(768)

After migration, run the backfill script to re-embed all rows:
    python scripts/backfill_embeddings_768.py
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "migrate_pgvector_384_to_768"
down_revision: Union[str, None] = "add_chat_message_attachments_001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Migrate all pgvector columns from 384d to 768d."""

    # =========================================================================
    # Step 1: NULL out incompatible 384d embeddings
    # The old MiniLM vectors cannot be compared with new Nomic vectors.
    # =========================================================================
    op.execute("UPDATE developer_schema.notes SET embedding = NULL WHERE embedding IS NOT NULL")
    op.execute("UPDATE developer_schema.flashcards SET content_embedding = NULL WHERE content_embedding IS NOT NULL")
    op.execute("UPDATE developer_schema.chat_messages SET embedding = NULL WHERE embedding IS NOT NULL")
    op.execute("UPDATE developer_schema.quiz_questions SET prompt_embedding = NULL WHERE prompt_embedding IS NOT NULL")
    op.execute("UPDATE developer_schema.artifacts SET embedding = NULL WHERE embedding IS NOT NULL")

    # Mark all as STALE so the backfill picks them up
    op.execute("UPDATE developer_schema.notes SET embedding_status = 'STALE' WHERE embedding_status = 'READY'")
    op.execute("UPDATE developer_schema.flashcards SET embedding_status = 'STALE' WHERE embedding_status = 'READY'")

    # =========================================================================
    # Step 2: Drop existing pgvector indexes (dimension-specific)
    # =========================================================================
    op.execute("""
        DO $$
        DECLARE
            idx RECORD;
        BEGIN
            FOR idx IN
                SELECT indexname FROM pg_indexes
                WHERE schemaname = 'developer_schema'
                AND indexdef LIKE '%vector_cosine_ops%'
            LOOP
                EXECUTE 'DROP INDEX IF EXISTS developer_schema.' || idx.indexname;
            END LOOP;
        END $$;
    """)

    # =========================================================================
    # Step 3: ALTER column types from vector(384) to vector(768)
    # =========================================================================
    op.execute("ALTER TABLE developer_schema.notes ALTER COLUMN embedding TYPE vector(768)")
    op.execute("ALTER TABLE developer_schema.flashcards ALTER COLUMN content_embedding TYPE vector(768)")
    op.execute("ALTER TABLE developer_schema.chat_messages ALTER COLUMN embedding TYPE vector(768)")
    op.execute("ALTER TABLE developer_schema.quiz_questions ALTER COLUMN prompt_embedding TYPE vector(768)")
    op.execute("ALTER TABLE developer_schema.artifacts ALTER COLUMN embedding TYPE vector(768)")

    # =========================================================================
    # Step 4: Recreate pgvector indexes with new dimension
    # Using HNSW for better recall at scale (ivfflat requires training data)
    # =========================================================================
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_notes_embedding_hnsw
        ON developer_schema.notes
        USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64)
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_flashcards_embedding_hnsw
        ON developer_schema.flashcards
        USING hnsw (content_embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64)
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_chat_messages_embedding_hnsw
        ON developer_schema.chat_messages
        USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64)
    """)

    # =========================================================================
    # Step 5: Re-deploy hybrid_search_notes with vector(768) parameter
    # =========================================================================
    op.execute("""
        DROP FUNCTION IF EXISTS developer_schema.hybrid_search_notes(INT, TEXT, VECTOR(384), INT, INT, TEXT, REAL, REAL);
    """)
    # The function will be re-created by the SQL deployment step
    # (app/sql/functions/search/hybrid_search_notes.sql)


def downgrade() -> None:
    """Revert to 384d (requires re-embedding with MiniLM)."""

    # NULL out 768d embeddings
    op.execute("UPDATE developer_schema.notes SET embedding = NULL WHERE embedding IS NOT NULL")
    op.execute("UPDATE developer_schema.flashcards SET content_embedding = NULL WHERE content_embedding IS NOT NULL")
    op.execute("UPDATE developer_schema.chat_messages SET embedding = NULL WHERE embedding IS NOT NULL")
    op.execute("UPDATE developer_schema.quiz_questions SET prompt_embedding = NULL WHERE prompt_embedding IS NOT NULL")
    op.execute("UPDATE developer_schema.artifacts SET embedding = NULL WHERE embedding IS NOT NULL")

    # Drop HNSW indexes
    op.execute("DROP INDEX IF EXISTS developer_schema.idx_notes_embedding_hnsw")
    op.execute("DROP INDEX IF EXISTS developer_schema.idx_flashcards_embedding_hnsw")
    op.execute("DROP INDEX IF EXISTS developer_schema.idx_chat_messages_embedding_hnsw")

    # Revert column types
    op.execute("ALTER TABLE developer_schema.notes ALTER COLUMN embedding TYPE vector(384)")
    op.execute("ALTER TABLE developer_schema.flashcards ALTER COLUMN content_embedding TYPE vector(384)")
    op.execute("ALTER TABLE developer_schema.chat_messages ALTER COLUMN embedding TYPE vector(384)")
    op.execute("ALTER TABLE developer_schema.quiz_questions ALTER COLUMN prompt_embedding TYPE vector(384)")
    op.execute("ALTER TABLE developer_schema.artifacts ALTER COLUMN embedding TYPE vector(384)")
