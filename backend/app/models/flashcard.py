"""
Flashcard model.

Represents individual flashcards with SM-2 spaced repetition algorithm fields.
Core model for the flashcard learning system.
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional
import enum

from sqlalchemy import (
    String,
    Text,
    Integer,
    DateTime,
    Numeric,
    ForeignKey,
    Enum as SQLEnum,
)
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base
from .mixins import TimestampMixin, SoftDeleteMixin
from app.db.types import Vector


class LearningState(str, enum.Enum):
    """Enum for flashcard learning states."""

    NEW = "new"
    LEARNING = "learning"
    REVIEW = "review"
    MASTERED = "mastered"


class Flashcard(Base, TimestampMixin, SoftDeleteMixin):
    """
    Flashcard model with SM-2 spaced repetition.

    Stores flashcard content (front/back), SM-2 algorithm state,
    and performance statistics. The heart of the spaced repetition system.
    """

    __tablename__ = "flashcards"

    # Primary Key
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True, doc="Primary key")

    # Foreign Keys
    deck_id: Mapped[int] = mapped_column(
        ForeignKey("decks.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="ID of the deck this card belongs to",
    )

    # Card Content
    front_text: Mapped[str] = mapped_column(
        Text, nullable=False, doc="Front of the card (question/prompt)"
    )

    back_text: Mapped[str] = mapped_column(
        Text, nullable=False, doc="Back of the card (answer/explanation)"
    )

    front_media_url: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
        default=None,
        doc="Optional URL to media on the front (image, audio, etc.)",
    )

    back_media_url: Mapped[Optional[str]] = mapped_column(
        String(500), nullable=True, default=None, doc="Optional URL to media on the back"
    )

    # SM-2 Algorithm Fields
    ease_factor: Mapped[Decimal] = mapped_column(
        Numeric(precision=3, scale=2),
        default=Decimal("2.5"),
        nullable=False,
        doc="SM-2 ease factor (difficulty multiplier)",
    )

    interval: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False, doc="Interval in days until next review"
    )

    repetitions: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False, doc="Number of consecutive correct repetitions"
    )

    last_review: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None, doc="Timestamp of last review"
    )

    next_review: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        default=None,
        index=True,
        doc="Timestamp when card is next due for review",
    )

    # Learning State
    learning_state: Mapped[LearningState] = mapped_column(
        SQLEnum(
            LearningState, native_enum=False, values_callable=lambda obj: [e.value for e in obj]
        ),
        default=LearningState.NEW,
        nullable=False,
        doc="Current learning state of the card",
    )

    # Performance Statistics
    times_reviewed: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False, doc="Total number of times reviewed"
    )

    times_correct: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False, doc="Number of correct reviews"
    )

    times_incorrect: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False, doc="Number of incorrect reviews"
    )

    # Vector Embedding Reference (legacy - for Qdrant)
    embedding_id: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True, default=None, doc="Reference to vector embedding in Qdrant"
    )

    # Vector Embedding (pgvector - for hybrid search)
    content_embedding: Mapped[Optional[list[float]]] = mapped_column(
        Vector(384),  # MiniLM-L6-v2 dimension
        nullable=True,
        default=None,
        doc="Vector embedding for semantic search (front_text + back_text combined)",
    )

    # Embedding versioning (for model upgrades and failure tracking)
    embedding_model: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        default=None,
        doc="Embedding model version (e.g., 'all-MiniLM-L6-v2@384@v1')",
    )

    embedding_status: Mapped[Optional[str]] = mapped_column(
        String(20),
        nullable=True,
        default="PENDING",
        doc="Embedding status: PENDING, READY, FAILED, STALE",
    )

    # Relationships
    # deck: Many-to-one with Deck
    # reviews: One-to-many with Review (defined in review.py)

    def __repr__(self) -> str:
        """String representation of Flashcard."""
        return (
            f"<Flashcard(id={self.id}, deck_id={self.deck_id}, state={self.learning_state.value})>"
        )

    @property
    def accuracy(self) -> float:
        """Calculate review accuracy percentage."""
        if self.times_reviewed == 0:
            return 0.0
        return (self.times_correct / self.times_reviewed) * 100.0
