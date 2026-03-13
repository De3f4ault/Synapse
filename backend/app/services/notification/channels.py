"""
Notification delivery channels.

Strategy pattern for multi-channel notification delivery.
Each channel handles one delivery mechanism:
  - WebSocket: real-time browser push (existing)
  - Email: SMTP delivery for important/system notifications
  - PubSub: PG LISTEN/NOTIFY for cross-process real-time sync
"""

import logging
from abc import ABC, abstractmethod
from typing import Any, Dict, Optional

from app.models.notification import (
    Notification,
    NotificationCategory,
    NotificationType,
)

logger = logging.getLogger(__name__)


# ============================================================================
# Base Channel
# ============================================================================


class NotificationChannel(ABC):
    """Abstract delivery channel."""

    @abstractmethod
    async def deliver(
        self, notification: Notification, user_email: Optional[str] = None
    ) -> bool:
        """
        Deliver a notification through this channel.

        Args:
            notification: The notification to deliver
            user_email: User's email (needed for email channel)

        Returns:
            True if delivered successfully
        """
        ...

    @abstractmethod
    def should_deliver(self, notification: Notification) -> bool:
        """
        Check whether this channel should handle this notification.

        Args:
            notification: The notification to check

        Returns:
            True if this channel should deliver it
        """
        ...


# ============================================================================
# WebSocket Channel
# ============================================================================


class WebSocketChannel(NotificationChannel):
    """
    Deliver notifications via WebSocket to connected browsers.

    Uses the existing channel_manager for real-time push.
    Always active for delivered (non-buffered) notifications.
    """

    async def deliver(
        self, notification: Notification, user_email: Optional[str] = None
    ) -> bool:
        try:
            from app.api.websockets.core.channels import channel_manager

            await channel_manager.broadcast_to_user_channel(
                user_id=notification.user_id,
                channel="dashboard",
                event="notification",
                data=notification.to_dict(),
            )
            logger.debug(
                "ws_notification_delivered",
                notification_id=notification.id,
            )
            return True
        except Exception as e:
            logger.error(
                "ws_notification_failed",
                notification_id=notification.id,
                error=str(e),
            )
            return False

    def should_deliver(self, notification: Notification) -> bool:
        """WebSocket always delivers for non-buffered notifications."""
        return True


# ============================================================================
# Email Channel
# ============================================================================


# Categories that warrant email delivery
EMAIL_CATEGORIES = {
    NotificationCategory.SYSTEM,
}

# Types that always get emailed regardless of category
EMAIL_TYPES = {
    NotificationType.ERROR,
    NotificationType.WARNING,
}


class EmailChannel(NotificationChannel):
    """
    Deliver notifications via email for important events.

    Only sends email for:
    - SYSTEM category notifications
    - ERROR/WARNING type notifications
    - Notifications with force_email=True in meta_data
    """

    async def deliver(
        self, notification: Notification, user_email: Optional[str] = None
    ) -> bool:
        if not user_email:
            logger.debug(
                "email_skipped_no_address",
                notification_id=notification.id,
            )
            return False

        try:
            from app.services.email.sender import EmailSender
            from app.core.config import get_settings

            settings = get_settings()

            sender = EmailSender(
                smtp_host=getattr(settings, "SMTP_HOST", "localhost"),
                smtp_port=getattr(settings, "SMTP_PORT", 587),
                smtp_user=getattr(settings, "SMTP_USER", None),
                smtp_password=getattr(settings, "SMTP_PASSWORD", None),
                from_email=getattr(
                    settings, "SMTP_FROM_EMAIL", "noreply@synapse.app"
                ),
                from_name="Synapse",
            )

            # Use template if available, otherwise plain text
            subject = f"[Synapse] {notification.title}"
            body = notification.message

            success = sender.send(
                to=user_email,
                subject=subject,
                body=body,
                html=False,
            )

            if success:
                logger.info(
                    "email_notification_delivered",
                    notification_id=notification.id,
                    to=user_email,
                )
            return success

        except Exception as e:
            logger.error(
                "email_notification_failed",
                notification_id=notification.id,
                error=str(e),
            )
            return False

    def should_deliver(self, notification: Notification) -> bool:
        """Email delivers for system/error/warning notifications."""
        # Explicit opt-in via meta_data
        if notification.meta_data and notification.meta_data.get("force_email"):
            return True

        # System category
        if notification.category in EMAIL_CATEGORIES:
            return True

        # Error/warning types
        if notification.type in EMAIL_TYPES:
            return True

        return False


# ============================================================================
# PubSub Channel
# ============================================================================


class PubSubChannel(NotificationChannel):
    """
    Publish notifications to PG LISTEN/NOTIFY event bus.

    Ensures cross-process delivery when multiple uvicorn workers
    are running. Other workers pick up the event and push via their
    own WebSocket connections.
    """

    async def deliver(
        self, notification: Notification, user_email: Optional[str] = None
    ) -> bool:
        try:
            from app.core.realtime.pubsub import broadcast_to_user

            await broadcast_to_user(
                user_id=notification.user_id,
                event_type="notification",
                data={
                    "notification_id": notification.id,
                    "type": notification.type.value,
                    "category": notification.category.value,
                    "title": notification.title,
                    "message": notification.message,
                },
            )
            logger.debug(
                "pubsub_notification_delivered",
                notification_id=notification.id,
            )
            return True
        except Exception as e:
            logger.error(
                "pubsub_notification_failed",
                notification_id=notification.id,
                error=str(e),
            )
            return False

    def should_deliver(self, notification: Notification) -> bool:
        """PubSub always delivers for cross-process sync."""
        return True


# ============================================================================
# Channel Dispatcher
# ============================================================================


class ChannelDispatcher:
    """
    Dispatches notifications through all applicable channels.

    Usage:
        dispatcher = ChannelDispatcher()
        results = await dispatcher.dispatch(notification, user_email="foo@bar.com")
    """

    def __init__(self):
        self.channels = [
            WebSocketChannel(),
            EmailChannel(),
            PubSubChannel(),
        ]

    async def dispatch(
        self,
        notification: Notification,
        user_email: Optional[str] = None,
    ) -> Dict[str, bool]:
        """
        Dispatch notification through all applicable channels.

        Returns:
            Dict mapping channel name → delivery success.
        """
        results: Dict[str, bool] = {}

        for channel in self.channels:
            channel_name = channel.__class__.__name__
            if channel.should_deliver(notification):
                success = await channel.deliver(notification, user_email)
                results[channel_name] = success
            else:
                results[channel_name] = False  # Skipped

        return results


# Singleton for reuse across requests
_dispatcher: Optional[ChannelDispatcher] = None


def get_channel_dispatcher() -> ChannelDispatcher:
    """Get or create the channel dispatcher singleton."""
    global _dispatcher
    if _dispatcher is None:
        _dispatcher = ChannelDispatcher()
    return _dispatcher
