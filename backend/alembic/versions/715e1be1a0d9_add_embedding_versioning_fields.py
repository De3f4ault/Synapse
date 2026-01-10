"""Add embedding versioning fields

Revision ID: 715e1be1a0d9
Revises: 8e666190e36e
Create Date: 2026-01-08 04:48:42.865733+00:00

CHANGES:
- Add embedding_model (String 100) to notes and flashcards
- Add embedding_status (String 20) to notes and flashcards
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "715e1be1a0d9"
down_revision = "8e666190e36e"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add embedding versioning fields to flashcards
    op.add_column("flashcards", sa.Column("embedding_model", sa.String(length=100), nullable=True))
    op.add_column("flashcards", sa.Column("embedding_status", sa.String(length=20), nullable=True))

    # Add embedding versioning fields to notes
    op.add_column("notes", sa.Column("embedding_model", sa.String(length=100), nullable=True))
    op.add_column("notes", sa.Column("embedding_status", sa.String(length=20), nullable=True))


def downgrade() -> None:
    op.drop_column("notes", "embedding_status")
    op.drop_column("notes", "embedding_model")
    op.drop_column("flashcards", "embedding_status")
    op.drop_column("flashcards", "embedding_model")
