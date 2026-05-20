"""
Study session model.

Tracks study sessions across different learning modules.
Records performance metrics and time spent.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import enum

from sqlalchemy import String, Integer, DateTime, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Enum as SQLEnum

from .base import Base


class StudySessionType(str, enum.Enum):
    """Enum for study session types."""
    FLASHCARD_REVIEW = "flashcard_review"
    QUIZ = "quiz"
    MIXED = "mixed"


class StudySession(Base):
    """
    Study session model.

    Records study sessions where users engage with learning content.
    Tracks performance, time spent, and modules used.
    """

    __tablename__ = "study_sessions"

    # Primary Key
    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
        doc="Primary key"
    )

    # Foreign Keys
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="ID of the user"
    )

    # Sprint 2 — deck-focused session (null = cross-deck session)
    deck_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("decks.id", ondelete="SET NULL"),
        nullable=True,
        default=None,
        doc="Which deck this session is focused on (null = cross-deck session)",
    )

    # Session Configuration
    session_type: Mapped[StudySessionType] = mapped_column(
        SQLEnum(StudySessionType, native_enum=False),
        nullable=False,
        doc="Type of study session"
    )

    # Sprint 2 — Socratic or classic review mode
    session_mode: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="classic",
        server_default="classic",
        doc="'classic' (flip card) | 'socratic' (typed answer evaluated by AI)",
    )

    # Sprint 2 — resume lifecycle
    resume_status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="in_progress",
        server_default="in_progress",
        index=True,
        doc="'in_progress' | 'completed' | 'abandoned'",
    )

    modules_used: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
        default=dict,
        doc="Module metadata used in this session"
    )

    # Sprint 2 — Queue snapshot: [{card_id, deck_id}] ordered at session start
    cards_planned: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(
        JSON,
        nullable=True,
        default=None,
        doc="Ordered queue snapshot captured at session start for deterministic resume",
    )

    # Sprint 2 — Per-card review detail: [{card_id, quality, duration_ms, hint_used, reviewed_at}]
    cards_reviewed_detail: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(
        JSON,
        nullable=True,
        default=None,
        doc="Per-card review records appended after every rating",
    )

    # Sprint 2 — Current position in cards_planned (for resume)
    current_card_index: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
        doc="0-based index into cards_planned — where to resume",
    )

    # Sprint 2 — Last heartbeat for stale-session detection
    last_activity_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        default=None,
        doc="Updated on every checkpoint. Sessions idle > 48h are auto-abandoned.",
    )

    # Timing
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
        doc="Timestamp when session started"
    )

    ended_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        default=None,
        doc="Timestamp when session ended (NULL if incomplete)"
    )

    # Performance Metrics
    items_completed: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        doc="Number of items completed (cards reviewed, questions answered)"
    )

    items_correct: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        doc="Number of items answered correctly"
    )

    time_spent_seconds: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        doc="Total time spent in seconds"
    )

    # Detailed Performance Data
    performance_data: Mapped[Optional[dict]] = mapped_column(
        JSON,
        nullable=True,
        default=None,
        doc="Detailed performance metrics per module/topic"
    )

    # Relationships
    # user: Many-to-one with User

    def __repr__(self) -> str:
        """String representation of StudySession."""
        return (
            f"<StudySession(id={self.id}, user_id={self.user_id}, "
            f"type={self.session_type.value})>"
        )

    @property
    def is_completed(self) -> bool:
        """Check if session is completed."""
        return self.ended_at is not None

    @property
    def accuracy(self) -> float:
        """Calculate accuracy percentage."""
        if self.items_completed == 0:
            return 0.0
        return (self.items_correct / self.items_completed) * 100.0

    @property
    def duration_minutes(self) -> Optional[float]:
        """Calculate session duration in minutes."""
        if not self.ended_at:
            return None
        delta = self.ended_at - self.started_at
        return delta.total_seconds() / 60.0
