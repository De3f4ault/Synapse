"""
Dashboard WebSocket endpoint.

Provides real-time updates for the dashboard including:
- Card reviews
- Note updates
- Document uploads
- Quiz completions
- Chat messages

UPDATED: Now uses channel manager for subscription-based broadcasting.

Authentication via query parameter token.
"""

from typing import Optional
from fastapi import WebSocket, WebSocketDisconnect, Query, status
from jose import JWTError
import structlog
import asyncio

from app.core.security import decode_token
from app.api.websockets.manager import manager
from app.api.websockets.channels import channel_manager
from app.db.session import AsyncSessionLocal
from app.models.user import User
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
        payload = decode_token(token)
        user_id_str = payload.get("sub")  # JWT 'sub' claim is typically a string

        if not user_id_str:
            logger.warning("token_missing_subject", token_preview=token[:20])
            return None

        # Convert string user_id to integer for database lookup
        try:
            user_id = int(user_id_str)
        except (ValueError, TypeError) as e:
            logger.warning(
                "invalid_user_id_format",
                user_id=user_id_str,
                error=str(e)
            )
            return None

        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(User).where(User.id == user_id)
            )
            user = result.scalar_one_or_none()

            if user and user.is_active:
                logger.debug(
                    "user_found_and_active",
                    user_id=user_id,
                    email=user.email if hasattr(user, 'email') else 'N/A'
                )
                return user
            elif user and not user.is_active:
                logger.warning("user_account_inactive", user_id=user_id)
                return None
            else:
                logger.warning("user_not_found", user_id=user_id)
                return None

    except JWTError as e:
        logger.warning("token_validation_failed", error=str(e))
        return None
    except Exception as e:
        logger.error("user_lookup_failed", error=str(e))
        return None


async def dashboard_websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(..., description="JWT authentication token")
):
    """
    WebSocket endpoint for dashboard real-time updates.

    Accepts connection with JWT token as query parameter.
    Broadcasts events like card reviews, note updates, etc.

    UPDATED: Now subscribes to 'dashboard' channel via channel manager.
    """
    # Authenticate user
    user = await get_user_from_token(token)

    if not user:
        logger.warning(
            "websocket_auth_failed",
            token_preview=token[:20],
            reason="Invalid token or user not found"
        )
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    session_id = f"dashboard_{user.id}"

    try:
        # Register with connection manager (this will call websocket.accept())
        await manager.connect(session_id, websocket, user.id)

        # Subscribe to dashboard channel
        await channel_manager.subscribe(
            user_id=user.id,
            channel="dashboard",
            session_id=session_id
        )

        # Send initial confirmation
        await websocket.send_json({
            "type": "connected",
            "user_id": user.id,
            "session_id": session_id,
            "message": "Dashboard WebSocket connected"
        })

        logger.info(
            "dashboard_websocket_connected",
            user_id=user.id,
            session_id=session_id,
            email=user.email if hasattr(user, 'email') else 'N/A'
        )

        # Heartbeat configuration
        HEARTBEAT_INTERVAL = 30  # seconds

        # Main message loop
        while True:
            try:
                # Wait for message from the client with timeout
                data = await asyncio.wait_for(
                    websocket.receive_json(),
                    timeout=HEARTBEAT_INTERVAL
                )

                # Handle ping/pong
                if data.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
                    logger.debug("heartbeat_pong_sent", user_id=user.id)
                    continue

                # Handle other message types
                message_type = data.get("type")
                if message_type:
                    logger.debug(
                        "websocket_message_received",
                        user_id=user.id,
                        message_type=message_type
                    )

                    # Future: Add specific message handlers here
                    # Example: if message_type == "subscribe": ...

            except asyncio.TimeoutError:
                # No message within interval → send heartbeat
                await websocket.send_json({"type": "ping"})
                logger.debug("heartbeat_ping_sent", user_id=user.id)
                continue

            except WebSocketDisconnect:
                logger.info(
                    "dashboard_websocket_disconnect",
                    user_id=user.id,
                    session_id=session_id
                )
                break

            except Exception as e:
                logger.error(
                    "dashboard_websocket_error",
                    user_id=user.id,
                    error=str(e),
                    session_id=session_id
                )
                # Don't break immediately - try to continue unless it's a fatal error
                if "connection closed" in str(e).lower():
                    break

    except Exception as e:
        logger.error(
            "dashboard_websocket_connection_error",
            user_id=user.id if user else "unknown",
            error=str(e),
            session_id=session_id
        )
        # Ensure we close the connection on any unhandled exception
        try:
            await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
        except Exception:
            pass  # Ignore errors during close

    finally:
        # Always clean up the connection and channel subscription
        try:
            await channel_manager.unsubscribe(
                user_id=user.id,
                channel="dashboard",
                session_id=session_id
            )
            await manager.disconnect(session_id, websocket)
            logger.info(
                "dashboard_websocket_closed",
                user_id=user.id if user else "unknown",
                session_id=session_id
            )
        except Exception as e:
            logger.error(
                "dashboard_websocket_cleanup_error",
                user_id=user.id if user else "unknown",
                error=str(e),
                session_id=session_id
            )
