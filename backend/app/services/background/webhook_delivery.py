"""
Webhook delivery task for Celery with exponential backoff retry logic.

Handles synchronous webhook HTTP POST delivery with automatic retries.
Uses sync SessionLocal and httpx.Client — no event loop needed.
"""

import httpx
from datetime import datetime, timedelta
from typing import Dict, Any
import structlog

from app.services.background.celery_app import celery_app
from app.models.webhook import Webhook
from app.models.webhook_event import WebhookEvent, WebhookStatus
from app.services.security.encryption import decrypt_webhook_secret
from app.core.events.webhooks.sender_sync import send_webhook_sync
from app.core.events.webhooks.sender import calculate_signature
from app.core.events.triggers import Event, EventType
from app.core.config import settings

logger = structlog.get_logger(__name__)


@celery_app.task(
    bind=True,
    autoretry_for=(httpx.RequestError, httpx.TimeoutException),
    max_retries=settings.WEBHOOK_MAX_RETRIES,
    retry_backoff=True,  # Exponential backoff: 2^attempt seconds
    retry_backoff_max=settings.WEBHOOK_BACKOFF_MAX,  # Max 1 hour
    retry_jitter=True,  # Add randomization to prevent thundering herd
    acks_late=True,  # Acknowledge after completion (prevents message loss)
    time_limit=settings.WEBHOOK_TIMEOUT * 2,  # Hard timeout
    name="webhook.deliver",
)
def deliver_webhook_task(
    self,
    webhook_id: int,
    event_id: str,
    event_type: str,
    event_timestamp: str,
    user_id: int,
    payload_data: dict,
    source: str = "system",
    correlation_id: str = None,
):
    """
    Celery task to deliver webhook with exponential backoff retry.

    This task is idempotent and safe to retry multiple times.
    All operations are synchronous — no event loop needed.

    Args:
        self: Celery task instance (injected via bind=True)
        webhook_id: ID of webhook subscription
        event_id: Unique event identifier
        event_type: Type of event (e.g., 'card.reviewed')
        event_timestamp: ISO format timestamp
        user_id: User ID who owns the webhook
        payload_data: Event data payload
        source: Event source identifier
        correlation_id: Optional correlation ID for tracing

    Returns:
        dict: Delivery result with success status
    """
    logger.info(
        "webhook_delivery_started",
        webhook_id=webhook_id,
        event_type=event_type,
        event_id=event_id,
        attempt=self.request.retries + 1,
    )

    result = _deliver_webhook(
        webhook_id=webhook_id,
        event_id=event_id,
        event_type=event_type,
        event_timestamp=event_timestamp,
        user_id=user_id,
        payload_data=payload_data,
        source=source,
        correlation_id=correlation_id,
        attempt_number=self.request.retries + 1,
    )

    # If delivery failed and retries exhausted, move to Dead Letter Queue
    if not result["success"] and self.request.retries >= self.max_retries:
        _move_to_dlq(webhook_id, event_id)
        logger.error(
            "webhook_moved_to_dlq",
            webhook_id=webhook_id,
            event_id=event_id,
            max_retries=self.max_retries,
        )

    return result


