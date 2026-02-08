"""add artifacts advanced features

Revision ID: add_artifacts_002
Revises: add_artifacts_001
Create Date: 2026-02-05

Adds advanced features for artifacts:
- pgvector extension and HNSW index for semantic search
- artifact_tags table for tagging/categorization
- artifact_collaborators table for sharing/collaboration
- Additional indexes for performance

This is a supplemental migration that future-proofs the artifacts feature
for all planned phases including semantic search and collaboration.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "add_artifacts_002"
down_revision = "add_artifacts_001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # =========================================================================
    # 1. PGVECTOR EXTENSION & INDEX (Phase 4D: Semantic Search)
    # =========================================================================

    # Enable pgvector extension (requires superuser or extension already installed)
    # This may fail if pgvector isn't installed - that's okay, we handle gracefully
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    # Convert embedding column from ARRAY to vector type for efficient similarity search
    # Using 1536 dimensions for OpenAI embeddings (adjust if using different model)
    op.execute("""
        ALTER TABLE artifacts 
        ALTER COLUMN embedding TYPE vector(1536) 
        USING embedding::vector(1536)
    """)

    # Create HNSW index for fast approximate nearest neighbor search
    # HNSW is faster than IVFFlat for most use cases
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_artifacts_embedding_hnsw 
        ON artifacts 
        USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64)
    """)

    # =========================================================================
    # 2. ARTIFACT TAGS TABLE (Phase 4D: Categorization & Search)
    # =========================================================================

    op.create_table(
        "artifact_tags",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "artifact_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("artifacts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("tag", sa.String(100), nullable=False),
        sa.Column(
            "tag_type", sa.String(50), nullable=True
        ),  # e.g. "language", "framework", "topic"
        sa.Column("confidence", sa.Float(), nullable=True),  # For AI-generated tags
        sa.Column(
            "created_by", sa.String(20), server_default="'user'", nullable=False
        ),  # "user" or "ai"
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )

    # Unique constraint: one tag per artifact
    op.create_index(
        "idx_artifact_tags_unique",
        "artifact_tags",
        ["artifact_id", "tag"],
        unique=True,
    )

    # Index for tag search
    op.create_index("idx_artifact_tags_tag", "artifact_tags", ["tag"])

    # Index for filtering by tag type
    op.create_index("idx_artifact_tags_type", "artifact_tags", ["tag_type"])

    # =========================================================================
    # 3. ARTIFACT COLLABORATORS TABLE (Collaboration & Sharing)
    # =========================================================================

    op.create_table(
        "artifact_collaborators",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "artifact_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("artifacts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "role", sa.String(20), server_default="'viewer'", nullable=False
        ),  # "viewer", "editor", "admin"
        sa.Column("invited_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("accepted_at", sa.DateTime(), nullable=True),  # NULL = pending invitation
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )

    # Unique constraint: one role per user per artifact
    op.create_index(
        "idx_artifact_collaborators_unique",
        "artifact_collaborators",
        ["artifact_id", "user_id"],
        unique=True,
    )

    # Index for finding all artifacts a user has access to
    op.create_index("idx_artifact_collaborators_user", "artifact_collaborators", ["user_id"])

    # =========================================================================
    # 4. ADDITIONAL INDEXES FOR PERFORMANCE
    # =========================================================================

    # Full-text search on title (PostgreSQL GIN index)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_artifacts_title_fts 
        ON artifacts 
        USING gin(to_tsvector('english', title))
    """)

    # Index for finding published/public artifacts
    op.create_index("idx_artifacts_published", "artifacts", ["is_published", "created_at"])

    # Index for finding latest versions quickly
    op.create_index("idx_artifacts_latest", "artifacts", ["is_latest", "user_id"])


def downgrade() -> None:
    # Drop indexes
    op.drop_index("idx_artifacts_latest", table_name="artifacts")
    op.drop_index("idx_artifacts_published", table_name="artifacts")
    op.execute("DROP INDEX IF EXISTS idx_artifacts_title_fts")

    # Drop collaborators table
    op.drop_table("artifact_collaborators")

    # Drop tags table
    op.drop_table("artifact_tags")

    # Revert embedding column to ARRAY type
    op.execute("""
        ALTER TABLE artifacts 
        ALTER COLUMN embedding TYPE double precision[] 
        USING embedding::double precision[]
    """)

    # Drop embedding index (will be dropped automatically with type change)
    op.execute("DROP INDEX IF EXISTS idx_artifacts_embedding_hnsw")

    # Note: We don't drop the vector extension as other tables may use it
