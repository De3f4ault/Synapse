"""Merge note_chunks_v1 and add_chat_session_source_deck heads.

Revision ID: merge_note_chunks_and_session_deck
Revises: note_chunks_v1, add_chat_session_source_deck
Create Date: 2026-05-06 00:00:00.000000

This is a merge migration — it has no DDL of its own. It exists solely to
reunify the two divergent branches (note_chunks_v1 and add_chat_session_source_deck)
into a single head so subsequent migrations can have a single down_revision.
"""

from alembic import op

# revision identifiers
revision = "merge_chunks_deck_001"
down_revision = ("note_chunks_v1", "add_chat_session_source_deck")
branch_labels = None
depends_on = None


def upgrade():
    # No DDL — this migration only exists to merge two independent branches.
    pass


def downgrade():
    pass
