"""
WebSocket connection manager.

Manages WebSocket connections, broadcasting, and cleanup.
Critical for real-time features.

UPDATED: Now includes complete cleanup_stale_connections implementation.
"""

from typing import Dict, List, Tuple
from datetime import datetime, timedelta
from fastapi import WebSocket
import structlog
import asyncio

logger = structlog.get_logger()


class ConnectionManager:
    """
    WebSocket connection manager (Singleton).

    Manages active WebSocket connections with support for:
    - Per-session connections
    - User-based broadcasting
    - Connection cleanup
    - Message routing
    - Stale connection detection
    """

    def __init__(self):
        """Initialize connection manager."""
        # {session_id: [(websocket, user_id, connected_at), ...]}
        self.connections: Dict[str, List[Tuple[WebSocket, int, datetime]]] = {}

        # {user_id: [session_ids, ...]}
        self.user_connections: Dict[int, List[str]] = {}

        # Cleanup task
        self.cleanup_task: asyncio.Task = None
        self.cleanup_running = False

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

        # Start cleanup task if not running
        if not self.cleanup_running:
            self.start_cleanup_task()

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

        # Create a copy to avoid modification during iteration
        connections = list(self.connections[session_id])

        for websocket, user_id, _ in connections:
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

        Detects and removes connections that are:
        - Older than 24 hours
        - In a closed state

        This method is called periodically by a background task.
        """
        try:
            logger.info("cleanup_stale_connections_started")

            stale_threshold = datetime.utcnow() - timedelta(hours=24)
            stale_sessions = []

            # Find stale connections
            for session_id, connections in list(self.connections.items()):
                cleaned_connections = []

                for websocket, user_id, connected_at in connections:
                    # Check if connection is too old
                    if connected_at < stale_threshold:
                        logger.info(
                            "removing_stale_connection",
                            session_id=session_id,
                            user_id=user_id,
                            age_hours=(datetime.utcnow() - connected_at).total_seconds() / 3600
                        )
                        try:
                            await websocket.close(code=1000, reason="Connection timeout")
                        except Exception:
                            pass
                        continue

                    # FIXED: Check websocket state without sending messages
                    try:
                        if hasattr(websocket, 'client_state') and websocket.client_state.name == 'CONNECTED':
                            cleaned_connections.append((websocket, user_id, connected_at))
                        elif hasattr(websocket, 'application_state') and websocket.application_state.name == 'CONNECTED':
                            cleaned_connections.append((websocket, user_id, connected_at))
                        else:
                            logger.info(
                                "removing_disconnected_connection",
                                session_id=session_id,
                                user_id=user_id
                            )
                            continue
                    except Exception as e:
                        logger.info(
                            "removing_dead_connection",
                            session_id=session_id,
                            user_id=user_id,
                            error=str(e)
                        )
                        continue

                # Update connections list
                if cleaned_connections:
                    self.connections[session_id] = cleaned_connections
                else:
                    stale_sessions.append(session_id)

            # Remove empty sessions
            for session_id in stale_sessions:
                if session_id in self.connections:
                    del self.connections[session_id]

                # Clean up user_connections
                for user_id, sessions in list(self.user_connections.items()):
                    if session_id in sessions:
                        sessions.remove(session_id)
                    if not sessions:
                        del self.user_connections[user_id]

            total_connections = sum(len(conns) for conns in self.connections.values())

            logger.info(
                "cleanup_stale_connections_completed",
                removed_sessions=len(stale_sessions),
                active_connections=total_connections
            )

        except Exception as e:
            logger.error("cleanup_stale_connections_failed", error=str(e))

    def start_cleanup_task(self):
        """
        Start periodic cleanup task.

        Runs cleanup every hour to remove stale connections.
        """
        async def cleanup_loop():
            self.cleanup_running = True
            try:
                while self.cleanup_running:
                    await asyncio.sleep(3600)  # Run every hour
                    await self.cleanup_stale_connections()
            except asyncio.CancelledError:
                logger.info("cleanup_task_cancelled")
            except Exception as e:
                logger.error("cleanup_task_error", error=str(e))
            finally:
                self.cleanup_running = False

        if not self.cleanup_task or self.cleanup_task.done():
            self.cleanup_task = asyncio.create_task(cleanup_loop())
            logger.info("cleanup_task_started")

    def stop_cleanup_task(self):
        """Stop periodic cleanup task."""
        self.cleanup_running = False
        if self.cleanup_task and not self.cleanup_task.done():
            self.cleanup_task.cancel()
            logger.info("cleanup_task_stopped")


# Singleton instance
manager = ConnectionManager()
