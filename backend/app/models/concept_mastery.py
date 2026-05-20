"""
ConceptMastery Model — Tracks concept-level mastery independently of flashcard decks.

This is the data store for the agentic learning loop:
    Conversation → LearningSignalMiddleware → Celery → concept_mastery → ContextEngine → next session

Concepts live independently of flashcards so a student who learns through
conversation gets credit even without creating a card.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Float,
    ForeignKey,
    Integer,
    Text,
    UniqueConstraint,
    Index,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.mixins import TimestampMixin, UserOwnedMixin


class ConceptMastery(Base, TimestampMixin, UserOwnedMixin):
    """
    Tracks per-concept mastery for a user.

    Attributes:
        concept: Specific, nameable concept (e.g. "PostgreSQL MVCC", not "databases")
        subject_area: Broad category for grouping (e.g. "databases", "networking")
        mastery_score: 0.0–1.0, updated by learning signal deltas
        exposure_count: How many times this concept has been encountered
        source: Last signal source — 'conversation', 'flashcard_review', 'quiz'
        first_exposure: When the student first encountered this concept
        last_exposure: When the student last engaged with this concept
    """

    __tablename__ = "concept_mastery"
    __table_args__ = (
        UniqueConstraint("user_id", "concept", name="uq_concept_mastery_user_concept"),
        Index("ix_concept_mastery_user_score", "user_id", "mastery_score"),
        Index("ix_concept_mastery_user_subject", "user_id", "subject_area"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    concept: Mapped[str] = mapped_column(
        Text, nullable=False, doc="Specific concept name, e.g. 'PostgreSQL MVCC'"
    )

    subject_area: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True, doc="Broad category: 'databases', 'networking', etc."
    )

    mastery_score: Mapped[float] = mapped_column(
        Float, nullable=False, default=0.0, doc="0.0–1.0 mastery level"
    )

    exposure_count: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, doc="Number of encounters"
    )

    source: Mapped[str] = mapped_column(
        Text, nullable=False, default="conversation",
        doc="Signal source: 'conversation', 'flashcard_review', 'quiz'",
    )

    first_exposure: Mapped[datetime] = mapped_column(
        nullable=False, default=datetime.utcnow, doc="When concept was first encountered"
    )

    last_exposure: Mapped[Optional[datetime]] = mapped_column(
        nullable=True, default=None, doc="When concept was last engaged with"
    )

    # ── Signal type deltas for mastery score updates ──
    SIGNAL_DELTAS = {
        "concept_introduced": 0.15,
        "concept_reinforced": 0.10,
        "mastery_demonstrated": 0.20,
        "gap_detected": -0.05,
    }

    def __repr__(self) -> str:
        return (
            f"<ConceptMastery(user_id={self.user_id}, "
            f"concept='{self.concept}', score={self.mastery_score:.2f})>"
        )
