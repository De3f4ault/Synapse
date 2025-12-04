"""
Event Dispatcher

Central event routing and webhook management.
"""

import asyncio
from typing import Callable, List, Dict, Any
from collections import defaultdict
import structlog

from .triggers import Event, EventType

logger = structlog.get_logger(__name__)


class EventDispatcher:
    """
    Singleton event dispatcher for SYNAPSE.

    Routes events to registered handlers and webhooks.
    Implements the observer pattern for event-driven architecture.
    """

    _instance = None

    def __new__(cls):
        """Singleton pattern implementation"""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        """Initialize dispatcher (only once due to singleton)"""
        if self._initialized:
            return

        self._handlers: Dict[EventType, List[Callable]] = defaultdict(list)
        self._webhooks: List[Dict[str, Any]] = []
        self._initialized = True

        logger.info("event_dispatcher_initialized")

    def register_handler(
        self,
        event_type: EventType,
        handler: Callable
    ):
        """
        Register a handler for an event type

        Args:
            event_type: Type of event to handle
            handler: Async callable that takes Event as parameter
        """
        self._handlers[event_type].append(handler)

        logger.info(
            "handler_registered",
            event_type=event_type.value,
            handler=handler.__name__
        )

    def register_webhook(
        self,
        webhook_id: str,
        url: str,
        events: List[EventType],
        secret: str,
        active: bool = True
    ):
        """
        Register a webhook endpoint

        Args:
            webhook_id: Unique webhook identifier
            url: Webhook URL to POST to
            events: List of event types to send to this webhook
            secret: Secret key for HMAC signature
            active: Whether webhook is active
        """
        webhook = {
            "id": webhook_id,
            "url": url,
            "events": set(events),
            "secret": secret,
            "active": active,
        }

        self._webhooks.append(webhook)

        logger.info(
            "webhook_registered",
            webhook_id=webhook_id,
            url=url,
            events=[e.value for e in events]
        )

    def unregister_webhook(self, webhook_id: str):
        """
        Unregister a webhook

        Args:
            webhook_id: Webhook identifier
        """
        self._webhooks = [
            w for w in self._webhooks
            if w["id"] != webhook_id
        ]

        logger.info("webhook_unregistered", webhook_id=webhook_id)

    async def emit(self, event: Event):
        """
        Emit an event to all handlers and webhooks

        Args:
            event: Event to emit
        """
        logger.info(
            "event_emitted",
            event_type=event.type.value,
            event_id=event.event_id,
            user_id=event.user_id
        )

        # Execute handlers concurrently
        handlers_task = asyncio.create_task(self._call_handlers(event))

        # Send webhooks concurrently
        webhooks_task = asyncio.create_task(self._send_webhooks(event))

        # Wait for both to complete
        await asyncio.gather(
            handlers_task,
            webhooks_task,
            return_exceptions=True
        )

    async def _call_handlers(self, event: Event):
        """
        Call all registered handlers for an event type

        Args:
            event: Event to handle
        """
        handlers = self._handlers.get(event.type, [])

        if not handlers:
            logger.debug(
                "no_handlers_for_event",
                event_type=event.type.value
            )
            return

        # Execute all handlers concurrently
        tasks = []
        for handler in handlers:
            task = asyncio.create_task(
                self._execute_handler(handler, event)
            )
            tasks.append(task)

        # Wait for all handlers to complete
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Log any handler failures
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(
                    "handler_failed",
                    handler=handlers[i].__name__,
                    event_type=event.type.value,
                    error=str(result),
                    exc_info=result
                )

    async def _execute_handler(self, handler: Callable, event: Event):
        """
        Execute a single handler with error handling

        Args:
            handler: Handler function
            event: Event to handle
        """
        try:
            logger.debug(
                "executing_handler",
                handler=handler.__name__,
                event_type=event.type.value
            )

            await handler(event)

            logger.debug(
                "handler_completed",
                handler=handler.__name__,
                event_type=event.type.value
            )
        except Exception as e:
            logger.error(
                "handler_execution_failed",
                handler=handler.__name__,
                event_type=event.type.value,
                error=str(e),
                exc_info=True
            )
            raise

    async def _send_webhooks(self, event: Event):
        """
        Send event to registered webhooks

        Args:
            event: Event to send
        """
        # Filter webhooks that should receive this event
        matching_webhooks = [
            w for w in self._webhooks
            if w["active"] and event.type in w["events"]
        ]

        if not matching_webhooks:
            return

        logger.debug(
            "sending_webhooks",
            event_type=event.type.value,
            webhook_count=len(matching_webhooks)
        )

        # Import webhook sender here to avoid circular imports
        from .webhooks.sender import send_webhook

        # Send to all matching webhooks concurrently
        tasks = []
        for webhook in matching_webhooks:
            task = asyncio.create_task(
                send_webhook(
                    webhook["url"],
                    event,
                    webhook["secret"],
                    webhook_id=webhook["id"]
                )
            )
            tasks.append(task)

        # Wait for all webhooks to complete (with timeout)
        try:
            await asyncio.wait_for(
                asyncio.gather(*tasks, return_exceptions=True),
                timeout=30.0  # 30 second timeout for webhooks
            )
        except asyncio.TimeoutError:
            logger.error(
                "webhook_batch_timeout",
                event_type=event.type.value,
                webhook_count=len(matching_webhooks)
            )

    def get_handler_count(self, event_type: EventType = None) -> int:
        """
        Get count of registered handlers

        Args:
            event_type: Optional event type to filter by

        Returns:
            Number of handlers
        """
        if event_type:
            return len(self._handlers.get(event_type, []))
        return sum(len(handlers) for handlers in self._handlers.values())

    def get_webhook_count(self) -> int:
        """Get count of registered webhooks"""
        return len([w for w in self._webhooks if w["active"]])

    def clear_handlers(self):
        """Clear all registered handlers (useful for testing)"""
        self._handlers.clear()
        logger.warning("all_handlers_cleared")

    def clear_webhooks(self):
        """Clear all registered webhooks (useful for testing)"""
        self._webhooks.clear()
        logger.warning("all_webhooks_cleared")
