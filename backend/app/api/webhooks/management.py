"""
Webhook management endpoints.

CRUD operations for webhook registrations with database storage.
UPDATED: Full implementation with encryption and database integration.
"""

from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from pydantic import BaseModel, HttpUrl, Field
import structlog

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.webhook import Webhook
from app.models.webhook_event import WebhookEvent, WebhookStatus
from app.services.security.encryption import (
    encrypt_webhook_secret,
    decrypt_webhook_secret, 
    generate_webhook_secret,
)
from app.core.events.webhooks.sender import test_webhook

logger = structlog.get_logger(__name__)
router = APIRouter()


# ============================================================================
# Schemas
# ============================================================================

class WebhookCreate(BaseModel):
    """Webhook creation request."""
    url: HttpUrl
    events: List[str] = Field(min_length=1, description="Event types to subscribe to")
    description: str = Field(default="", max_length=500)


class WebhookUpdate(BaseModel):
    """Webhook update request."""
    url: Optional[HttpUrl] = None
    events: Optional[List[str]] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class WebhookResponse(BaseModel):
    """Webhook response."""
    id: int
    url: str
    events: List[str]
    description: str
    secret_masked: str = Field(description="Masked version of secret for display")
    is_active: bool
    created_at: datetime
    updated_at: datetime
    last_triggered_at: Optional[datetime]
    total_deliveries: int
    successful_deliveries: int
    failed_deliveries: int
    success_rate: float

    class Config:
        from_attributes = True


class WebhookDeliveryLog(BaseModel):
    """Webhook delivery log entry."""
    id: int
    event_type: str
    status: WebhookStatus
    attempts: int
    response_code: Optional[int]
    created_at: datetime
    sent_at: Optional[datetime]

    class Config:
        from_attributes = True


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

def validate_events(events: List[str]) -> tuple[bool, str]:
    """
    Validate event names.

    Returns:
        (is_valid, error_message)
    """
    if not events:
        return False, "At least one event must be specified"
    
    for event in events:
        if event not in AVAILABLE_EVENTS:
            return False, f"Invalid event: {event}. Available events: {', '.join(AVAILABLE_EVENTS)}"

    return True, ""


def mask_secret(secret: str) -> str:
    """Mask secret for display (show first 4 and last 4 chars)."""
    if len(secret) <= 8:
        return "****"
    return f"{secret[:4]}{'*' * (len(secret) - 8)}{secret[-4:]}"


def webhook_to_response(webhook: Webhook) -> WebhookResponse:
    """Convert Webhook model to response schema."""
    return WebhookResponse(
        id=webhook.id,
        url=webhook.url,
        events=webhook.events,
        description=webhook.description or "",
        secret_masked=mask_secret(decrypt_webhook_secret(webhook.secret_encrypted)),
        is_active=webhook.is_active,
        created_at=webhook.created_at,
        updated_at=webhook.updated_at,
        last_triggered_at=webhook.last_triggered_at,
        total_deliveries=webhook.total_deliveries,
        successful_deliveries=webhook.successful_deliveries,
        failed_deliveries=webhook.failed_deliveries,
        success_rate=webhook.success_rate
    )


# ============================================================================
# Endpoints
# ============================================================================

@router.get("", response_model=List[WebhookResponse])
async def list_webhooks(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all webhooks for the authenticated user."""
    query = select(Webhook).where(
        Webhook.user_id == current_user.id
    ).order_by(Webhook.created_at.desc())

    result = await db.execute(query)
    webhooks = result.scalars().all()

    return [webhook_to_response(w) for w in webhooks]


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

    # Generate and encrypt secret
    secret = generate_webhook_secret()
    encrypted_secret = encrypt_webhook_secret(secret)

    # Create webhook
    new_webhook = Webhook(
        user_id=current_user.id,
        url=str(webhook_data.url),
        secret_encrypted=encrypted_secret,
        events=webhook_data.events,
        description=webhook_data.description,
        is_active=True
    )

    db.add(new_webhook)
    await db.commit()
    await db.refresh(new_webhook)

    logger.info(
        "webhook_created",
        webhook_id=new_webhook.id,
        user_id=current_user.id,
        events=webhook_data.events
    )

    return webhook_to_response(new_webhook)


@router.get("/{webhook_id}", response_model=WebhookResponse)
async def get_webhook(
    webhook_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get details of a specific webhook."""
    result = await db.execute(
        select(Webhook).where(
            and_(
                Webhook.id == webhook_id,
                Webhook.user_id == current_user.id
            )
        )
    )
    webhook = result.scalar_one_or_none()

    if not webhook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Webhook not found"
        )

    return webhook_to_response(webhook)


