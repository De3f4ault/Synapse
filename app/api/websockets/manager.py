"""
WebSocket connection manager.

Manages WebSocket connections, broadcasting, and cleanup.
Critical for real-time features.
"""

from typing import Dict, List, Tuple
from datetime import datetime
from fastapi import WebSocket
import structlog

logger = structlog.get_logger()


class ConnectionManager:
    """
    WebSocket connection manager (Singleton).

    Manages active WebSocket connections with support for:
    - Per-session connections
    - User-based broadcasting
    - Connection cleanup
    - Message routing
    """

    def __init__(self):
        """Initialize connection manager."""
        # {session_id: [(websocket, user_id, connected_at), ...]}
        self.connections: Dict[str, List[Tuple[WebSocket, int, datetime]]] = {}

        # {user_id: [session_ids, ...]}
        self.user_connections: Dict[int, List[str]] = {}

    async def connect(
        self,
        session_id: str,
        websocket: WebSocket,
        user_id: int
    ):
        """
        Register a new WebSocket connection.

        Args:
            session_id: Session identifier
            websocket: WebSocket connection
            user_id: User ID
        """
        await websocket.accept()

        # Add to connections
        if session_id not in self.connections:
            self.connections[session_id] = []

        self.connections[session_id].append((
            websocket,
            user_id,
            datetime.utcnow()
        ))

        # Track user connections
        if user_id not in self.user_connections:
            self.user_connections[user_id] = []

        if session_id not in self.user_connections[user_id]:
            self.user_connections[user_id].append(session_id)

        logger.info(
            "websocket_connected",
            session_id=session_id,
            user_id=user_id,
            total_connections=len(self.connections.get(session_id, []))
        )

    async def disconnect(self, session_id: str, websocket: WebSocket):
        """
        Unregister a WebSocket connection.

        Args:
            session_id: Session identifier
            websocket: WebSocket connection to remove
        """
        if session_id in self.connections:
            # Remove specific websocket
            self.connections[session_id] = [
                (ws, uid, ts)
                for ws, uid, ts in self.connections[session_id]
                if ws != websocket
            ]

            # Clean up empty session
            if not self.connections[session_id]:
                del self.connections[session_id]

        logger.info("websocket_disconnected", session_id=session_id)

    async def send_message(
        self,
        session_id: str,
        websocket: WebSocket,
        message: dict
    ):
        """
        Send message to specific WebSocket.

        Args:
            session_id: Session identifier
            websocket: Target WebSocket
            message: Message to send (will be JSON-encoded)
        """
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error(
                "websocket_send_error",
                session_id=session_id,
                error=str(e)
            )
            await self.disconnect(session_id, websocket)

    async def broadcast_to_session(self, session_id: str, message: dict):
        """
        Broadcast message to all connections in a session.

        Args:
            session_id: Session identifier
            message: Message to broadcast
        """
        if session_id not in self.connections:
            return

        for websocket, user_id, _ in self.connections[session_id]:
            await self.send_message(session_id, websocket, message)

    async def broadcast_to_user(self, user_id: int, message: dict):
        """
        Broadcast message to all user's connections.

        Args:
            user_id: User ID
            message: Message to broadcast
        """
        if user_id not in self.user_connections:
            return

        for session_id in self.user_connections[user_id]:
            await self.broadcast_to_session(session_id, message)

    def get_active_connections(self, user_id: int) -> List[str]:
        """
        Get list of active session IDs for a user.

        Args:
            user_id: User ID

        Returns:
            List of session IDs
        """
        return self.user_connections.get(user_id, [])

    async def cleanup_stale_connections(self):
        """
        Remove stale connections.

        Should be called periodically to clean up dead connections.
        """
        # TODO: Implement cleanup logic
        # - Check connection age
        # - Ping connections
        # - Remove non-responsive
        pass


# Singleton instance
manager = ConnectionManager()
