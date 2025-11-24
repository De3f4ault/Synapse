"""
Quiz attempt model.

Tracks individual quiz taking sessions with answers and scores.
Records timing and performance data.
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import Integer, DateTime, Numeric, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class QuizAttempt(Base):
    """
    Quiz attempt model.

    Records a user's attempt at taking a quiz, including all answers,
    timing information, and final score.
    """

    __tablename__ = "quiz_attempts"

    # Primary Key
    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
        doc="Primary key"
    )

    # Foreign Keys
    quiz_id: Mapped[int] = mapped_column(
        ForeignKey("quizzes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="ID of the quiz attempted"
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="ID of the user who attempted the quiz"
    )

    # Timing
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        doc="Timestamp when quiz attempt started"
    )

    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        default=None,
        doc="Timestamp when quiz was completed (NULL if incomplete)"
    )

    # Scoring
    score: Mapped[Decimal] = mapped_column(
        Numeric(precision=5, scale=2),
        nullable=False,
        doc="Points earned"
    )

    max_score: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        doc="Maximum possible points"
    )

    # Answers
    answers: Mapped[dict] = mapped_column(
        JSON,
        nullable=False,
        doc="Array of answer objects: [{question_id, answer, is_correct, points}, ...]"
    )

    # Performance Metrics
    time_taken_seconds: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        default=None,
        doc="Total time taken in seconds (NULL if incomplete)"
    )

    # Relationships
    # quiz: Many-to-one with Quiz
    # user: Many-to-one with User

    def __repr__(self) -> str:
        """String representation of QuizAttempt."""
        return (
            f"<QuizAttempt(id={self.id}, quiz_id={self.quiz_id}, "
            f"score={self.score}/{self.max_score})>"
        )

    @property
    def is_completed(self) -> bool:
        """Check if attempt is completed."""
        return self.completed_at is not None

    @property
    def percentage(self) -> float:
        """Calculate percentage score."""
        if self.max_score == 0:
            return 0.0
        return float((self.score / self.max_score) * 100)
