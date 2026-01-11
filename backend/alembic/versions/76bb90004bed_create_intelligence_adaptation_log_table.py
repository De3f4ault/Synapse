"""create_intelligence_adaptation_log_table

Revision ID: 76bb90004bed
Revises: 9aee2bc642bc
Create Date: 2026-01-10 17:44:54.865107+00:00

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "76bb90004bed"
down_revision = "9aee2bc642bc"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create intelligence_adaptation_log table for Phase 3 telemetry."""
    op.create_table(
        "intelligence_adaptation_log",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("timestamp", sa.DateTime(), nullable=False),
        sa.Column("source_event_id", sa.String(), index=True, nullable=False),
        sa.Column("surface", sa.String(), nullable=False),
        sa.Column("entity_id", sa.String(), index=True, nullable=False),
        sa.Column("entity_type", sa.String(), nullable=False),
        sa.Column("signal_type", sa.String(), nullable=False),
        sa.Column("learning_value", sa.Float(), nullable=False),
        sa.Column("confidence_weight", sa.Float(), nullable=False),
        sa.Column("applied_actions", sa.JSON(), nullable=True),
    )


def downgrade() -> None:
    """Drop intelligence_adaptation_log table."""
    op.drop_table("intelligence_adaptation_log")
