"""
Webhook subscription model.

Stores user-defined webhook endpoints for event notifications.
"""

from datetime import datetime
from typing import Optional, List

from sqlalchemy import String, Text, Integer, DateTime, Boolean, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import ARRAY

from .base import Base


class Webhook(Base):
    """
    Webhook subscription model.
    
    Users can register webhook endpoints to receive HTTP POST notifications
    when specific events occur in the system. Secrets are encrypted at rest
    using Fernet encryption.
    """
    
    __tablename__ = "webhooks"
    
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
    url: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
        doc="Target webhook URL (must be HTTPS in production)"
    )
    
    secret_encrypted: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        doc="Fernet-encrypted webhook secret for HMAC signature verification"
    )
    
    events: Mapped[List[str]] = mapped_column(
        ARRAY(String(100)),
        nullable=False,
        doc="Array of subscribed event types (e.g., ['card.reviewed', 'note.created'])"
    )
    
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        index=True,
        doc="Whether webhook is active and should receive events"
    )
    
    description: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
        doc="User-provided description of webhook purpose"
    )
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        doc="Timestamp when webhook was created"
    )
    
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        doc="Timestamp when webhook was last updated"
    )
    
    last_triggered_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        doc="Timestamp of last delivery attempt"
    )
    
    # Delivery Metrics
    total_deliveries: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        doc="Total number of delivery attempts"
    )
    
    successful_deliveries: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        doc="Number of successful deliveries (HTTP 2xx)"
    )
    
    failed_deliveries: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        doc="Number of failed deliveries"
    )
    
    # Relationships
    # user: Many-to-one with User
    # webhook_events: One-to-many with WebhookEvent
    
    def __repr__(self) -> str:
        """String representation of Webhook."""
        return (
            f"<Webhook(id={self.id}, user_id={self.user_id}, "
            f"url='{self.url[:50]}...', events={len(self.events)}, "
            f"is_active={self.is_active})>"
        )
    
    @property
    def success_rate(self) -> float:
        """Calculate delivery success rate."""
        if self.total_deliveries == 0:
            return 0.0
        return (self.successful_deliveries / self.total_deliveries) * 100.0
    
    @property
    def masked_url(self) -> str:
        """Return URL with query parameters masked for display."""
        from urllib.parse import urlparse, urlunparse
        parsed = urlparse(self.url)
        # Remove query string and fragment
        masked = urlunparse((
            parsed.scheme,
            parsed.netloc,
            parsed.path,
            '',  # params
            '',  # query (masked)
            ''   # fragment
        ))
        return masked
    
    def is_subscribed_to(self, event_type: str) -> bool:
        """
        Check if webhook is subscribed to a specific event type.
        
        Args:
            event_type: Event type to check (e.g., 'card.reviewed')
            
        Returns:
            True if subscribed and active, False otherwise
        """
        return self.is_active and event_type in self.events
