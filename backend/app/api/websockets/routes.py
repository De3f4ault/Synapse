"""
WebSocket route registration.

All WebSocket routes are registered at root level (no /api/v1 prefix).
"""

from fastapi import FastAPI, WebSocket, Query

from .endpoints.unified import unified_websocket_endpoint
from .endpoints.dashboard import dashboard_websocket_endpoint
from .endpoints.activity import activity_websocket_endpoint
from .endpoints.study import study_websocket_endpoint
from .endpoints.live_voice import live_voice_websocket_endpoint


def register_websocket_routes(app: FastAPI):
    """Register all WebSocket routes with the FastAPI app."""

    @app.websocket("/ws/unified")
    async def unified_ws(
        websocket: WebSocket, token: str = Query(..., description="JWT token"),
    ):
        """Unified endpoint — channel-based routing for all real-time features."""
        await unified_websocket_endpoint(websocket, token)

    @app.websocket("/ws/dashboard")
    async def dashboard_ws(
        websocket: WebSocket, token: str = Query(..., description="JWT token"),
    ):
        """Dashboard real-time updates (legacy — prefer /ws/unified)."""
        await dashboard_websocket_endpoint(websocket, token)

    @app.websocket("/ws/activity")
    async def activity_ws(
        websocket: WebSocket, token: str = Query(..., description="JWT token"),
    ):
        """Activity tracking (legacy — prefer /ws/unified)."""
        await activity_websocket_endpoint(websocket, token)

    @app.websocket("/ws/study/{session_id}")
    async def study_ws(
        websocket: WebSocket, session_id: int,
        token: str = Query(..., description="JWT token"),
    ):
        """Study session tracking (legacy — prefer /ws/unified)."""
        await study_websocket_endpoint(websocket, session_id, token)

    @app.websocket("/ws/live")
    async def live_voice_ws(
        websocket: WebSocket,
        token: str = Query(..., description="JWT token"),
        session_id: int = Query(..., description="Chat session ID"),
    ):
        """Live Voice — bidirectional audio with Gemini Live API."""
        await live_voice_websocket_endpoint(websocket, token, session_id)
