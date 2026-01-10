"""Add links table for knowledge graph

Revision ID: add_links_table
Revises: add_activity_log
Create Date: 2025-12-18

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_links_table'
down_revision: Union[str, None] = 'add_activity_log'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create links table for knowledge graph connections."""
    op.create_table(
        'links',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('source_type', sa.String(50), nullable=False),
        sa.Column('source_id', sa.Integer(), nullable=False),
        sa.Column('target_type', sa.String(50), nullable=False),
        sa.Column('target_id', sa.Integer(), nullable=False),
        sa.Column('link_type', sa.String(50), nullable=False, server_default='manual'),
        sa.Column('strength', sa.Float(), nullable=False, server_default='1.0'),
        sa.Column('label', sa.String(255), nullable=True),
        sa.Column('metadata', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes for efficient graph queries
    op.create_index('ix_links_source', 'links', ['source_type', 'source_id'])
    op.create_index('ix_links_target', 'links', ['target_type', 'target_id'])
    op.create_index('ix_links_type', 'links', ['link_type'])
    op.create_index('ix_links_user', 'links', ['user_id'])


def downgrade() -> None:
    """Drop links table."""
    op.drop_index('ix_links_user', table_name='links')
    op.drop_index('ix_links_type', table_name='links')
    op.drop_index('ix_links_target', table_name='links')
    op.drop_index('ix_links_source', table_name='links')
    op.drop_table('links')
