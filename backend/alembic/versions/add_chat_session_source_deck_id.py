"""add_chat_session_source_deck_id

Revision ID: add_chat_session_source_deck
Revises: eb2abc73e699
Create Date: 2026-05-02

Adds two columns to chat_sessions:
  - source  VARCHAR(20) NOT NULL DEFAULT 'chat'
             Discriminator: 'chat' = normal chat, 'tutor' = Card Tutor
             Card Tutor sessions are hidden from the main chat sidebar.
  - deck_id  INTEGER FK → decks.id SET NULL
             For tutor sessions only — anchors the session to a deck so all
             card conversations within a deck share one session row.
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "add_chat_session_source_deck"
down_revision: Union[str, None] = "0e55fd61f54f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # source column — default 'chat' so all existing sessions remain visible
    op.add_column(
        "chat_sessions",
        sa.Column(
            "source",
            sa.String(length=20),
            nullable=False,
            server_default="chat",
        ),
    )
    op.create_index("ix_chat_sessions_source", "chat_sessions", ["source"])

    # deck_id FK — nullable, only populated for tutor sessions
    op.add_column(
        "chat_sessions",
        sa.Column("deck_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_chat_sessions_deck_id",
        "chat_sessions",
        "decks",
        ["deck_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_chat_sessions_deck_id", "chat_sessions", ["deck_id"])

    # Retroactively mark existing "Card Tutor:" sessions as source='tutor'
    # so they immediately disappear from the chat sidebar on deploy.
    op.execute(
        """
        UPDATE chat_sessions
        SET source = 'tutor'
        WHERE title LIKE 'Card Tutor:%'
        """
    )


def downgrade() -> None:
    op.drop_index("ix_chat_sessions_deck_id", "chat_sessions")
    op.drop_constraint("fk_chat_sessions_deck_id", "chat_sessions", type_="foreignkey")
    op.drop_column("chat_sessions", "deck_id")
    op.drop_index("ix_chat_sessions_source", "chat_sessions")
    op.drop_column("chat_sessions", "source")
