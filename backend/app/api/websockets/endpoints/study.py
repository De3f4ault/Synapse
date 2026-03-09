"""
Study Session WebSocket endpoint.

Real-time study session tracking and progress updates.
"""

import asyncio

import structlog
from fastapi import WebSocket, WebSocketDisconnect, Query, status

from app.api.websockets.core.auth import get_user_from_token
from app.api.websockets.core.channels import channel_manager
from app.api.websockets.core.manager import manager
from app.db.session import AsyncSessionLocal
from app.modules.study.service import StudyService

logger = structlog.get_logger()

_HEARTBEAT = 30


async def study_websocket_endpoint(
    websocket: WebSocket,
    session_id: int,
    token: str = Query(..., description="JWT authentication token"),
):
    """
    Study session WebSocket.

    Client sends:
        {"type": "item_completed", "item_id": 123, "correct": true, "time_taken_ms": 5000}
        {"type": "session_pause"}
        {"type": "session_resume"}
        {"type": "session_end"}
    """
    user = await get_user_from_token(token)
    if not user:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # Verify session ownership
    async with AsyncSessionLocal() as db:
        svc = StudyService(db)
        study_session = await svc.get_session(session_id, user.id)
        if not study_session:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

    ws_session_id = f"study_{session_id}"

    try:
        await manager.connect(ws_session_id, websocket, user.id)
        await channel_manager.subscribe(user_id=user.id, channel="study", session_id=ws_session_id)

        # Send initial session state
        async with AsyncSessionLocal() as db:
            svc = StudyService(db)
            session_data = await svc.get_session(session_id, user.id)
            await websocket.send_json({
                "type": "connected",
                "session_id": session_id,
                "data": svc.session_to_dict(session_data),
            })

        logger.info("study_ws_connected", user_id=user.id, session_id=session_id)

        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_json(), timeout=_HEARTBEAT)
                msg_type = data.get("type")

                if msg_type == "ping":
                    await websocket.send_json({"type": "pong"})
                elif msg_type == "item_completed":
                    await _handle_item_completed(user.id, session_id, data, websocket)
                elif msg_type == "session_pause":
                    await _handle_session_lifecycle(user.id, session_id, "session_paused", websocket)
                elif msg_type == "session_resume":
                    await _handle_session_lifecycle(user.id, session_id, "session_resumed", websocket)
                elif msg_type == "session_end":
                    await _handle_session_end(user.id, session_id, websocket)

            except asyncio.TimeoutError:
                await websocket.send_json({"type": "ping"})
            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.error("study_ws_error", user_id=user.id, error=str(e))
                if "connection closed" in str(e).lower():
                    break

    except Exception as e:
        logger.error("study_ws_connection_error", user_id=user.id, error=str(e))
        try:
            await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
        except Exception:
            pass

    finally:
        try:
            await channel_manager.unsubscribe(user_id=user.id, channel="study", session_id=ws_session_id)
            await manager.disconnect(ws_session_id, websocket)
        except Exception:
            pass
        logger.info("study_ws_closed", user_id=user.id, session_id=session_id)


# ── Private handlers ─────────────────────────────────────────────────────


async def _handle_item_completed(user_id: int, session_id: int, data: dict, websocket: WebSocket):
    """Update session progress on item completion."""
    try:
        async with AsyncSessionLocal() as db:
            svc = StudyService(db)
            study_session = await svc.get_session(session_id, user_id)
            if not study_session:
                return

            correct = data.get("correct", False)
            time_taken_ms = data.get("time_taken_ms", 0)

            updated = await svc.update_session_progress(
                session_id=session_id,
                user_id=user_id,
                items_completed=study_session.items_completed + 1,
                items_correct=study_session.items_correct + (1 if correct else 0),
                time_spent_seconds=study_session.time_spent_seconds + (time_taken_ms // 1000),
            )

            await channel_manager.broadcast_to_user_channel(
                user_id=user_id, channel="study",
                event="session_update", data=svc.session_to_dict(updated),
            )
    except Exception as e:
        logger.error("item_completed_failed", error=str(e))
        await websocket.send_json({"type": "error", "data": {"message": str(e)}})


async def _handle_session_lifecycle(user_id: int, session_id: int, event: str, websocket: WebSocket):
    """Handle pause/resume — broadcast the event and echo to sender."""
    try:
        payload = {"session_id": session_id}
        await channel_manager.broadcast_to_user_channel(
            user_id=user_id, channel="study", event=event, data=payload,
        )
        await websocket.send_json({"type": event, "data": payload})
    except Exception as e:
        logger.error(f"{event}_failed", error=str(e))


async def _handle_session_end(user_id: int, session_id: int, websocket: WebSocket):
    """End a study session and broadcast the result."""
    try:
        async with AsyncSessionLocal() as db:
            svc = StudyService(db)
            ended = await svc.end_session(session_id, user_id)
            if ended:
                result = svc.session_to_dict(ended)
                await channel_manager.broadcast_to_user_channel(
                    user_id=user_id, channel="study",
                    event="session_ended", data=result,
                )
                await websocket.send_json({"type": "session_ended", "data": result})
    except Exception as e:
        logger.error("session_end_failed", error=str(e))
