"""
WebSocket API package.

Real-time communication layer for:
- Chat streaming
- Study sessions
- Live updates
"""

from .manager import ConnectionManager, manager

__all__ = ["ConnectionManager", "manager"]
