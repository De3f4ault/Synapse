"""
WebSocket API package.

Re-exports preserve backward compatibility for all external imports:
  - from app.api.websockets import register_websocket_routes
  - from app.api.websockets import manager, channel_manager
  - from app.api.websockets import ConnectionManager, ChannelManager
"""

from .core.manager import ConnectionManager, manager
from .core.channels import ChannelManager, channel_manager
from .routes import register_websocket_routes

__all__ = [
    "ConnectionManager",
    "manager",
    "ChannelManager",
    "channel_manager",
    "register_websocket_routes",
]
