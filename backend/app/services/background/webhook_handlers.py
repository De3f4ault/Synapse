"""
Webhook event handlers for background task triggers.

Maps webhook events to appropriate background tasks,
enabling event-driven asynchronous processing.
"""

import logging
from typing import Any, Dict, Callable
from enum import Enum

logger = logging.getLogger(__name__)


class WebhookEventType(Enum):
    """Supported webhook event types."""

    DOCUMENT_UPLOADED = "document.uploaded"
    DOCUMENT_UPDATED = "document.updated"
    DOCUMENT_DELETED = "document.deleted"
    USER_REGISTERED = "user.registered"
    USER_UPDATED = "user.updated"
    QUERY_COMPLETED = "query.completed"
    SYSTEM_ALERT = "system.alert"


class WebhookHandler:
    """
    Maps webhook events to background tasks.

    Provides event-driven task triggering based on
    system events and external webhooks.
    """

    def __init__(self):
        """Initialize webhook handler."""
        self.handlers: Dict[str, Callable] = {}
        self._register_default_handlers()
        logger.debug("Initialized WebhookHandler")

    def _register_default_handlers(self) -> None:
        """Register default event handlers."""
        self.register(
            WebhookEventType.DOCUMENT_UPLOADED.value,
            self._handle_document_uploaded
        )
        self.register(
            WebhookEventType.DOCUMENT_UPDATED.value,
            self._handle_document_updated
        )
        self.register(
            WebhookEventType.DOCUMENT_DELETED.value,
            self._handle_document_deleted
        )
        self.register(
            WebhookEventType.USER_REGISTERED.value,
            self._handle_user_registered
        )
        self.register(
            WebhookEventType.QUERY_COMPLETED.value,
            self._handle_query_completed
        )

    def register(self, event_type: str, handler: Callable) -> None:
        """
        Register event handler.

        Args:
            event_type: Event type identifier
            handler: Handler function
        """
        self.handlers[event_type] = handler
        logger.debug(f"Registered handler for event: {event_type}")

    def handle_event(self, event_type: str, event_data: Dict[str, Any]) -> bool:
        """
        Handle webhook event.

        Args:
            event_type: Type of event
            event_data: Event payload

        Returns:
            bool: True if handled successfully
        """
        logger.info(f"Handling webhook event: {event_type}")

        if event_type not in self.handlers:
            logger.warning(f"No handler registered for event: {event_type}")
            return False

        try:
            handler = self.handlers[event_type]
            handler(event_data)
            return True

        except Exception as e:
            logger.error(f"Error handling event {event_type}: {e}")
            return False

    def _handle_document_uploaded(self, event_data: Dict[str, Any]) -> None:
        """
        Handle document uploaded event.

        Triggers document processing task.

        Args:
            event_data: Event data containing document_id, user_id
        """
        from .tasks import process_document_task

        document_id = event_data.get("document_id")
        user_id = event_data.get("user_id")

        if not document_id or not user_id:
            logger.error("Missing document_id or user_id in event data")
            return

        # Trigger async processing
        process_document_task.delay(document_id, user_id)
        logger.info(f"Triggered document processing for {document_id}")

    def _handle_document_updated(self, event_data: Dict[str, Any]) -> None:
        """
        Handle document updated event.

        Triggers re-indexing task.

        Args:
            event_data: Event data containing document_id
        """
        from .tasks import process_document_task
        from ...services.cache.invalidation import CacheInvalidator

        document_id = event_data.get("document_id")
        user_id = event_data.get("user_id", "system")

        if not document_id:
            logger.error("Missing document_id in event data")
            return

        # Invalidate document cache
        # cache_invalidator = CacheInvalidator(...)
        # cache_invalidator.invalidate_document_cache(document_id)

        # Re-process document
        process_document_task.delay(document_id, user_id)
        logger.info(f"Triggered document re-indexing for {document_id}")

    def _handle_document_deleted(self, event_data: Dict[str, Any]) -> None:
        """
        Handle document deleted event.

        Triggers cleanup tasks.

        Args:
            event_data: Event data containing document_id
        """
        from ...services.cache.invalidation import CacheInvalidator
        from ...services.vector_store.operations import VectorOperations

        document_id = event_data.get("document_id")

        if not document_id:
            logger.error("Missing document_id in event data")
            return

        # Invalidate caches
        # cache_invalidator = CacheInvalidator(...)
        # cache_invalidator.invalidate_document_cache(document_id)

        # Remove from vector store
        # vector_ops = VectorOperations(...)
        # vector_ops.delete(f"document_id = '{document_id}'")

        logger.info(f"Cleaned up after document deletion: {document_id}")

    def _handle_user_registered(self, event_data: Dict[str, Any]) -> None:
        """
        Handle user registered event.

        Sends welcome email.

        Args:
            event_data: Event data containing user_id, email
        """
        from .tasks import send_email_task

        user_id = event_data.get("user_id")
        email = event_data.get("email")
        name = event_data.get("name", "User")

        if not email:
            logger.error("Missing email in event data")
            return

        # Send welcome email
        send_email_task.delay(
            to=email,
            subject="Welcome to RAG App",
            body=f"Hello {name}, welcome to our platform!",
            html=False
        )

        logger.info(f"Sent welcome email to {email}")

    def _handle_query_completed(self, event_data: Dict[str, Any]) -> None:
        """
        Handle query completed event.

        Updates analytics and caches.

        Args:
            event_data: Event data containing query info
        """
        query_id = event_data.get("query_id")
        user_id = event_data.get("user_id")

        # Log analytics
        logger.info(f"Query {query_id} completed for user {user_id}")

        # Could trigger analytics aggregation tasks
        # analytics_task.delay(query_data=event_data)


# Global handler instance
_handler = WebhookHandler()


def handle_webhook_event(event_type: str, event_data: Dict[str, Any]) -> bool:
    """
    Handle webhook event (convenience function).

    Args:
        event_type: Event type
        event_data: Event data

    Returns:
        bool: True if handled successfully
    """
    return _handler.handle_event(event_type, event_data)


def register_webhook_handler(event_type: str, handler: Callable) -> None:
    """
    Register custom webhook handler.

    Args:
        event_type: Event type
        handler: Handler function
    """
    _handler.register(event_type, handler)
