"""fix activity_logs column sizes

Revision ID: fix_activity_logs_columns
Revises: add_learning_event_fields
Create Date: 2026-01-15

The activity_type and module columns were created with sizes too small
for the actual enum values like 'FLASHCARD_REVIEW' (16 chars) and 'FLASHCARDS'.
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "fix_activity_logs_columns"
down_revision = "add_learning_event_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Fix activity_type: was varchar(8), needs to hold 'FLASHCARD_REVIEW' (16 chars)
    op.alter_column(
        "activity_logs",
        "activity_type",
        type_=sa.String(50),
        existing_type=sa.String(8),
        existing_nullable=True,
    )

    # Fix module: was varchar(10), needs to hold longer module names
    op.alter_column(
        "activity_logs",
        "module",
        type_=sa.String(50),
        existing_type=sa.String(10),
        existing_nullable=True,
    )


def downgrade() -> None:
    # Revert to original sizes (will truncate data if any exists)
    op.alter_column(
        "activity_logs",
        "activity_type",
        type_=sa.String(8),
        existing_type=sa.String(50),
        existing_nullable=True,
    )

    op.alter_column(
        "activity_logs",
        "module",
        type_=sa.String(10),
        existing_type=sa.String(50),
        existing_nullable=True,
    )
