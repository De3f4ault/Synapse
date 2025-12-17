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
            event_data: Event data containing document_id
        """
        from .tasks import process_document_task

        document_id = event_data.get("document_id")

        if not document_id:
            logger.error("Missing document_id in event data")
            return

        # Trigger async processing
        process_document_task.delay(document_id)
        logger.info(f"Triggered document processing for {document_id}")

    def _handle_document_updated(self, event_data: Dict[str, Any]) -> None:
        """
        Handle document updated event.

        Triggers re-indexing task.

        Args:
            event_data: Event data containing document_id
        """
        from .tasks import process_document_task

        document_id = event_data.get("document_id")

        if not document_id:
            logger.error("Missing document_id in event data")
            return

        # Re-process document
        process_document_task.delay(document_id)
        logger.info(f"Triggered document re-indexing for {document_id}")

    def _handle_document_deleted(self, event_data: Dict[str, Any]) -> None:
        """
        Handle document deleted event.

        Triggers cache invalidation via event system and cleans up vector store.

        Args:
            event_data: Event data containing document_id and user_id
        """
        document_id = event_data.get("document_id")
        user_id = event_data.get("user_id")

        if not document_id:
            logger.error("Missing document_id in event data")
            return

        # Import here to avoid circular imports
        import asyncio
        from app.core.events.dispatcher import EventDispatcher
        from app.core.events.triggers import Event, EventType

        # Create deletion event for cache invalidation
        # This will automatically trigger the CacheInvalidationSubscriber
        deletion_event = Event(
            type=EventType.DOCUMENT_DELETED,
            user_id=user_id,
            data={"document_id": document_id},
            source="webhook_handler"
        )

        # Emit event asynchronously (cache invalidator will handle it)
        try:
            dispatcher = EventDispatcher()
            asyncio.create_task(dispatcher.emit(deletion_event))
            logger.info(f"Emitted DOCUMENT_DELETED event for document {document_id}")
        except Exception as e:
            logger.error(f"Failed to emit deletion event: {e}")

        # Clean up vector store (if user_id is available)
        if user_id:
            try:
                from app.core.ai.rag.vector_store.qdrant.client import get_qdrant_client
                from qdrant_client import models
                
                # Get Qdrant client
                qdrant_client = get_qdrant_client()
                client = qdrant_client.get_client()
                
                # Get user's document collection name
                collection_name = f"synapse_v2_user_{user_id}_documents"
                
                try:
                    # Delete points matching document_id using Qdrant filter
                    client.delete(
                        collection_name=collection_name,
                        points_selector=models.FilterSelector(
                            filter=models.Filter(
                                must=[
                                    models.FieldCondition(
                                        key="metadata.document_id",
                                        match=models.MatchValue(value=str(document_id))
                                    )
                                ]
                            )
                        )
                    )
                    
                    logger.info(
                        f"Vector store cleanup completed for document {document_id}. "
                        f"Deleted embeddings from Qdrant collection {collection_name}"
                    )
                    
                except Exception as qdrant_error:
                    # Collection might not exist yet
                    logger.warning(
                        f"Could not delete from Qdrant collection {collection_name}: {qdrant_error}. "
                        f"This is normal if document was never processed."
                    )

            except Exception as e:
                logger.error(f"Failed to cleanup vector store: {e}", exc_info=True)


        logger.info(f"Document deletion handling completed for {document_id}")

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
