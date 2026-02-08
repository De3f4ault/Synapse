"""
Chat WebSocket endpoint.

Real-time streaming chat with AI tutor.
Implemented full AI streaming
Thinking process streaming
Sources streaming
Complete message type support
Cancellation support for Stop Generation

FIXED: Transaction isolation - context building and chat saving use separate transactions
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
import structlog
from typing import AsyncIterator, Optional

from app.api.deps import get_db
from app.api.websockets.manager import manager

# Chat models from module interface (temporary migration)
from app.modules.chat.interface import ChatSession, ChatMessage, MessageRole
from app.db.session import AsyncSessionLocal
from app.core.ai.cancellation import CancellationToken
from app.core.ai.generation_runtime import get_generation_registry

router = APIRouter()
logger = structlog.get_logger()


async def validate_token(token: str) -> dict:
    """
    Validate JWT token and return user info.

    Args:
        token: JWT token string

    Returns:
        dict: User info (id, email)

    Raises:
        Exception: If token is invalid
    """
    from jose import jwt, JWTError
    from app.core.config import settings

    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise Exception("Invalid token")
        return {"id": int(user_id)}
    except JWTError:
        raise Exception("Invalid token")


def estimate_tokens(text: str) -> int:
    """Estimate token count for text."""
    return max(1, len(text) // 4)


async def stream_ai_response(
    message: str,
    user_id: int,
    session_id: int,
    mode: str = "tutor",  # "tutor" or "general"
    cancellation_token: Optional[CancellationToken] = None,
) -> AsyncIterator[dict]:
    """
    Stream AI response with real-time tokens.

    FIXED: Uses separate database session for context building
    to prevent transaction contamination.

    Yields messages in this order:
    1. thinking (if model supports it)
    2. tokens (streaming response)
    3. sources (if grounding used)
    4. complete (final metadata)

    Args:
        message: User message
        user_id: User ID
        session_id: Session ID
        mode: "tutor" for Socratic or "general" for direct answers

    Yields:
        dict: WebSocket messages with type and data
    """
    # Create SEPARATE session for context building
    # This prevents context errors from contaminating the chat message save
    context_db: Optional[AsyncSession] = None

    try:
        from app.core.ai.agents.factory import create_agent
        from app.core.context.engine import ContextEngine

        # Create isolated session for context building
        context_db = AsyncSessionLocal()

        try:
            # Build user context in isolated transaction
            context_engine = ContextEngine(context_db)
            context = await context_engine.get_user_context(user_id=user_id, focus=message)

            # Commit the context session (or rollback if it failed)
            await context_db.commit()

        except Exception as ctx_error:
            logger.error(
                "context_building_failed",
                user_id=user_id,
                session_id=session_id,
                error=str(ctx_error),
                exc_info=True,
            )
            # Rollback the failed context transaction
            await context_db.rollback()
            # Use empty context on failure
            context = {}
        finally:
            # Close the context session
            await context_db.close()
            context_db = None

        # Select agent based on mode
        agent_name = "general" if mode == "general" else "tutor"
        agent = await create_agent(agent_name)

        # Execute with streaming
        result = await agent.execute(user_id=user_id, input=message, context=context or {})

        # Get model info
        model = (
            result.metadata.get("model", "gemini-2.5-flash")
            if result.metadata
            else "gemini-2.5-flash"
        )

        # Stream thinking process if available
        if result.metadata and result.metadata.get("thinking_process"):
            thinking = result.metadata["thinking_process"]
            # Stream thinking in chunks
            chunk_size = 50
            for i in range(0, len(thinking), chunk_size):
                chunk = thinking[i : i + chunk_size]
                yield {
                    "type": "thinking",
                    "data": {"text": chunk, "model": model, "streaming": True},
                }

        # Stream response tokens
        if result.success and result.output:
            # Simulate streaming by chunking the response
            # In production, this would use actual streaming from Gemini
            words = result.output.split()
            for i, word in enumerate(words):
                # Check for cancellation at each yield point
                if cancellation_token and cancellation_token.is_cancelled:
                    yield {
                        "type": "cancelled",
                        "data": {
                            "reason": cancellation_token.reason or "user_requested",
                            "partial_tokens": i,
                        },
                    }
                    return

                token_text = word + (" " if i < len(words) - 1 else "")
                yield {
                    "type": "token",
                    "data": {"text": token_text, "model": model, "streaming": True},
                }
        else:
            # Error case
            error_msg = result.error or "Failed to generate response"
            yield {"type": "token", "data": {"text": error_msg, "model": model, "streaming": True}}

        # Send grounding sources if available
        if result.metadata and result.metadata.get("grounding_sources"):
            yield {"type": "sources", "data": {"sources": result.metadata["grounding_sources"]}}

        # Send completion message
        yield {
            "type": "complete",
            "data": {
                "total_tokens": result.total_tokens,
                "model_used": model,
                "success": result.success,
                "function_calls": result.metadata.get("function_calls")
                if result.metadata
                else None,
                "grounding_sources": result.metadata.get("grounding_sources")
                if result.metadata
                else None,
            },
        }

    except Exception as e:
        logger.error("stream_ai_error", error=str(e), exc_info=True)
        yield {"type": "error", "data": {"code": "generation_error", "message": str(e)}}
    finally:
        # Ensure context session is closed
        if context_db is not None:
            try:
                await context_db.close()
            except Exception as cleanup_error:
                logger.error("context_session_cleanup_failed", error=str(cleanup_error))


async def stream_comparison(
    message: str,
    user_id: int,
    session_id: int,
    model_a: str,
    model_b: str,
    mode_id: str = "socratic",
) -> AsyncIterator[dict]:
    """
    Stream responses from two models in parallel for comparison.

    Uses asyncio.create_task() to run both streams concurrently,
    with an async queue to merge and tag chunks.

    Args:
        message: User's message
        user_id: User ID
        session_id: Session ID
        model_a: First model registry key (e.g., "qwen3_next")
        model_b: Second model registry key (e.g., "deepseek_v3_1")
        mode_id: Mode to use for both models

    Yields:
        dict: Chunks tagged with model_slot ("A" or "B")
    """
    import asyncio
    from asyncio import Queue
    from app.core.ai.orchestrator import get_orchestrator

    output_queue: Queue[dict] = Queue()

    async def stream_model(slot: str, model_key: str):
        """Stream from a single model and tag chunks with slot."""
        orchestrator = get_orchestrator()
        try:
            async for chunk in orchestrator.handle_message_stream(
                message=message,
                user_id=user_id,
                session_id=session_id,
                mode_id=mode_id,
                model_override=model_key,
                context={},
                chat_history=[],
            ):
                # Normalize chunk format for WebSocket
                chunk_type = chunk.get("type")

                if chunk_type == "token":
                    ws_chunk = {
                        "type": "token",
                        "model_slot": slot,
                        "data": {
                            "text": chunk.get("text", ""),
                            "model": chunk.get("model", model_key),
                            "streaming": True,
                        },
                    }
                elif chunk_type == "thinking":
                    ws_chunk = {
                        "type": "thinking",
                        "model_slot": slot,
                        "data": {
                            "text": chunk.get("text", ""),
                            "model": chunk.get("model", model_key),
                        },
                    }
                elif chunk_type == "complete":
                    metadata = chunk.get("metadata", {})
                    ws_chunk = {
                        "type": "complete",
                        "model_slot": slot,
                        "data": {
                            "total_tokens": metadata.get("total_tokens", 0),
                            "model_used": model_key,
                            "success": True,
                        },
                    }
                elif chunk_type == "error":
                    ws_chunk = {
                        "type": "error",
                        "model_slot": slot,
                        "data": {"message": chunk.get("message", "Unknown error")},
                    }
                else:
                    # Pass through other types (routing, fallback, etc.)
                    ws_chunk = {**chunk, "model_slot": slot}

                await output_queue.put(ws_chunk)

        except Exception as e:
            logger.error(
                "comparison_stream_error",
                slot=slot,
                model=model_key,
                error=str(e),
            )
            await output_queue.put(
                {
                    "type": "error",
                    "model_slot": slot,
                    "data": {"message": f"Model {model_key} failed: {str(e)}"},
                }
            )
        finally:
            # Signal completion for this slot
            await output_queue.put({"type": "stream_end", "model_slot": slot})

    # Start both streams concurrently
    task_a = asyncio.create_task(stream_model("A", model_a))
    task_b = asyncio.create_task(stream_model("B", model_b))

    logger.info(
        "comparison_started",
        user_id=user_id,
        session_id=session_id,
        model_a=model_a,
        model_b=model_b,
    )

    # Merge chunks from both streams
    completed = set()
    while len(completed) < 2:
        chunk = await output_queue.get()
        if chunk["type"] == "stream_end":
            completed.add(chunk["model_slot"])
            continue
        yield chunk

    # Ensure tasks are done
    await asyncio.gather(task_a, task_b, return_exceptions=True)

    logger.info(
        "comparison_completed",
        user_id=user_id,
        session_id=session_id,
    )


@router.websocket("/chat/{session_id}")
async def chat_websocket(
    websocket: WebSocket,
    session_id: str,
    token: str = Query(..., description="JWT access token"),
    db: AsyncSession = Depends(get_db),
):
    """
    Chat WebSocket endpoint.

    Provides real-time streaming chat with AI tutor.

    FIXED: Uses separate transactions for context building vs chat message saving.

    Protocol:
    - Client sends: {"type": "message", "content": "Hello"}
    - Server streams:
      * {"type": "thinking", "data": {"text": "...", "model": "..."}}
      * {"type": "token", "data": {"text": "Hi", "model": "flash"}}
      * {"type": "sources", "data": {"sources": [...]}}
      * {"type": "complete", "data": {"total_tokens": 150, ...}}
    """
    # Validate token
    try:
        user_info = await validate_token(token)
        user_id = user_info["id"]
    except Exception as e:
        await websocket.close(code=1008, reason="Unauthorized")
        logger.error("websocket_auth_failed", error=str(e))
        return

    # Verify session ownership
    try:
        session_int_id = int(session_id)
        result = await db.execute(
            select(ChatSession).where(
                and_(
                    ChatSession.id == session_int_id,
                    ChatSession.user_id == user_id,
                    ChatSession.deleted_at.is_(None),
                )
            )
        )
        chat_session = result.scalar_one_or_none()

        if not chat_session:
            await websocket.close(code=1008, reason="Session not found")
            logger.error("websocket_session_not_found", session_id=session_id)
            return

    except ValueError:
        await websocket.close(code=1008, reason="Invalid session ID")
        return

    # Accept connection
    await manager.connect(session_id, websocket, user_id)

    # Send connected message
    await manager.send_message(
        session_id,
        websocket,
        {"type": "connected", "data": {"session_id": session_int_id, "user_id": user_id}},
    )

    try:
        while True:
            # Receive message from client
            data = await websocket.receive_json()
            message_type = data.get("type")

            logger.info(
                "websocket_message_received",
                session_id=session_id,
                user_id=user_id,
                type=message_type,
            )

            if message_type == "message":
                # Handle chat message
                content = data.get("content")

                if not content:
                    await manager.send_message(
                        session_id,
                        websocket,
                        {
                            "type": "error",
                            "data": {
                                "code": "empty_message",
                                "message": "Message content cannot be empty",
                            },
                        },
                    )
                    continue

                # Save user message in SEPARATE transaction
                try:
                    user_message = ChatMessage(
                        session_id=session_int_id,
                        role=MessageRole.USER,
                        content=content,
                        tokens=estimate_tokens(content),
                    )
                    db.add(user_message)
                    await db.commit()
                    await db.refresh(user_message)

                    logger.info(
                        "user_message_saved", message_id=user_message.id, session_id=session_id
                    )
                except Exception as save_error:
                    logger.error(
                        "failed_to_save_user_message",
                        session_id=session_id,
                        error=str(save_error),
                        exc_info=True,
                    )
                    await db.rollback()
                    await manager.send_message(
                        session_id,
                        websocket,
                        {
                            "type": "error",
                            "data": {"code": "save_error", "message": "Failed to save message"},
                        },
                    )
                    continue

                # Get mode from client message and map to backend mode IDs
                # Frontend modes → Backend mode IDs
                FRONTEND_MODE_MAP = {
                    "tutor": "socratic",  # Legacy: Socratic teaching
                    "direct": "direct",  # Concise, no questions
                    "deep_think": "deep_dive",  # Visible reasoning
                    "creative": "creative",  # Creative writing
                    "research": "research",  # Research mode
                    "socratic": "socratic",  # Direct match
                    "deep_dive": "deep_dive",  # Direct match
                    "vision": "vision",  # Vision analysis
                }
                raw_mode = data.get("mode", "socratic")
                mode_id = FRONTEND_MODE_MAP.get(raw_mode, "socratic")

                logger.info(
                    "mode_resolved",
                    raw_mode=raw_mode,
                    mode_id=mode_id,
                    session_id=session_id,
                )

                # Create cancellation token and register generation
                registry = get_generation_registry()
                generation_channel = f"chat:{session_int_id}:{user_message.id}"
                # Register generation for cancellation support (orchestrator will check registry)
                await registry.start(generation_channel)

                # Stream AI response (uses its own session for context)
                full_response = ""
                total_tokens = 0
                model_used = None
                function_calls = None
                grounding_sources = None
                was_cancelled = False

                try:
                    # Check for comparison mode
                    is_comparison = data.get("compare", False)
                    comparison_models = data.get("models", [])

                    if is_comparison and len(comparison_models) >= 2:
                        # ========== COMPARISON MODE ==========
                        # Stream from two models in parallel
                        model_a = comparison_models[0]
                        model_b = comparison_models[1]

                        logger.info(
                            "comparison_mode_activated",
                            model_a=model_a,
                            model_b=model_b,
                            session_id=session_id,
                        )

                        # Track content for both slots
                        content_a = ""
                        content_b = ""

                        async for chunk in stream_comparison(
                            message=content,
                            user_id=user_id,
                            session_id=session_int_id,
                            model_a=model_a,
                            model_b=model_b,
                            mode_id=mode_id,
                        ):
                            # Send tagged chunk directly to client
                            await manager.send_message(session_id, websocket, chunk)

                            # Track content for saving
                            if chunk.get("type") == "token":
                                if chunk.get("model_slot") == "A":
                                    content_a += chunk.get("data", {}).get("text", "")
                                elif chunk.get("model_slot") == "B":
                                    content_b += chunk.get("data", {}).get("text", "")

                        # Save primary response (Model A) with comparison data
                        full_response = content_a
                        model_used = model_a
                        # Store Model B response in comparison_data
                        # (will need to add this field to ChatMessage model later)

                    else:
                        # ========== NORMAL MODE ==========
                        # Use orchestrator with full mode system
                        from app.core.ai.orchestrator import get_orchestrator

                        orchestrator = get_orchestrator()

                        async for chunk in orchestrator.handle_message_stream(
                            message=content,
                            user_id=user_id,
                            session_id=session_int_id,
                            mode_id=mode_id,
                            context={},  # Context engine runs inside orchestrator
                            chat_history=[],
                        ):
                            # Normalize chunk format for WebSocket transmission
                            # Agent yields flat: {"type": "token", "text": "..."}
                            # WebSocket expects: {"type": "token", "data": {"text": "..."}}
                            chunk_type = chunk.get("type")

                            if chunk_type == "token":
                                # Wrap flat format for WebSocket
                                ws_chunk = {
                                    "type": "token",
                                    "data": {
                                        "text": chunk.get("text", ""),
                                        "model": chunk.get("model", ""),
                                        "streaming": chunk.get("streaming", True),
                                    },
                                }
                                await manager.send_message(session_id, websocket, ws_chunk)
                                full_response += chunk.get("text", "")
                                model_used = chunk.get("model")

                            elif chunk_type == "thinking":
                                # Wrap thinking for WebSocket
                                ws_chunk = {
                                    "type": "thinking",
                                    "data": {
                                        "text": chunk.get("text", ""),
                                        "model": chunk.get("model", ""),
                                        "streaming": True,
                                    },
                                }
                                await manager.send_message(session_id, websocket, ws_chunk)

                            elif chunk_type == "routing":
                                # Pass through routing metadata (already correct format)
                                await manager.send_message(session_id, websocket, chunk)

                            elif chunk_type == "fallback":
                                # Pass through fallback notification
                                await manager.send_message(session_id, websocket, chunk)

                            elif chunk_type == "tool_call":
                                ws_chunk = {"type": "tool_call", "data": chunk}
                                await manager.send_message(session_id, websocket, ws_chunk)

                            elif chunk_type == "tool_result":
                                ws_chunk = {"type": "tool_result", "data": chunk}
                                await manager.send_message(session_id, websocket, ws_chunk)

                            elif chunk_type == "complete":
                                # Extract completion metadata
                                metadata = chunk.get("metadata", {})
                                ws_chunk = {
                                    "type": "complete",
                                    "data": {
                                        "total_tokens": metadata.get("total_tokens", 0),
                                        "model_used": model_used,
                                        "success": True,
                                        "function_calls": metadata.get("function_calls"),
                                        "grounding_sources": metadata.get("grounding_sources"),
                                    },
                                }
                                await manager.send_message(session_id, websocket, ws_chunk)
                                total_tokens = metadata.get("total_tokens", 0)
                                function_calls = metadata.get("function_calls")
                                grounding_sources = metadata.get("grounding_sources")

                            elif chunk_type == "error":
                                ws_chunk = {
                                    "type": "error",
                                    "data": {"message": chunk.get("message", "Unknown error")},
                                }
                                await manager.send_message(session_id, websocket, ws_chunk)

                            elif chunk_type == "cancelled":
                                was_cancelled = True
                                ws_chunk = {"type": "cancelled", "data": chunk}
                                await manager.send_message(session_id, websocket, ws_chunk)
                                logger.info(
                                    "generation_cancelled_by_user",
                                    session_id=session_id,
                                    partial_tokens=chunk.get("partial_tokens", 0),
                                )
                finally:
                    # Always complete the generation in registry
                    status = "cancelled" if was_cancelled else "completed"
                    await registry.complete(generation_channel, status)

                # Save assistant message in FRESH transaction
                if full_response:
                    try:
                        assistant_message = ChatMessage(
                            session_id=session_int_id,
                            role=MessageRole.ASSISTANT,
                            content=full_response,
                            tokens=total_tokens or estimate_tokens(full_response),
                            model_used=model_used,
                            function_calls=function_calls,
                            grounding_sources=grounding_sources,
                        )
                        db.add(assistant_message)

                        # Update session token count
                        chat_session.total_tokens_used += (
                            user_message.tokens + assistant_message.tokens
                        )

                        await db.commit()

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

            elif message_type == "ping":
                # Respond to ping
                await manager.send_message(session_id, websocket, {"type": "pong", "data": {}})

            elif message_type == "stop" or message_type == "generation.stop":
                # Stop generation - cancel via registry
                channel = data.get("channel")
                if not channel:
                    # Default to session-level cancellation (cancel any active)
                    channel = f"chat:{session_int_id}"

                registry = get_generation_registry()
                # Try to find and cancel any generation for this session
                cancelled = False
                for active_channel in registry.active_channels():
                    if active_channel.startswith(f"chat:{session_int_id}:"):
                        await registry.cancel(active_channel, "user_requested")
                        cancelled = True
                        break

                await manager.send_message(
                    session_id,
                    websocket,
                    {
                        "type": "stopped",
                        "data": {
                            "message": "Generation stopped"
                            if cancelled
                            else "No active generation",
                            "cancelled": cancelled,
                        },
                    },
                )

    except WebSocketDisconnect:
        await manager.disconnect(session_id, websocket)
        logger.info("websocket_disconnected", session_id=session_id)

    except Exception as e:
        logger.error("websocket_error", session_id=session_id, error=str(e), exc_info=True)
        try:
            await manager.send_message(
                session_id,
                websocket,
                {"type": "error", "data": {"code": "internal_error", "message": str(e)}},
            )
        except Exception:
            pass
        await manager.disconnect(session_id, websocket)
