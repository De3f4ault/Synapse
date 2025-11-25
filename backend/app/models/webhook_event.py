"""
Webhook event log model.

Tracks webhook delivery attempts with retry logic and response tracking.
Essential for webhook reliability and debugging.
"""

from datetime import datetime
from typing import Optional
import enum

from sqlalchemy import String, Text, Integer, DateTime, JSON, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Enum as SQLEnum

from .base import Base


class WebhookStatus(str, enum.Enum):
    """Enum for webhook delivery status."""
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"


class WebhookEvent(Base):
    """
    Webhook event log model.

    Records every webhook delivery attempt with:
    - Full request/response details
    - Retry tracking
    - Status monitoring
    - Error capture for debugging
    """

    __tablename__ = "webhook_events"

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
        doc="ID of the user who owns this webhook"
    )

    # Webhook Configuration
    webhook_url: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
        doc="Target webhook URL"
    )

    event_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
        doc="Type of event (e.g., 'card.reviewed', 'note.created')"
    )

    # Request Details
    payload: Mapped[dict] = mapped_column(
        JSON,
        nullable=False,
        doc="JSON payload sent to webhook"
    )

    # Response Details
    status: Mapped[WebhookStatus] = mapped_column(
        SQLEnum(WebhookStatus, native_enum=False),
        default=WebhookStatus.PENDING,
        nullable=False,
        index=True,
        doc="Delivery status"
    )

    response_code: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        default=None,
        doc="HTTP response code (NULL if not sent yet)"
    )

    response_body: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        default=None,
        doc="HTTP response body (NULL if not sent yet)"
    )

    # Retry Logic
    attempts: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        doc="Number of delivery attempts made"
    )

    next_retry_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        default=None,
        index=True,
        doc="Timestamp for next retry attempt (NULL if no retry scheduled)"
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
        doc="Timestamp when event was created"
    )

    sent_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        default=None,
        doc="Timestamp when webhook was successfully sent (NULL if not sent)"
    )

    # Relationships
    # user: Many-to-one with User

    def __repr__(self) -> str:
        """String representation of WebhookEvent."""
        return (
            f"<WebhookEvent(id={self.id}, event_type='{self.event_type}', "
            f"status={self.status.value}, attempts={self.attempts})>"
        )

    @property
    def is_successful(self) -> bool:
        """Check if webhook was successfully delivered."""
        return self.status == WebhookStatus.SENT

    @property
    def should_retry(self) -> bool:
        """Determine if webhook should be retried."""
        max_attempts = 3
        return (
            self.status == WebhookStatus.FAILED and
            self.attempts < max_attempts and
            self.next_retry_at is not None
        )
