"""add artifacts tables

Revision ID: add_artifacts_001
Revises:
Create Date: 2026-02-05

Adds tables for Artifacts feature:
- artifacts: Core artifact storage with pgvector embedding
- artifact_versions: Version history for undo/redo
- artifact_storage: Key-value storage for stateful artifacts
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "add_artifacts_001"
down_revision = "document_favorites_001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create artifacts table (using String columns for type/state for simplicity)
    op.create_table(
        "artifacts",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("slug", sa.String(255), unique=True, nullable=False),
        sa.Column(
            "user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column(
            "session_id",
            sa.Integer(),
            sa.ForeignKey("chat_sessions.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "message_id",
            sa.Integer(),
            sa.ForeignKey("chat_messages.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("type", sa.String(50), nullable=False),  # e.g. "application/vnd.ant.code"
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("language", sa.String(50), nullable=True),
        sa.Column("filename", sa.String(255), nullable=True),
        sa.Column("version", sa.Integer(), server_default="1", nullable=False),
        sa.Column(
            "parent_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("artifacts.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("is_latest", sa.Boolean(), server_default="true", nullable=False),
        sa.Column(
            "state", sa.String(20), server_default="'ready'", nullable=False
        ),  # creating, streaming, ready, error
        sa.Column("is_published", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("public_url", sa.Text(), unique=True, nullable=True),
        sa.Column("view_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column(
            "embedding", sa.dialects.postgresql.ARRAY(sa.Float()), nullable=True
        ),  # Will use pgvector in production
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("length(content) <= 1000000", name="max_content_size"),
    )

    # Create indexes
    op.create_index("idx_artifacts_slug", "artifacts", ["slug"])
    op.create_index("idx_artifacts_user_id", "artifacts", ["user_id"])
    op.create_index("idx_artifacts_session_id", "artifacts", ["session_id"])
    op.create_index("idx_artifacts_user_type_date", "artifacts", ["user_id", "type", "created_at"])
    op.create_index("idx_artifacts_session", "artifacts", ["session_id", "created_at"])

    # Create artifact_versions table
    op.create_table(
        "artifact_versions",
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
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("change_type", sa.String(20), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )

    op.create_index(
        "idx_artifact_versions_artifact",
        "artifact_versions",
        ["artifact_id", "version"],
        unique=True,
    )

    # Create artifact_storage table
    op.create_table(
        "artifact_storage",
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
        sa.Column("storage_key", sa.String(200), nullable=False),
        sa.Column("storage_value", sa.Text(), nullable=False),
        sa.Column("is_shared", sa.Boolean(), default=False, nullable=False),
        sa.Column("value_size_bytes", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("value_size_bytes <= 5242880", name="max_storage_value_size"),
    )

    op.create_index(
        "idx_artifact_storage_key",
        "artifact_storage",
        ["artifact_id", "storage_key", "is_shared"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_table("artifact_storage")
    op.drop_table("artifact_versions")
    op.drop_table("artifacts")
