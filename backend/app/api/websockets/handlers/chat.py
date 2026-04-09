"""
Chat message handler.

Handles new chat messages and comparison mode streaming.
"""

import asyncio
from asyncio import Queue

import structlog
from fastapi import WebSocket
from sqlalchemy import select, and_

from app.api.websockets.core.channels import channel_manager
from app.api.websockets.core.streaming import stream_and_broadcast
from app.core.ai.registry.models import DEFAULT_CHAT_MODEL
from app.db.session import AsyncSessionLocal

logger = structlog.get_logger()


# ---------------------------------------------------------------------------
# Comparison streaming
# ---------------------------------------------------------------------------


async def stream_comparison(
    *,
    message: str,
    user_id: int,
    session_id: int,
    model_a: str,
    model_b: str,
    mode_id: str = "socratic",
    context: dict | None = None,
    chat_history: list | None = None,
):
    """
    Stream responses from two models in parallel for side-by-side comparison.

    Yields tagged chunks with ``model_slot`` ("A" or "B") so the frontend
    can route them to the correct panel.
    """
    from app.core.ai.orchestrator import get_orchestrator

    output_queue: Queue[dict] = Queue()

    async def _stream_model(slot: str, model_key: str):
        orchestrator = get_orchestrator()
        try:
            async for chunk in orchestrator.handle_message_stream(
                message=message,
                user_id=user_id,
                session_id=session_id,
                mode_id=mode_id,
                model_override=model_key,
                context=context or {},
                chat_history=chat_history or [],
            ):
                chunk_type = chunk.get("type")
                if chunk_type == "routing":
                    continue

                data = chunk.get("data", {})
                if chunk_type in ("token", "thinking"):
                    ws_chunk = {
                        "type": chunk_type,
                        "data": {
                            "text": chunk.get("text", ""),
                            "model": chunk.get("model", model_key),
                            "model_slot": slot,
                            "streaming": chunk_type == "token",
                        },
                    }
                elif chunk_type == "complete":
                    meta = chunk.get("metadata", {})
                    ws_chunk = {
                        "type": "complete",
                        "data": {
                            "total_tokens": meta.get("total_tokens", 0),
                            "model_used": model_key,
                            "model_slot": slot,
                            "success": True,
                        },
                    }
                elif chunk_type == "error":
                    ws_chunk = {
                        "type": "error",
                        "data": {"message": chunk.get("message", "Unknown error"), "model_slot": slot},
                    }
                else:
                    ws_chunk = {**chunk, "data": {**data, "model_slot": slot}}

                await output_queue.put(ws_chunk)

        except Exception as e:
            logger.error("comparison_stream_error", slot=slot, model=model_key, error=str(e))
            await output_queue.put({
                "type": "error",
                "model_slot": slot,
                "data": {"message": f"Model {model_key} failed: {e}"},
            })
        finally:
            await output_queue.put({"type": "_stream_end", "model_slot": slot})

    task_a = asyncio.create_task(_stream_model("A", model_a))
    task_b = asyncio.create_task(_stream_model("B", model_b))

    logger.info("comparison_started", user_id=user_id, model_a=model_a, model_b=model_b)

    completed: set[str] = set()
    while len(completed) < 2:
        chunk = await output_queue.get()
        if chunk["type"] == "_stream_end":
            completed.add(chunk["model_slot"])
            continue
        yield chunk

    await asyncio.gather(task_a, task_b, return_exceptions=True)
    logger.info("comparison_completed", user_id=user_id, session_id=session_id)


# ---------------------------------------------------------------------------
# Main chat handler
# ---------------------------------------------------------------------------

# Token budget for chat history (~4k tokens ≈ 16k chars)
_MAX_HISTORY_CHARS = 16_000


