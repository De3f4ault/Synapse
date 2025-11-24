"""
Quiz model.

Represents quizzes with questions that can be manually created or AI-generated.
Tracks source content and difficulty level.
"""

from typing import Optional
import enum

from sqlalchemy import String, Text, Integer, JSON, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from .mixins import TimestampMixin, SoftDeleteMixin, UserOwnedMixin


class QuizSourceType(str, enum.Enum):
    """Enum for quiz source types."""
    MANUAL = "manual"
    AI_GENERATED = "ai_generated"


class QuizDifficulty(str, enum.Enum):
    """Enum for quiz difficulty levels."""
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class Quiz(Base, TimestampMixin, SoftDeleteMixin, UserOwnedMixin):
    """
    Quiz model.

    Container for quiz questions. Can be manually created or
    AI-generated from notes, documents, or other content sources.
    """

    __tablename__ = "quizzes"

    # Primary Key
    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
        doc="Primary key"
    )

    # Basic Information
    title: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
        doc="Quiz title"
    )

    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        default=None,
        doc="Optional description of quiz content/purpose"
    )

    # Source Tracking
    source_type: Mapped[QuizSourceType] = mapped_column(
        SQLEnum(QuizSourceType, native_enum=False),
        default=QuizSourceType.MANUAL,
        nullable=False,
        doc="How this quiz was created"
    )

    source_ids: Mapped[Optional[dict]] = mapped_column(
        JSON,
        nullable=True,
        default=None,
        doc="IDs of source content (note_ids, document_ids, etc.)"
    )

    # Quiz Configuration
    difficulty: Mapped[QuizDifficulty] = mapped_column(
        SQLEnum(QuizDifficulty, native_enum=False),
        default=QuizDifficulty.MEDIUM,
        nullable=False,
        doc="Overall difficulty level"
    )

    time_limit_minutes: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        default=None,
        doc="Time limit in minutes (NULL for no limit)"
    )

    # Relationships
    # questions: One-to-many with QuizQuestion (defined in quiz_question.py)
    # attempts: One-to-many with QuizAttempt (defined in quiz_attempt.py)
    # user: Many-to-one with User (provided by UserOwnedMixin)

    def __repr__(self) -> str:
        """String representation of Quiz."""
        return (
            f"<Quiz(id={self.id}, title='{self.title}', "
            f"difficulty={self.difficulty.value})>"
        )
