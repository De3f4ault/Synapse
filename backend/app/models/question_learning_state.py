"""
QuestionLearningState model.

Per-user, per-question SM-2 spaced repetition state.
Mirrors the flashcard learning state for unified scheduling semantics.
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    Integer,
    DateTime,
    Numeric,
    ForeignKey,
    UniqueConstraint,
    Index,
    Enum as SQLEnum,
)
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base
from .mixins import TimestampMixin
from .flashcard import LearningState  # Reuse same enum


class QuestionLearningState(Base, TimestampMixin):
    """
    Per-user, per-question SM-2 learning state.

    This is the quiz equivalent of flashcard learning state.
    Each question is tracked independently per user for true spaced repetition.

    Architecture:
    - Questions are scheduled, not quizzes (like cards, not decks)
    - SM-2 semantics: ease_factor, interval, repetitions
    - Feeds the same Learning Ledger as flashcard reviews
    """

    __tablename__ = "question_learning_states"

    # Primary Key
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    # Foreign Keys
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="User this learning state belongs to",
    )

    question_id: Mapped[int] = mapped_column(
        ForeignKey("quiz_questions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Question this learning state tracks",
    )

    # SM-2 Algorithm Fields (identical to flashcards)
    ease_factor: Mapped[Decimal] = mapped_column(
        Numeric(precision=3, scale=2),
        default=Decimal("2.5"),
        nullable=False,
        doc="SM-2 ease factor (difficulty multiplier, default 2.5)",
    )

    interval: Mapped[int] = mapped_column(
        Integer,
        default=1,
        nullable=False,
        doc="Interval in days until next review",
    )

    repetitions: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        doc="Number of consecutive successful reviews",
    )

    # Scheduling
    next_review: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        default=None,
        index=True,
        doc="When this question is next due for review",
    )

    last_reviewed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        default=None,
        doc="Timestamp of last review",
    )

    # Learning State
    learning_state: Mapped[LearningState] = mapped_column(
        SQLEnum(
            LearningState, native_enum=False, values_callable=lambda obj: [e.value for e in obj]
        ),
        default=LearningState.NEW,
        nullable=False,
        doc="Current learning state: new, learning, review, mastered",
    )

    # Performance Statistics
    times_reviewed: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False, doc="Total number of times reviewed"
    )

    times_correct: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False, doc="Number of correct responses"
    )

    # Last quality score (for analytics)
    last_quality: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        default=None,
        doc="Last quality score (0-5) from most recent attempt",
    )

    # Constraints
    __table_args__ = (
        UniqueConstraint("user_id", "question_id", name="uq_user_question"),
        Index("idx_qls_user_due", "user_id", "next_review"),
        Index("idx_qls_question", "question_id"),
    )

    # Relationships (optional - can be loaded when needed)
    # user = relationship("User", back_populates="question_states")
    # question = relationship("QuizQuestion", back_populates="learning_states")

    @property
    def accuracy(self) -> float:
        """Calculate accuracy percentage."""
        if self.times_reviewed == 0:
            return 0.0
        return (self.times_correct / self.times_reviewed) * 100

    def __repr__(self) -> str:
        return (
            f"<QuestionLearningState(user={self.user_id}, question={self.question_id}, "
            f"state={self.learning_state.value}, interval={self.interval}d)>"
        )
