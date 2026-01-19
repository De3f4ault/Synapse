"""
Activity Log Model

Tracks all user activities across the application for:
- Session detection
- Learning analytics (CANONICAL SOURCE OF TRUTH)
- Activity feed
- Behavior analysis

INVARIANTS:
- This ledger is APPEND-ONLY for learning events
- Corrections = compensating events, NEVER updates
- No dashboard metric shall read from any table other than ActivityLog
"""

from datetime import datetime
from typing import Optional, Dict
import enum

from sqlalchemy import String, Integer, Float, Boolean, DateTime, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import Enum as SQLEnum

from .base import Base


class ActivityType(str, enum.Enum):
    """Enum for activity types."""

    # General activities
    VIEW = "view"
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    REVIEW = "review"  # Legacy - use FLASHCARD_REVIEW for learning events
    COMPLETE = "complete"
    UPLOAD = "upload"
    DOWNLOAD = "download"
    SHARE = "share"
    SEARCH = "search"

    # Learning events (contribute to learning ledger)
    SESSION_START = "session_start"  # Context only, not counted
    SESSION_END = "session_end"  # Counts for streak + duration
    FLASHCARD_REVIEW = "flashcard_review"  # Core learning event
    QUIZ_QUESTION_ATTEMPT = "quiz_question_attempt"  # Per-question learning event (Phase Q1)
    QUIZ_COMPLETE = "quiz_complete"  # Quiz summary (presentation, not scheduling)

    # Future: Audit-only (does not affect learning metrics in v2.x)
    # Reserved for epistemic confidence & knowledge reinforcement
    GROUNDED_ANSWER = "grounded_answer"


# ============================================================================
# ACTIVITY CONTRACTS
# ============================================================================
# Each learning event type declares what it contributes to.
# This prevents metric creep and implicit assumptions.

ACTIVITY_CONTRACTS: Dict[ActivityType, Dict[str, bool]] = {
    ActivityType.FLASHCARD_REVIEW: {
        "counts_for_streak": True,
        "has_duration": True,
        "has_accuracy": True,
        "has_quality": True,
    },
    ActivityType.SESSION_END: {
        "counts_for_streak": True,
        "has_duration": True,
        "has_accuracy": False,
        "has_quality": False,
    },
    ActivityType.SESSION_START: {
        "counts_for_streak": False,
        "has_duration": False,
        "has_accuracy": False,
        "has_quality": False,
    },
    ActivityType.QUIZ_QUESTION_ATTEMPT: {
        "counts_for_streak": True,
        "has_duration": True,
        "has_accuracy": True,
        "has_quality": True,
    },
    ActivityType.QUIZ_COMPLETE: {
        "counts_for_streak": False,  # Questions count, not quiz summary
        "has_duration": True,
        "has_accuracy": True,
        "has_quality": False,
    },
    ActivityType.GROUNDED_ANSWER: {
        # Audit-only: reserved for future epistemic confidence tracking
        "counts_for_streak": False,
        "has_duration": False,
        "has_accuracy": False,
        "has_quality": False,
    },
}


def is_learning_activity_type(activity_type: ActivityType) -> bool:
    """Check if an activity type is a learning event."""
    return activity_type in ACTIVITY_CONTRACTS


class ModuleType(str, enum.Enum):
    """Enum for module types."""

    FLASHCARDS = "flashcards"
    NOTES = "notes"
    DOCUMENTS = "documents"
    QUIZZES = "quizzes"
    CHAT = "chat"
    STUDY = "study"
    ANALYTICS = "analytics"


