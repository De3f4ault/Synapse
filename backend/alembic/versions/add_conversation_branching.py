"""Add conversation branching columns to chat_messages.

Revision ID: add_conversation_branching
Revises: webhook_subscriptions_v1_add_webhooks_table
Create Date: 2025-12-28

Adds:
- parent_message_id: Self-referential FK for tree structure
- version: Integer for edit/regenerate tracking
- is_active: Boolean for branch selection

This enables Git-style conversation branching where editing a past
message forks the timeline while preserving the original.
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "add_conversation_branching"
down_revision = "webhook_subscriptions_v1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add parent_message_id for tree structure
    op.add_column(
        "chat_messages",
        sa.Column(
            "parent_message_id",
            sa.Integer(),
            sa.ForeignKey("chat_messages.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index(
        "ix_chat_messages_parent_message_id",
        "chat_messages",
        ["parent_message_id"],
    )

    # Add version for edit/regenerate tracking
    op.add_column(
        "chat_messages",
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
    )

    # Add is_active for branch selection
    op.add_column(
        "chat_messages",
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
    )
    op.create_index(
        "ix_chat_messages_is_active",
        "chat_messages",
        ["is_active"],
    )


def downgrade() -> None:
    op.drop_index("ix_chat_messages_is_active", table_name="chat_messages")
    op.drop_column("chat_messages", "is_active")
    op.drop_column("chat_messages", "version")
    op.drop_index("ix_chat_messages_parent_message_id", table_name="chat_messages")
    op.drop_column("chat_messages", "parent_message_id")
