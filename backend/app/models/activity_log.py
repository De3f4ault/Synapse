"""
Activity Log Model

Tracks all user activities across the application for:
- Session detection
- Learning analytics
- Activity feed
- Behavior analysis
"""

from datetime import datetime
from typing import Optional
import enum

from sqlalchemy import String, Integer, DateTime, JSON, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import Enum as SQLEnum

from .base import Base


class ActivityType(str, enum.Enum):
    """Enum for activity types."""
    VIEW = "view"
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    REVIEW = "review"
    COMPLETE = "complete"
    UPLOAD = "upload"
    DOWNLOAD = "download"
    SHARE = "share"
    SEARCH = "search"


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
    Activity log model.

    Records every user interaction for:
    - Session detection and tracking
    - Activity feed display
    - Learning pattern analysis
    - Engagement metrics
    """

    __tablename__ = "activity_logs"

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
        doc="ID of the user performing the activity"
    )

    # Activity Information
    activity_type: Mapped[ActivityType] = mapped_column(
        SQLEnum(ActivityType, native_enum=False),
        nullable=False,
        index=True,
        doc="Type of activity performed"
    )

    module: Mapped[ModuleType] = mapped_column(
        SQLEnum(ModuleType, native_enum=False),
        nullable=False,
        index=True,
        doc="Module where activity occurred"
    )

    # Resource Information (optional)
    resource_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        doc="ID of the resource (card, note, document, etc.)"
    )

    resource_title: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
        doc="Title/name of the resource"
    )

    # Additional Context
    # FIXED: Renamed from 'metadata' to 'meta_data' to avoid SQLAlchemy reserved word conflict
    # The database column is still named 'metadata' via explicit mapping
    meta_data: Mapped[Optional[dict]] = mapped_column(
        'metadata',  # Database column name
        JSON,
        nullable=True,
        doc="Additional activity metadata (scores, time spent, etc.)"
    )

    # Timing
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
        index=True,
        doc="Timestamp when activity occurred"
    )

    # Session Tracking (optional - can be computed)
    session_id: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        index=True,
        doc="Session ID if activity is part of a detected session"
    )

    def __repr__(self) -> str:
        """String representation of ActivityLog."""
        return (
            f"<ActivityLog(id={self.id}, user_id={self.user_id}, "
            f"type={self.activity_type.value}, module={self.module.value})>"
        )

    def to_dict(self) -> dict:
        """Convert to dictionary for API responses."""
        return {
            "id": str(self.id),
            "user_id": self.user_id,
            "activity_type": self.activity_type.value,
            "module": self.module.value,
            "resource_id": self.resource_id,
            "resource_title": self.resource_title,
            "metadata": self.meta_data,  # Return as 'metadata' for API consistency
            "created_at": self.created_at.isoformat(),
            "session_id": self.session_id
        }
