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

from app.core.security import decode_token
from app.api.websockets.manager import manager
from app.api.websockets.channels import channel_manager
from app.db.session import AsyncSessionLocal
from app.models.user import User
from sqlalchemy import select
from app.core.ai.registry.models import DEFAULT_CHAT_MODEL

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
            result = await db.execute(select(User).where(User.id == user_id))
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
    websocket: WebSocket, token: str = Query(..., description="JWT authentication token")
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
            reason="Invalid token or user not found",
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
        await channel_manager.subscribe(user_id=user.id, channel="dashboard", session_id=session_id)
        active_channels.add("dashboard")

        # Send initial confirmation
        await websocket.send_json(
            {
                "type": "connected",
                "user_id": user.id,
                "session_id": session_id,
                "message": "Unified WebSocket connected",
            }
        )

        logger.info("unified_websocket_connected", user_id=user.id, session_id=session_id)

        # Heartbeat configuration
        HEARTBEAT_INTERVAL = 30  # seconds

        # Main message loop
        while True:
            try:
                # Wait for message from client with timeout
                data = await asyncio.wait_for(websocket.receive_json(), timeout=HEARTBEAT_INTERVAL)

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
                            user_id=user.id, channel=channel, session_id=session_id
                        )
                        active_channels.add(channel)
                        await websocket.send_json({"type": "subscribed", "channel": channel})
                        logger.info("channel_subscribed", user_id=user.id, channel=channel)

                # Handle channel unsubscription
                elif message_type == "unsubscribe":
                    channel = data.get("channel")
                    if channel and channel in active_channels:
                        await channel_manager.unsubscribe(
                            user_id=user.id, channel=channel, session_id=session_id
                        )
                        active_channels.discard(channel)
                        await websocket.send_json({"type": "unsubscribed", "channel": channel})
                        logger.info("channel_unsubscribed", user_id=user.id, channel=channel)

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
                                channel=channel,
                            )
                        except (ValueError, IndexError) as e:
                            logger.error("invalid_chat_channel", channel=channel, error=str(e))
                            await websocket.send_json(
                                {
                                    "type": "error",
                                    "channel": channel,
                                    "data": {
                                        "code": "invalid_channel",
                                        "message": "Invalid chat channel format",
                                    },
                                }
                            )

            except asyncio.TimeoutError:
                # No message within interval → send heartbeat
                await websocket.send_json({"type": "ping"})
                logger.debug("unified_heartbeat_ping_sent", user_id=user.id)
                continue

            except WebSocketDisconnect:
                logger.info("unified_websocket_disconnect", user_id=user.id, session_id=session_id)
                break

            except asyncio.CancelledError:
                # Server shutdown or task cancellation - exit gracefully
                logger.info("unified_websocket_cancelled", user_id=user.id, session_id=session_id)
                break

            except Exception as e:
                error_str = str(e).lower()
                logger.error(
                    "unified_websocket_error", user_id=user.id, error=str(e), session_id=session_id
                )
                # Break on any connection-related errors to prevent infinite loops
                if any(
                    phrase in error_str
                    for phrase in [
                        "connection closed",
                        "not connected",
                        "accept",
                        "websocket",
                        "disconnect",
                        "closed",
                    ]
                ):
                    break

    except Exception as e:
        logger.error(
            "unified_websocket_connection_error",
            user_id=user.id if user else "unknown",
            error=str(e),
            session_id=session_id,
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
                    user_id=user.id, channel=channel, session_id=session_id
                )
            await manager.disconnect(session_id, websocket)
            logger.info(
                "unified_websocket_closed",
                user_id=user.id if user else "unknown",
                session_id=session_id,
                channels_unsubscribed=len(active_channels),
            )
        except Exception as e:
            logger.error(
                "unified_websocket_cleanup_error",
                user_id=user.id if user else "unknown",
                error=str(e),
            )


