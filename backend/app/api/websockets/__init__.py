"""
WebSocket API package.

Real-time communication layer for:
- Chat streaming
- Study sessions
- Activity tracking
- Dashboard live updates
"""

from .manager import ConnectionManager, manager
from .channels import ChannelManager, channel_manager
from .routes import register_websocket_routes

__all__ = [
    "ConnectionManager",
    "manager",
    "ChannelManager",
    "channel_manager",
    "register_websocket_routes"
]
