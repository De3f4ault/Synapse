"""
Study Session WebSocket Endpoint

Provides real-time study session tracking and progress updates.
"""

from typing import Optional
from fastapi import WebSocket, WebSocketDisconnect, Query, status
import structlog
import asyncio

from app.core.security import decode_token
from app.api.websockets.manager import manager
from app.api.websockets.channels import channel_manager
from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.models.study_session import StudySession, StudySessionType
from app.modules.study.service import StudyService
from sqlalchemy import select

logger = structlog.get_logger()


async def get_user_from_token(token: str) -> Optional[User]:
    """Validate token and retrieve user."""
    try:
        from jose import JWTError

        payload = decode_token(token)
        user_id_str = payload.get("sub")

        if not user_id_str:
            return None

        user_id = int(user_id_str)

        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(User).where(User.id == user_id)
            )
            user = result.scalar_one_or_none()

            if user and user.is_active:
                return user
            return None

    except Exception as e:
        logger.error("user_lookup_failed", error=str(e))
        return None


async def study_websocket_endpoint(
    websocket: WebSocket,
    session_id: int,
    token: str = Query(..., description="JWT authentication token")
):
    """
    Study session WebSocket endpoint.

    Provides real-time study session tracking for:
    - Session start/end
    - Item completion tracking
    - Progress updates
    - Performance metrics

    Protocol:
    - Client sends: {"type": "item_completed", "item_id": 123, "correct": true, "time_taken_ms": 5000}
    - Client sends: {"type": "session_pause"}
    - Client sends: {"type": "session_resume"}
    - Server broadcasts: Progress updates to all user's connections
    """
    # Authenticate user
    user = await get_user_from_token(token)

    if not user:
        logger.warning(
            "study_websocket_auth_failed",
            token_preview=token[:20]
        )
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    ws_session_id = f"study_{session_id}"

    try:
        # Verify session ownership
        async with AsyncSessionLocal() as db:
            study_service = StudyService(db)
            study_session = await study_service.get_session(session_id, user.id)

            if not study_session:
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                logger.error(
                    "study_session_not_found",
                    session_id=session_id,
                    user_id=user.id
                )
                return

        # Register with connection manager
        await manager.connect(ws_session_id, websocket, user.id)

        # Subscribe to study channel
        await channel_manager.subscribe(
            user_id=user.id,
            channel="study",
            session_id=ws_session_id
        )

        # Send initial confirmation with session data
        async with AsyncSessionLocal() as db:
            study_service = StudyService(db)
            study_session = await study_service.get_session(session_id, user.id)

            await websocket.send_json({
                "type": "connected",
                "session_id": session_id,
                "data": study_service.session_to_dict(study_session)
            })

        logger.info(
            "study_websocket_connected",
            user_id=user.id,
            session_id=session_id
        )

        # Heartbeat configuration
        HEARTBEAT_INTERVAL = 30  # seconds

        # Main message loop
        while True:
            try:
                # Wait for message from client with timeout
                data = await asyncio.wait_for(
                    websocket.receive_json(),
                    timeout=HEARTBEAT_INTERVAL
                )

                # Handle ping/pong
                if data.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
                    continue

                # Handle item completion
                if data.get("type") == "item_completed":
                    await handle_item_completed(
                        user.id,
                        session_id,
                        data,
                        websocket
                    )

                # Handle session pause
                elif data.get("type") == "session_pause":
                    await handle_session_pause(user.id, session_id, websocket)

                # Handle session resume
                elif data.get("type") == "session_resume":
                    await handle_session_resume(user.id, session_id, websocket)

                # Handle session end
                elif data.get("type") == "session_end":
                    await handle_session_end(user.id, session_id, websocket)

            except asyncio.TimeoutError:
                # No message → send heartbeat
                await websocket.send_json({"type": "ping"})
                continue

            except WebSocketDisconnect:
                logger.info(
                    "study_websocket_disconnect",
                    user_id=user.id,
                    session_id=session_id
                )
                break

            except Exception as e:
                logger.error(
                    "study_websocket_error",
                    user_id=user.id,
                    error=str(e)
                )
                if "connection closed" in str(e).lower():
                    break

    except Exception as e:
        logger.error(
            "study_websocket_connection_error",
            user_id=user.id if user else "unknown",
            error=str(e)
        )
        try:
            await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
        except Exception:
            pass

    finally:
        # Always clean up
        try:
            await channel_manager.unsubscribe(
                user_id=user.id,
                channel="study",
                session_id=ws_session_id
            )
            await manager.disconnect(ws_session_id, websocket)
            logger.info(
                "study_websocket_closed",
                user_id=user.id if user else "unknown"
            )
        except Exception as e:
            logger.error(
                "study_websocket_cleanup_error",
                error=str(e)
            )


