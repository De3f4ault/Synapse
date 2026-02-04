"""Add is_favorite column to documents.

Phase 2A: Document Actions

Revision ID: document_favorites_001
Revises: document_folders_001
Create Date: 2026-01-22 23:15:00.000000

"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "document_favorites_001"
down_revision = "9be2be9e1b5d"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add is_favorite column with index
    op.add_column(
        "documents",
        sa.Column("is_favorite", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.create_index("ix_documents_is_favorite", "documents", ["is_favorite"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_documents_is_favorite", table_name="documents")
    op.drop_column("documents", "is_favorite")
