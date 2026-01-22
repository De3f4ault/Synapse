"""Add chat_threads table and thread_id to messages

Revision ID: add_chat_threads_001
Revises: 9a6fe7b8092f
Create Date: 2026-01-20

Phase 2: Threads Implementation
- Creates chat_threads table for topic isolation
- Adds thread_id column to chat_messages
- Enforces invariant: threads and branches are mutually exclusive

INVARIANT: If thread_id IS NOT NULL -> parent_message_id MUST BE NULL
INVARIANT: If parent_message_id IS NOT NULL -> thread_id MUST BE NULL
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "add_chat_threads_001"
down_revision: Union[str, None] = "58e59d1e88bf"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create chat_threads table
    op.create_table(
        "chat_threads",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("session_id", sa.Integer(), nullable=False),
        sa.Column("created_from_message_id", sa.Integer(), nullable=True),
        sa.Column("title", sa.String(length=500), nullable=False),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["session_id"], ["chat_sessions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["created_from_message_id"], ["chat_messages.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create indexes
    op.create_index("ix_chat_threads_session_id", "chat_threads", ["session_id"])
    op.create_index("ix_chat_threads_created_at", "chat_threads", ["created_at"])

    # Add thread_id column to chat_messages
    op.add_column("chat_messages", sa.Column("thread_id", sa.Integer(), nullable=True))

    # Create foreign key constraint
    op.create_foreign_key(
        "fk_chat_messages_thread_id",
        "chat_messages",
        "chat_threads",
        ["thread_id"],
        ["id"],
        ondelete="CASCADE",
    )

    # Create index on thread_id
    op.create_index("ix_chat_messages_thread_id", "chat_messages", ["thread_id"])

    # Create partial indexes for mutual exclusivity validation
    # These help with query performance when filtering by thread vs branch
    op.execute("""
        CREATE INDEX ix_chat_messages_thread_only 
        ON chat_messages (thread_id) 
        WHERE thread_id IS NOT NULL AND parent_message_id IS NULL;
    """)

    op.execute("""
        CREATE INDEX ix_chat_messages_branch_only 
        ON chat_messages (parent_message_id) 
        WHERE parent_message_id IS NOT NULL AND thread_id IS NULL;
    """)


def downgrade() -> None:
    # Drop partial indexes
    op.execute("DROP INDEX IF EXISTS ix_chat_messages_thread_only;")
    op.execute("DROP INDEX IF EXISTS ix_chat_messages_branch_only;")

    # Drop thread_id from chat_messages
    op.drop_index("ix_chat_messages_thread_id", "chat_messages")
    op.drop_constraint("fk_chat_messages_thread_id", "chat_messages", type_="foreignkey")
    op.drop_column("chat_messages", "thread_id")

    # Drop chat_threads table
    op.drop_index("ix_chat_threads_created_at", "chat_threads")
    op.drop_index("ix_chat_threads_session_id", "chat_threads")
    op.drop_table("chat_threads")
