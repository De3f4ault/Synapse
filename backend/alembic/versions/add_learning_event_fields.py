"""Add learning event fields to activity_logs

Revision ID: add_learning_event_fields
Revises: blocksuite_migration_001
Create Date: 2026-01-15

Dashboard Truth System v2.0 - Learning Ledger
Adds columns needed for canonical learning event tracking:
- event_uid: idempotency key for deduplication
- duration_seconds: declared interaction time
- accuracy: normalized quality score (0.0-1.0)
- quality_score: raw SM-2 quality (0-5)
- is_learning_event: flag for analytics filtering
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "add_learning_event_fields"
down_revision = "blocksuite_migration_001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add learning event columns
    op.add_column("activity_logs", sa.Column("event_uid", sa.String(36), nullable=True))

    op.add_column("activity_logs", sa.Column("duration_seconds", sa.Integer(), nullable=True))

    op.add_column("activity_logs", sa.Column("accuracy", sa.Float(), nullable=True))

    op.add_column("activity_logs", sa.Column("quality_score", sa.Integer(), nullable=True))

    op.add_column(
        "activity_logs",
        sa.Column("is_learning_event", sa.Boolean(), server_default="false", nullable=False),
    )

    # Composite index for efficient learning event queries
    # Analytics queries filter by user_id + is_learning_event + created_at
    op.create_index(
        "ix_activity_logs_learning_events",
        "activity_logs",
        ["user_id", "is_learning_event", "created_at"],
        unique=False,
    )

    # Composite unique index for idempotency (user_id + event_uid)
    # Prevents duplicate learning events from retries
    op.create_index(
        "ix_activity_logs_event_uid_unique",
        "activity_logs",
        ["user_id", "event_uid"],
        unique=True,
        postgresql_where=sa.text("event_uid IS NOT NULL"),
    )


def downgrade() -> None:
    # Drop indexes first
    op.drop_index("ix_activity_logs_event_uid_unique", table_name="activity_logs")
    op.drop_index("ix_activity_logs_learning_events", table_name="activity_logs")

    # Drop columns
    op.drop_column("activity_logs", "is_learning_event")
    op.drop_column("activity_logs", "quality_score")
    op.drop_column("activity_logs", "accuracy")
    op.drop_column("activity_logs", "duration_seconds")
    op.drop_column("activity_logs", "event_uid")
