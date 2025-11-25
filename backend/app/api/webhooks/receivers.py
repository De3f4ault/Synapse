"""
Incoming webhook receivers.

Endpoints for receiving webhooks from external services.
"""

from fastapi import APIRouter, Request, HTTPException, status
from pydantic import BaseModel
import hmac
import hashlib
import structlog

router = APIRouter()
logger = structlog.get_logger()


class WebhookPayload(BaseModel):
    """Generic webhook payload."""
    event: str
    data: dict


def validate_signature(payload: bytes, signature: str, secret: str) -> bool:
    """
    Validate HMAC webhook signature.

    Args:
        payload: Raw request body
        signature: Signature from header
        secret: Webhook secret

    Returns:
        bool: True if signature is valid
    """
    expected_signature = hmac.new(
        secret.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()

    # Constant-time comparison
    return hmac.compare_digest(
        f"sha256={expected_signature}",
        signature
    )


@router.post(
    "/receive/{webhook_id}",
    summary="Receive webhook",
    description="Endpoint for receiving webhooks from external services"
)
async def receive_webhook(
    webhook_id: str,
    request: Request
):
    """
    Receive and process incoming webhook.

    Validates signature and triggers appropriate handlers.
    """
    # Get raw body for signature validation
    body = await request.body()

    # Get signature from header
    signature = request.headers.get("X-Webhook-Signature")

    if not signature:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing webhook signature"
        )

    # TODO: Retrieve webhook secret from database
    webhook_secret = "placeholder_secret"

    # Validate signature
    if not validate_signature(body, signature, webhook_secret):
        logger.warning("webhook_signature_invalid", webhook_id=webhook_id)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid webhook signature"
        )

    # Parse payload
    try:
        payload = await request.json()
    except Exception as e:
        logger.error("webhook_parse_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON payload"
        )

    # TODO: Process webhook based on event type
    event_type = payload.get("event")
    logger.info(
        "webhook_received",
        webhook_id=webhook_id,
        event=event_type
    )

    # Return success
    return {"status": "received", "event": event_type}
