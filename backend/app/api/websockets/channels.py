"""
Channel subscription system for WebSocket connections.

Manages channel-based message routing for WebSocket broadcasts.
"""

from typing import Dict, Set, List
from fastapi import WebSocket
import structlog

from .manager import manager

logger = structlog.get_logger()


class ChannelManager:
    """
    Manages channel subscriptions for WebSocket connections.

    Channels:
    - dashboard: Real-time updates for dashboard (cards, notes, quizzes, etc.)
    - chat: Chat messages (handled separately per session)
    - study: Study session updates (future)
    - activity: Activity tracking (future)
    """

    def __init__(self):
        """Initialize channel manager."""
        # {channel: {user_id: session_ids}}
        self.channel_subscriptions: Dict[str, Dict[int, Set[str]]] = {}

    async def subscribe(self, user_id: int, channel: str, session_id: str):
        """
        Subscribe a user to a channel.

        Args:
            user_id: User ID
            channel: Channel name (dashboard, chat, study, activity)
            session_id: Session identifier
        """
        if channel not in self.channel_subscriptions:
            self.channel_subscriptions[channel] = {}

        if user_id not in self.channel_subscriptions[channel]:
            self.channel_subscriptions[channel][user_id] = set()

        self.channel_subscriptions[channel][user_id].add(session_id)

        logger.info(
            "channel_subscribed",
            user_id=user_id,
            channel=channel,
            session_id=session_id
        )

    async def unsubscribe(self, user_id: int, channel: str, session_id: str):
        """
        Unsubscribe a user from a channel.

        Args:
            user_id: User ID
            channel: Channel name
            session_id: Session identifier
        """
        if channel in self.channel_subscriptions:
            if user_id in self.channel_subscriptions[channel]:
                self.channel_subscriptions[channel][user_id].discard(session_id)

                # Clean up empty entries
                if not self.channel_subscriptions[channel][user_id]:
                    del self.channel_subscriptions[channel][user_id]

                if not self.channel_subscriptions[channel]:
                    del self.channel_subscriptions[channel]

        logger.info(
            "channel_unsubscribed",
            user_id=user_id,
            channel=channel,
            session_id=session_id
        )

    async def broadcast_to_channel(
        self,
        channel: str,
        event: str,
        data: dict
    ):
        """
        Broadcast message to all users in a channel.

        Args:
            channel: Channel name
            event: Event type
            data: Event data
        """
        if channel not in self.channel_subscriptions:
            logger.debug("broadcast_to_empty_channel", channel=channel)
            return

        message = {
            "type": event,
            "event": event,
            "data": data
        }

        # Broadcast to all users in channel
        for user_id, session_ids in self.channel_subscriptions[channel].items():
            for session_id in session_ids:
                await manager.broadcast_to_session(session_id, message)

        logger.debug(
            "channel_broadcast",
            channel=channel,
            event_type=event,  # ✅ FIXED: Renamed from 'event' to 'event_type'
            users=len(self.channel_subscriptions[channel])
        )

    async def broadcast_to_user_channel(
        self,
        user_id: int,
        channel: str,
        event: str,
        data: dict
    ):
        """
        Broadcast message to a specific user on a channel.

        Args:
            user_id: User ID
            channel: Channel name
            event: Event type
            data: Event data
        """
        # 🔍 DEBUG: Log subscription state BEFORE checks
        logger.info(
            "broadcast_attempt",
            channel=channel,
            user_id=user_id,
            event_type=event,  # ✅ FIXED: Renamed from 'event' to 'event_type'
            channel_exists=channel in self.channel_subscriptions,
            user_subscribed=user_id in self.channel_subscriptions.get(channel, {}),
            all_channels=list(self.channel_subscriptions.keys()),
            channel_users=list(self.channel_subscriptions.get(channel, {}).keys()) if channel in self.channel_subscriptions else []
        )

        if channel not in self.channel_subscriptions:
            logger.debug(
                "broadcast_to_nonexistent_channel",
                user_id=user_id,
                channel=channel
            )
            return

        if user_id not in self.channel_subscriptions[channel]:
            logger.debug(
                "broadcast_to_unsubscribed_user",
                user_id=user_id,
                channel=channel
            )
            return

        message = {
            "type": event,
            "event": event,
            "channel": channel,  # ✅ ADD: Include channel in message
            "data": data
        }

        # Broadcast to all user's sessions on this channel
        for session_id in self.channel_subscriptions[channel][user_id]:
            await manager.broadcast_to_session(session_id, message)

        logger.debug(
            "user_channel_broadcast",
            user_id=user_id,
            channel=channel,
            event_type=event  # ✅ FIXED: Renamed from 'event' to 'event_type'
        )

    def get_user_channels(self, user_id: int) -> List[str]:
        """
        Get list of channels a user is subscribed to.

        Args:
            user_id: User ID

        Returns:
            List of channel names
        """
        channels = []
        for channel, users in self.channel_subscriptions.items():
            if user_id in users:
                channels.append(channel)
        return channels


# Singleton instance
channel_manager = ChannelManager()
