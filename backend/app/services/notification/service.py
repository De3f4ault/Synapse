"""
Notification Service

Core service for creating, delivering, and managing notifications.
Supports:
- Preference-aware delivery (category toggles, DND)
- Focus Mode buffering (tied to active StudySession)
- Batching for similar notifications
- WebSocket real-time delivery
- TTL/expiration cleanup
"""

from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
import structlog

from sqlalchemy import select, and_, update, delete, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import (
    Notification,
    NotificationType,
    NotificationCategory,
    NotificationStatus,
)
from app.models.user import User
from app.models.study_session import StudySession
from app.api.websockets.core.channels import channel_manager

logger = structlog.get_logger()


# Default TTL for notifications (7 days)
DEFAULT_TTL_DAYS = 7


class NotificationService:
    """
    Service for managing user notifications.

    Handles creation, delivery, preference checks, and smart delivery.
    """

    def __init__(self, db: AsyncSession):
        """Initialize with database session."""
        self.db = db

    # ==================== CORE OPERATIONS ====================

    async def send(
        self,
        user_id: int,
        type: NotificationType,
        category: NotificationCategory,
        title: str,
        message: str,
        action_url: Optional[str] = None,
        action_label: Optional[str] = None,
        meta_data: Optional[Dict[str, Any]] = None,
        group_key: Optional[str] = None,
        ttl_days: int = DEFAULT_TTL_DAYS,
        force: bool = False,  # Bypass preference checks
    ) -> Optional[Notification]:
        """
        Send a notification to a user.

        Args:
            user_id: Target user ID
            type: Notification type (info, success, warning, error, achievement, reminder)
            category: Notification category (learning, system, social)
            title: Short title
            message: Detailed message
            action_url: Optional URL/scheme for action
            action_label: Optional button label
            meta_data: Optional structured payload
            group_key: Optional key for batching similar notifications
            ttl_days: Days until expiration (default 7)
            force: If True, bypass preference and DND checks

        Returns:
            Created Notification or None if suppressed by preferences
        """
        # Check preferences (unless forced)
        if not force:
            is_allowed = await self._check_preferences(user_id, category)
            if not is_allowed:
                logger.debug(
                    "notification_suppressed_by_preference",
                    user_id=user_id,
                    category=category.value,
                )
                return None

        # Check for active study session (Focus Mode)
        is_focus_mode = await self._is_in_focus_mode(user_id)
        status = NotificationStatus.PENDING if is_focus_mode else NotificationStatus.DELIVERED

        # Calculate expiration
        expires_at = datetime.utcnow() + timedelta(days=ttl_days) if ttl_days > 0 else None

        # Create notification
        notification = Notification(
            user_id=user_id,
            type=type,
            category=category,
            status=status,
            title=title,
            message=message,
            action_url=action_url,
            action_label=action_label,
            meta_data=meta_data,
            group_key=group_key,
            expires_at=expires_at,
        )

        self.db.add(notification)
        await self.db.commit()
        await self.db.refresh(notification)

        logger.info(
            "notification_created",
            notification_id=notification.id,
            user_id=user_id,
            type=type.value,
            category=category.value,
            status=status.value,
        )

        # If not buffered, broadcast via WebSocket
        if status == NotificationStatus.DELIVERED:
            await self._broadcast(notification)

        return notification

    async def get_user_notifications(
        self,
        user_id: int,
        limit: int = 50,
        offset: int = 0,
        category: Optional[NotificationCategory] = None,
        unread_only: bool = False,
    ) -> tuple[List[Notification], int, int]:
        """
        Get notifications for a user.

        Returns:
            Tuple of (notifications, total_count, unread_count)
        """
        # Base query
        query = select(Notification).where(
            and_(
                Notification.user_id == user_id,
                Notification.status != NotificationStatus.PENDING,  # Hide buffered
            )
        )

        # Apply filters
        if category:
            query = query.where(Notification.category == category)
        if unread_only:
            query = query.where(Notification.status == NotificationStatus.DELIVERED)

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        # Get unread count
        unread_query = select(func.count()).where(
            and_(
                Notification.user_id == user_id,
                Notification.status == NotificationStatus.DELIVERED,
            )
        )
        unread_result = await self.db.execute(unread_query)
        unread_count = unread_result.scalar() or 0

        # Get paginated results
        query = query.order_by(Notification.created_at.desc()).offset(offset).limit(limit)
        result = await self.db.execute(query)
        notifications = list(result.scalars().all())

        return notifications, total, unread_count

    async def mark_as_read(self, user_id: int, notification_ids: List[int]) -> int:
        """
        Mark notifications as read.

        Returns:
            Number of notifications updated
        """
        stmt = (
            update(Notification)
            .where(
                and_(
                    Notification.id.in_(notification_ids),
                    Notification.user_id == user_id,
                    Notification.status == NotificationStatus.DELIVERED,
                )
            )
            .values(status=NotificationStatus.READ)
        )
        result = await self.db.execute(stmt)
        await self.db.commit()

        updated = result.rowcount
        logger.info("notifications_marked_read", user_id=user_id, count=updated)

        return updated

    async def mark_all_as_read(self, user_id: int) -> int:
        """Mark all notifications as read for a user."""
        stmt = (
            update(Notification)
            .where(
                and_(
                    Notification.user_id == user_id,
                    Notification.status == NotificationStatus.DELIVERED,
                )
            )
            .values(status=NotificationStatus.READ)
        )
        result = await self.db.execute(stmt)
        await self.db.commit()

        updated = result.rowcount
        logger.info("all_notifications_marked_read", user_id=user_id, count=updated)

        return updated

    async def clear_all(self, user_id: int, category: Optional[NotificationCategory] = None) -> int:
        """
        Clear (delete) notifications for a user.

        Returns:
            Number of notifications deleted
        """
        conditions = [Notification.user_id == user_id]
        if category:
            conditions.append(Notification.category == category)

        stmt = delete(Notification).where(and_(*conditions))
        result = await self.db.execute(stmt)
        await self.db.commit()

        deleted = result.rowcount
        logger.info(
            "notifications_cleared",
            user_id=user_id,
            count=deleted,
            category=category.value if category else "all",
        )

        return deleted

    # ==================== FOCUS MODE ====================

    async def flush_buffered(self, user_id: int) -> int:
        """
        Deliver all buffered notifications after Focus Mode ends.

        Returns:
            Number of notifications delivered
        """
        # Get buffered notifications
        query = select(Notification).where(
            and_(
                Notification.user_id == user_id,
                Notification.status == NotificationStatus.PENDING,
            )
        )
        result = await self.db.execute(query)
        notifications = list(result.scalars().all())

        if not notifications:
            return 0

        # Update status
        stmt = (
            update(Notification)
            .where(
                and_(
                    Notification.user_id == user_id,
                    Notification.status == NotificationStatus.PENDING,
                )
            )
            .values(status=NotificationStatus.DELIVERED)
        )
        await self.db.execute(stmt)
        await self.db.commit()

        # Broadcast each (or create a summary if many)
        count = len(notifications)
        if count > 5:
            # Batch into a summary notification
            await channel_manager.broadcast_to_user_channel(
                user_id=user_id,
                channel="dashboard",
                event="notification_batch",
                data={
                    "count": count,
                    "message": f"You have {count} notifications from your focus session.",
                },
            )
        else:
            # Broadcast individually
            for notification in notifications:
                await self._broadcast(notification)

        logger.info("buffered_notifications_flushed", user_id=user_id, count=count)
        return count

    # ==================== CLEANUP ====================

    async def cleanup_expired(self) -> int:
        """
        Delete expired notifications.

        Should be called periodically (e.g., via Celery beat).

        Returns:
            Number of notifications deleted
        """
        stmt = delete(Notification).where(
            and_(
                Notification.expires_at.isnot(None),
                Notification.expires_at < datetime.utcnow(),
            )
        )
        result = await self.db.execute(stmt)
        await self.db.commit()

        deleted = result.rowcount
        if deleted > 0:
            logger.info("expired_notifications_cleaned", count=deleted)

        return deleted

    # ==================== INTERNAL HELPERS ====================

    async def _check_preferences(self, user_id: int, category: NotificationCategory) -> bool:
        """Check if user preferences allow this notification category."""
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()

        if not user or not user.preferences:
            return True  # Default: allow

        prefs = user.preferences.get("notifications", {})

        # Check if push is enabled
        if not prefs.get("push_enabled", True):
            return False

        # Check category toggle
        categories = prefs.get("categories", {})
        return categories.get(category.value, True)

    async def _is_in_focus_mode(self, user_id: int) -> bool:
        """Check if user has an active study session (Focus Mode)."""
        result = await self.db.execute(
            select(StudySession).where(
                and_(
                    StudySession.user_id == user_id,
                    StudySession.ended_at.is_(None),  # Not ended
                )
            )
        )
        return result.scalar_one_or_none() is not None

    async def _broadcast(self, notification: Notification) -> None:
        """Broadcast notification via WebSocket."""
        try:
            await channel_manager.broadcast_to_user_channel(
                user_id=notification.user_id,
                channel="dashboard",
                event="notification",
                data=notification.to_dict(),
            )
            logger.debug("notification_broadcast", notification_id=notification.id)
        except Exception as e:
            logger.error(
                "notification_broadcast_failed",
                notification_id=notification.id,
                error=str(e),
            )


# ==================== HELPER FUNCTIONS ====================


async def get_notification_service(db: AsyncSession) -> NotificationService:
    """Factory function for dependency injection."""
    return NotificationService(db)
