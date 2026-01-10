"""
WebSocket Routes - Centralized WebSocket Endpoint Registration

UPDATED: Unified endpoint architecture
All chat now handled via /ws/unified with channel subscriptions.
Legacy dedicated endpoints removed in favor of channel-based routing.
"""

from fastapi import FastAPI, WebSocket, Query

from .unified import unified_websocket_endpoint
from .dashboard import dashboard_websocket_endpoint
from .activity import activity_websocket_endpoint
from .study import study_websocket_endpoint
from .live_voice import live_voice_websocket_endpoint


def register_websocket_routes(app: FastAPI):
    """
    Register all WebSocket routes with the FastAPI app.

    WebSocket routes must be registered at root level (no /api/v1 prefix).
    Each endpoint requires Query parameter for proper validation.

    Args:
        app: FastAPI application instance
    """

    @app.websocket("/ws/unified")
    async def unified_ws(
        websocket: WebSocket, token: str = Query(..., description="JWT authentication token")
    ):
        """
        **NEW** Unified WebSocket endpoint for all real-time features.

        Supports channel-based subscriptions:
        - dashboard: General app updates
        - chat:{session_id}: Chat session streaming
        - activity: Activity tracking
        - study:{session_id}: Study session tracking

        Authentication via query parameter: ws://host/ws/unified?token=xxx

        Protocol:
        - Client sends: {"type": "subscribe", "channel": "chat:123"}
        - Client sends: {"type": "message", "channel": "chat:123", "content": "Hello"}
        - Server sends: {"type": "token", "channel": "chat:123", "data": {...}}
        """
        await unified_websocket_endpoint(websocket, token)

    @app.websocket("/ws/dashboard")
    async def dashboard_ws(
        websocket: WebSocket, token: str = Query(..., description="JWT authentication token")
    ):
        """
        Dashboard WebSocket endpoint with real-time updates.

        **LEGACY**: Prefer /ws/unified for new implementations.

        Provides live updates for:
        - Card reviews
        - Note updates
        - Quiz completions
        - Document uploads
        - General dashboard events

        Authentication via query parameter: ws://host/ws/dashboard?token=xxx
        """
        await dashboard_websocket_endpoint(websocket, token)

    # REMOVED: Legacy /ws/chat/{session_id} endpoint
    # All chat now handled via /ws/unified with channel subscriptions
    # Example: {"type": "subscribe", "channel": "chat:123"}

    @app.websocket("/ws/activity")
    async def activity_ws(
        websocket: WebSocket, token: str = Query(..., description="JWT authentication token")
    ):
        """
        Activity tracking WebSocket endpoint.

        **LEGACY**: Prefer /ws/unified for new implementations.

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
        token: str = Query(..., description="JWT authentication token"),
    ):
        """
        Study session WebSocket endpoint.

        **LEGACY**: Prefer /ws/unified for new implementations.

        Provides real-time study session tracking for:
        - Item completion
        - Progress updates
        - Session pause/resume
        - Performance metrics

        Authentication via query parameter: ws://host/ws/study/123?token=xxx
        """
        await study_websocket_endpoint(websocket, session_id, token)

    @app.websocket("/ws/live")
    async def live_voice_ws(
        websocket: WebSocket, token: str = Query(..., description="JWT authentication token")
    ):
        """
        Live Voice WebSocket endpoint with Gemini Live API.

        **NEW**: Real-time bidirectional voice interaction.

        Provides:
        - Low-latency audio streaming (16kHz in, 24kHz out)
        - Interruptible AI responses
        - Search Grounding integration
        - Real-time transcription

        Protocol:
        - Client sends: {"type": "audio", "data": "<base64 PCM>"}
        - Client sends: {"type": "text", "content": "Hello"}
        - Server sends: {"type": "audio", "data": "<base64 PCM>"}
        - Server sends: {"type": "transcript", "text": "..."}
        - Server sends: {"type": "grounding", "metadata": {...}}

        Authentication via query parameter: ws://host/ws/live?token=xxx
        """
        await live_voice_websocket_endpoint(websocket, token)
