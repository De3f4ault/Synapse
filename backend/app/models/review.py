"""
Review history model.

Tracks each flashcard review session with SM-2 state transitions.
Essential for analytics and performance tracking.
"""

from datetime import datetime
from decimal import Decimal

from sqlalchemy import Integer, DateTime, Numeric, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class Review(Base):
    """
    Flashcard review record.

    Captures each review attempt with quality rating and SM-2 state
    before/after the review. Critical for analytics and learning insights.
    """

    __tablename__ = "reviews"

    # Primary Key
    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
        doc="Primary key"
    )

    # Foreign Keys
    card_id: Mapped[int] = mapped_column(
        ForeignKey("flashcards.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="ID of the reviewed flashcard"
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="ID of the user who performed the review"
    )

    # Review Quality (0-5 scale)
    quality: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        doc="Quality rating (0=complete blackout, 5=perfect recall)"
    )

    # SM-2 State Before Review
    ease_factor_before: Mapped[Decimal] = mapped_column(
        Numeric(precision=3, scale=2),
        nullable=False,
        doc="Ease factor before this review"
    )

    interval_before: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        doc="Interval (days) before this review"
    )

    # SM-2 State After Review
    ease_factor_after: Mapped[Decimal] = mapped_column(
        Numeric(precision=3, scale=2),
        nullable=False,
        doc="Ease factor after this review"
    )

    interval_after: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        doc="Interval (days) after this review"
    )

    # Performance Metrics
    time_taken_ms: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        doc="Time taken to complete review (milliseconds)"
    )

    # Timestamp
    reviewed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
        doc="Timestamp when review was completed"
    )

    # Relationships
    # card: Many-to-one with Flashcard
    # user: Many-to-one with User

    def __repr__(self) -> str:
        """String representation of Review."""
        return (
            f"<Review(id={self.id}, card_id={self.card_id}, "
            f"quality={self.quality}, reviewed_at={self.reviewed_at})>"
        )

    @property
    def is_correct(self) -> bool:
        """Determine if review was correct (quality >= 3)."""
        return self.quality >= 3
