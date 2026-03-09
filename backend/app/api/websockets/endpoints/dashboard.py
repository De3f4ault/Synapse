"""
Dashboard WebSocket endpoint.

Provides real-time updates for the dashboard: card reviews,
note updates, document uploads, quiz completions, chat messages.
"""

import asyncio

import structlog
from fastapi import WebSocket, WebSocketDisconnect, Query, status

from app.api.websockets.core.auth import get_user_from_token
from app.api.websockets.core.channels import channel_manager
from app.api.websockets.core.manager import manager

logger = structlog.get_logger()

_HEARTBEAT = 30


async def dashboard_websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(..., description="JWT authentication token"),
):
    """Dashboard WebSocket — subscribes to 'dashboard' channel for live events."""
    user = await get_user_from_token(token)
    if not user:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    session_id = f"dashboard_{user.id}"

    try:
        await manager.connect(session_id, websocket, user.id)
        await channel_manager.subscribe(user_id=user.id, channel="dashboard", session_id=session_id)

        await websocket.send_json({
            "type": "connected",
            "user_id": user.id,
            "session_id": session_id,
            "message": "Dashboard WebSocket connected",
        })

        logger.info("dashboard_ws_connected", user_id=user.id)

        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_json(), timeout=_HEARTBEAT)

                if data.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})

            except asyncio.TimeoutError:
                await websocket.send_json({"type": "ping"})

            except WebSocketDisconnect:
                break

            except Exception as e:
                logger.error("dashboard_ws_error", user_id=user.id, error=str(e))
                if "connection closed" in str(e).lower():
                    break

    except Exception as e:
        logger.error("dashboard_ws_connection_error", user_id=user.id, error=str(e))
        try:
            await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
        except Exception:
            pass

    finally:
        try:
            await channel_manager.unsubscribe(user_id=user.id, channel="dashboard", session_id=session_id)
            await manager.disconnect(session_id, websocket)
        except Exception:
            pass
        logger.info("dashboard_ws_closed", user_id=user.id, session_id=session_id)
