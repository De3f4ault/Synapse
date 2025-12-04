"""
Redis pub/sub for real-time broadcasting.
Used to broadcast events to WebSocket connections and other subscribers.
"""
import asyncio
import json
from typing import Any, Callable, Dict

from app.services.cache.client import get_redis
from app.utils.logging import get_logger

logger = get_logger(__name__)


async def publish(channel: str, message: Dict[str, Any]) -> int:
    """
    Publish a message to a Redis channel.

    Args:
        channel: Channel name
        message: Message dictionary (will be JSON-encoded)

    Returns:
        int: Number of subscribers that received the message
    """
    try:
        redis = await get_redis()

        # Serialize message to JSON
        message_json = json.dumps(message)

        # Publish to channel
        subscriber_count = await redis.publish(channel, message_json)

        logger.debug(
            "message_published",
            channel=channel,
            subscriber_count=subscriber_count,
        )

        return subscriber_count

    except Exception as e:
        logger.error(
            "publish_failed",
            channel=channel,
            error=str(e),
        )
        return 0


async def subscribe(channel: str, callback: Callable[[Dict[str, Any]], None]) -> None:
    """
    Subscribe to a Redis channel and call callback for each message.

    This is a blocking operation that runs until cancelled.

    Args:
        channel: Channel name to subscribe to
        callback: Async function to call for each message
    """
    try:
        redis = await get_redis()
        pubsub = redis.pubsub()

        await pubsub.subscribe(channel)

        logger.info(
            "subscribed_to_channel",
            channel=channel,
        )

        try:
            while True:
                message = await pubsub.get_message(
                    ignore_subscribe_messages=True,
                    timeout=1.0
                )

                if message and message['type'] == 'message':
                    try:
                        # Decode JSON message
                        data = json.loads(message['data'])

                        # Call callback
                        await callback(data)

                    except json.JSONDecodeError as e:
                        logger.error(
                            "message_decode_failed",
                            channel=channel,
                            error=str(e),
                        )
                    except Exception as e:
                        logger.error(
                            "callback_failed",
                            channel=channel,
                            error=str(e),
                        )

                # Allow other tasks to run
                await asyncio.sleep(0.01)

        finally:
            await pubsub.unsubscribe(channel)
            logger.info(
                "unsubscribed_from_channel",
                channel=channel,
            )

    except Exception as e:
        logger.error(
            "subscribe_failed",
            channel=channel,
            error=str(e),
        )


async def broadcast_to_user(user_id: int, message: Dict[str, Any]) -> int:
    """
    Broadcast a message to all connections for a specific user.

    Args:
        user_id: ID of the user
        message: Message dictionary

    Returns:
        int: Number of subscribers that received the message
    """
    channel = f"user:{user_id}"
    return await publish(channel, message)


async def broadcast_to_session(session_id: str, message: Dict[str, Any]) -> int:
    """
    Broadcast a message to a specific session.

    Args:
        session_id: Session ID
        message: Message dictionary

    Returns:
        int: Number of subscribers that received the message
    """
    channel = f"session:{session_id}"
    return await publish(channel, message)


async def broadcast_global(event_type: str, data: Dict[str, Any]) -> int:
    """
    Broadcast a global event to all subscribers.

    Args:
        event_type: Type of event
        data: Event data

    Returns:
        int: Number of subscribers that received the message
    """
    message = {
        "type": event_type,
        "data": data,
    }

    return await publish("global", message)


class PubSubManager:
    """
    Manager for pub/sub subscriptions.
    Handles multiple subscriptions and automatic reconnection.
    """

    def __init__(self):
        self.subscriptions: Dict[str, asyncio.Task] = {}
        self.running = False

    async def start(self):
        """Start the pub/sub manager."""
        self.running = True
        logger.info("pubsub_manager_started")

    async def stop(self):
        """Stop the pub/sub manager and cancel all subscriptions."""
        self.running = False

        # Cancel all subscription tasks
        for channel, task in self.subscriptions.items():
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass

        self.subscriptions.clear()
        logger.info("pubsub_manager_stopped")

    async def subscribe_channel(
        self,
        channel: str,
        callback: Callable[[Dict[str, Any]], None]
    ):
        """
        Subscribe to a channel with automatic task management.

        Args:
            channel: Channel name
            callback: Callback function
        """
        if channel in self.subscriptions:
            logger.warning(
                "already_subscribed",
                channel=channel,
            )
            return

        # Create subscription task
        task = asyncio.create_task(
            subscribe(channel, callback)
        )

        self.subscriptions[channel] = task

        logger.info(
            "subscription_created",
            channel=channel,
        )

    async def unsubscribe_channel(self, channel: str):
        """
        Unsubscribe from a channel.

        Args:
            channel: Channel name
        """
        if channel not in self.subscriptions:
            logger.warning(
                "not_subscribed",
                channel=channel,
            )
            return

        # Cancel subscription task
        task = self.subscriptions.pop(channel)
        task.cancel()

        try:
            await task
        except asyncio.CancelledError:
            pass

        logger.info(
            "subscription_cancelled",
            channel=channel,
        )
