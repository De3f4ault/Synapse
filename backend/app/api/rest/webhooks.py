"""
Webhook management REST API endpoints.

Complete implementation with full CRUD operations, secret generation,
event management, and testing capabilities.
"""

import secrets
import logging
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from pydantic import BaseModel, HttpUrl, Field

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.webhook import Webhook
from app.models.webhook_event import WebhookStatus

logger = logging.getLogger(__name__)
router = APIRouter()


# ============================================================================
# Available Webhook Events
# ============================================================================

AVAILABLE_EVENTS = [
    "card.created",
    "card.updated",
    "card.reviewed",
    "card.deleted",
    "note.created",
    "note.updated",
    "note.deleted",
    "document.uploaded",
    "document.processed",
    "document.deleted",
    "quiz.created",
    "quiz.completed",
    "study.session.completed",
    "chat.message.sent",
]


# ============================================================================
# Request/Response Schemas
# ============================================================================


class WebhookCreate(BaseModel):
    """Webhook creation request."""

    url: HttpUrl = Field(..., description="Webhook endpoint URL")
    events: List[str] = Field(..., min_items=1, description="Events to subscribe to")
    description: Optional[str] = Field(None, max_length=500, description="Webhook description")
    active: bool = Field(default=True, description="Whether webhook is active")


class WebhookUpdate(BaseModel):
    """Webhook update request."""

    url: Optional[HttpUrl] = None
    events: Optional[List[str]] = None
    description: Optional[str] = None
    active: Optional[bool] = None


class WebhookResponse(BaseModel):
    """Webhook response."""

    id: int
    url: str
    events: List[str]
    description: Optional[str]
    active: bool
    secret: str  # Only returned on creation
    created_at: datetime
    updated_at: datetime
    last_triggered_at: Optional[datetime]
    success_count: int
    failure_count: int

    class Config:
        from_attributes = True


class WebhookEventResponse(BaseModel):
    """Webhook event delivery response."""

    id: int
    webhook_id: int
    event_type: str
    payload: dict
    status: WebhookStatus
    http_status: Optional[int]
    response: Optional[str]
    attempts: int
    next_retry_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class WebhookTestRequest(BaseModel):
    """Test webhook request."""

    event_type: str = Field(..., description="Event type to test")


class WebhookTestResponse(BaseModel):
    """Test webhook response."""

    success: bool
    http_status: int
    response_time_ms: float
    message: str


# ============================================================================
# Helper Functions
# ============================================================================


def validate_events(events: List[str]) -> tuple[bool, Optional[str]]:
    """
    Validate webhook event names.

    Args:
        events: List of event names to validate

    Returns:
        (is_valid, error_message)
    """
    for event in events:
        if event not in AVAILABLE_EVENTS:
            return False, f"Invalid event: {event}. Available: {', '.join(AVAILABLE_EVENTS)}"
    return True, None


def generate_webhook_secret() -> str:
    """
    Generate secure webhook secret for HMAC signing.

    Returns:
        Secure random secret string
    """
    return secrets.token_urlsafe(32)


# ============================================================================
# Endpoints
# ============================================================================


