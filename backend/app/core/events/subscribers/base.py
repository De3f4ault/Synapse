"""
Base Subscriber

Abstract base class for event subscribers.
"""

from abc import ABC, abstractmethod
from typing import List
import structlog

from ..triggers import Event, EventType

logger = structlog.get_logger(__name__)


class BaseSubscriber(ABC):
    """
    Abstract base class for event subscribers.

    Subscribers are registered with the EventDispatcher and receive
    events they are interested in.
    """

    def __init__(self):
        """Initialize subscriber"""
        self.name = self.__class__.__name__
        logger.debug("subscriber_initialized", subscriber=self.name)

    @abstractmethod
    def get_subscribed_events(self) -> List[EventType]:
        """
        Get list of event types this subscriber handles

        Returns:
            List of EventType enums
        """
        pass

    @abstractmethod
    async def on_event(self, event: Event):
        """
        Handle an event

        Args:
            event: Event to handle
        """
        pass

    async def handle_event(self, event: Event):
        """
        Wrapper method that adds logging and error handling

        Args:
            event: Event to handle
        """
        logger.debug(
            "subscriber_handling_event",
            subscriber=self.name,
            event_type=event.type.value,
            event_id=event.event_id
        )

        try:
            await self.on_event(event)

            logger.debug(
                "subscriber_handled_event",
                subscriber=self.name,
                event_type=event.type.value
            )
        except Exception as e:
            logger.error(
                "subscriber_error",
                subscriber=self.name,
                event_type=event.type.value,
                error=str(e),
                exc_info=True
            )
            # Don't re-raise - we don't want one subscriber to break others

    def register_with_dispatcher(self, dispatcher):
        """
        Register this subscriber with an event dispatcher

        Args:
            dispatcher: EventDispatcher instance
        """
        subscribed_events = self.get_subscribed_events()

        for event_type in subscribed_events:
            dispatcher.register_handler(event_type, self.handle_event)

        logger.info(
            "subscriber_registered",
            subscriber=self.name,
            event_types=[e.value for e in subscribed_events]
        )
