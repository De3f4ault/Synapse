"""
Real-time event publishing via PostgreSQL Event Bus.

Replaces Redis PUBLISH/SUBSCRIBE with the durable PgEventBus.
All messages are persisted in the `events` UNLOGGED table and
delivered via LISTEN/NOTIFY to WebSocket consumers.
"""

from typing import Optional

from app.utils.logging import get_logger

logger = get_logger(__name__)


# ============================================================================
# Channel Constants
# ============================================================================

# Channel naming conventions (used as prefixes for the events table)
CHANNEL_USER = "user"  # Per-user events
CHANNEL_SESSION = "session"  # Per-session events
CHANNEL_GLOBAL = "global"  # System-wide broadcasts
CHANNEL_AGENT = "agent"  # Agent status updates


# ============================================================================
# Publish Functions
# ============================================================================


async def publish_event(channel: str, data: dict) -> None:
    """
    Publish an event to a channel via the PostgreSQL event bus.

    Args:
        channel: Target channel name
        data: Event payload
    """
    try:
        from app.services.cache.event_bus import get_event_bus

        bus = get_event_bus()
        await bus.publish(channel, data)

        logger.debug(
            "event_published",
            channel=channel,
            event_type=data.get("type", "unknown"),
        )
    except RuntimeError:
        # Event bus not initialized (e.g., during testing or startup)
        logger.debug("event_bus_not_available", channel=channel)
    except Exception as e:
        logger.error(
            "event_publish_failed",
            channel=channel,
            error=str(e),
        )


async def broadcast_to_user(user_id: int, event_type: str, data: dict) -> None:
    """
    Broadcast event to a specific user.

    Args:
        user_id: Target user ID
        event_type: Event type identifier
        data: Event payload
    """
    channel = f"{CHANNEL_USER}:{user_id}"
    payload = {
        "type": event_type,
        "user_id": user_id,
        **data,
    }
    await publish_event(channel, payload)


async def broadcast_to_session(session_id: str, event_type: str, data: dict) -> None:
    """
    Broadcast event to a specific session.

    Args:
        session_id: Target session ID
        event_type: Event type identifier
        data: Event payload
    """
    channel = f"{CHANNEL_SESSION}:{session_id}"
    payload = {
        "type": event_type,
        "session_id": session_id,
        **data,
    }
    await publish_event(channel, payload)


async def broadcast_global(event_type: str, data: dict) -> None:
    """
    Broadcast event to all connected users.

    Args:
        event_type: Event type identifier
        data: Event payload
    """
    channel = CHANNEL_GLOBAL
    payload = {
        "type": event_type,
        **data,
    }
    await publish_event(channel, payload)


async def broadcast_agent_status(
    agent_name: str,
    status: str,
    metadata: Optional[dict] = None,
) -> None:
    """
    Broadcast agent status update.

    Args:
        agent_name: Name of the agent
        status: Agent status (e.g., "thinking", "responding", "idle")
        metadata: Optional additional metadata
    """
    channel = f"{CHANNEL_AGENT}:{agent_name}"
    payload = {
        "type": "agent_status",
        "agent_name": agent_name,
        "status": status,
        **(metadata or {}),
    }
    await publish_event(channel, payload)


# ============================================================================
# Subscribe Functions (for WebSocket manager integration)
# ============================================================================


async def subscribe_to_user(user_id: int, callback) -> None:
    """
    Subscribe to events for a specific user.

    Args:
        user_id: User ID to subscribe to
        callback: Async callback function(data: dict)
    """
    try:
        from app.services.cache.event_bus import get_event_bus

        bus = get_event_bus()
        channel = f"{CHANNEL_USER}:{user_id}"
        await bus.subscribe(channel, callback)
    except RuntimeError:
        logger.debug("event_bus_not_available_for_subscribe")


async def unsubscribe_from_user(user_id: int, callback=None) -> None:
    """
    Unsubscribe from user events.

    Args:
        user_id: User ID to unsubscribe from
        callback: Specific callback to remove (None removes all)
    """
    try:
        from app.services.cache.event_bus import get_event_bus

        bus = get_event_bus()
        channel = f"{CHANNEL_USER}:{user_id}"
        await bus.unsubscribe(channel, callback)
    except RuntimeError:
        pass