async def handle_item_completed(
    user_id: int,
    session_id: int,
    data: dict,
    websocket: WebSocket
):
    """Handle item completion event."""
    try:
        item_id = data.get("item_id")
        correct = data.get("correct", False)
        time_taken_ms = data.get("time_taken_ms", 0)

        async with AsyncSessionLocal() as db:
            study_service = StudyService(db)
            study_session = await study_service.get_session(session_id, user_id)

            if not study_session:
                return

            # Update session progress
            new_items_completed = study_session.items_completed + 1
            new_items_correct = study_session.items_correct + (1 if correct else 0)
            new_time_spent = study_session.time_spent_seconds + (time_taken_ms // 1000)

            updated_session = await study_service.update_session_progress(
                session_id=session_id,
                user_id=user_id,
                items_completed=new_items_completed,
                items_correct=new_items_correct,
                time_spent_seconds=new_time_spent
            )

            # Broadcast update
            await channel_manager.broadcast_to_user_channel(
                user_id=user_id,
                channel="study",
                event="session_update",
                data=study_service.session_to_dict(updated_session)
            )

            logger.debug(
                "study_item_completed",
                user_id=user_id,
                session_id=session_id,
                item_id=item_id,
                correct=correct
            )

    except Exception as e:
        logger.error("handle_item_completed_failed", error=str(e))
        await websocket.send_json({
            "type": "error",
            "data": {"message": str(e)}
        })


async def handle_session_pause(user_id: int, session_id: int, websocket: WebSocket):
    """Handle session pause event."""
    try:
        # Broadcast pause event
        await channel_manager.broadcast_to_user_channel(
            user_id=user_id,
            channel="study",
            event="session_paused",
            data={"session_id": session_id}
        )

        await websocket.send_json({
            "type": "session_paused",
            "data": {"session_id": session_id}
        })

    except Exception as e:
        logger.error("handle_session_pause_failed", error=str(e))


async def handle_session_resume(user_id: int, session_id: int, websocket: WebSocket):
    """Handle session resume event."""
    try:
        # Broadcast resume event
        await channel_manager.broadcast_to_user_channel(
            user_id=user_id,
            channel="study",
            event="session_resumed",
            data={"session_id": session_id}
        )

        await websocket.send_json({
            "type": "session_resumed",
            "data": {"session_id": session_id}
        })

    except Exception as e:
        logger.error("handle_session_resume_failed", error=str(e))


async def handle_session_end(user_id: int, session_id: int, websocket: WebSocket):
    """Handle session end event."""
    try:
        async with AsyncSessionLocal() as db:
            study_service = StudyService(db)
            ended_session = await study_service.end_session(session_id, user_id)

            if ended_session:
                # Broadcast end event
                await channel_manager.broadcast_to_user_channel(
                    user_id=user_id,
                    channel="study",
                    event="session_ended",
                    data=study_service.session_to_dict(ended_session)
                )

                await websocket.send_json({
                    "type": "session_ended",
                    "data": study_service.session_to_dict(ended_session)
                })

    except Exception as e:
        logger.error("handle_session_end_failed", error=str(e))