@router.get(
    "",
    response_model=List[WebhookResponse],
    summary="List webhooks",
    description="Retrieve user's webhooks",
)
async def list_webhooks(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    active_only: bool = Query(False, description="Only active webhooks"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List user's webhooks with pagination."""
    query = select(Webhook).where(Webhook.user_id == current_user.id)

    if active_only:
        query = query.where(Webhook.is_active.is_(True))

    query = query.order_by(Webhook.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    webhooks = result.scalars().all()

    return [
        WebhookResponse(
            id=w.id,
            url=str(w.url),
            events=w.events or [],
            description=w.description,
            active=w.is_active,
            secret="*" * 32,  # Don't expose secret after creation
            created_at=w.created_at,
            updated_at=w.updated_at,
            last_triggered_at=w.last_triggered_at,
            success_count=w.successful_deliveries or 0,
            failure_count=w.failed_deliveries or 0,
        )
        for w in webhooks
    ]


@router.post(
    "",
    response_model=WebhookResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create webhook",
    description="Create a new webhook for event notifications",
)
async def create_webhook(
    webhook_data: WebhookCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new webhook.

    The webhook secret should be used to verify webhook signatures
    using HMAC-SHA256 for security.
    """
    # Validate events
    is_valid, error_msg = validate_events(webhook_data.events)
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error_msg)

    # Generate secret
    secret = generate_webhook_secret()

    # Create webhook record with encrypted secret
    from app.core.security import encrypt_secret

    encrypted_secret = encrypt_secret(secret)

    new_webhook = Webhook(
        user_id=current_user.id,
        url=str(webhook_data.url),
        events=webhook_data.events,
        description=webhook_data.description,
        secret_encrypted=encrypted_secret,
        is_active=webhook_data.active,
    )

    db.add(new_webhook)
    await db.commit()
    await db.refresh(new_webhook)

    logger.info(
        "webhook_created",
        user_id=current_user.id,
        webhook_id=new_webhook.id,
        events=webhook_data.events,
    )

    return WebhookResponse(
        id=new_webhook.id,
        url=str(new_webhook.url),
        events=new_webhook.events or [],
        description=new_webhook.description,
        active=new_webhook.is_active,
        secret=secret,  # Return plaintext secret ONLY on creation
        created_at=new_webhook.created_at,
        updated_at=new_webhook.updated_at,
        last_triggered_at=new_webhook.last_triggered_at,
        success_count=new_webhook.successful_deliveries or 0,
        failure_count=new_webhook.failed_deliveries or 0,
    )


@router.get(
    "/{webhook_id}",
    response_model=WebhookResponse,
    summary="Get webhook",
    description="Retrieve a specific webhook",
)
async def get_webhook(
    webhook_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific webhook."""
    result = await db.execute(
        select(Webhook).where(
            and_(
                Webhook.id == webhook_id,
                Webhook.user_id == current_user.id,
            )
        )
    )
    webhook = result.scalar_one_or_none()

    if not webhook:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Webhook not found")

    return WebhookResponse(
        id=webhook.id,
        url=str(webhook.url),
        events=webhook.events or [],
        description=webhook.description,
        active=webhook.is_active,
        secret="*" * 32,  # Don't expose secret
        created_at=webhook.created_at,
        updated_at=webhook.updated_at,
        last_triggered_at=webhook.last_triggered_at,
        success_count=webhook.successful_deliveries or 0,
        failure_count=webhook.failed_deliveries or 0,
    )


@router.put(
    "/{webhook_id}",
    response_model=WebhookResponse,
    summary="Update webhook",
    description="Update a webhook configuration",
)
async def update_webhook(
    webhook_id: int,
    update_data: WebhookUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update webhook configuration."""
    result = await db.execute(
        select(Webhook).where(
            and_(
                Webhook.id == webhook_id,
                Webhook.user_id == current_user.id,
            )
        )
    )
    webhook = result.scalar_one_or_none()

    if not webhook:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Webhook not found")

    # Validate events if provided
    if update_data.events:
        is_valid, error_msg = validate_events(update_data.events)
        if not is_valid:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error_msg)
        webhook.events = update_data.events

    # Update fields
    if update_data.url:
        webhook.url = str(update_data.url)
    if update_data.description is not None:
        webhook.description = update_data.description
    if update_data.active is not None:
        webhook.is_active = update_data.active

    await db.commit()
    await db.refresh(webhook)

    logger.info("webhook_updated", user_id=current_user.id, webhook_id=webhook.id)

    return WebhookResponse(
        id=webhook.id,
        url=str(webhook.url),
        events=webhook.events or [],
        description=webhook.description,
        active=webhook.is_active,
        secret="*" * 32,  # Don't expose secret
        created_at=webhook.created_at,
        updated_at=webhook.updated_at,
        last_triggered_at=webhook.last_triggered_at,
        success_count=webhook.successful_deliveries or 0,
        failure_count=webhook.failed_deliveries or 0,
    )


@router.delete(
    "/{webhook_id}", summary="Delete webhook", description="Delete a webhook (soft delete)"
)
async def delete_webhook(
    webhook_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a webhook (hard delete)."""
    result = await db.execute(
        select(Webhook).where(
            and_(
                Webhook.id == webhook_id,
                Webhook.user_id == current_user.id,
            )
        )
    )
    webhook = result.scalar_one_or_none()

    if not webhook:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Webhook not found")

    await db.delete(webhook)
    await db.commit()

    logger.info("webhook_deleted", user_id=current_user.id, webhook_id=webhook_id)

    return {"message": "Webhook deleted successfully"}


@router.post(
    "/{webhook_id}/test",
    response_model=WebhookTestResponse,
    summary="Test webhook",
    description="Send test payload to webhook",
)
async def test_webhook(
    webhook_id: int,
    test_data: WebhookTestRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Test webhook by sending sample payload.

    Useful for verifying webhook configuration and connectivity.
    """
    result = await db.execute(
        select(Webhook).where(
            and_(
                Webhook.id == webhook_id,
                Webhook.user_id == current_user.id,
            )
        )
    )
    webhook = result.scalar_one_or_none()

    if not webhook:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Webhook not found")

    try:
        import httpx
        import time
        import hmac
        import hashlib
        import json
        from app.core.security import decrypt_secret

        # Decrypt secret for signing
        secret = decrypt_secret(webhook.secret_encrypted)

        # Create test payload
        test_payload = {
            "event_type": test_data.event_type,
            "timestamp": datetime.utcnow().isoformat(),
            "data": {"test": True, "webhook_id": webhook.id},
        }

        # Create HMAC signature
        payload_str = json.dumps(test_payload, sort_keys=True)
        signature = hmac.new(secret.encode(), payload_str.encode(), hashlib.sha256).hexdigest()

        # Send test request
        start_time = time.time()
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                str(webhook.url),
                json=test_payload,
                headers={
                    "X-Webhook-Signature": signature,
                    "X-Webhook-Event": test_data.event_type,
                    "X-Webhook-ID": str(webhook.id),
                },
            )
        response_time_ms = (time.time() - start_time) * 1000

        success = 200 <= response.status_code < 300

        logger.info(
            "webhook_test_sent",
            webhook_id=webhook.id,
            event_type=test_data.event_type,
            status_code=response.status_code,
            response_time_ms=response_time_ms,
        )

        return WebhookTestResponse(
            success=success,
            http_status=response.status_code,
            response_time_ms=response_time_ms,
            message=f"Webhook test sent. Status: {response.status_code}",
        )

    except Exception as e:
        logger.error("webhook_test_failed", webhook_id=webhook.id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to test webhook: {str(e)}",
        )


@router.get(
    "/events",
    summary="List available events",
    description="Get list of all available webhook event types",
)
async def list_event_types():
    """List available webhook event types for subscription."""
    return {"events": AVAILABLE_EVENTS, "count": len(AVAILABLE_EVENTS)}
