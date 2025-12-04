"""
Quiz question model.

Individual questions within quizzes supporting multiple question types.
Stores correct answers and explanations.
"""

from typing import Optional
import enum

from sqlalchemy import String, Text, Integer, JSON, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from .mixins import TimestampMixin


class QuestionType(str, enum.Enum):
    """Enum for question types."""
    MULTIPLE_CHOICE = "multiple_choice"
    TRUE_FALSE = "true_false"
    SHORT_ANSWER = "short_answer"


class QuizQuestion(Base, TimestampMixin):
    """
    Quiz question model.

    Represents individual questions within a quiz. Supports various
    question types with flexible answer formats.
    """

    __tablename__ = "quiz_questions"

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
        doc="ID of the quiz this question belongs to"
    )

    # Question Content
    question_text: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        doc="The question text"
    )

    question_type: Mapped[QuestionType] = mapped_column(
        SQLEnum(QuestionType, native_enum=False),
        nullable=False,
        doc="Type of question"
    )

    # Answer Options (for multiple choice)
    options: Mapped[Optional[dict]] = mapped_column(
        JSON,
        nullable=True,
        default=None,
        doc="Answer options (for multiple choice): {'A': 'text', 'B': 'text', ...}"
    )

    # Correct Answer
    correct_answer: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
        doc="Correct answer (option key for MC, 'true'/'false' for TF, text for SA)"
    )

    # Explanation
    explanation: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        default=None,
        doc="Optional explanation of the correct answer"
    )

    # Scoring
    points: Mapped[int] = mapped_column(
        Integer,
        default=1,
        nullable=False,
        doc="Points awarded for correct answer"
    )

    # Order
    order: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        doc="Display order within quiz (0, 1, 2, ...)"
    )

    # Relationships
    # quiz: Many-to-one with Quiz

    def __repr__(self) -> str:
        """String representation of QuizQuestion."""
        return (
            f"<QuizQuestion(id={self.id}, quiz_id={self.quiz_id}, "
            f"type={self.question_type.value})>"
        )
