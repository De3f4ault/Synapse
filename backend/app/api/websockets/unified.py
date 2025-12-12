"""
Unified WebSocket Endpoint

Single endpoint for all real-time features:
- Dashboard updates
- Chat streaming
- Activity tracking
- Study sessions

Uses channel-based routing for all features.
"""

from typing import Optional
from fastapi import WebSocket, WebSocketDisconnect, Query, status
from jose import JWTError
import structlog
import asyncio
import json

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

    except JWTError as e:
        logger.warning("token_validation_failed", error=str(e))
        return None
    except Exception as e:
        logger.error("user_lookup_failed", error=str(e))
        return None


async def unified_websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(..., description="JWT authentication token")
):
    """
    Unified WebSocket endpoint for all real-time features.

    Supports channel-based subscriptions:
    - dashboard: General app updates
    - chat:{session_id}: Chat session streaming
    - activity: Activity tracking
    - study:{session_id}: Study session tracking

    Protocol:
    Client → Server:
    - {"type": "subscribe", "channel": "chat:123"}
    - {"type": "unsubscribe", "channel": "chat:123"}
    - {"type": "message", "channel": "chat:123", "content": "Hello"}
    - {"type": "ping"}

    Server → Client:
    - {"type": "connected", "user_id": 1}
    - {"type": "subscribed", "channel": "chat:123"}
    - {"type": "token", "channel": "chat:123", "data": {...}}
    - {"type": "pong"}
    """
    # Authenticate user
    user = await get_user_from_token(token)

    if not user:
        logger.warning(
            "unified_websocket_auth_failed",
            token_preview=token[:20],
            reason="Invalid token or user not found"
        )
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    session_id = f"unified_{user.id}"

    # Track active channel subscriptions for this connection
    active_channels = set()

    try:
        # Register with connection manager
        await manager.connect(session_id, websocket, user.id)

        # Auto-subscribe to dashboard channel
        await channel_manager.subscribe(
            user_id=user.id,
            channel="dashboard",
            session_id=session_id
        )
        active_channels.add("dashboard")

        # Send initial confirmation
        await websocket.send_json({
            "type": "connected",
            "user_id": user.id,
            "session_id": session_id,
            "message": "Unified WebSocket connected"
        })

        logger.info(
            "unified_websocket_connected",
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

                message_type = data.get("type")

                # Handle ping/pong
                if message_type == "ping":
                    await websocket.send_json({"type": "pong"})
                    logger.debug("unified_heartbeat_pong_sent", user_id=user.id)
                    continue

                # Handle channel subscription
                elif message_type == "subscribe":
                    channel = data.get("channel")
                    if channel:
                        await channel_manager.subscribe(
                            user_id=user.id,
                            channel=channel,
                            session_id=session_id
                        )
                        active_channels.add(channel)
                        await websocket.send_json({
                            "type": "subscribed",
                            "channel": channel
                        })
                        logger.info(
                            "channel_subscribed",
                            user_id=user.id,
                            channel=channel
                        )

                # Handle channel unsubscription
                elif message_type == "unsubscribe":
                    channel = data.get("channel")
                    if channel and channel in active_channels:
                        await channel_manager.unsubscribe(
                            user_id=user.id,
                            channel=channel,
                            session_id=session_id
                        )
                        active_channels.discard(channel)
                        await websocket.send_json({
                            "type": "unsubscribed",
                            "channel": channel
                        })
                        logger.info(
                            "channel_unsubscribed",
                            user_id=user.id,
                            channel=channel
                        )

                # Handle chat message
                elif message_type == "message":
                    channel = data.get("channel")
                    content = data.get("content")

                    if channel and channel.startswith("chat:") and content:
                        # Extract session_id from channel
                        try:
                            chat_session_id = int(channel.split(":")[1])
                            await handle_chat_message(
                                user_id=user.id,
                                session_id=chat_session_id,
                                content=content,
                                websocket=websocket,
                                channel=channel
                            )
                        except (ValueError, IndexError) as e:
                            logger.error(
                                "invalid_chat_channel",
                                channel=channel,
                                error=str(e)
                            )
                            await websocket.send_json({
                                "type": "error",
                                "channel": channel,
                                "data": {
                                    "code": "invalid_channel",
                                    "message": "Invalid chat channel format"
                                }
                            })

            except asyncio.TimeoutError:
                # No message within interval → send heartbeat
                await websocket.send_json({"type": "ping"})
                logger.debug("unified_heartbeat_ping_sent", user_id=user.id)
                continue

            except WebSocketDisconnect:
                logger.info(
                    "unified_websocket_disconnect",
                    user_id=user.id,
                    session_id=session_id
                )
                break

            except Exception as e:
                logger.error(
                    "unified_websocket_error",
                    user_id=user.id,
                    error=str(e),
                    session_id=session_id
                )
                if "connection closed" in str(e).lower():
                    break

    except Exception as e:
        logger.error(
            "unified_websocket_connection_error",
            user_id=user.id if user else "unknown",
            error=str(e),
            session_id=session_id
        )
        try:
            await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
        except Exception:
            pass

    finally:
        # Always clean up all subscriptions
        try:
            for channel in active_channels:
                await channel_manager.unsubscribe(
                    user_id=user.id,
                    channel=channel,
                    session_id=session_id
                )
            await manager.disconnect(session_id, websocket)
            logger.info(
                "unified_websocket_closed",
                user_id=user.id if user else "unknown",
                session_id=session_id,
                channels_unsubscribed=len(active_channels)
            )
        except Exception as e:
            logger.error(
                "unified_websocket_cleanup_error",
                user_id=user.id if user else "unknown",
                error=str(e)
            )


async def handle_chat_message(
    user_id: int,
    session_id: int,
    content: str,
    websocket: WebSocket,
    channel: str
):
    """
    Handle chat message and stream AI response.

    Args:
        user_id: User ID
        session_id: Chat session ID
        content: Message content
        websocket: WebSocket connection
        channel: Channel name (e.g., "chat:123")
    """
    from app.models.chat_session import ChatSession
    from app.models.chat_message import ChatMessage, MessageRole
    from app.core.ai.agents.factory import create_agent
    from app.core.context.engine import ContextEngine
    from sqlalchemy import select, and_

    logger.info(
        "chat_message_received",
        user_id=user_id,
        session_id=session_id,
        content_length=len(content)
    )

    # Verify session ownership
    async with AsyncSessionLocal() as db:
        try:
            result = await db.execute(
                select(ChatSession).where(
                    and_(
                        ChatSession.id == session_id,
                        ChatSession.user_id == user_id,
                        ChatSession.deleted_at.is_(None)
                    )
                )
            )
            chat_session = result.scalar_one_or_none()

            if not chat_session:
                await websocket.send_json({
                    "type": "error",
                    "channel": channel,
                    "data": {
                        "code": "session_not_found",
                        "message": "Chat session not found or access denied"
                    }
                })
                return

            # Save user message
            user_message = ChatMessage(
                session_id=session_id,
                role=MessageRole.USER,
                content=content,
                tokens=max(1, len(content) // 4)
            )
            db.add(user_message)
            await db.commit()
            await db.refresh(user_message)

            logger.info(
                "user_message_saved",
                message_id=user_message.id,
                session_id=session_id
            )

        except Exception as save_error:
            logger.error(
                "failed_to_save_user_message",
                session_id=session_id,
                error=str(save_error),
                exc_info=True
            )
            await db.rollback()
            await websocket.send_json({
                "type": "error",
                "channel": channel,
                "data": {
                    "code": "save_error",
                    "message": "Failed to save message"
                }
            })
            return

    # Build context in separate transaction
    context = {}
    context_db = None
    try:
        context_db = AsyncSessionLocal()
        context_engine = ContextEngine(context_db)
        context = await context_engine.get_user_context(
            user_id=user_id,
            focus=content
        )
        await context_db.commit()
    except Exception as ctx_error:
        logger.error(
            "context_building_failed",
            user_id=user_id,
            session_id=session_id,
            error=str(ctx_error),
            exc_info=True
        )
        if context_db:
            await context_db.rollback()
        context = {}
    finally:
        if context_db:
            await context_db.close()

    # Generate AI response with streaming
    try:
        agent = await create_agent("tutor")
        result = await agent.execute(
            user_id=user_id,
            input=content,
            context=context or {}
        )

        logger.info(
            "agent_result_debug",
            success=result.success,
            output_length=len(result.output) if result.output else 0,
            has_output=bool(result.output),
            channel=channel,
            user_id=user_id
        )

        model = result.metadata.get("model", "gemini-2.5-flash") if result.metadata else "gemini-2.5-flash"

        # Stream thinking process if available
        if result.metadata and result.metadata.get("thinking_process"):
            thinking = result.metadata["thinking_process"]
            chunk_size = 50
            for i in range(0, len(thinking), chunk_size):
                chunk = thinking[i:i+chunk_size]
                await channel_manager.broadcast_to_user_channel(
                    user_id=user_id,
                    channel=channel,
                    event="thinking",
                    data={
                        "text": chunk,
                        "model": model,
                        "streaming": True
                    }
                )

        # Stream response tokens
        if result.success and result.output:
            words = result.output.split()
            for i, word in enumerate(words):
                token_text = word + (" " if i < len(words) - 1 else "")
                await channel_manager.broadcast_to_user_channel(
                    user_id=user_id,
                    channel=channel,
                    event="token",
                    data={
                        "text": token_text,
                        "model": model,
                        "streaming": True
                    }
                )
        else:
            error_msg = result.error or "Failed to generate response"
            await channel_manager.broadcast_to_user_channel(
                user_id=user_id,
                channel=channel,
                event="token",
                data={
                    "text": error_msg,
                    "model": model,
                    "streaming": True
                }
            )

        # Send grounding sources if available
        if result.metadata and result.metadata.get("grounding_sources"):
            await channel_manager.broadcast_to_user_channel(
                user_id=user_id,
                channel=channel,
                event="sources",
                data={
                    "sources": result.metadata["grounding_sources"]
                }
            )

        # Send completion message
        await channel_manager.broadcast_to_user_channel(
            user_id=user_id,
            channel=channel,
            event="complete",
            data={
                "total_tokens": result.total_tokens,
                "model_used": model,
                "success": result.success,
                "function_calls": result.metadata.get("function_calls") if result.metadata else None,
                "grounding_sources": result.metadata.get("grounding_sources") if result.metadata else None
            }
        )

        # Save assistant message
        async with AsyncSessionLocal() as db:
            try:
                assistant_message = ChatMessage(
                    session_id=session_id,
                    role=MessageRole.ASSISTANT,
                    content=result.output or "",
                    tokens=result.total_tokens or max(1, len(result.output or "") // 4),
                    model_used=model,
                    function_calls=result.metadata.get("function_calls") if result.metadata else None,
                    grounding_sources=result.metadata.get("grounding_sources") if result.metadata else None
                )
                db.add(assistant_message)

                # Update session token count
                result_session = await db.execute(
                    select(ChatSession).where(ChatSession.id == session_id)
                )
                chat_session = result_session.scalar_one()
                chat_session.total_tokens_used += user_message.tokens + assistant_message.tokens

                await db.commit()

                logger.info(
                    "assistant_message_saved",
                    message_id=assistant_message.id,
                    session_id=session_id,
                    tokens=assistant_message.tokens
                )
            except Exception as save_error:
                logger.error(
                    "failed_to_save_assistant_message",
                    session_id=session_id,
                    error=str(save_error),
                    exc_info=True
                )
                await db.rollback()

    except Exception as e:
        logger.error(
            "chat_message_error",
            user_id=user_id,
            session_id=session_id,
            error=str(e),
            exc_info=True
        )
        await channel_manager.broadcast_to_user_channel(
            user_id=user_id,
            channel=channel,
            event="error",
            data={
                "code": "generation_error",
                "message": str(e)
            }
        )
