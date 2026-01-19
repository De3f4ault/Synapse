"""add journal and favorites columns to notes

Revision ID: journal_favorites_001
Revises: blocksuite_migration_001
Create Date: 2026-01-17

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "journal_favorites_001"
down_revision: Union[str, None] = "blocksuite_migration_001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add journal_date, is_favorite, is_archived columns to notes table."""

    # Use Inspector to check if columns/indexes already exist
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [c["name"] for c in inspector.get_columns("notes")]
    indexes = [i["name"] for i in inspector.get_indexes("notes")]

    # Add journal_date column (nullable, indexed)
    if "journal_date" not in columns:
        op.add_column("notes", sa.Column("journal_date", sa.String(10), nullable=True))

    if "ix_notes_journal_date" not in indexes:
        op.create_index("ix_notes_journal_date", "notes", ["journal_date"])

    # Add is_favorite column (default False, indexed)
    if "is_favorite" not in columns:
        op.add_column(
            "notes", sa.Column("is_favorite", sa.Boolean(), nullable=False, server_default="false")
        )

    if "ix_notes_is_favorite" not in indexes:
        op.create_index("ix_notes_is_favorite", "notes", ["is_favorite"])

    # Add is_archived column (default False, indexed)
    if "is_archived" not in columns:
        op.add_column(
            "notes", sa.Column("is_archived", sa.Boolean(), nullable=False, server_default="false")
        )

    if "ix_notes_is_archived" not in indexes:
        op.create_index("ix_notes_is_archived", "notes", ["is_archived"])


def downgrade() -> None:
    """Remove journal_date, is_favorite, is_archived columns from notes table."""

    op.drop_index("ix_notes_is_archived", table_name="notes")
    op.drop_column("notes", "is_archived")

    op.drop_index("ix_notes_is_favorite", table_name="notes")
    op.drop_column("notes", "is_favorite")

    op.drop_index("ix_notes_journal_date", table_name="notes")
    op.drop_column("notes", "journal_date")
