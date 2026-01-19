"""
Notification Model

Stores in-app notifications for users with support for:
- Categorization (learning, system, social)
- Type-based styling (info, success, warning, error, achievement, reminder)
- Action deep-linking (URLs or app schemes like synapse://)
- TTL/expiration
- Buffering during Focus Mode
"""

from datetime import datetime
from typing import Optional
import enum

from sqlalchemy import String, Integer, DateTime, JSON, ForeignKey, Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Enum as SQLEnum

from .base import Base
from .mixins import TimestampMixin


class NotificationType(str, enum.Enum):
    """Visual style/severity of the notification."""
    INFO = "info"
    SUCCESS = "success"
    WARNING = "warning"
    ERROR = "error"
    ACHIEVEMENT = "achievement"
    REMINDER = "reminder"


class NotificationCategory(str, enum.Enum):
    """Logical grouping for preference filtering."""
    LEARNING = "learning"   # Cards due, quizzes, study goals
    SYSTEM = "system"       # Maintenance, billing, security
    SOCIAL = "social"       # Collaboration, sharing (future)


class NotificationStatus(str, enum.Enum):
    """Delivery status."""
    PENDING = "pending"     # Buffered during Focus Mode
    DELIVERED = "delivered" # Sent via WebSocket
    READ = "read"


class Notification(Base, TimestampMixin):
    """
    Notification model.

    Represents a single notification sent to a user.
    Supports rich actions, categorization, and smart delivery.
    """

    __tablename__ = "notifications"

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
        doc="ID of the user receiving the notification"
    )

    # Classification
    type: Mapped[NotificationType] = mapped_column(
        SQLEnum(NotificationType, native_enum=False),
        nullable=False,
        default=NotificationType.INFO,
        doc="Visual type/severity of the notification"
    )

    category: Mapped[NotificationCategory] = mapped_column(
        SQLEnum(NotificationCategory, native_enum=False),
        nullable=False,
        default=NotificationCategory.SYSTEM,
        index=True,
        doc="Logical category for filtering and preferences"
    )

    status: Mapped[NotificationStatus] = mapped_column(
        SQLEnum(NotificationStatus, native_enum=False),
        nullable=False,
        default=NotificationStatus.DELIVERED,
        index=True,
        doc="Delivery/read status"
    )

    # Content
    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        doc="Short notification title"
    )

    message: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        doc="Detailed notification message"
    )

    # Action
    action_url: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
        default=None,
        doc="URL for action. Internal path ('/notes/1'), or scheme ('synapse://modal?...')"
    )

    action_label: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        default=None,
        doc="Label for the action button (e.g., 'Review Now')"
    )

    # Payload / Metadata
    meta_data: Mapped[Optional[dict]] = mapped_column(
        'metadata',  # Database column name
        JSON,
        nullable=True,
        default=None,
        doc="Additional structured data (e.g., {'card_count': 5})"
    )

    # TTL
    expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        default=None,
        index=True,
        doc="Timestamp when notification auto-expires (NULL = never)"
    )

    # Grouping for batching
    group_key: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        default=None,
        index=True,
        doc="Key for batching similar notifications (e.g., 'cards_due')"
    )

    def __repr__(self) -> str:
        """String representation of Notification."""
        return (
            f"<Notification(id={self.id}, user_id={self.user_id}, "
            f"type={self.type.value}, category={self.category.value}, "
            f"status={self.status.value})>"
        )

    def to_dict(self) -> dict:
        """Convert to dictionary for API responses."""
        return {
            "id": str(self.id),
            "user_id": self.user_id,
            "type": self.type.value,
            "category": self.category.value,
            "status": self.status.value,
            "title": self.title,
            "message": self.message,
            "action_url": self.action_url,
            "action_label": self.action_label,
            "metadata": self.meta_data,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "group_key": self.group_key,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "read": self.status == NotificationStatus.READ,
        }