class ActivityLog(Base):
    """
    Activity log model - CANONICAL LEARNING LEDGER.

    Records every user interaction for:
    - Session detection and tracking
    - Activity feed display
    - Learning pattern analysis (PRIMARY USE)
    - Engagement metrics

    INVARIANTS:
    - Append-only for learning events (is_learning_event=True)
    - Use event_uid for idempotency
    - duration_seconds is declared time, not verified cognitive engagement
    """

    __tablename__ = "activity_logs"

    # Primary Key
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True, doc="Primary key")

    # Foreign Keys
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="ID of the user performing the activity",
    )

    # Activity Information
    activity_type: Mapped[ActivityType] = mapped_column(
        SQLEnum(ActivityType, native_enum=False),
        nullable=False,
        index=True,
        doc="Type of activity performed",
    )

    module: Mapped[ModuleType] = mapped_column(
        SQLEnum(ModuleType, native_enum=False),
        nullable=False,
        index=True,
        doc="Module where activity occurred",
    )

    # Resource Information (optional)
    resource_id: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True, doc="ID of the resource (card, note, document, etc.)"
    )

    resource_title: Mapped[Optional[str]] = mapped_column(
        String(500), nullable=True, doc="Title/name of the resource"
    )

    # ========================================================================
    # LEARNING EVENT FIELDS (v2.0 - Learning Ledger)
    # ========================================================================

    # Idempotency key for deduplication (client-generated UUID)
    event_uid: Mapped[Optional[str]] = mapped_column(
        String(36),
        nullable=True,
        unique=False,  # Will add composite unique index in migration
        doc="Client-generated UUID for deduplication",
    )

    # Duration: declared interaction time (capped by guardrails, not verified)
    duration_seconds: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        doc="Declared duration in seconds (interaction time, not cognitive engagement)",
    )

    # Accuracy: normalized quality score (quality_score / 5.0)
    # Range: 0.0 - 1.0, continuous (NOT binary thresholded)
    accuracy: Mapped[Optional[float]] = mapped_column(
        Float, nullable=True, doc="Normalized accuracy (quality_score / 5.0), range 0.0-1.0"
    )

    # Raw quality score from SM-2 algorithm (0-5)
    quality_score: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True, doc="Raw SM-2 quality score (0-5)"
    )

    # Learning event flag - enables efficient filtering in analytics
    is_learning_event: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        index=True,
        doc="True if this event contributes to learning analytics",
    )

    # ========================================================================
    # END LEARNING EVENT FIELDS
    # ========================================================================

    # Additional Context
    # FIXED: Renamed from 'metadata' to 'meta_data' to avoid SQLAlchemy reserved word conflict
    # The database column is still named 'metadata' via explicit mapping
    meta_data: Mapped[Optional[dict]] = mapped_column(
        "metadata",  # Database column name
        JSON,
        nullable=True,
        doc="Additional activity metadata (scores, time spent, etc.)",
    )

    # Timing
    # NOTE: Streaks are calculated in UTC. Users experience local time,
    # but ledger truth is UTC-based for consistency.
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
        index=True,
        doc="Timestamp when activity occurred (UTC)",
    )

    # Session Tracking (optional - advisory context, not accounting truth)
    session_id: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        index=True,
        doc="Session ID if activity is part of a detected session (advisory)",
    )

    def __repr__(self) -> str:
        """String representation of ActivityLog."""
        return (
            f"<ActivityLog(id={self.id}, user_id={self.user_id}, "
            f"type={self.activity_type.value}, module={self.module.value}, "
            f"learning={self.is_learning_event})>"
        )

    def to_dict(self) -> dict:
        """Convert to dictionary for API responses."""
        result = {
            "id": str(self.id),
            "user_id": self.user_id,
            "activity_type": self.activity_type.value,
            "module": self.module.value,
            "resource_id": self.resource_id,
            "resource_title": self.resource_title,
            "metadata": self.meta_data,  # Return as 'metadata' for API consistency
            "created_at": self.created_at.isoformat(),
            "session_id": self.session_id,
            "is_learning_event": self.is_learning_event,
        }

        # Include learning fields only if present
        if self.is_learning_event:
            result.update(
                {
                    "event_uid": self.event_uid,
                    "duration_seconds": self.duration_seconds,
                    "accuracy": self.accuracy,
                    "quality_score": self.quality_score,
                }
            )

        return result

    @property
    def contract(self) -> Dict[str, bool]:
        """Get the semantic contract for this activity type."""
        return ACTIVITY_CONTRACTS.get(
            self.activity_type,
            {
                "counts_for_streak": False,
                "has_duration": False,
                "has_accuracy": False,
                "has_quality": False,
            },
        )