async def handle_chat_message(
    user_id: int,
    session_id: int,
    content: str,
    websocket: WebSocket,
    channel: str,
    compare: bool = False,
    models: list | None = None,
    mode: str = "socratic",
    attachment_ids: list[int] | None = None,
):
    """Handle a new chat message — save, stream AI response, persist."""
    from app.modules.chat.interface import ChatSession, ChatMessage, MessageRole
    from app.core.context.engine import ContextEngine
    from app.core.ai.orchestrator import get_orchestrator

    logger.info("chat_message_received", user_id=user_id, session_id=session_id)

    # ── 1. Verify session ownership & save user message ──────────────────
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
                await websocket.send_json({
                    "type": "error",
                    "channel": channel,
                    "data": {"code": "session_not_found", "message": "Chat session not found or access denied"},
                })
                return

            # Load attachment metadata from Document records
            attachments_jsonb = None
            image_bytes: list[bytes] = []

            if attachment_ids:
                from app.models.document import Document
                import os

                doc_result = await db.execute(
                    select(Document).where(
                        and_(
                            Document.id.in_(attachment_ids),
                            Document.user_id == user_id,
                            Document.deleted_at.is_(None),
                        )
                    )
                )
                docs = doc_result.scalars().all()

                attachments_jsonb = []
                for doc in docs:
                    attachments_jsonb.append({
                        "document_id": doc.id,
                        "filename": doc.filename,
                        "content_type": doc.mime_type or doc.file_type,
                        "size_bytes": doc.file_size,
                    })

                    # Load image bytes for vision models
                    mime = (doc.mime_type or "").lower()
                    if mime.startswith("image/"):
                        file_path = doc.file_path
                        if not os.path.isabs(file_path):
                            file_path = os.path.join("data", file_path)
                        try:
                            with open(file_path, "rb") as f:
                                image_bytes.append(f.read())
                        except FileNotFoundError:
                            logger.warning(
                                "attachment_file_not_found",
                                document_id=doc.id,
                                path=file_path,
                            )

                logger.info(
                    "attachments_loaded",
                    session_id=session_id,
                    count=len(attachments_jsonb),
                    images=len(image_bytes),
                )

            user_message = ChatMessage(
                session_id=session_id,
                role=MessageRole.USER,
                content=content,
                tokens=max(1, len(content) // 4),
                attachments=attachments_jsonb,
            )
            db.add(user_message)
            await db.commit()
            await db.refresh(user_message)
        except Exception:
            logger.exception("failed_to_save_user_message", session_id=session_id)
            await db.rollback()
            await websocket.send_json({
                "type": "error",
                "channel": channel,
                "data": {"code": "save_error", "message": "Failed to save message"},
            })
            return

    # ── 2. Build context & chat history (separate transaction) ───────────
    context: dict = {}
    chat_history: list = []

    try:
        async with AsyncSessionLocal() as ctx_db:
            result = await ctx_db.execute(
                select(ChatMessage)
                .where(ChatMessage.session_id == session_id)
                .order_by(ChatMessage.created_at.desc())
                .limit(50)
            )
            messages = result.scalars().all()

            # Chronological order, exclude current message
            all_msgs = [{"role": m.role, "content": m.content} for m in reversed(messages)][:-1]

            # Token-budget truncation: keep most recent within budget
            total_chars = 0
            for msg in reversed(all_msgs):
                msg_chars = len(msg.get("content", ""))
                if total_chars + msg_chars > _MAX_HISTORY_CHARS:
                    break
                chat_history.insert(0, msg)
                total_chars += msg_chars

            context_engine = ContextEngine(ctx_db)
            context = await context_engine.get_user_context(user_id=user_id, focus=content)
            await ctx_db.commit()
    except Exception:
        logger.exception("context_building_failed", session_id=session_id)
        context, chat_history = {}, []

    # ── 3. Stream AI response ────────────────────────────────────────────
    is_comparison = compare and models and len(models) >= 2

    try:
        if is_comparison:
            sr = await _stream_comparison_mode(
                content=content,
                user_id=user_id,
                session_id=session_id,
                channel=channel,
                model_a=models[0],
                model_b=models[1],
                mode=mode,
                context=context,
                chat_history=chat_history,
            )
        else:
            orchestrator = get_orchestrator()
            _ib = image_bytes if image_bytes else None
            logger.info(
                "stream_handoff",
                session_id=session_id,
                attachment_ids=attachment_ids,
                image_bytes_count=len(image_bytes) if image_bytes else 0,
                image_bytes_sizes=[len(b) for b in image_bytes] if image_bytes else [],
                passing_images=_ib is not None,
            )
            sr = await stream_and_broadcast(
                orchestrator=orchestrator,
                message=content,
                user_id=user_id,
                session_id=session_id,
                channel=channel,
                chat_history=chat_history,
                context=context,
                mode_id=mode,
                image_bytes=_ib,
            )

        # ── 4. Persist assistant message ─────────────────────────────────
        await _save_assistant_message(
            session_id=session_id,
            user_id=user_id,
            user_message=user_message,
            content=content,
            channel=channel,
            sr=sr,
            is_comparison=is_comparison,
            models=models,
            chat_session=chat_session,
        )

    except Exception as e:
        logger.exception("chat_message_error", session_id=session_id)
        await channel_manager.broadcast_to_user_channel(
            user_id=user_id,
            channel=channel,
            event="error",
            data={"code": "generation_error", "message": str(e)},
        )


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------


async def _stream_comparison_mode(
    *,
    content: str,
    user_id: int,
    session_id: int,
    channel: str,
    model_a: str,
    model_b: str,
    mode: str,
    context: dict,
    chat_history: list,
):
    """Run comparison streaming and return a StreamResult-like object."""
    from app.api.websockets.core.streaming import StreamResult

    content_a, content_b = "", ""
    thinking_a, thinking_b = "", ""

    async for chunk in stream_comparison(
        message=content,
        user_id=user_id,
        session_id=session_id,
        model_a=model_a,
        model_b=model_b,
        mode_id=mode,
        context=context,
        chat_history=chat_history,
    ):
        chunk_type = chunk.get("type", "token")
        chunk_data = chunk.get("data", {})
        slot = chunk_data.get("model_slot") or chunk.get("model_slot")

        await channel_manager.broadcast_to_user_channel(
            user_id=user_id,
            channel=channel,
            event=chunk_type,
            data={**chunk_data, "model_slot": slot},
        )

        if chunk_type == "token":
            text = chunk_data.get("text", "")
            if slot == "A":
                content_a += text
            elif slot == "B":
                content_b += text
        elif chunk_type == "thinking":
            text = chunk_data.get("text", "")
            if slot == "A":
                thinking_a += text
            elif slot == "B":
                thinking_b += text

    final_a = content_a or (f"<think>\n{thinking_a}\n</think>" if thinking_a else "")
    final_b = content_b or (f"<think>\n{thinking_b}\n</think>" if thinking_b else "")

    sr = StreamResult()
    sr.content = final_a
    sr.model_used = model_a
    sr.total_tokens = max(1, (len(final_a) + len(final_b)) // 4)
    sr.tool_calls = []
    # Stash comparison payload for persistence
    sr._comparison_metadata = {
        "comparison": {
            "model_a": {"key": model_a, "content": final_a},
            "model_b": {"key": model_b, "content": final_b},
        }
    }
    return sr


async def _save_assistant_message(
    *,
    session_id: int,
    user_id: int,
    user_message,
    content: str,
    channel: str,
    sr,
    is_comparison: bool,
    models: list | None,
    chat_session,
):
    """Persist the assistant message, generate embeddings, and maybe update title."""
    from app.modules.chat.interface import ChatSession, ChatMessage, MessageRole

    async with AsyncSessionLocal() as db:
        try:
            function_calls_data = None
            if is_comparison and hasattr(sr, "_comparison_metadata"):
                function_calls_data = sr._comparison_metadata
            elif sr.tool_calls:
                function_calls_data = {"calls": sr.tool_calls}

            assistant_message = ChatMessage(
                session_id=session_id,
                role=MessageRole.ASSISTANT,
                content=sr.final_content,
                tokens=sr.estimated_tokens,
                model_used=sr.model_used,
                function_calls=function_calls_data,
                grounding_sources=sr.grounding_sources,
            )
            db.add(assistant_message)

            # Update session token count
            result_session = await db.execute(select(ChatSession).where(ChatSession.id == session_id))
            session = result_session.scalar_one()
            session.total_tokens_used += user_message.tokens + assistant_message.tokens

            await db.commit()
            await db.refresh(assistant_message)

            # Generate embedding (non-blocking, failure is non-fatal)
            try:
                from app.services.search.chat_embedding import embed_assistant_message
                await embed_assistant_message(
                    db_session=db,
                    message_id=assistant_message.id,
                    content=sr.content or "",
                    parent_content=content,
                    session_title=chat_session.title if chat_session else None,
                )
                await db.commit()
            except Exception:
                logger.warning("chat_embedding_failed", message_id=assistant_message.id)

            # Generate title on first exchange (non-blocking)
            try:
                from app.services.chat.title_generator import maybe_generate_title
                new_title = await maybe_generate_title(
                    session_id=session_id,
                    first_message=content,
                    first_response=sr.content or "",
                    db_session=db,
                )
                if new_title:
                    await channel_manager.broadcast_to_user_channel(
                        user_id=user_id,
                        channel=channel,
                        event="title_updated",
                        data={"session_id": session_id, "title": new_title},
                    )
            except Exception:
                logger.warning("title_generation_failed", session_id=session_id)

        except Exception:
            logger.exception("failed_to_save_assistant_message", session_id=session_id)
            await db.rollback()