def _deliver_webhook(
    webhook_id: int,
    event_id: str,
    event_type: str,
    event_timestamp: str,
    user_id: int,
    payload_data: dict,
    source: str,
    correlation_id: str,
    attempt_number: int,
) -> Dict[str, Any]:
    """
    Synchronous webhook delivery with database updates.

    Returns:
        dict: Delivery result
    """
    from app.db.session import SessionLocal
    from sqlalchemy import select

    with SessionLocal() as db:
        # Fetch webhook from database
        result = db.execute(select(Webhook).where(Webhook.id == webhook_id))
        webhook = result.scalar_one_or_none()

        if not webhook:
            logger.error("webhook_not_found_for_delivery", webhook_id=webhook_id)
            return {"success": False, "error": "Webhook not found"}

        if not webhook.is_active:
            logger.warning("webhook_inactive_skipping", webhook_id=webhook_id)
            return {"success": False, "error": "Webhook inactive"}

        # Check if webhook is subscribed to this event type
        if event_type not in webhook.events:
            logger.info(
                "webhook_not_subscribed",
                webhook_id=webhook_id,
                event_type=event_type,
                subscribed_events=webhook.events,
            )
            return {"success": False, "error": "Not subscribed to event type"}

        # Decrypt secret
        secret = decrypt_webhook_secret(webhook.secret_encrypted)

        # Create or get WebhookEvent record
        event_result = db.execute(
            select(WebhookEvent).where(
                WebhookEvent.webhook_id == webhook_id,
                WebhookEvent.event_type == event_type,
                WebhookEvent.payload.op("@>")({"event_id": event_id}),  # JSONB contains
            )
        )
        webhook_event = event_result.scalar_one_or_none()

        if not webhook_event:
            # Create new event record
            webhook_event = WebhookEvent(
                webhook_id=webhook_id,
                user_id=user_id,
                webhook_url=webhook.url,
                event_type=event_type,
                payload={
                    "event_id": event_id,
                    "event_type": event_type,
                    "timestamp": event_timestamp,
                    "user_id": user_id,
                    "data": payload_data,
                    "source": source,
                    "correlation_id": correlation_id,
                },
                status=WebhookStatus.PENDING,
                attempts=0,
            )
            db.add(webhook_event)
            db.commit()
            db.refresh(webhook_event)

        # Update attempt count
        webhook_event.attempts = attempt_number

        # Build Event object for sender
        event = Event(
            type=EventType(event_type.split(".")[0].upper() + "_EVENT"),  # Convert to enum
            event_id=event_id,
            timestamp=datetime.fromisoformat(event_timestamp),
            user_id=user_id,
            data=payload_data,
            source=source,
            correlation_id=correlation_id,
        )

        # Send webhook (sync)
        try:
            delivery_result = send_webhook_sync(
                webhook_url=webhook.url,
                event=event,
                secret=secret,
                webhook_id=str(webhook_id),
                timeout=settings.WEBHOOK_TIMEOUT,
            )

            # Update webhook_event with result
            webhook_event.status = (
                WebhookStatus.SENT if delivery_result["success"] else WebhookStatus.FAILED
            )
            webhook_event.response_code = delivery_result.get("status_code")
            webhook_event.response_body = delivery_result.get("response_body", "")[:1000]

            if delivery_result["success"]:
                webhook_event.sent_at = datetime.utcnow()
                webhook.successful_deliveries += 1
            else:
                webhook.failed_deliveries += 1
                # Calculate next retry time
                if attempt_number < settings.WEBHOOK_MAX_RETRIES:
                    backoff_seconds = min(2**attempt_number, settings.WEBHOOK_BACKOFF_MAX)
                    webhook_event.next_retry_at = datetime.utcnow() + timedelta(
                        seconds=backoff_seconds
                    )

            # Update webhook metrics
            webhook.total_deliveries += 1
            webhook.last_triggered_at = datetime.utcnow()

            db.commit()

            logger.info(
                "webhook_delivery_completed",
                webhook_id=webhook_id,
                success=delivery_result["success"],
                status_code=delivery_result.get("status_code"),
                attempt=attempt_number,
            )

            return delivery_result

        except Exception as e:
            # Handle unexpected errors
            logger.error(
                "webhook_delivery_unexpected_error",
                webhook_id=webhook_id,
                error=str(e),
                exc_info=True,
            )

            webhook_event.status = WebhookStatus.FAILED
            webhook.failed_deliveries += 1
            webhook.total_deliveries += 1

            db.commit()

            # Re-raise to trigger Celery retry
            raise


def _move_to_dlq(webhook_id: int, event_id: str):
    """
    Move failed webhook event to Dead Letter Queue (mark as permanently failed).

    Args:
        webhook_id: Webhook ID
        event_id: Event ID
    """
    from app.db.session import SessionLocal
    from sqlalchemy import select

    with SessionLocal() as db:
        result = db.execute(
            select(WebhookEvent).where(
                WebhookEvent.webhook_id == webhook_id,
                WebhookEvent.payload.op("@>")({"event_id": event_id}),
            )
        )
        webhook_event = result.scalar_one_or_none()

        if webhook_event:
            webhook_event.status = WebhookStatus.FAILED
            webhook_event.next_retry_at = None  # No more retries
            db.commit()

            logger.warning(
                "webhook_event_dlq",
                webhook_id=webhook_id,
                event_id=event_id,
                attempts=webhook_event.attempts,
            )
