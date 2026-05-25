"""Add chat message embedding column and BM25 index.

Revision ID: add_chat_message_embedding
Revises: e5c795423a01
Create Date: 2026-01-11

This migration adds hybrid search support for chat messages:
1. embedding vector(384) column for semantic search
2. BM25 index on content for keyword search
"""

from alembic import op


# revision identifiers, used by Alembic.
revision = "add_chat_message_embedding"
down_revision = "e5c795423a01"  # Last migration
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add embedding column and BM25 index to chat_messages."""

    # Add embedding column (using raw SQL for vector type)
    op.execute("""
        ALTER TABLE developer_schema.chat_messages 
        ADD COLUMN IF NOT EXISTS embedding vector(384);
    """)

    # Create BM25 index for keyword search
    op.execute("""
        CREATE INDEX IF NOT EXISTS chat_messages_bm25_idx 
        ON developer_schema.chat_messages 
        USING bm25 (id, content) 
        WITH (key_field='id');
    """)

    # Create vector index for fast semantic search.
    # NOTE: DiskANN (vectorscale) removed — vectorscale is not available in the
    # paradedb/paradedb Docker image. HNSW (pgvector) is equivalent at current scale.
    op.execute("""
        CREATE INDEX IF NOT EXISTS chat_messages_embedding_idx
        ON developer_schema.chat_messages
        USING hnsw (embedding vector_cosine_ops)
        WITH (m=16, ef_construction=64)
        WHERE embedding IS NOT NULL;
    """)

    # Add index on role for filtering assistant messages
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_chat_messages_role
        ON developer_schema.chat_messages (role);
    """)


def downgrade() -> None:
    """Remove embedding column and indexes."""
    op.execute("DROP INDEX IF EXISTS developer_schema.ix_chat_messages_role;")
    op.execute("DROP INDEX IF EXISTS developer_schema.chat_messages_embedding_idx;")
    op.execute("DROP INDEX IF EXISTS developer_schema.chat_messages_bm25_idx;")
    op.execute("ALTER TABLE developer_schema.chat_messages DROP COLUMN IF EXISTS embedding;")
