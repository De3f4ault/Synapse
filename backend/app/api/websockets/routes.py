"""
WebSocket Routes - Centralized WebSocket Endpoint Registration

All WebSocket endpoints are registered here for easy management and discovery.
"""

from fastapi import FastAPI, WebSocket, Query, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from .dashboard import dashboard_websocket_endpoint
from .chat import chat_websocket
from .activity import activity_websocket_endpoint
from .study import study_websocket_endpoint


def register_websocket_routes(app: FastAPI):
    """
    Register all WebSocket routes with the FastAPI app.

    WebSocket routes must be registered at root level (no /api/v1 prefix).
    Each endpoint requires Query parameter for proper validation.

    Args:
        app: FastAPI application instance
    """

    @app.websocket("/ws/dashboard")
    async def dashboard_ws(
        websocket: WebSocket,
        token: str = Query(..., description="JWT authentication token")
    ):
        """
        Dashboard WebSocket endpoint with real-time updates.

        Provides live updates for:
        - Card reviews
        - Note updates
        - Quiz completions
        - Document uploads
        - General dashboard events

        Authentication via query parameter: ws://host/ws/dashboard?token=xxx
        """
        await dashboard_websocket_endpoint(websocket, token)

    @app.websocket("/ws/chat/{session_id}")
    async def chat_ws(
        websocket: WebSocket,
        session_id: str,
        token: str = Query(..., description="JWT authentication token"),
        db: AsyncSession = Depends(get_db)
    ):
        """
        Chat WebSocket endpoint with AI streaming.

        Provides real-time chat with AI tutor including:
        - Streaming responses
        - Thinking process
        - Source citations
        - Function calls

        Authentication via query parameter: ws://host/ws/chat/123?token=xxx
        """
        await chat_websocket(websocket, session_id, token,db)

    @app.websocket("/ws/activity")
    async def activity_ws(
        websocket: WebSocket,
        token: str = Query(..., description="JWT authentication token")
    ):
        """
        Activity tracking WebSocket endpoint.

        Provides real-time activity tracking for:
        - Activity logging
        - Session detection
        - Live activity feed
        - Learning analytics

        Authentication via query parameter: ws://host/ws/activity?token=xxx
        """
        await activity_websocket_endpoint(websocket, token)

    @app.websocket("/ws/study/{session_id}")
    async def study_ws(
        websocket: WebSocket,
        session_id: int,
        token: str = Query(..., description="JWT authentication token")
    ):
        """
        Study session WebSocket endpoint.

        Provides real-time study session tracking for:
        - Item completion
        - Progress updates
        - Session pause/resume
        - Performance metrics

        Authentication via query parameter: ws://host/ws/study/123?token=xxx
        """
        await study_websocket_endpoint(websocket, session_id, token)
