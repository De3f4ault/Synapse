"""Add content_hash column to documents for deduplication.

Revision ID: add_document_content_hash
Revises: add_synapse_tasks
Create Date: 2026-01-01

"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "add_document_content_hash"
down_revision = "add_synapse_tasks"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add content_hash column for SHA256 deduplication
    op.add_column(
        "documents",
        sa.Column(
            "content_hash",
            sa.String(64),
            nullable=True,  # Nullable for migration; existing docs have no hash
            comment="SHA256 hash of file content for duplicate detection",
        ),
    )

    # Add index for fast duplicate lookups
    op.create_index("ix_documents_content_hash", "documents", ["content_hash"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_documents_content_hash", table_name="documents")
    op.drop_column("documents", "content_hash")
