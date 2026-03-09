"""
Synchronous HTTP Webhook Sender

Used by Celery background tasks where no event loop is available.
The async version (sender.py) is still used by the FastAPI API layer.
"""

import json
from typing import Dict, Any
import httpx
import structlog

from ..triggers import Event
from .sender import calculate_signature

logger = structlog.get_logger(__name__)


def send_webhook_sync(
    webhook_url: str, event: Event, secret: str, webhook_id: str = None, timeout: float = 10.0
) -> Dict[str, Any]:
    """
    Send webhook HTTP POST request with HMAC signature (sync version).

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
    payload_json = json.dumps(payload, separators=(",", ":"))
    payload_bytes = payload_json.encode("utf-8")

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
        "sending_webhook_sync",
        webhook_id=webhook_id,
        webhook_url=webhook_url,
        event_type=event.type.value,
        event_id=event.event_id,
    )

    try:
        with httpx.Client() as client:
            response = client.post(
                webhook_url, content=payload_bytes, headers=headers, timeout=timeout
            )

            result = {
                "success": response.status_code < 400,
                "status_code": response.status_code,
                "response_body": response.text[:1000],
            }

            if result["success"]:
                logger.info(
                    "webhook_sent_successfully",
                    webhook_id=webhook_id,
                    webhook_url=webhook_url,
                    status_code=response.status_code,
                    event_type=event.type.value,
                )
            else:
                logger.warning(
                    "webhook_failed",
                    webhook_id=webhook_id,
                    webhook_url=webhook_url,
                    status_code=response.status_code,
                    event_type=event.type.value,
                    response=response.text[:200],
                )

            return result

    except httpx.TimeoutException:
        logger.error(
            "webhook_timeout",
            webhook_id=webhook_id,
            webhook_url=webhook_url,
            event_type=event.type.value,
            timeout=timeout,
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
            exc_info=True,
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
            exc_info=True,
        )
        return {
            "success": False,
            "status_code": 0,
            "response_body": f"Unexpected error: {str(e)}",
        }
