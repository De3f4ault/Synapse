"""
Webhook management endpoints.

CRUD operations for webhook registrations.

"""

from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from pydantic import BaseModel, HttpUrl
import secrets

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.webhook_event import WebhookEvent, WebhookStatus

router = APIRouter()


# ============================================================================
# Schemas (Note: These overlap with webhooks.py, consolidate in production)
# ============================================================================

class WebhookCreate(BaseModel):
    """Webhook creation request."""
    url: HttpUrl
    events: List[str]
    description: str = ""


class WebhookUpdate(BaseModel):
    """Webhook update request."""
    url: HttpUrl = None
    events: List[str] = None
    description: str = None
    is_active: bool = None


class WebhookResponse(BaseModel):
    """Webhook response."""
    id: int
    url: str
    events: List[str]
    description: str
    secret: str
    is_active: bool
    created_at: datetime


class WebhookDeliveryLog(BaseModel):
    """Webhook delivery log entry."""
    id: int
    event_type: str
    status: WebhookStatus
    attempts: int
    response_code: int = None
    created_at: datetime
    sent_at: datetime = None


# ============================================================================
# Constants
# ============================================================================

AVAILABLE_EVENTS = [
    "card.created",
    "card.updated",
    "card.reviewed",
    "card.deleted",
    "deck.created",
    "deck.updated",
    "deck.deleted",
    "note.created",
    "note.updated",
    "note.deleted",
    "document.uploaded",
    "document.processed",
    "document.failed",
    "quiz.created",
    "quiz.completed",
    "chat.message.sent",
    "chat.session.created",
    "study.session.started",
    "study.session.completed"
]


# ============================================================================
# Helper Functions
# ============================================================================

def generate_webhook_secret() -> str:
    """Generate a secure random webhook secret."""
    return secrets.token_urlsafe(32)


def validate_events(events: List[str]) -> tuple[bool, str]:
    """
    Validate event names.

    Returns:
        (is_valid, error_message)
    """
    for event in events:
        if event not in AVAILABLE_EVENTS:
            return False, f"Invalid event: {event}. Available events: {', '.join(AVAILABLE_EVENTS)}"

    if not events:
        return False, "At least one event must be specified"

    return True, ""


# ============================================================================
# Endpoints
# ============================================================================

@router.get("", response_model=List[WebhookResponse])
async def list_webhooks(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all webhooks for the authenticated user."""

    # NOTE: In production, add a webhooks table to store webhook configurations
    # For now, return empty list as placeholder

    # Example query (once webhooks table exists):
    # query = select(Webhook).where(
    #     Webhook.user_id == current_user.id
    # ).order_by(Webhook.created_at.desc())
    #
    # result = await db.execute(query)
    # webhooks = result.scalars().all()

    return []


@router.post("", response_model=WebhookResponse, status_code=status.HTTP_201_CREATED)
async def create_webhook(
    webhook_data: WebhookCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new webhook registration.

    The webhook will receive POST requests for specified events.
    A secret is generated for HMAC signature validation.
    """
    # Validate events
    is_valid, error_msg = validate_events(webhook_data.events)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )

    # Generate secret
    secret = generate_webhook_secret()

    # NOTE: In production, create webhook record in database
    # new_webhook = Webhook(
    #     user_id=current_user.id,
    #     url=str(webhook_data.url),
    #     events=webhook_data.events,
    #     description=webhook_data.description,
    #     secret=secret,  # Store encrypted in production!
    #     is_active=True
    # )
    # db.add(new_webhook)
    # await db.commit()
    # await db.refresh(new_webhook)

    # Placeholder response
    return WebhookResponse(
        id=1,
        url=str(webhook_data.url),
        events=webhook_data.events,
        description=webhook_data.description,
        secret=secret,
        is_active=True,
        created_at=datetime.utcnow()
    )


@router.get("/{webhook_id}", response_model=WebhookResponse)
async def get_webhook(
    webhook_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get details of a specific webhook."""

    # NOTE: In production, query webhook from database
    # result = await db.execute(
    #     select(Webhook).where(
    #         and_(
    #             Webhook.id == webhook_id,
    #             Webhook.user_id == current_user.id
    #         )
    #     )
    # )
    # webhook = result.scalar_one_or_none()
    #
    # if not webhook:
    #     raise HTTPException(
    #         status_code=status.HTTP_404_NOT_FOUND,
    #         detail="Webhook not found"
    #     )
    #
    # return webhook

    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Webhook storage not yet implemented. Add webhooks table to database."
    )


@router.put("/{webhook_id}", response_model=WebhookResponse)
async def update_webhook(
    webhook_id: int,
    webhook_data: WebhookUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a webhook configuration."""

    # Validate events if provided
    if webhook_data.events:
        is_valid, error_msg = validate_events(webhook_data.events)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg
            )

    # NOTE: In production, update webhook in database
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Webhook storage not yet implemented"
    )


@router.delete("/{webhook_id}")
async def delete_webhook(
    webhook_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a webhook registration."""

    # NOTE: In production, delete webhook from database
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Webhook storage not yet implemented"
    )


@router.post("/{webhook_id}/test")
async def test_webhook(
    webhook_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Send a test event to the webhook.

    Useful for verifying webhook configuration and endpoint availability.
    """
    # NOTE: In production:
    # 1. Get webhook from database
    # 2. Create test event payload
    # 3. Send HTTP POST to webhook URL with signature
    # 4. Return delivery status

    test_payload = {
        "event": "test.webhook",
        "timestamp": datetime.utcnow().isoformat(),
        "data": {
            "message": "This is a test webhook delivery",
            "user_id": current_user.id
        }
    }

    return {
        "message": "Test webhook would be sent here",
        "payload": test_payload,
        "note": "Implement webhook sending logic with HMAC signature"
    }


@router.get("/{webhook_id}/logs", response_model=List[WebhookDeliveryLog])
async def get_webhook_logs(
    webhook_id: int,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get delivery logs for a webhook.

    Shows recent webhook delivery attempts with status and response details.
    """
    # Query webhook_events table for this webhook
    # NOTE: In production, filter by webhook_id once webhooks table exists

    result = await db.execute(
        select(WebhookEvent).where(
            WebhookEvent.user_id == current_user.id
        ).order_by(
            WebhookEvent.created_at.desc()
        ).limit(limit)
    )
    events = result.scalars().all()

    return [
        WebhookDeliveryLog(
            id=event.id,
            event_type=event.event_type,
            status=event.status,
            attempts=event.attempts,
            response_code=event.response_code,
            created_at=event.created_at,
            sent_at=event.sent_at
        )
        for event in events
    ]
