"""Add activity_log table

Revision ID: add_activity_log
Revises: c368ad399481
Create Date: 2025-01-28 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_activity_log'
down_revision = 'c368ad399481'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create activity_logs table."""

    # Create activity_logs table
    op.create_table(
        'activity_logs',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('activity_type', sa.String(50), nullable=False),
        sa.Column('module', sa.String(50), nullable=False),
        sa.Column('resource_id', sa.Integer(), nullable=True),
        sa.Column('resource_title', sa.String(500), nullable=True),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('session_id', sa.String(100), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        schema='developer_schema'
    )

    # Create indexes for common queries
    op.create_index(
        'ix_activity_logs_user_id',
        'activity_logs',
        ['user_id'],
        schema='developer_schema'
    )

    op.create_index(
        'ix_activity_logs_created_at',
        'activity_logs',
        ['created_at'],
        schema='developer_schema'
    )

    op.create_index(
        'ix_activity_logs_activity_type',
        'activity_logs',
        ['activity_type'],
        schema='developer_schema'
    )

    op.create_index(
        'ix_activity_logs_module',
        'activity_logs',
        ['module'],
        schema='developer_schema'
    )

    op.create_index(
        'ix_activity_logs_session_id',
        'activity_logs',
        ['session_id'],
        schema='developer_schema'
    )

    # Composite index for user activities by time
    op.create_index(
        'ix_activity_logs_user_created',
        'activity_logs',
        ['user_id', 'created_at'],
        schema='developer_schema'
    )


def downgrade() -> None:
    """Drop activity_logs table."""
    op.drop_index('ix_activity_logs_user_created', table_name='activity_logs', schema='developer_schema')
    op.drop_index('ix_activity_logs_session_id', table_name='activity_logs', schema='developer_schema')
    op.drop_index('ix_activity_logs_module', table_name='activity_logs', schema='developer_schema')
    op.drop_index('ix_activity_logs_activity_type', table_name='activity_logs', schema='developer_schema')
    op.drop_index('ix_activity_logs_created_at', table_name='activity_logs', schema='developer_schema')
    op.drop_index('ix_activity_logs_user_id', table_name='activity_logs', schema='developer_schema')
    op.drop_table('activity_logs', schema='developer_schema')
