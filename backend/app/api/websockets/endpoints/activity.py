"""
Activity Tracking WebSocket endpoint.

Real-time activity tracking for study sessions and user interactions.
"""

import asyncio

import structlog
from fastapi import WebSocket, WebSocketDisconnect, Query, status

from app.api.websockets.core.auth import get_user_from_token
from app.api.websockets.core.channels import channel_manager
from app.api.websockets.core.manager import manager
from app.db.session import AsyncSessionLocal
from app.models.activity_log import ActivityType, ModuleType
from app.modules.activity.service import ActivityService

logger = structlog.get_logger()

_HEARTBEAT = 30


async def activity_websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(..., description="JWT authentication token"),
):
    """
    Activity tracking WebSocket.

    Client sends:
        {"type": "activity_log", "activity_type": "view", "module": "flashcards", ...}
        {"type": "detect_sessions"}
    """
    user = await get_user_from_token(token)
    if not user:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    session_id = f"activity_{user.id}"

    try:
        await manager.connect(session_id, websocket, user.id)
        await channel_manager.subscribe(user_id=user.id, channel="activity", session_id=session_id)

        await websocket.send_json({
            "type": "connected",
            "user_id": user.id,
            "session_id": session_id,
            "message": "Activity WebSocket connected",
        })

        logger.info("activity_ws_connected", user_id=user.id)

        # Send recent activity history on connect
        async with AsyncSessionLocal() as db:
            svc = ActivityService(db)
            recent = await svc.get_recent_activities(user_id=user.id, hours=24, limit=20)
            await websocket.send_json({
                "type": "activity_history",
                "data": {"activities": [a.to_dict() for a in recent]},
            })

        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_json(), timeout=_HEARTBEAT)
                msg_type = data.get("type")

                if msg_type == "ping":
                    await websocket.send_json({"type": "pong"})
                elif msg_type == "activity_log":
                    await _handle_activity_log(user.id, data, websocket)
                elif msg_type == "detect_sessions":
                    await _handle_session_detection(user.id, websocket)

            except asyncio.TimeoutError:
                await websocket.send_json({"type": "ping"})
            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.error("activity_ws_error", user_id=user.id, error=str(e))
                if "connection closed" in str(e).lower():
                    break

    except Exception as e:
        logger.error("activity_ws_connection_error", user_id=user.id, error=str(e))
        try:
            await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
        except Exception:
            pass

    finally:
        try:
            await channel_manager.unsubscribe(user_id=user.id, channel="activity", session_id=session_id)
            await manager.disconnect(session_id, websocket)
        except Exception:
            pass
        logger.info("activity_ws_closed", user_id=user.id)


# ── Private handlers ─────────────────────────────────────────────────────


async def _handle_activity_log(user_id: int, data: dict, websocket: WebSocket):
    """Log an activity and broadcast to all user's activity channels."""
    activity_type_str = data.get("activity_type")
    module_str = data.get("module")

    if not activity_type_str or not module_str:
        await websocket.send_json({
            "type": "error",
            "data": {"code": "invalid_activity", "message": "activity_type and module are required"},
        })
        return

    try:
        activity_type = ActivityType(activity_type_str)
        module = ModuleType(module_str)
    except ValueError:
        await websocket.send_json({
            "type": "error",
            "data": {"code": "invalid_activity", "message": "Invalid activity_type or module"},
        })
        return

    try:
        async with AsyncSessionLocal() as db:
            svc = ActivityService(db)
            activity = await svc.log_activity(
                user_id=user_id,
                activity_type=activity_type,
                module=module,
                resource_id=data.get("resource_id"),
                resource_title=data.get("resource_title"),
                metadata=data.get("metadata", {}),
            )
            await channel_manager.broadcast_to_user_channel(
                user_id=user_id, channel="activity",
                event="activity_logged", data=activity.to_dict(),
            )
    except Exception as e:
        logger.error("activity_log_failed", user_id=user_id, error=str(e))
        await websocket.send_json({"type": "error", "data": {"code": "log_failed", "message": str(e)}})


async def _handle_session_detection(user_id: int, websocket: WebSocket):
    """Detect and return study sessions from recent activity."""
    try:
        async with AsyncSessionLocal() as db:
            svc = ActivityService(db)
            sessions = await svc.detect_sessions(
                user_id=user_id, hours=24,
                session_timeout_minutes=30, min_activities=2,
            )
            await websocket.send_json({"type": "sessions_detected", "data": {"sessions": sessions}})
    except Exception as e:
        logger.error("session_detection_failed", user_id=user_id, error=str(e))
        await websocket.send_json({"type": "error", "data": {"code": "detection_failed", "message": str(e)}})
