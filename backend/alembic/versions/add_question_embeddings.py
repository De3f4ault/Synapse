"""Add prompt_embedding to quiz_questions for semantic routing

Revision ID: add_question_embeddings
Revises: fix_activity_logs_columns
Create Date: 2026-01-16

Phase Q2.1: Enable quiz questions to participate in semantic neighborhoods.

INVARIANT: Embeddings define SEMANTIC NEIGHBORHOODS, not authority or scheduling.
Used for: attention routing, cross-entity surfacing, priority biasing.
Never for: interval modification, ease adjustment, mastery claims.
"""

from alembic import op


# revision identifiers, used by Alembic.
revision = "add_question_embeddings"
down_revision = "fix_activity_logs_columns"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Ensure pgvector extension exists (idempotent)
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    # Add prompt_embedding column (384 dimensions for all-MiniLM-L6-v2)
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_schema = current_schema() 
                AND table_name = 'quiz_questions' 
                AND column_name = 'prompt_embedding'
            ) THEN
                ALTER TABLE quiz_questions ADD COLUMN prompt_embedding vector(384);
            END IF;
        END $$;
    """)

    # Add embedding_model for version tracking
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_schema = current_schema() 
                AND table_name = 'quiz_questions' 
                AND column_name = 'embedding_model'
            ) THEN
                ALTER TABLE quiz_questions ADD COLUMN embedding_model VARCHAR(100);
            END IF;
        END $$;
    """)

    # Add embedding_status for failure tracking
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_schema = current_schema() 
                AND table_name = 'quiz_questions' 
                AND column_name = 'embedding_status'
            ) THEN
                ALTER TABLE quiz_questions ADD COLUMN embedding_status VARCHAR(20) DEFAULT 'PENDING';
            END IF;
        END $$;
    """)

    # Create HNSW index for efficient semantic neighbor queries
    # Using cosine distance (vector_cosine_ops) to match embedding normalization
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_indexes 
                WHERE indexname = 'idx_quiz_questions_embedding_hnsw'
            ) THEN
                CREATE INDEX idx_quiz_questions_embedding_hnsw 
                ON quiz_questions USING hnsw (prompt_embedding vector_cosine_ops)
                WITH (m = 16, ef_construction = 64);
            END IF;
        END $$;
    """)


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_quiz_questions_embedding_hnsw")
    op.execute("ALTER TABLE quiz_questions DROP COLUMN IF EXISTS embedding_status")
    op.execute("ALTER TABLE quiz_questions DROP COLUMN IF EXISTS embedding_model")
    op.execute("ALTER TABLE quiz_questions DROP COLUMN IF EXISTS prompt_embedding")
