"""
WebSocket core infrastructure.

Transport-layer primitives: authentication, connection management,
channel pub/sub, and shared streaming utilities.
"""

from .auth import get_user_from_token
from .manager import ConnectionManager, manager
from .channels import ChannelManager, channel_manager
from .streaming import stream_and_broadcast, StreamResult

__all__ = [
    "get_user_from_token",
    "ConnectionManager",
    "manager",
    "ChannelManager",
    "channel_manager",
    "stream_and_broadcast",
    "StreamResult",
]
