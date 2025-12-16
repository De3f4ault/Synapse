"""add webhooks table

Revision ID: webhook_subscriptions_v1
Revises: update_json_to_jsonb
Create Date: 2025-12-16 15:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'webhook_subscriptions_v1'
down_revision = 'add_activity_log'  # Changed from 'update_json_to_jsonb' to fix branch
branch_labels = None
depends_on = None


def upgrade():
    """
    Create webhooks table for storing webhook subscriptions.
    
    Adds support for user-defined webhook endpoints with encrypted secrets,
    event subscriptions, and delivery tracking metrics.
    """
    # Create webhooks table
    op.create_table(
        'webhooks',
        sa.Column('id', sa.Integer(), nullable=False, autoincrement=True),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('url', sa.String(500), nullable=False),
        sa.Column('secret_encrypted', sa.Text(), nullable=False, 
                  comment='Fernet-encrypted webhook secret'),
        sa.Column('events', postgresql.ARRAY(sa.String(100)), nullable=False,
                  comment='Array of subscribed event types'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('description', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, 
                  server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, 
                  server_default=sa.text('now()')),
        sa.Column('last_triggered_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('total_deliveries', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('successful_deliveries', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('failed_deliveries', sa.Integer(), nullable=False, server_default='0'),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(
            ['user_id'], 
            ['users.id'], 
            ondelete='CASCADE'
        ),
        comment='User-defined webhook subscription endpoints'
    )
    
    # Create indexes for performance
    op.create_index(
        'ix_webhooks_user_id',
        'webhooks',
        ['user_id']
    )
    
    op.create_index(
        'ix_webhooks_is_active',
        'webhooks',
        ['is_active']
    )
    
    op.create_index(
        'ix_webhooks_events',
        'webhooks',
        ['events'],
        postgresql_using='gin'  # GIN index for array contains queries
    )
    
    # Add webhook_id foreign key to webhook_events table (if not exists)
    # This links delivery attempts to specific webhook subscriptions
    op.add_column(
        'webhook_events',
        sa.Column('webhook_id', sa.Integer(), nullable=True)
    )
    
    op.create_foreign_key(
        'fk_webhook_events_webhook_id',
        'webhook_events',
        'webhooks',
        ['webhook_id'],
        ['id'],
        ondelete='SET NULL'  # Keep logs even if webhook is deleted
    )
    
    op.create_index(
        'ix_webhook_events_webhook_id',
        'webhook_events',
        ['webhook_id']
    )


def downgrade():
    """
    Remove webhooks table and related changes.
    
    Warning: This will delete all webhook subscriptions and break
    the webhook_id foreign key relationship in webhook_events.
    """
    # Drop foreign key and column from webhook_events
    op.drop_index('ix_webhook_events_webhook_id', table_name='webhook_events')
    op.drop_constraint('fk_webhook_events_webhook_id', 'webhook_events', type_='foreignkey')
    op.drop_column('webhook_events', 'webhook_id')
    
    # Drop webhooks table indexes
    op.drop_index('ix_webhooks_events', table_name='webhooks')
    op.drop_index('ix_webhooks_is_active', table_name='webhooks')
    op.drop_index('ix_webhooks_user_id', table_name='webhooks')
    
    # Drop webhooks table
    op.drop_table('webhooks')
