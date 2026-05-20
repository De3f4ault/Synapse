"""
CardSource model — provenance tracking for flashcards.

Every card has a lineage. This table records what created it:
    - 'document'       → generated from a PDF / URL ingestion
    - 'quiz_question'  → promoted from a failed quiz question
    - 'note'           → extracted from a Tiptap note
    - 'chat_message'   → saved from a chat conversation
    - 'card'           → split from another card (atomization)

Combined with `card_prerequisites`, this forms the full provenance DAG:

    Document → Deck A (cards 1-20)
             → Quiz (questions 1-10)
               ↘
                 Quiz failure → Cards 21-25 in Deck A
                             → Remedial cards 26-29
                             → Card 26 atomized → 26a, 26b, 26c

Ref: implementation_plan.md §4 (Universal Knowledge → Cards)
"""

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


# Valid source_type values — stored as VARCHAR for flexibility
SOURCE_TYPES = frozenset(
    {"document", "quiz_question", "note", "chat_message", "card"}
)

# Valid generation_method values
GENERATION_METHODS = frozenset(
    {"ai_generated", "manual", "quiz_failure", "remedial", "atomized"}
)


class CardSource(Base):
    """
    Provenance record linking a flashcard to its originating source.

    One card may have multiple source records (e.g. a card derived from a
    document chunk AND refined from a quiz failure). Each row is one hop
    in the provenance DAG.
    """

    __tablename__ = "card_sources"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True, doc="Primary key"
    )

    # The card whose origin this record describes
    card_id: Mapped[int] = mapped_column(
        ForeignKey("flashcards.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Flashcard this provenance record belongs to",
    )

    # What kind of source produced this card
    source_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        doc=(
            "Origin source type. One of: "
            "'document' | 'quiz_question' | 'note' | 'chat_message' | 'card'"
        ),
    )

    # ID of the source record in its own table
    # (document.id, quiz_questions.id, notes.id, chat_messages.id, flashcards.id)
    source_id: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        doc="PK of the source row in its native table (polymorphic FK)",
    )

    # Optional: specific chunk within the source (e.g. paragraph in a document)
    source_chunk_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        default=None,
        doc="FK into document_chunks (or similar) for fine-grained lineage",
    )

    # How the card was created from that source
    generation_method: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        doc=(
            "How this card was produced. One of: "
            "'ai_generated' | 'manual' | 'quiz_failure' | 'remedial' | 'atomized'"
        ),
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        doc="When this provenance record was created",
    )

    def __repr__(self) -> str:
        return (
            f"<CardSource(id={self.id}, card_id={self.card_id}, "
            f"source_type='{self.source_type}', method='{self.generation_method}')>"
        )
