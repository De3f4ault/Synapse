"""Add attachments JSONB column to chat_messages

Revision ID: add_chat_message_attachments_001
Revises: eb31699831c1
Create Date: 2026-04-02

Adds attachments column (JSONB) to chat_messages table.
Each entry: {document_id, filename, content_type, size_bytes}
Links chat messages to Document records in the knowledge bank.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


# revision identifiers, used by Alembic.
revision: str = "add_chat_message_attachments_001"
down_revision: Union[str, None] = "eb31699831c1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "chat_messages",
        sa.Column(
            "attachments",
            JSONB,
            nullable=True,
            default=None,
            comment="Attached files [{document_id, filename, content_type, size_bytes}]",
        ),
    )

    # Partial index for messages with attachments (speeds up "find messages with files")
    op.execute("""
        CREATE INDEX ix_chat_messages_has_attachments
        ON chat_messages USING gin (attachments)
        WHERE attachments IS NOT NULL;
    """)


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_chat_messages_has_attachments;")
    op.drop_column("chat_messages", "attachments")