@router.put("/{webhook_id}", response_model=WebhookResponse)
async def update_webhook(
    webhook_id: int,
    webhook_data: WebhookUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a webhook configuration."""
    # Fetch webhook
    result = await db.execute(
        select(Webhook).where(
            and_(
                Webhook.id == webhook_id,
                Webhook.user_id == current_user.id
            )
        )
    )
    webhook = result.scalar_one_or_none()

    if not webhook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Webhook not found"
        )

    # Validate events if provided
    if webhook_data.events:
        is_valid, error_msg = validate_events(webhook_data.events)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg
            )

    # Update fields
    if webhook_data.url is not None:
        webhook.url = str(webhook_data.url)
    if webhook_data.events is not None:
        webhook.events = webhook_data.events
    if webhook_data.description is not None:
        webhook.description = webhook_data.description
    if webhook_data.is_active is not None:
        webhook.is_active = webhook_data.is_active

    webhook.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(webhook)

    logger.info("webhook_updated", webhook_id=webhook_id, user_id=current_user.id)

    return webhook_to_response(webhook)


@router.delete("/{webhook_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_webhook(
    webhook_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a webhook registration."""
    result = await db.execute(
        select(Webhook).where(
            and_(
                Webhook.id == webhook_id,
                Webhook.user_id == current_user.id
            )
        )
    )
    webhook = result.scalar_one_or_none()

    if not webhook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Webhook not found"
        )

    await db.delete(webhook)
    await db.commit()

    logger.info("webhook_deleted", webhook_id=webhook_id, user_id=current_user.id)


@router.post("/{webhook_id}/regenerate-secret", response_model=dict)
async def regenerate_secret(
    webhook_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Regenerate webhook secret (invalidates old secret)."""
    result = await db.execute(
        select(Webhook).where(
            and_(
                Webhook.id == webhook_id,
                Webhook.user_id == current_user.id
            )
        )
    )
    webhook = result.scalar_one_or_none()

    if not webhook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Webhook not found"
        )

    # Generate new secret
    new_secret = generate_webhook_secret()
    webhook.secret_encrypted = encrypt_webhook_secret(new_secret)
    webhook.updated_at = datetime.utcnow()

    await db.commit()

    logger.info("webhook_secret_regenerated", webhook_id=webhook_id, user_id=current_user.id)

    return {
        "message": "Secret regenerated successfully",
        "secret": new_secret,  # Return once for user to save
        "webhook_id": webhook_id
    }


@router.post("/{webhook_id}/test", response_model=dict)
async def test_webhook_endpoint(
    webhook_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Send a test event to the webhook.

    Useful for verifying webhook configuration and endpoint availability.
    """
    result = await db.execute(
        select(Webhook).where(
            and_(
                Webhook.id == webhook_id,
                Webhook.user_id == current_user.id
            )
        )
    )
    webhook = result.scalar_one_or_none()

    if not webhook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Webhook not found"
        )

    # Decrypt secret for test
    secret = decrypt_webhook_secret(webhook.secret_encrypted)

    # Send test webhook
    test_result = await test_webhook(webhook.url, secret)

    logger.info(
        "webhook_test_sent",
        webhook_id=webhook_id,
        success=test_result.get("success"),
        status_code=test_result.get("status_code")
    )

    return {
        "success": test_result.get("success"),
        "status_code": test_result.get("status_code"),
        "message": "Test webhook sent" if test_result.get("success") else "Test webhook failed"
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
    # Verify webhook ownership
    result = await db.execute(
        select(Webhook).where(
            and_(
                Webhook.id == webhook_id,
                Webhook.user_id == current_user.id
            )
        )
    )
    webhook = result.scalar_one_or_none()

    if not webhook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Webhook not found"
        )

    # Query delivery logs
    result = await db.execute(
        select(WebhookEvent).where(
            WebhookEvent.webhook_id == webhook_id
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


@router.get("/events/available", response_model=dict)
async def list_available_events():
    """List all available webhook event types."""
    return {
        "events": [
            {
                "name": event,
                "category": event.split(".")[0]
            }
            for event in AVAILABLE_EVENTS
        ]
    }
