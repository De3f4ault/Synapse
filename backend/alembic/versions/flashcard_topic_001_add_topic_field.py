"""add topic field to flashcards for concept_mastery precision

Revision ID: flashcard_topic_001
Revises: concept_mastery_001
Create Date: 2026-04-23

Adds a structured noun-phrase `topic` column to flashcards.
This fixes the concept_mastery bridge — previously the bridge used
front_text[:100] (a question string) as the concept key, causing mismatches
with LLMExtractor which produces noun-phrases like "PostgreSQL MVCC".

With `topic`, AI-generated cards write a precise noun-phrase that matches
LLMExtractor output exactly, closing the cross-module mastery loop.

Backwards compatible: existing cards without `topic` fall back to front_text
in the bridge logic.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "flashcard_topic_001"
down_revision: Union[str, None] = "concept_mastery_001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add topic column to flashcards table."""
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    # Guard: only add if not already present (idempotent)
    existing_columns = {col["name"] for col in inspector.get_columns("flashcards")}

    if "topic" not in existing_columns:
        op.add_column(
            "flashcards",
            sa.Column(
                "topic",
                sa.String(200),
                nullable=True,
                comment=(
                    "Noun-phrase concept name (e.g. 'PostgreSQL MVCC'). "
                    "Used as concept key in concept_mastery. "
                    "AI-generated cards populate this; manual cards fall back to front_text."
                ),
            ),
        )

        # Index on (deck_id, topic) — supports the session curator query:
        # "Find cards in this deck whose topic has low concept_mastery score"
        op.create_index(
            "ix_flashcards_topic",
            "flashcards",
            ["topic"],
        )


def downgrade() -> None:
    """Remove topic column."""
    op.drop_index("ix_flashcards_topic", table_name="flashcards")
    op.drop_column("flashcards", "topic")