async def handle_chat_message(
    user_id: int, session_id: int, content: str, websocket: WebSocket, channel: str
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
    # Chat models from module interface (temporary migration)
    from app.modules.chat.interface import ChatSession, ChatMessage, MessageRole
    from app.core.context.engine import ContextEngine
    from sqlalchemy import select, and_

    logger.info(
        "chat_message_received", user_id=user_id, session_id=session_id, content_length=len(content)
    )

    # Verify session ownership
    async with AsyncSessionLocal() as db:
        try:
            result = await db.execute(
                select(ChatSession).where(
                    and_(
                        ChatSession.id == session_id,
                        ChatSession.user_id == user_id,
                        ChatSession.deleted_at.is_(None),
                    )
                )
            )
            chat_session = result.scalar_one_or_none()

            if not chat_session:
                await websocket.send_json(
                    {
                        "type": "error",
                        "channel": channel,
                        "data": {
                            "code": "session_not_found",
                            "message": "Chat session not found or access denied",
                        },
                    }
                )
                return

            # Save user message
            user_message = ChatMessage(
                session_id=session_id,
                role=MessageRole.USER,
                content=content,
                tokens=max(1, len(content) // 4),
            )
            db.add(user_message)
            await db.commit()
            await db.refresh(user_message)

            logger.info("user_message_saved", message_id=user_message.id, session_id=session_id)

        except Exception as save_error:
            logger.error(
                "failed_to_save_user_message",
                session_id=session_id,
                error=str(save_error),
                exc_info=True,
            )
            await db.rollback()
            await websocket.send_json(
                {
                    "type": "error",
                    "channel": channel,
                    "data": {"code": "save_error", "message": "Failed to save message"},
                }
            )
            return

    # Build context and chat history in separate transaction
    context = {}
    chat_history = []
    context_db = None

    # Token budget for chat history (target ~4k tokens, rough estimate 4 chars per token)
    MAX_HISTORY_TOKENS = 4000
    MAX_HISTORY_CHARS = MAX_HISTORY_TOKENS * 4  # ~16k characters

    try:
        context_db = AsyncSessionLocal()

        # Fetch recent chat history with token-based truncation
        # ChatMessage is already imported above at function start

        result = await context_db.execute(
            select(ChatMessage)
            .where(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.created_at.desc())
            .limit(50)  # Fetch more, then truncate by tokens
        )
        messages = result.scalars().all()

        # Reverse to chronological order, exclude current message
        all_messages = [{"role": msg.role, "content": msg.content} for msg in reversed(messages)][
            :-1
        ]  # Exclude the message we just saved

        # Token-based truncation: keep most recent messages within budget
        chat_history = []
        total_chars = 0

        # Always include the most recent messages (within token budget)
        for msg in reversed(all_messages):
            msg_chars = len(msg.get("content", ""))
            if total_chars + msg_chars > MAX_HISTORY_CHARS:
                break
            chat_history.insert(0, msg)  # Insert at beginning to maintain order
            total_chars += msg_chars

        logger.debug(
            "chat_history_built",
            session_id=session_id,
            total_messages=len(all_messages),
            included_messages=len(chat_history),
            total_chars=total_chars,
            estimated_tokens=total_chars // 4,
        )

        # Build user context
        context_engine = ContextEngine(context_db)
        context = await context_engine.get_user_context(user_id=user_id, focus=content)
        await context_db.commit()

    except Exception as ctx_error:
        logger.error(
            "context_building_failed",
            user_id=user_id,
            session_id=session_id,
            error=str(ctx_error),
            exc_info=True,
        )
        if context_db:
            await context_db.rollback()
        context = {}
        chat_history = []
    finally:
        if context_db:
            await context_db.close()

    # Generate AI response through orchestrator (intent routing + streaming)
    try:
        from app.core.ai.orchestrator import get_orchestrator

        orchestrator = get_orchestrator()

        # Accumulate full response for saving
        full_response = ""
        total_tokens = 0
        model_used = DEFAULT_CHAT_MODEL
        tool_calls_made = []
        grounding_sources = None
        agent_used = "tutor"

        logger.info(
            "starting_orchestrated_stream",
            user_id=user_id,
            session_id=session_id,
            channel=channel,
            history_messages=len(chat_history),
            history_chars=sum(len(m.get("content", "")) for m in chat_history),
        )

        # Stream tokens through orchestrator
        async for chunk in orchestrator.handle_message_stream(
            message=content,
            user_id=user_id,
            session_id=session_id,
            context=context or {},
            chat_history=chat_history,
        ):
            chunk_type = chunk.get("type")

            # Handle routing info (new from orchestrator)
            if chunk_type == "routing":
                agent_used = chunk.get("agent", "tutor")
                logger.info(
                    "orchestrator_routed",
                    agent=agent_used,
                    intent=chunk.get("intent"),
                    confidence=chunk.get("confidence"),
                )
                continue  # Don't broadcast routing info to client

            chunk_type = chunk.get("type")

            if chunk_type == "token":
                # Real-time token streaming
                token_text = chunk.get("text", "")
                full_response += token_text
                await channel_manager.broadcast_to_user_channel(
                    user_id=user_id,
                    channel=channel,
                    event="token",
                    data={
                        "text": token_text,
                        "model": chunk.get("model", model_used),
                        "streaming": True,
                    },
                )

            elif chunk_type == "thinking":
                # Thinking process from thinking models
                await channel_manager.broadcast_to_user_channel(
                    user_id=user_id,
                    channel=channel,
                    event="thinking",
                    data={
                        "text": chunk.get("text", ""),
                        "model": chunk.get("model", model_used),
                        "streaming": True,
                    },
                )

            elif chunk_type == "tool_call":
                # Tool being called
                await channel_manager.broadcast_to_user_channel(
                    user_id=user_id,
                    channel=channel,
                    event="tool_call",
                    data={"name": chunk.get("name"), "args": chunk.get("args", {})},
                )

            elif chunk_type == "tool_result":
                # Tool execution result
                tool_calls_made.append({"name": chunk.get("name"), "result": chunk.get("result")})
                await channel_manager.broadcast_to_user_channel(
                    user_id=user_id,
                    channel=channel,
                    event="tool_result",
                    data={"name": chunk.get("name"), "result": chunk.get("result")},
                )

            elif chunk_type == "complete":
                # Streaming complete
                total_tokens = chunk.get("total_tokens", 0)
                model_used = chunk.get("model", model_used)
                grounding_sources = chunk.get("grounding_sources")

                await channel_manager.broadcast_to_user_channel(
                    user_id=user_id,
                    channel=channel,
                    event="complete",
                    data={
                        "total_tokens": total_tokens,
                        "model_used": model_used,
                        "success": chunk.get("success", True),
                        "function_calls": tool_calls_made if tool_calls_made else None,
                        "grounding_sources": grounding_sources,
                    },
                )

            elif chunk_type == "error":
                # Error during streaming
                await channel_manager.broadcast_to_user_channel(
                    user_id=user_id,
                    channel=channel,
                    event="error",
                    data={
                        "code": "generation_error",
                        "message": chunk.get("message", "Unknown error"),
                    },
                )
                return

        logger.info(
            "stream_complete",
            user_id=user_id,
            session_id=session_id,
            response_length=len(full_response),
            total_tokens=total_tokens,
        )

        # Save assistant message
        async with AsyncSessionLocal() as db:
            try:
                assistant_message = ChatMessage(
                    session_id=session_id,
                    role=MessageRole.ASSISTANT,
                    content=full_response or "",
                    tokens=total_tokens or max(1, len(full_response or "") // 4),
                    model_used=model_used,
                    function_calls={"calls": tool_calls_made} if tool_calls_made else None,
                    grounding_sources=grounding_sources,
                )
                db.add(assistant_message)

                # Update session token count
                result_session = await db.execute(
                    select(ChatSession).where(ChatSession.id == session_id)
                )
                chat_session = result_session.scalar_one()
                chat_session.total_tokens_used += user_message.tokens + assistant_message.tokens

                await db.commit()
                await db.refresh(assistant_message)

                # Generate embedding for hybrid search (Q+A pair strategy)
                try:
                    from app.services.search.chat_embedding import embed_assistant_message

                    await embed_assistant_message(
                        db_session=db,
                        message_id=assistant_message.id,
                        content=full_response or "",
                        parent_content=content,  # User's question
                        session_title=chat_session.title if chat_session else None,
                    )
                    await db.commit()
                except Exception as embed_error:
                    # Don't fail message saving if embedding fails
                    logger.warning(
                        "chat_embedding_failed",
                        message_id=assistant_message.id,
                        error=str(embed_error)[:100],
                    )

                # Generate AI title for session (if this is the first exchange)
                try:
                    from app.services.chat.title_generator import maybe_generate_title

                    new_title = await maybe_generate_title(
                        session_id=session_id,
                        first_message=content,
                        first_response=full_response or "",
                        db_session=db,
                    )
                    if new_title:
                        # Broadcast title update to client
                        await channel_manager.broadcast_to_user_channel(
                            user_id=user_id,
                            channel=channel,
                            event="title_updated",
                            data={"session_id": session_id, "title": new_title},
                        )
                except Exception as title_error:
                    # Don't fail if title generation fails
                    logger.warning("title_generation_failed", error=str(title_error)[:100])

                logger.info(
                    "assistant_message_saved",
                    message_id=assistant_message.id,
                    session_id=session_id,
                    tokens=assistant_message.tokens,
                )
            except Exception as save_error:
                logger.error(
                    "failed_to_save_assistant_message",
                    session_id=session_id,
                    error=str(save_error),
                    exc_info=True,
                )
                await db.rollback()

    except Exception as e:
        logger.error(
            "chat_message_error",
            user_id=user_id,
            session_id=session_id,
            error=str(e),
            exc_info=True,
        )
        await channel_manager.broadcast_to_user_channel(
            user_id=user_id,
            channel=channel,
            event="error",
            data={"code": "generation_error", "message": str(e)},
        )
