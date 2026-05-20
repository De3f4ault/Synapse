"""
notifications/ — Notification schemas.

    from app.schemas.notifications import NotificationResponse, NotificationPreferences
"""

from app.schemas.notifications.notification import (
    NotificationType,
    NotificationCategory,
    NotificationStatus,
    NotificationBase,
    NotificationCreate,
    NotificationResponse,
    NotificationList,
    MarkAsReadRequest,
    ClearNotificationsRequest,
    DNDSchedule,
    CategoryPreferences,
    NotificationPreferences,
    UpdatePreferencesRequest,
    TestNotificationRequest,
)

__all__ = [
    "NotificationType",
    "NotificationCategory",
    "NotificationStatus",
    "NotificationBase",
    "NotificationCreate",
    "NotificationResponse",
    "NotificationList",
    "MarkAsReadRequest",
    "ClearNotificationsRequest",
    "DNDSchedule",
    "CategoryPreferences",
    "NotificationPreferences",
    "UpdatePreferencesRequest",
    "TestNotificationRequest",
]
