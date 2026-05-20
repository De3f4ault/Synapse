"""
CardPrerequisite model — prerequisite graph between flashcards.

Captured at AI deck-generation time (not computed at runtime).
When a student fails card A, a simple lookup:

    SELECT prereq_id FROM card_prerequisites WHERE card_id = :failed_card_id

surfaces all prerequisite cards immediately — pure SQL, zero LLM latency.

The graph is directed: (card_id) depends on (prereq_id).
Cycles are not possible because generation is one-directional.

Ref: implementation_plan.md §9 (Card Prerequisite Graph)
"""

from sqlalchemy import ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class CardPrerequisite(Base):
    """
    A directed prerequisite edge: card_id requires prereq_id.

    Primary key is the composite (card_id, prereq_id) — no surrogate key
    needed, matches the migration schema exactly.
    """

    __tablename__ = "card_prerequisites"

    # Composite primary key
    card_id: Mapped[int] = mapped_column(
        ForeignKey("flashcards.id", ondelete="CASCADE"),
        primary_key=True,
        nullable=False,
        doc="The card that has a prerequisite",
    )

    prereq_id: Mapped[int] = mapped_column(
        ForeignKey("flashcards.id", ondelete="CASCADE"),
        primary_key=True,
        nullable=False,
        doc="The prerequisite card that must be understood first",
    )

    def __repr__(self) -> str:
        return (
            f"<CardPrerequisite(card_id={self.card_id}, prereq_id={self.prereq_id})>"
        )
