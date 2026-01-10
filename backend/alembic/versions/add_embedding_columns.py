"""Add vector embedding columns to notes and flashcards

Revision ID: add_embedding_columns
Revises: 29017093e61c
Create Date: 2025-12-28

This migration adds the embedding columns that may already exist in the DB.
Uses raw SQL with existence checks for idempotency - safe to run on both
fresh and existing databases.
"""

from alembic import op


# revision identifiers, used by Alembic.
revision = "add_embedding_columns"
down_revision = "29017093e61c"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Enable pgvector extension (idempotent)
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    # Add embedding column to notes if not exists
    # Uses 1536 dimensions for text-embedding-3-small (OpenAI)
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_schema = current_schema() 
                AND table_name = 'notes' 
                AND column_name = 'embedding'
            ) THEN
                ALTER TABLE notes ADD COLUMN embedding vector(1536);
            END IF;
        END $$;
    """)

    # Add content_embedding column to flashcards if not exists
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_schema = current_schema() 
                AND table_name = 'flashcards' 
                AND column_name = 'content_embedding'
            ) THEN
                ALTER TABLE flashcards ADD COLUMN content_embedding vector(1536);
            END IF;
        END $$;
    """)


def downgrade() -> None:
    op.execute("ALTER TABLE notes DROP COLUMN IF EXISTS embedding")
    op.execute("ALTER TABLE flashcards DROP COLUMN IF EXISTS content_embedding")
