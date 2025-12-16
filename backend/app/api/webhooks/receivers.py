"""
Incoming webhook receivers.

Endpoints for receiving webhooks from external services with enhanced security.
UPDATED: Database lookup, replay attack protection, improved validation.
"""

from fastapi import APIRouter, Request, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from pydantic import BaseModel
import hmac
import hashlib
import time
import structlog

from app.api.deps import get_db
from app.models.webhook import Webhook
from app.services.security.encryption import decrypt_webhook_secret

router = APIRouter()
logger = structlog.get_logger()


class WebhookPayload(BaseModel):
    """Generic webhook payload."""
    event: str
    data: dict


def calculate_signature(payload: bytes, secret: str) -> str:
    """
    Calculate HMAC-SHA256 signature for webhook payload.
    
    Args:
        payload: Raw request body bytes
        secret: Webhook secret key
        
    Returns:
        Signature in format: sha256=<hexdigest>
    """
    signature = hmac.new(
        secret.encode('utf-8'),
        payload,
        hashlib.sha256
    ).hexdigest()
    
    return f"sha256={signature}"


def verify_signature(payload: bytes, signature: str, secret: str) -> bool:
    """
    Validate HMAC webhook signature using constant-time comparison.
    
    Args:
        payload: Raw request body bytes
        signature: Signature from header
        secret: Webhook secret
        
    Returns:
        bool: True if signature is valid
    """
    expected_signature = calculate_signature(payload, secret)
    
    # Constant-time comparison to prevent timing attacks
    return hmac.compare_digest(expected_signature, signature)


def verify_timestamp(timestamp_str: str, max_age_seconds: int = 300) -> bool:
    """
    Verify webhook timestamp to prevent replay attacks.
    
    Args:
        timestamp_str: Unix timestamp from header
        max_age_seconds: Maximum age in seconds (default: 5 minutes)
        
    Returns:
        bool: True if timestamp is valid
    """
    try:
        timestamp = int(timestamp_str)
        now = int(time.time())
        age = abs(now - timestamp)
        return age <= max_age_seconds
    except (ValueError, TypeError):
        return False


@router.post(
    "/receive/{webhook_id}",
    summary="Receive webhook",
    description="Endpoint for receiving webhooks from external services"
)
async def receive_webhook(
    webhook_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Receive and process incoming webhook.
    
    Validates signature, timestamp, and triggers appropriate handlers.
    
    Security features:
    - HMAC-SHA256 signature verification
    - Replay attack protection via timestamp
    - Constant-time signature comparison
    - Database-backed secret lookup
    """
    # Get raw body for signature validation (CRITICAL: must get before parsing)
    body = await request.body()
    
    # Extract headers
    signature = request.headers.get("X-Webhook-Signature")
    timestamp = request.headers.get("X-Webhook-Timestamp")
    request_id = request.headers.get("X-Request-ID", "unknown")
    
    logger.info(
        "webhook_received",
        webhook_id=webhook_id,
        request_id=request_id,
        has_signature=bool(signature),
        has_timestamp=bool(timestamp)
    )
    
    # Validate signature header presence
    if not signature:
        logger.warning("webhook_missing_signature", webhook_id=webhook_id, request_id=request_id)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing X-Webhook-Signature header"
        )
    
    # Fetch webhook from database
    result = await db.execute(
        select(Webhook).where(
            and_(
                Webhook.id == webhook_id,
                Webhook.is_active == True
            )
        )
    )
    webhook = result.scalar_one_or_none()
    
    if not webhook:
        logger.warning("webhook_not_found", webhook_id=webhook_id, request_id=request_id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Webhook not found or inactive"
        )
    
    # Decrypt secret
    try:
        webhook_secret = decrypt_webhook_secret(webhook.secret_encrypted)
    except Exception as e:
        logger.error("webhook_secret_decryption_failed", webhook_id=webhook_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to decrypt webhook secret"
        )
    
    # Verify timestamp (replay attack protection)
    if timestamp:
        if not verify_timestamp(timestamp):
            logger.warning(
                "webhook_timestamp_invalid",
                webhook_id=webhook_id,
                timestamp=timestamp,
                request_id=request_id
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Webhook timestamp expired or invalid (max age: 5 minutes)"
            )
    else:
        logger.warning("webhook_missing_timestamp", webhook_id=webhook_id, request_id=request_id)
        # Optional: make timestamp required in production
        # raise HTTPException(status_code=400, detail="Missing X-Webhook-Timestamp header")
    
    # Verify signature
    if not verify_signature(body, signature, webhook_secret):
        logger.warning("webhook_signature_invalid", webhook_id=webhook_id, request_id=request_id)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid webhook signature"
        )
    
    # Parse payload (after verification)
    try:
        payload = await request.json()
    except Exception as e:
        logger.error("webhook_parse_error", webhook_id=webhook_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON payload"
        )
    
    # Extract event type
    event_type = payload.get("event")
    
    if not event_type:
        logger.error("webhook_missing_event_type", webhook_id=webhook_id, request_id=request_id)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing 'event' field in payload"
        )
    
    logger.info(
        "webhook_verified",
        webhook_id=webhook_id,
        event_type=event_type,
        request_id=request_id,
        user_id=webhook.user_id
    )
    
    # TODO: Process webhook based on event type
    # This could trigger background tasks, update database, etc.
    # For now, just log and acknowledge
    
    # Return success
    return {
        "status": "received",
        "event": event_type,
        "webhook_id": webhook_id,
        "request_id": request_id
    }
