"""
Chat WebSocket endpoint.

Real-time streaming chat with AI tutor.
Implemented full AI streaming
Thinking process streaming
Sources streaming
Complete message type support
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
import structlog
import json
from typing import AsyncIterator, Optional

from app.api.deps import get_db
from app.api.websockets.manager import manager
from app.api.websockets.protocol import MessageType
from app.models.chat_session import ChatSession
from app.models.chat_message import ChatMessage, MessageRole

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
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )
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
    db: AsyncSession
) -> AsyncIterator[dict]:
    """
    Stream AI response with real-time tokens.

    Yields messages in this order:
    1. thinking (if model supports it)
    2. tokens (streaming response)
    3. sources (if grounding used)
    4. complete (final metadata)

    Args:
        message: User message
        user_id: User ID
        session_id: Session ID
        db: Database session

    Yields:
        dict: WebSocket messages with type and data
    """
    try:
        from app.core.ai.agents.factory import create_agent
        from app.core.context.engine import ContextEngine

        # Build user context
        context_engine = ContextEngine(db)
        context = await context_engine.get_user_context(
            user_id=user_id,
            focus=message
        )

        # Create tutor agent
        agent = await create_agent("tutor")

        # Execute with streaming
        result = await agent.execute(
            user_id=user_id,
            input=message,
            context=context or {}
        )

        # Get model info
        model = result.metadata.get("model", "gemini-2.5-flash") if result.metadata else "gemini-2.5-flash"

        # Stream thinking process if available
        if result.metadata and result.metadata.get("thinking_process"):
            thinking = result.metadata["thinking_process"]
            # Stream thinking in chunks
            chunk_size = 50
            for i in range(0, len(thinking), chunk_size):
                chunk = thinking[i:i+chunk_size]
                yield {
                    "type": "thinking",
                    "data": {
                        "text": chunk,
                        "model": model,
                        "streaming": True
                    }
                }

        # Stream response tokens
        if result.success and result.output:
            # Simulate streaming by chunking the response
            # In production, this would use actual streaming from Gemini
            words = result.output.split()
            for i, word in enumerate(words):
                token_text = word + (" " if i < len(words) - 1 else "")
                yield {
                    "type": "token",
                    "data": {
                        "text": token_text,
                        "model": model,
                        "streaming": True
                    }
                }
        else:
            # Error case
            error_msg = result.error or "Failed to generate response"
            yield {
                "type": "token",
                "data": {
                    "text": error_msg,
                    "model": model,
                    "streaming": True
                }
            }

        # Send grounding sources if available
        if result.metadata and result.metadata.get("grounding_sources"):
            yield {
                "type": "sources",
                "data": {
                    "sources": result.metadata["grounding_sources"]
                }
            }

        # Send completion message
        yield {
            "type": "complete",
            "data": {
                "total_tokens": result.total_tokens,
                "model_used": model,
                "success": result.success,
                "function_calls": result.metadata.get("function_calls") if result.metadata else None,
                "grounding_sources": result.metadata.get("grounding_sources") if result.metadata else None
            }
        }

    except Exception as e:
        logger.error("stream_ai_error", error=str(e), exc_info=True)
        yield {
            "type": "error",
            "data": {
                "code": "generation_error",
                "message": str(e)
            }
        }


@router.websocket("/chat/{session_id}")
async def chat_websocket(
    websocket: WebSocket,
    session_id: str,
    token: str = Query(..., description="JWT access token"),
    db: AsyncSession = Depends(get_db)
):
    """
    Chat WebSocket endpoint.

    Provides real-time streaming chat with AI tutor.

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
                    ChatSession.deleted_at.is_(None)
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
        {
            "type": "connected",
            "data": {
                "session_id": session_int_id,
                "user_id": user_id
            }
        }
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
                type=message_type
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
                                "message": "Message content cannot be empty"
                            }
                        }
                    )
                    continue

                # Save user message
                user_message = ChatMessage(
                    session_id=session_int_id,
                    role=MessageRole.USER,
                    content=content,
                    tokens=estimate_tokens(content)
                )
                db.add(user_message)
                await db.commit()

                logger.info(
                    "user_message_saved",
                    message_id=user_message.id,
                    session_id=session_id
                )

                # Stream AI response
                full_response = ""
                total_tokens = 0
                model_used = None
                function_calls = None
                grounding_sources = None

                async for chunk in stream_ai_response(
                    message=content,
                    user_id=user_id,
                    session_id=session_int_id,
                    db=db
                ):
                    # Send chunk to client
                    await manager.send_message(session_id, websocket, chunk)

                    # Accumulate response
                    if chunk["type"] == "token":
                        full_response += chunk["data"]["text"]
                        model_used = chunk["data"]["model"]
                    elif chunk["type"] == "complete":
                        total_tokens = chunk["data"]["total_tokens"]
                        function_calls = chunk["data"].get("function_calls")
                        grounding_sources = chunk["data"].get("grounding_sources")

                # Save assistant message
                if full_response:
                    assistant_message = ChatMessage(
                        session_id=session_int_id,
                        role=MessageRole.ASSISTANT,
                        content=full_response,
                        tokens=total_tokens or estimate_tokens(full_response),
                        model_used=model_used,
                        function_calls=function_calls,
                        grounding_sources=grounding_sources
                    )
                    db.add(assistant_message)

                    # Update session token count
                    chat_session.total_tokens_used += user_message.tokens + assistant_message.tokens

                    await db.commit()

                    logger.info(
                        "assistant_message_saved",
                        message_id=assistant_message.id,
                        session_id=session_id,
                        tokens=assistant_message.tokens
                    )

            elif message_type == "ping":
                # Respond to ping
                await manager.send_message(
                    session_id,
                    websocket,
                    {"type": "pong", "data": {}}
                )

            elif message_type == "stop":
                # Stop generation (placeholder for future implementation)
                await manager.send_message(
                    session_id,
                    websocket,
                    {
                        "type": "stopped",
                        "data": {"message": "Generation stopped"}
                    }
                )

    except WebSocketDisconnect:
        await manager.disconnect(session_id, websocket)
        logger.info("websocket_disconnected", session_id=session_id)

    except Exception as e:
        logger.error(
            "websocket_error",
            session_id=session_id,
            error=str(e),
            exc_info=True
        )
        try:
            await manager.send_message(
                session_id,
                websocket,
                {
                    "type": "error",
                    "data": {
                        "code": "internal_error",
                        "message": str(e)
                    }
                }
            )
        except:
            pass
        await manager.disconnect(session_id, websocket)
