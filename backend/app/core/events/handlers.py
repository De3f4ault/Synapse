"""
Event Handlers Registry

Central registry of all internal event handlers.
"""

import structlog
from .triggers import Event, EventType
from .dispatcher import EventDispatcher

logger = structlog.get_logger(__name__)


# ============================================================================
# Cache Invalidation Handlers
# ============================================================================

async def invalidate_cache_on_content_change(event: Event):
    """
    Invalidate user context cache when content changes

    Triggered by: CARD_UPDATED, NOTE_UPDATED, CARD_REVIEWED, etc.
    """
    if not event.user_id:
        return

    logger.info(
        "invalidating_cache",
        event_type=event.type.value,
        user_id=event.user_id
    )

    # Import here to avoid circular dependencies
    try:
        from app.services.cache.manager import get_cache_manager
        cache_manager = get_cache_manager()

        # Invalidate user context cache
        await cache_manager.delete(f"context:{event.user_id}")

        # Invalidate any module-specific caches
        if event.type in [EventType.CARD_UPDATED, EventType.CARD_REVIEWED]:
            deck_id = event.data.get("deck_id")
            if deck_id:
                await cache_manager.delete(f"deck:{deck_id}:stats")

        logger.debug("cache_invalidated", user_id=event.user_id)

    except Exception as e:
        logger.error(
            "cache_invalidation_failed",
            user_id=event.user_id,
            error=str(e),
            exc_info=True
        )


# ============================================================================
# Analytics Update Handlers
# ============================================================================

async def update_analytics_on_review(event: Event):
    """
    Update analytics when a review occurs

    Triggered by: CARD_REVIEWED, STUDY_ITEM_REVIEWED
    """
    if event.type not in [EventType.CARD_REVIEWED, EventType.STUDY_ITEM_REVIEWED]:
        return

    logger.info(
        "updating_analytics",
        event_type=event.type.value,
        user_id=event.user_id
    )

    # This would trigger a DuckDB analytics update
    # For now, just log the intent
    logger.debug(
        "analytics_update_scheduled",
        user_id=event.user_id,
        review_data=event.data
    )


async def refresh_materialized_views(event: Event):
    """
    Refresh materialized views after significant data changes

    Triggered by: CARD_REVIEWED (batch), STUDY_SESSION_COMPLETED
    """
    # Only refresh for certain events that affect aggregates
    if event.type not in [EventType.STUDY_SESSION_COMPLETED]:
        return

    logger.info(
        "scheduling_view_refresh",
        event_type=event.type.value
    )

    # This would be handled by a background task
    # For now, just log the intent
    logger.debug("materialized_view_refresh_scheduled")


# ============================================================================
# Embedding Generation Handlers
# ============================================================================

async def generate_embedding_on_content_create(event: Event):
    """
    Generate embeddings when new content is created

    Triggered by: CARD_CREATED, NOTE_CREATED
    """
    if event.type not in [EventType.CARD_CREATED, EventType.NOTE_CREATED]:
        return

    logger.info(
        "scheduling_embedding_generation",
        event_type=event.type.value,
        content_id=event.data.get("id"),
        user_id=event.user_id
    )

    # This would trigger a background task to generate embeddings
    # For now, just log the intent
    logger.debug(
        "embedding_generation_scheduled",
        content_type=event.type.value,
        content_id=event.data.get("id")
    )


# ============================================================================
# Document Processing Handlers
# ============================================================================

async def process_document_on_upload(event: Event):
    """
    Start document processing when uploaded

    Triggered by: DOCUMENT_UPLOADED
    """
    if event.type != EventType.DOCUMENT_UPLOADED:
        return

    document_id = event.data.get("document_id")
    if not document_id:
        logger.error("document_upload_event_missing_id", event=event.to_dict())
        return

    logger.info(
        "scheduling_document_processing",
        document_id=document_id,
        user_id=event.user_id
    )

    # This would trigger background document processing
    # For now, just log the intent
    logger.debug(
        "document_processing_scheduled",
        document_id=document_id
    )


# ============================================================================
# Notification Handlers
# ============================================================================

async def send_notification_on_quota_warning(event: Event):
    """
    Send notification when AI quota is running low

    Triggered by: AI_QUOTA_WARNING, AI_QUOTA_EXHAUSTED
    """
    if event.type not in [EventType.AI_QUOTA_WARNING, EventType.AI_QUOTA_EXHAUSTED]:
        return

    logger.warning(
        "quota_notification_triggered",
        event_type=event.type.value,
        model=event.data.get("model"),
        remaining=event.data.get("remaining")
    )

    # This would send email/Slack notification
    # For now, just log
    logger.debug(
        "notification_scheduled",
        type="quota_warning",
        model=event.data.get("model")
    )


# ============================================================================
# Error Tracking Handlers
# ============================================================================

async def log_system_error(event: Event):
    """
    Log system errors for monitoring

    Triggered by: SYSTEM_ERROR, *_FAILED events
    """
    if not (event.type == EventType.SYSTEM_ERROR or
            event.type.value.endswith(".failed")):
        return

    logger.error(
        "system_error_tracked",
        event_type=event.type.value,
        error=event.data.get("error"),
        context=event.data
    )

    # This would send to error tracking service (Sentry, etc.)
    logger.debug("error_logged_to_monitoring")


# ============================================================================
# Handler Registration
# ============================================================================

def register_all_handlers():
    """
    Register all internal event handlers with the dispatcher

    Call this during application startup.
    """
    dispatcher = EventDispatcher()

    logger.info("registering_event_handlers")

    # Cache invalidation handlers
    cache_events = [
        EventType.CARD_UPDATED,
        EventType.CARD_REVIEWED,
        EventType.NOTE_UPDATED,
        EventType.DOCUMENT_PROCESSED,
        EventType.QUIZ_COMPLETED,
    ]
    for event_type in cache_events:
        dispatcher.register_handler(event_type, invalidate_cache_on_content_change)

    # Analytics handlers
    analytics_events = [
        EventType.CARD_REVIEWED,
        EventType.STUDY_ITEM_REVIEWED,
    ]
    for event_type in analytics_events:
        dispatcher.register_handler(event_type, update_analytics_on_review)

    dispatcher.register_handler(
        EventType.STUDY_SESSION_COMPLETED,
        refresh_materialized_views
    )

    # Embedding generation handlers
    embedding_events = [
        EventType.CARD_CREATED,
        EventType.NOTE_CREATED,
    ]
    for event_type in embedding_events:
        dispatcher.register_handler(event_type, generate_embedding_on_content_create)

    # Document processing handler
    dispatcher.register_handler(
        EventType.DOCUMENT_UPLOADED,
        process_document_on_upload
    )

    # Quota notification handlers
    quota_events = [
        EventType.AI_QUOTA_WARNING,
        EventType.AI_QUOTA_EXHAUSTED,
    ]
    for event_type in quota_events:
        dispatcher.register_handler(event_type, send_notification_on_quota_warning)

    # Error tracking
    dispatcher.register_handler(EventType.SYSTEM_ERROR, log_system_error)

    # Log all failed events
    failed_events = [
        EventType.DOCUMENT_PROCESSING_FAILED,
        EventType.AI_GENERATION_FAILED,
        EventType.AGENT_EXECUTION_FAILED,
    ]
    for event_type in failed_events:
        dispatcher.register_handler(event_type, log_system_error)

    handler_count = dispatcher.get_handler_count()
    logger.info(
        "event_handlers_registered",
        total_handlers=handler_count
    )
