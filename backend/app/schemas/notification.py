"""
Notification Schemas

Pydantic schemas for notification CRUD operations and preferences.
"""

from datetime import datetime
from typing import Optional, List
from enum import Enum

from pydantic import BaseModel, Field


# ==================== ENUMS ====================


class NotificationType(str, Enum):
    """Visual style/severity of the notification."""

    INFO = "info"
    SUCCESS = "success"
    WARNING = "warning"
    ERROR = "error"
    ACHIEVEMENT = "achievement"
    REMINDER = "reminder"


class NotificationCategory(str, Enum):
    """Logical grouping for preference filtering."""

    LEARNING = "learning"
    SYSTEM = "system"
    SOCIAL = "social"


class NotificationStatus(str, Enum):
    """Delivery status."""

    PENDING = "pending"
    DELIVERED = "delivered"
    READ = "read"


# ==================== CORE SCHEMAS ====================


class NotificationBase(BaseModel):
    """Base schema for notification data."""

    type: NotificationType = NotificationType.INFO
    category: NotificationCategory = NotificationCategory.SYSTEM
    title: str = Field(..., max_length=255)
    message: str
    action_url: Optional[str] = Field(None, max_length=500)
    action_label: Optional[str] = Field(None, max_length=100)
    metadata: Optional[dict] = None
    group_key: Optional[str] = Field(None, max_length=100)


class NotificationCreate(NotificationBase):
    """Schema for creating a notification (internal use)."""

    user_id: int
    expires_at: Optional[datetime] = None


class NotificationResponse(NotificationBase):
    """Schema for API responses."""

    id: str
    user_id: int
    status: NotificationStatus
    created_at: datetime
    expires_at: Optional[datetime] = None
    read: bool  # Convenience flag

    class Config:
        from_attributes = True


class NotificationList(BaseModel):
    """Schema for paginated notification list."""

    notifications: List[NotificationResponse]
    total: int
    unread_count: int


# ==================== ACTION SCHEMAS ====================


class MarkAsReadRequest(BaseModel):
    """Schema for marking notifications as read."""

    notification_ids: List[str] = Field(..., description="List of notification IDs to mark as read")


class ClearNotificationsRequest(BaseModel):
    """Schema for clearing notifications."""

    category: Optional[NotificationCategory] = None
    all: bool = False


# ==================== PREFERENCE SCHEMAS ====================


class DNDSchedule(BaseModel):
    """Do Not Disturb schedule."""

    start: str = Field(..., pattern=r"^\d{2}:\d{2}$", description="Start time in HH:MM format")
    end: str = Field(..., pattern=r"^\d{2}:\d{2}$", description="End time in HH:MM format")


class CategoryPreferences(BaseModel):
    """Per-category notification toggles."""

    learning: bool = True
    system: bool = True
    social: bool = False


class NotificationPreferences(BaseModel):
    """Full notification preferences object."""

    email_enabled: bool = True
    push_enabled: bool = True
    sound_enabled: bool = True
    categories: CategoryPreferences = Field(default_factory=CategoryPreferences)
    dnd_schedule: Optional[DNDSchedule] = None


class UpdatePreferencesRequest(BaseModel):
    """Request to update notification preferences."""

    notifications: NotificationPreferences


# ==================== TEST SCHEMA ====================


class TestNotificationRequest(BaseModel):
    """Schema for triggering a test notification."""

    type: NotificationType = NotificationType.INFO
    title: str = "Test Notification"
    message: str = "This is a test notification."
