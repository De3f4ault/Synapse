"""
Notifications REST API

Endpoints for managing in-app notifications:
- List notifications
- Mark as read
- Clear/delete
- Update preferences
- Test notification (dev only)
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.notification import NotificationCategory
from app.services.notification.service import NotificationService
from app.schemas.notifications import (
    NotificationResponse,
    NotificationList,
    MarkAsReadRequest,
    ClearNotificationsRequest,
    UpdatePreferencesRequest,
    NotificationPreferences,
    TestNotificationRequest,
    NotificationCategory as NotificationCategorySchema,
)

import structlog

logger = structlog.get_logger()

router = APIRouter()


# ==================== LIST ====================


@router.get("", response_model=NotificationList)
async def get_notifications(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    category: Optional[NotificationCategorySchema] = None,
    unread_only: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get notifications for the current user.

    Supports filtering by category and unread status.
    Returns paginated list with total and unread counts.
    """
    service = NotificationService(db)

    # Convert schema enum to model enum if provided
    cat_filter = NotificationCategory(category.value) if category else None

    notifications, total, unread_count = await service.get_user_notifications(
        user_id=current_user.id,
        limit=limit,
        offset=offset,
        category=cat_filter,
        unread_only=unread_only,
    )

    return NotificationList(
        notifications=[NotificationResponse(**n.to_dict()) for n in notifications],
        total=total,
        unread_count=unread_count,
    )


# ==================== MARK READ ====================


@router.post("/read", status_code=status.HTTP_200_OK)
async def mark_notifications_read(
    request: MarkAsReadRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark specific notifications as read."""
    service = NotificationService(db)

    # Convert string IDs to integers
    try:
        notification_ids = [int(nid) for nid in request.notification_ids]
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid notification ID format",
        )

    updated = await service.mark_as_read(
        user_id=current_user.id,
        notification_ids=notification_ids,
    )

    return {"message": f"{updated} notifications marked as read", "count": updated}


@router.post("/read-all", status_code=status.HTTP_200_OK)
async def mark_all_notifications_read(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark all notifications as read."""
    service = NotificationService(db)
    updated = await service.mark_all_as_read(user_id=current_user.id)

    return {"message": f"{updated} notifications marked as read", "count": updated}


# ==================== CLEAR ====================


@router.post("/clear", status_code=status.HTTP_200_OK)
async def clear_notifications(
    request: ClearNotificationsRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Clear (delete) notifications."""
    service = NotificationService(db)

    cat_filter = NotificationCategory(request.category.value) if request.category else None

    deleted = await service.clear_all(
        user_id=current_user.id,
        category=cat_filter,
    )

    return {"message": f"{deleted} notifications cleared", "count": deleted}


# ==================== PREFERENCES ====================


@router.get("/preferences", response_model=NotificationPreferences)
async def get_notification_preferences(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get current notification preferences."""
    prefs = (current_user.preferences or {}).get("notifications", {})

    # Return with defaults
    return NotificationPreferences(
        email_enabled=prefs.get("email_enabled", True),
        push_enabled=prefs.get("push_enabled", True),
        sound_enabled=prefs.get("sound_enabled", True),
        categories=prefs.get("categories", {}),
        dnd_schedule=prefs.get("dnd_schedule"),
    )


@router.patch("/preferences", response_model=NotificationPreferences)
async def update_notification_preferences(
    request: UpdatePreferencesRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update notification preferences."""
    # Merge with existing preferences
    existing = current_user.preferences or {}
    existing["notifications"] = request.notifications.model_dump()

    current_user.preferences = existing
    await db.commit()
    await db.refresh(current_user)

    logger.info("notification_preferences_updated", user_id=current_user.id)

    return request.notifications


# ==================== TEST (DEV ONLY) ====================


@router.post("/test", status_code=status.HTTP_201_CREATED)
async def send_test_notification(
    request: TestNotificationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Send a test notification to the current user.

    Useful for verifying WebSocket connectivity and UI.
    """
    from app.models.notification import (
        NotificationType as ModelType,
        NotificationCategory as ModelCat,
    )

    service = NotificationService(db)

    notification = await service.send(
        user_id=current_user.id,
        type=ModelType(request.type.value),
        category=ModelCat.SYSTEM,
        title=request.title,
        message=request.message,
        action_url="/dashboard",
        action_label="View Dashboard",
        force=True,  # Bypass preferences for test
    )

    if notification:
        return {
            "message": "Test notification sent",
            "notification_id": str(notification.id),
        }
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create test notification",
        )
