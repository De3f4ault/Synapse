"""
HTTP Webhook Sender

Sends webhook HTTP requests with HMAC signature authentication.
"""

import json
import hmac
import hashlib
from typing import Dict, Any, Optional
import httpx
import structlog

from ..triggers import Event

logger = structlog.get_logger(__name__)


async def send_webhook(
    webhook_url: str,
    event: Event,
    secret: str,
    webhook_id: str = None,
    timeout: float = 10.0
) -> Dict[str, Any]:
    """
    Send webhook HTTP POST request with HMAC signature

    Args:
        webhook_url: URL to POST webhook payload to
        event: Event to send
        secret: Secret key for HMAC signature
        webhook_id: Optional webhook identifier for logging
        timeout: Request timeout in seconds

    Returns:
        Dict with success status, status_code, and response
    """
    # Build webhook payload
    payload = {
        "event_id": event.event_id,
        "event_type": event.type.value,
        "timestamp": event.timestamp.isoformat(),
        "user_id": event.user_id,
        "data": event.data,
        "source": event.source,
        "correlation_id": event.correlation_id,
    }

    # Serialize payload to JSON
    payload_json = json.dumps(payload, separators=(',', ':'))
    payload_bytes = payload_json.encode('utf-8')

    # Calculate HMAC-SHA256 signature
    signature = calculate_signature(payload_bytes, secret)

    # Prepare headers
    headers = {
        "Content-Type": "application/json",
        "X-Webhook-Signature": f"sha256={signature}",
        "X-Webhook-Event-Type": event.type.value,
        "X-Webhook-Event-Id": event.event_id,
        "User-Agent": "SYNAPSE-Webhook/1.0",
    }

    logger.info(
        "sending_webhook",
        webhook_id=webhook_id,
        webhook_url=webhook_url,
        event_type=event.type.value,
        event_id=event.event_id
    )

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                webhook_url,
                content=payload_bytes,
                headers=headers,
                timeout=timeout
            )

            result = {
                "success": response.status_code < 400,
                "status_code": response.status_code,
                "response_body": response.text[:1000],  # Limit response body
            }

            if result["success"]:
                logger.info(
                    "webhook_sent_successfully",
                    webhook_id=webhook_id,
                    webhook_url=webhook_url,
                    status_code=response.status_code,
                    event_type=event.type.value
                )
            else:
                logger.warning(
                    "webhook_failed",
                    webhook_id=webhook_id,
                    webhook_url=webhook_url,
                    status_code=response.status_code,
                    event_type=event.type.value,
                    response=response.text[:200]
                )

            return result

    except httpx.TimeoutException:
        logger.error(
            "webhook_timeout",
            webhook_id=webhook_id,
            webhook_url=webhook_url,
            event_type=event.type.value,
            timeout=timeout
        )
        return {
            "success": False,
            "status_code": 0,
            "response_body": "Request timeout",
        }

    except httpx.RequestError as e:
        logger.error(
            "webhook_request_error",
            webhook_id=webhook_id,
            webhook_url=webhook_url,
            event_type=event.type.value,
            error=str(e),
            exc_info=True
        )
        return {
            "success": False,
            "status_code": 0,
            "response_body": f"Request error: {str(e)}",
        }

    except Exception as e:
        logger.error(
            "webhook_unexpected_error",
            webhook_id=webhook_id,
            webhook_url=webhook_url,
            event_type=event.type.value,
            error=str(e),
            exc_info=True
        )
        return {
            "success": False,
            "status_code": 0,
            "response_body": f"Unexpected error: {str(e)}",
        }


def calculate_signature(payload: bytes, secret: str) -> str:
    """
    Calculate HMAC-SHA256 signature for webhook payload

    Args:
        payload: Payload bytes to sign
        secret: Secret key for HMAC

    Returns:
        Hex-encoded signature string
    """
    secret_bytes = secret.encode('utf-8')
    signature = hmac.new(
        secret_bytes,
        payload,
        hashlib.sha256
    ).hexdigest()

    return signature


async def test_webhook(
    webhook_url: str,
    secret: str
) -> Dict[str, Any]:
    """
    Send a test webhook to verify connectivity

    Args:
        webhook_url: URL to test
        secret: Secret key

    Returns:
        Result dict with success status
    """
    from datetime import datetime
    from uuid import uuid4
    from ..triggers import EventType

    # Create test event
    test_event = Event(
        type=EventType.SYSTEM_ERROR,  # Use generic system event for testing
        event_id=str(uuid4()),
        timestamp=datetime.utcnow(),
        user_id=None,
        data={
            "test": True,
            "message": "This is a test webhook from SYNAPSE"
        },
        source="webhook_test"
    )

    logger.info("sending_test_webhook", webhook_url=webhook_url)

    result = await send_webhook(
        webhook_url=webhook_url,
        event=test_event,
        secret=secret,
        webhook_id="test"
    )

    return result
