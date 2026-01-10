"""Add synapse_tasks table for Celery task tracking

Revision ID: add_synapse_tasks
Revises: add_links_table
Create Date: 2025-12-19

Based on paperless-ngx PaperlessTask pattern:
- Tracks Celery task lifecycle (PENDING → STARTED → SUCCESS/FAILURE)
- Stores task metadata and results
- Enables UI display of background task progress
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "add_synapse_tasks"
down_revision: Union[str, None] = "webhook_subscriptions_v1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create synapse_tasks table for Celery task tracking."""
    op.create_table(
        "synapse_tasks",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("task_id", sa.String(255), nullable=False),
        sa.Column("task_name", sa.String(50), nullable=True),
        sa.Column("celery_task_name", sa.String(255), nullable=True),
        sa.Column("task_type", sa.String(30), nullable=False, server_default="auto"),
        sa.Column("status", sa.String(30), nullable=False, server_default="PENDING"),
        sa.Column("owner_id", sa.Integer(), nullable=True),
        sa.Column("task_file_name", sa.String(255), nullable=True),
        sa.Column("task_args", sa.Text(), nullable=True),
        sa.Column(
            "date_created",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("date_started", sa.DateTime(timezone=True), nullable=True),
        sa.Column("date_done", sa.DateTime(timezone=True), nullable=True),
        sa.Column("result", sa.Text(), nullable=True),
        sa.Column("acknowledged", sa.Boolean(), nullable=False, server_default="false"),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("task_id"),
    )

    # Create indexes for common queries
    op.create_index("ix_synapse_tasks_task_id", "synapse_tasks", ["task_id"])
    op.create_index("ix_synapse_tasks_status", "synapse_tasks", ["status"])
    op.create_index("ix_synapse_tasks_owner_id", "synapse_tasks", ["owner_id"])
    op.create_index("ix_synapse_tasks_task_name", "synapse_tasks", ["task_name"])
    op.create_index("ix_synapse_tasks_date_created", "synapse_tasks", ["date_created"])
    op.create_index("ix_synapse_tasks_date_done", "synapse_tasks", ["date_done"])

    # Composite indexes for common query patterns
    op.create_index("ix_synapse_tasks_status_created", "synapse_tasks", ["status", "date_created"])
    op.create_index("ix_synapse_tasks_owner_status", "synapse_tasks", ["owner_id", "status"])


def downgrade() -> None:
    """Drop synapse_tasks table."""
    op.drop_index("ix_synapse_tasks_owner_status", table_name="synapse_tasks")
    op.drop_index("ix_synapse_tasks_status_created", table_name="synapse_tasks")
    op.drop_index("ix_synapse_tasks_date_done", table_name="synapse_tasks")
    op.drop_index("ix_synapse_tasks_date_created", table_name="synapse_tasks")
    op.drop_index("ix_synapse_tasks_task_name", table_name="synapse_tasks")
    op.drop_index("ix_synapse_tasks_owner_id", table_name="synapse_tasks")
    op.drop_index("ix_synapse_tasks_status", table_name="synapse_tasks")
    op.drop_index("ix_synapse_tasks_task_id", table_name="synapse_tasks")
    op.drop_table("synapse_tasks")
