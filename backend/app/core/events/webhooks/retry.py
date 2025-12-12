"""
Webhook Retry Logic

Implements exponential backoff retry for failed webhooks.
"""

from datetime import datetime, timedelta
from typing import List, Dict, Any
import structlog

logger = structlog.get_logger(__name__)


class RetryConfig:
    """Configuration for webhook retry logic"""

    # Maximum number of retry attempts
    MAX_ATTEMPTS = 3

    # Initial backoff delay (seconds)
    INITIAL_BACKOFF_SECONDS = 60  # 1 minute

    # Backoff multiplier (exponential)
    BACKOFF_MULTIPLIER = 2

    # Maximum backoff delay (seconds)
    MAX_BACKOFF_SECONDS = 3600  # 1 hour


def calculate_next_retry_time(
    attempts: int,
    config: RetryConfig = None
) -> datetime:
    """
    Calculate next retry time using exponential backoff

    Args:
        attempts: Number of attempts made so far
        config: Optional retry configuration

    Returns:
        Datetime for next retry attempt
    """
    if config is None:
        config = RetryConfig()

    # Calculate backoff delay: initial * (multiplier ^ attempts)
    backoff_seconds = min(
        config.INITIAL_BACKOFF_SECONDS * (config.BACKOFF_MULTIPLIER ** attempts),
        config.MAX_BACKOFF_SECONDS
    )

    next_retry = datetime.utcnow() + timedelta(seconds=backoff_seconds)

    logger.debug(
        "calculated_retry_time",
        attempts=attempts,
        backoff_seconds=backoff_seconds,
        next_retry=next_retry.isoformat()
    )

    return next_retry


async def retry_failed_webhooks(
    db_session,
    config: RetryConfig = None
) -> Dict[str, int]:
    """
    Retry all failed webhooks that are due for retry

    This should be called periodically by a background task.

    Args:
        db_session: Database session for querying webhook events
        config: Optional retry configuration

    Returns:
        Dict with retry statistics
    """
    if config is None:
        config = RetryConfig()

    logger.info("starting_webhook_retry_job")

    stats = {
        "checked": 0,
        "retried": 0,
        "succeeded": 0,
        "failed": 0,
        "max_attempts_reached": 0
    }

    try:
        # Import models here to avoid circular imports
        from app.models.webhook_event import WebhookEvent
        from sqlalchemy import select

        # Query failed webhooks due for retry
        query = select(WebhookEvent).where(
            WebhookEvent.status == "failed",
            WebhookEvent.attempts < config.MAX_ATTEMPTS,
            WebhookEvent.next_retry_at <= datetime.utcnow()
        )

        result = await db_session.execute(query)
        failed_webhooks = result.scalars().all()

        stats["checked"] = len(failed_webhooks)

        logger.info(
            "found_failed_webhooks",
            count=len(failed_webhooks)
        )

        # Retry each webhook
        for webhook_event in failed_webhooks:
            result = await retry_webhook_event(
                webhook_event,
                db_session,
                config
            )

            stats["retried"] += 1

            if result["success"]:
                stats["succeeded"] += 1
            elif webhook_event.attempts >= config.MAX_ATTEMPTS:
                stats["max_attempts_reached"] += 1
            else:
                stats["failed"] += 1

        # Commit changes
        await db_session.commit()

    except Exception as e:
        logger.error(
            "webhook_retry_job_failed",
            error=str(e),
            exc_info=True
        )
        await db_session.rollback()

    logger.info(
        "webhook_retry_job_completed",
        **stats
    )

    return stats


async def retry_webhook_event(
    webhook_event,
    db_session,
    config: RetryConfig = None
) -> Dict[str, Any]:
    """
    Retry a single webhook event

    Args:
        webhook_event: WebhookEvent model instance
        db_session: Database session
        config: Retry configuration

    Returns:
        Result dict with success status
    """
    if config is None:
        config = RetryConfig()

    logger.info(
        "retrying_webhook",
        webhook_id=webhook_event.id,
        webhook_url=webhook_event.webhook_url,
        attempts=webhook_event.attempts
    )

    # Reconstruct event from stored payload
    from ..triggers import Event
    from .sender import send_webhook

    try:
        event = Event.from_dict(webhook_event.payload)

        # Attempt to send webhook
        result = await send_webhook(
            webhook_url=webhook_event.webhook_url,
            event=event,
            secret=webhook_event.secret,  # Assumes secret is stored
            webhook_id=str(webhook_event.id)
        )

        # Update webhook event record
        webhook_event.attempts += 1
        webhook_event.response_code = result.get("status_code")
        webhook_event.response_body = result.get("response_body", "")[:1000]

        if result["success"]:
            webhook_event.status = "sent"
            webhook_event.sent_at = datetime.utcnow()
            webhook_event.next_retry_at = None

            logger.info(
                "webhook_retry_succeeded",
                webhook_id=webhook_event.id,
                attempts=webhook_event.attempts
            )
        else:
            # Still failed - schedule next retry if under max attempts
            if webhook_event.attempts < config.MAX_ATTEMPTS:
                webhook_event.next_retry_at = calculate_next_retry_time(
                    webhook_event.attempts,
                    config
                )
                logger.warning(
                    "webhook_retry_failed_rescheduled",
                    webhook_id=webhook_event.id,
                    attempts=webhook_event.attempts,
                    next_retry=webhook_event.next_retry_at.isoformat()
                )
            else:
                # Max attempts reached - mark as permanently failed
                webhook_event.status = "failed_permanent"
                webhook_event.next_retry_at = None
                logger.error(
                    "webhook_max_attempts_reached",
                    webhook_id=webhook_event.id,
                    attempts=webhook_event.attempts
                )

        return result

    except Exception as e:
        logger.error(
            "webhook_retry_error",
            webhook_id=webhook_event.id,
            error=str(e),
            exc_info=True
        )

        # Update attempts and schedule retry
        webhook_event.attempts += 1

        if webhook_event.attempts < config.MAX_ATTEMPTS:
            webhook_event.next_retry_at = calculate_next_retry_time(
                webhook_event.attempts,
                config
            )
        else:
            webhook_event.status = "failed_permanent"
            webhook_event.next_retry_at = None

        return {
            "success": False,
            "status_code": 0,
            "response_body": f"Retry error: {str(e)}"
        }
