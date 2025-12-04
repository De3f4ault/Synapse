"""
Activity Tracking WebSocket Endpoint

Provides real-time activity tracking for study sessions and user interactions.
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
from app.models.activity_log import ActivityType, ModuleType
from app.modules.activity.service import ActivityService
from sqlalchemy import select

logger = structlog.get_logger()


async def get_user_from_token(token: str) -> Optional[User]:
    """
    Validate token and retrieve user.

    Args:
        token: JWT token string

    Returns:
        User object if valid, None otherwise
    """
    try:
        from jose import JWTError

        payload = decode_token(token)
        user_id_str = payload.get("sub")

        if not user_id_str:
            logger.warning("token_missing_subject", token_preview=token[:20])
            return None

        try:
            user_id = int(user_id_str)
        except (ValueError, TypeError) as e:
            logger.warning("invalid_user_id_format", user_id=user_id_str, error=str(e))
            return None

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


async def activity_websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(..., description="JWT authentication token")
):
    """
    Activity tracking WebSocket endpoint.

    Provides real-time activity tracking for:
    - Activity logging
    - Session detection
    - Live activity feed

    Protocol:
    - Client sends: {"type": "activity_log", "activity_type": "view", "module": "flashcards", ...}
    - Server broadcasts: Activity updates to all user's connections
    """
    # Authenticate user
    user = await get_user_from_token(token)

    if not user:
        logger.warning(
            "activity_websocket_auth_failed",
            token_preview=token[:20],
            reason="Invalid token or user not found"
        )
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    session_id = f"activity_{user.id}"

    try:
        # Register with connection manager
        await manager.connect(session_id, websocket, user.id)

        # Subscribe to activity channel
        await channel_manager.subscribe(
            user_id=user.id,
            channel="activity",
            session_id=session_id
        )

        # Send initial confirmation
        await websocket.send_json({
            "type": "connected",
            "user_id": user.id,
            "session_id": session_id,
            "message": "Activity WebSocket connected"
        })

        logger.info(
            "activity_websocket_connected",
            user_id=user.id,
            session_id=session_id
        )

        # Send recent activities (last 20)
        async with AsyncSessionLocal() as db:
            activity_service = ActivityService(db)
            recent_activities = await activity_service.get_recent_activities(
                user_id=user.id,
                hours=24,
                limit=20
            )

            # Send recent activities
            await websocket.send_json({
                "type": "activity_history",
                "data": {
                    "activities": [activity.to_dict() for activity in recent_activities]
                }
            })

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
                    logger.debug("activity_heartbeat_pong_sent", user_id=user.id)
                    continue

                # Handle activity logging
                if data.get("type") == "activity_log":
                    await handle_activity_log(user.id, data, websocket)

                # Handle session detection request
                elif data.get("type") == "detect_sessions":
                    await handle_session_detection(user.id, websocket)

            except asyncio.TimeoutError:
                # No message within interval → send heartbeat
                await websocket.send_json({"type": "ping"})
                logger.debug("activity_heartbeat_ping_sent", user_id=user.id)
                continue

            except WebSocketDisconnect:
                logger.info(
                    "activity_websocket_disconnect",
                    user_id=user.id,
                    session_id=session_id
                )
                break

            except Exception as e:
                logger.error(
                    "activity_websocket_error",
                    user_id=user.id,
                    error=str(e),
                    session_id=session_id
                )
                if "connection closed" in str(e).lower():
                    break

    except Exception as e:
        logger.error(
            "activity_websocket_connection_error",
            user_id=user.id if user else "unknown",
            error=str(e),
            session_id=session_id
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
                channel="activity",
                session_id=session_id
            )
            await manager.disconnect(session_id, websocket)
            logger.info(
                "activity_websocket_closed",
                user_id=user.id if user else "unknown",
                session_id=session_id
            )
        except Exception as e:
            logger.error(
                "activity_websocket_cleanup_error",
                user_id=user.id if user else "unknown",
                error=str(e)
            )


async def handle_activity_log(user_id: int, data: dict, websocket: WebSocket):
    """Handle activity logging request."""
    try:
        # Extract activity data
        activity_type_str = data.get("activity_type")
        module_str = data.get("module")
        resource_id = data.get("resource_id")
        resource_title = data.get("resource_title")
        metadata = data.get("metadata", {})  # Still accept "metadata" from client for API compatibility

        # Validate required fields
        if not activity_type_str or not module_str:
            await websocket.send_json({
                "type": "error",
                "data": {
                    "code": "invalid_activity",
                    "message": "activity_type and module are required"
                }
            })
            return

        # Convert to enums
        try:
            activity_type = ActivityType(activity_type_str)
            module = ModuleType(module_str)
        except ValueError:
            await websocket.send_json({
                "type": "error",
                "data": {
                    "code": "invalid_activity",
                    "message": "Invalid activity_type or module"
                }
            })
            return

        # Log activity
        async with AsyncSessionLocal() as db:
            activity_service = ActivityService(db)
            activity = await activity_service.log_activity(
                user_id=user_id,
                activity_type=activity_type,
                module=module,
                resource_id=resource_id,
                resource_title=resource_title,
                metadata=metadata  # Pass to service (which will use meta_data= internally)
            )

            # Broadcast to all user's activity channels
            await channel_manager.broadcast_to_user_channel(
                user_id=user_id,
                channel="activity",
                event="activity_logged",
                data=activity.to_dict()  # to_dict() returns "metadata" key for API compatibility
            )

            logger.debug(
                "activity_logged",
                user_id=user_id,
                activity_id=activity.id,
                type=activity_type.value
            )

    except Exception as e:
        logger.error("activity_log_failed", user_id=user_id, error=str(e))
        await websocket.send_json({
            "type": "error",
            "data": {
                "code": "log_failed",
                "message": str(e)
            }
        })


async def handle_session_detection(user_id: int, websocket: WebSocket):
    """Handle session detection request."""
    try:
        async with AsyncSessionLocal() as db:
            activity_service = ActivityService(db)

            # Detect sessions from last 24 hours
            sessions = await activity_service.detect_sessions(
                user_id=user_id,
                hours=24,
                session_timeout_minutes=30,
                min_activities=2
            )

            # Send detected sessions
            await websocket.send_json({
                "type": "sessions_detected",
                "data": {
                    "sessions": sessions
                }
            })

            logger.debug(
                "sessions_detected",
                user_id=user_id,
                session_count=len(sessions)
            )

    except Exception as e:
        logger.error("session_detection_failed", user_id=user_id, error=str(e))
        await websocket.send_json({
            "type": "error",
            "data": {
                "code": "detection_failed",
                "message": str(e)
            }
        })
