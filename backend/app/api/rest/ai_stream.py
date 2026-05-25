"""
Chat AI Streaming — Vercel AI SDK SSE Endpoints.

Provides Server-Sent Events streaming endpoints that speak the Vercel AI SDK
UI Message Stream Protocol (v1). These endpoints work alongside the existing
WebSocket chat handlers — they do NOT replace them.

Frontend hooks:
    - `useChat({ api: '/api/v1/chat/sessions/{id}/stream' })` for main chat
    - `useChat({ api: '/api/v1/chat/assistant/stream' })` for dashboard assistant
"""

import os
from typing import List, Optional

import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user
from app.core.ai.streaming.vercel_protocol import (
    create_vercel_sse_generator,
    VERCEL_SSE_HEADERS,
)
from app.db.session import AsyncSessionLocal
from app.models.user import User

logger = structlog.get_logger(__name__)

router = APIRouter()


# ── Token budget for chat history (~4k tokens ≈ 16k chars) ──────────────
_MAX_HISTORY_CHARS = 16_000


# ── Request Schemas ─────────────────────────────────────────────────────


class VercelMessagePart(BaseModel):
    """A single part in a Vercel AI SDK v6 UIMessage."""

    type: str = Field(..., description="Part type: 'text', 'reasoning', 'tool-invocation', etc.")
    text: Optional[str] = Field(None, description="Text content (for text/reasoning parts)")

    class Config:
        extra = "allow"  # SDK sends additional fields per part type


class VercelChatMessage(BaseModel):
    """
    Vercel AI SDK v6 UIMessage format.

    SDK native: { id, role, parts: [{type:'text', text:'Hello'}], createdAt, metadata }
    Curl compat: { role, content: 'Hello' }
    """

    role: str = Field(..., description="Message role: 'user', 'assistant', or 'system'")
    parts: Optional[List[VercelMessagePart]] = Field(None, description="SDK v6 message parts")
    content: Optional[str] = Field(None, description="Legacy content string (curl compat)")
    id: Optional[str] = Field(None, description="SDK-assigned message ID")

    class Config:
        extra = "allow"  # SDK sends createdAt, metadata, etc.

    @property
    def text(self) -> str:
        """Extract plain text — prefers parts (SDK native), falls back to content (legacy)."""
        if self.parts:
            return "".join(
                p.text or "" for p in self.parts if p.type in ("text", "reasoning")
            )
        return self.content or ""


class ChatStreamRequest(BaseModel):
    """
    Request body for the chat streaming endpoint.

    Accepts the SDK v6 UIMessage format with parts array.
    Extra body fields from DefaultChatTransport.body are merged in.
    """

    messages: List[VercelChatMessage] = Field(
        ..., description="Conversation messages (SDK v6 UIMessage format)"
    )
    model_id: Optional[str] = Field(None, description="Model key override")
    mode: str = Field("socratic", description="AI mode (socratic, direct, deep_dive, creative)")
    branch_id: Optional[int] = Field(None, description="Branch ID for branched conversations")
    thread_id: Optional[int] = Field(None, description="Thread ID — routes message to a thread")
    attachment_ids: Optional[List[int]] = Field(None, description="Document IDs attached to message")
    # Card Tutor: when set, every message in this stream is anchored to this card
    card_id: Optional[int] = Field(None, description="Flashcard ID for Card Tutor sessions")

    class Config:
        extra = "allow"  # SDK transport may send additional fields


class AssistantStreamRequest(BaseModel):
    """Request body for the dashboard assistant streaming endpoint."""

    messages: List[VercelChatMessage] = Field(
        ..., description="Conversation messages"
    )
    content: Optional[str] = Field(None, description="Shortcut: single message content")

    class Config:
        extra = "allow"


# ── Main Chat Stream Endpoint ───────────────────────────────────────────


@router.post(
    "/sessions/{session_id}/stream",
    summary="Stream chat response (Vercel AI SDK)",
    description=(
        "Stream an AI response using the Vercel AI SDK UI Message Stream Protocol. "
        "Designed to be consumed by `useChat` from `@ai-sdk/react`."
    ),
    tags=["Chat Streaming"],
)
async def stream_chat_message(
    session_id: int,
    request: ChatStreamRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Stream an AI chat response via Server-Sent Events.

    This endpoint mirrors the logic from the WebSocket chat handler
    (handle_chat_message) but outputs via HTTP SSE instead of WS broadcast.

    Flow:
        1. Validate session ownership
        2. Save user message to DB
        3. Build context & chat history
        4. Stream orchestrator output as Vercel protocol SSE
        5. After stream completes, persist assistant message
    """
    from app.modules.chat.interface import ChatSession, ChatMessage, MessageRole
    from app.core.context.engine import ContextEngine
    from app.core.ai.orchestrator import get_orchestrator

    # ── 1. Extract the latest user message ──────────────────────────────
    if not request.messages:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Messages array cannot be empty",
        )

    # The last message in the array is the new user message
    last_message = request.messages[-1]
    if last_message.role != "user":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Last message must be from the user",
        )
    user_content = last_message.text  # .text extracts from parts or content

    # ── 2. Verify session & save user message ───────────────────────────
    try:
        result = await db.execute(
            select(ChatSession).where(
                and_(
                    ChatSession.id == session_id,
                    ChatSession.user_id == current_user.id,
                    ChatSession.deleted_at.is_(None),
                )
            )
        )
        chat_session = result.scalar_one_or_none()
        if not chat_session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chat session not found or access denied",
            )

        # Load attachment metadata
        image_bytes: list[bytes] = []
        attachments_jsonb = None

        if request.attachment_ids:
            from app.models.document import Document

            doc_result = await db.execute(
                select(Document).where(
                    and_(
                        Document.id.in_(request.attachment_ids),
                        Document.user_id == current_user.id,
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

                mime = (doc.mime_type or "").lower()
                if mime.startswith("image/"):
                    file_path = doc.file_path
                    if not os.path.isabs(file_path):
                        from app.core.config import settings
                        data_dir = getattr(settings, "DATA_DIR", "data")
                        file_path = os.path.join(data_dir, file_path)
                    try:
                        with open(file_path, "rb") as f:
                            image_bytes.append(f.read())
                    except FileNotFoundError:
                        logger.warning(
                            "attachment_file_not_found",
                            document_id=doc.id,
                            path=file_path,
                        )

        # Save user message
        user_message = ChatMessage(
            session_id=session_id,
            role=MessageRole.USER,
            content=user_content,
            tokens=max(1, len(user_content) // 4),
            attachments=attachments_jsonb,
            thread_id=request.thread_id,
            card_id=request.card_id,
        )
        db.add(user_message)
        await db.commit()
        await db.refresh(user_message)

    except HTTPException:
        raise
    except Exception:
        logger.exception("failed_to_save_user_message_sse", session_id=session_id)
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save message",
        )

    # ── 3. Build context & chat history ─────────────────────────────────
    context: dict = {}
    chat_history: list = []

    try:
        from app.core.ai.agents.messages import message_from_db_row

        async with AsyncSessionLocal() as ctx_db:
            result = await ctx_db.execute(
                select(ChatMessage)
                .where(ChatMessage.session_id == session_id)
                .order_by(ChatMessage.created_at.desc())
                .limit(50)
            )
            messages = result.scalars().all()

            # Build typed chat history via from_db_row, then serialize for the
            # orchestrator (which passes chat_history as list[dict] to agents).
            all_rows = [
                {
                    "role": m.role,
                    "content": m.content,
                    "model_used": m.model_used,
                    "tokens": m.tokens,
                    "function_calls": m.function_calls,
                    "grounding_sources": m.grounding_sources,
                }
                for m in reversed(messages)
            ][:-1]  # Exclude current message

            total_chars = 0
            for row in reversed(all_rows):
                msg_chars = len(row.get("content", ""))
                if total_chars + msg_chars > _MAX_HISTORY_CHARS:
                    break
                typed_msg = message_from_db_row(row)
                chat_history.insert(0, typed_msg.to_litellm())
                total_chars += msg_chars

            context_engine = ContextEngine(ctx_db)
            context = await context_engine.get_user_context(
                user_id=current_user.id, focus=user_content
            )

            # ── Card Tutor context injection ───────────────────────────────
            # When card_id is set, prepend the card's Socratic system prompt
            # to the context so the orchestrator stays focused on that concept.
            if request.card_id:
                try:
                    from app.services.flashcards.card_tutor_service import CardTutorService
                    from app.models.flashcard import Flashcard as _Flashcard
                    from app.models.deck import Deck as _Deck
                    from sqlalchemy import and_ as _and

                    card_res = await ctx_db.execute(
                        select(_Flashcard).where(
                            _and(_Flashcard.id == request.card_id, _Flashcard.deleted_at.is_(None))
                        )
                    )
                    _card = card_res.scalar_one_or_none()
                    _deck = None
                    if _card and _card.deck_id:
                        deck_res = await ctx_db.execute(
                            select(_Deck).where(_Deck.id == _card.deck_id)
                        )
                        _deck = deck_res.scalar_one_or_none()

                    if _card:
                        tutor_svc = CardTutorService(ctx_db)
                        card_ctx = tutor_svc.get_card_tutor_context(_card, _deck)
                        context["card_tutor_system"] = card_ctx
                        context["card_id"] = request.card_id
                        logger.info(
                            "card_tutor_context_injected",
                            card_id=request.card_id,
                            session_id=session_id,
                        )
                except Exception:
                    logger.warning("card_tutor_context_injection_failed", card_id=request.card_id)
            # ──────────────────────────────────────────────────────────────

            # ── Card Designer context injection ────────────────────────────
            # When session.source == 'card_designer', inject the enriched
            # system prompt stored in context_modules at session creation time.
            # The context injection middleware (context_injection.py) will then
            # use it as the dominant system prompt — same pattern as card_tutor.
            try:
                _session_res = await ctx_db.execute(
                    select(ChatSession).where(ChatSession.id == session_id)
                )
                _chat_session = _session_res.scalar_one_or_none()
                if (
                    _chat_session
                    and getattr(_chat_session, "source", None) == "card_designer"
                ):
                    _modules = getattr(_chat_session, "context_modules", None) or {}
                    _designer_prompt = _modules.get("system_prompt", "")
                    if _designer_prompt:
                        context["card_designer_system"] = _designer_prompt
                        logger.info(
                            "card_designer_context_injected",
                            session_id=session_id,
                            prompt_chars=len(_designer_prompt),
                        )
            except Exception:
                logger.warning("card_designer_context_injection_failed", session_id=session_id)
            # ──────────────────────────────────────────────────────────────

            # ── @Mention hydration ─────────────────────────────────────────
            # Parse @[title](entity:type:id) mentions from the user's message,
            # resolve them via the platform registry, hydrate their content,
            # and inject HydrationResult into context for the middleware.
            # The entire step is wrapped in a 500ms timeout — on failure the
            # stream continues without referenced content (fail-open).
            from app.core.ai.mentions import MentionResolver, ContentHydrator
            import asyncio as _asyncio

            _resolver = MentionResolver()
            _hydration_result = None
            _parsed_mentions = _resolver.parse(user_content)

            if _parsed_mentions:
                try:
                    _resolved_mentions = await _asyncio.wait_for(
                        _resolver.resolve_all(_parsed_mentions, ctx_db, current_user.id),
                        timeout=0.5,
                    )

                    _hydrator = ContentHydrator()
                    _hydration_result = await _asyncio.wait_for(
                        _hydrator.hydrate_all(
                            resolved_mentions=_resolved_mentions,
                            parsed_mentions=_parsed_mentions,
                            db=ctx_db,
                            user_id=current_user.id,
                            user_message=user_content,
                            mode_id=request.mode or "direct",
                        ),
                        timeout=0.5,
                    )

                    context["hydration_result"] = _hydration_result

                    logger.info(
                        "mention_hydration_complete",
                        session_id=session_id,
                        parsed=len(_parsed_mentions),
                        injected=len(_hydration_result.injected),
                        resolution_failures=len(_hydration_result.resolution_failures),
                        budget_overflows=len(_hydration_result.budget_overflows),
                        stale_fallbacks=_hydration_result.stale_fallbacks,
                    )

                except _asyncio.TimeoutError:
                    logger.warning("mention_hydration_timeout", session_id=session_id)
                except Exception:
                    logger.exception("mention_hydration_error", session_id=session_id)
            # ──────────────────────────────────────────────────────────────

            await ctx_db.commit()
    except Exception:
        logger.exception("context_building_failed_sse", session_id=session_id)
        context, chat_history = {}, []

    # ── 4. Create orchestrator stream ───────────────────────────────────
    orchestrator = get_orchestrator()
    _ib = image_bytes if image_bytes else None

    logger.info(
        "sse_stream_started",
        session_id=session_id,
        user_id=current_user.id,
        mode=request.mode,
        model_id=request.model_id,
        attachment_count=len(request.attachment_ids or []),
        image_count=len(image_bytes),
    )

    # Card Tutor: override to the dedicated tutor alias (gemma4:31b-cloud primary,
    # Gemini Flash fallback). The mode is already "socratic" which maps to
    # synapse-tutor, but an explicit override ensures correctness even if the
    # frontend sends a different mode. We use the ALIAS, not the raw model ID.
    from app.core.ai.providers.litellm_router import REGISTRY_KEY_TO_ALIAS
    effective_model = request.model_id or (
        REGISTRY_KEY_TO_ALIAS.get("gemma4_31b") if request.card_id else None
    )

    orchestrator_stream = orchestrator.handle_message_stream(
        message=user_content,
        user_id=current_user.id,
        session_id=session_id,
        chat_history=chat_history,
        context=context,
        mode_id=request.mode,
        model_override=effective_model,
        image_bytes=_ib,
    )

    # ── 5. Stream via Vercel protocol, persist after ─────────────────────
    sse_generator, accumulator = create_vercel_sse_generator(orchestrator_stream)

    async def _stream_and_persist():
        """Yield SSE events, then persist the assistant message after stream ends."""
        # Emit mention status as the FIRST event so the frontend can update
        # mention chip states before any text starts streaming.
        # Only emitted when the user actually had @mentions in their message.
        if _parsed_mentions and _hydration_result:
            import json as _json
            payload = _hydration_result.to_sse_payload()
            yield f"data: {_json.dumps({'type': 'data-mention-status', 'data': payload})}\n\n"

        async for event in sse_generator:
            yield event

        # ── Post-stream persistence (runs after client receives all events) ──
        try:
            from app.core.ai.agents.messages import AIMessage as TypedAIMessage

            async with AsyncSessionLocal() as persist_db:
                # StreamAccumulator → typed AIMessage → DB row
                # Clean separation: accumulator handles streaming,
                # AIMessage handles persistence semantics.
                ai_msg = TypedAIMessage(
                    content=accumulator.final_content,
                    tool_calls=accumulator.tool_calls or None,
                    model_used=accumulator.model_used or None,
                    tokens=accumulator.estimated_tokens,
                    grounding_sources=(
                        accumulator.grounding_sources.get("sources")
                        if isinstance(accumulator.grounding_sources, dict)
                        else None
                    ),
                )
                db_fields = ai_msg.to_db_row()

                assistant_message = ChatMessage(
                    session_id=session_id,
                    role=MessageRole.ASSISTANT,
                    content=db_fields["content"],
                    tokens=db_fields["tokens"],
                    model_used=db_fields["model_used"],
                    function_calls=db_fields["function_calls"],
                    grounding_sources=db_fields["grounding_sources"],
                    thread_id=request.thread_id,
                    card_id=request.card_id,  # Card Tutor anchor
                )

                persist_db.add(assistant_message)

                # Update session token count
                result_session = await persist_db.execute(
                    select(ChatSession).where(ChatSession.id == session_id)
                )
                session = result_session.scalar_one()
                session.total_tokens_used += user_message.tokens + assistant_message.tokens

                await persist_db.commit()
                await persist_db.refresh(assistant_message)

                # Generate embedding (non-blocking, failure is non-fatal)
                try:
                    from app.services.search.chat_embedding import embed_assistant_message

                    await embed_assistant_message(
                        db_session=persist_db,
                        message_id=assistant_message.id,
                        content=accumulator.content or "",
                        parent_content=user_content,
                        session_title=chat_session.title if chat_session else None,
                    )
                    await persist_db.commit()
                except Exception:
                    logger.warning("chat_embedding_failed_sse", message_id=assistant_message.id)

                # Generate title on first exchange
                try:
                    from app.services.chat.title_generator import maybe_generate_title

                    new_title = await maybe_generate_title(
                        session_id=session_id,
                        first_message=user_content,
                        first_response=accumulator.content or "",
                        db_session=persist_db,
                    )
                    if new_title:
                        logger.info(
                            "sse_title_generated",
                            session_id=session_id,
                            title=new_title,
                        )
                except Exception:
                    logger.warning("title_generation_failed_sse", session_id=session_id)

                logger.info(
                    "sse_stream_persisted",
                    session_id=session_id,
                    content_length=len(accumulator.content),
                    tokens=accumulator.estimated_tokens,
                    model=accumulator.model_used,
                    agent=accumulator.agent_used,
                    tool_count=len(accumulator.tool_calls),
                    grounded=ai_msg.grounding_sources is not None,
                    success=accumulator.success,
                )

        except Exception:
            logger.exception("failed_to_persist_sse_message", session_id=session_id)

    return StreamingResponse(
        _stream_and_persist(),
        media_type="text/event-stream",
        headers=VERCEL_SSE_HEADERS,
    )


# ── Dashboard Assistant Stream Endpoint ─────────────────────────────────


@router.post(
    "/assistant/stream",
    summary="Stream dashboard assistant response (Vercel AI SDK)",
    description=(
        "Stream an AI response from the dashboard assistant. "
        "Uses the same Vercel protocol consumed by `useChat`."
    ),
    tags=["Chat Streaming"],
)
async def stream_assistant_message(
    request: AssistantStreamRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Stream a dashboard assistant response via SSE.

    The dashboard assistant has broader system context but doesn't persist
    to a standard chat session. It uses a transient session internally.
    """
    from app.core.ai.orchestrator import get_orchestrator

    # Extract user content
    if request.content:
        user_content = request.content
    elif request.messages:
        last_message = request.messages[-1]
        user_content = last_message.text
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either 'content' or 'messages' must be provided",
        )

    logger.info("sse_assistant_stream_started", user_id=current_user.id)

    orchestrator = get_orchestrator()
    orchestrator_stream = orchestrator.handle_message_stream(
        message=user_content,
        user_id=current_user.id,
        session_id=0,  # Dashboard uses transient session
        mode_id="direct",
        chat_history=[
            {"role": m.role, "content": m.content}
            for m in (request.messages or [])[:-1]
        ],
    )

    sse_generator, accumulator = create_vercel_sse_generator(orchestrator_stream)

    return StreamingResponse(
        sse_generator,
        media_type="text/event-stream",
        headers=VERCEL_SSE_HEADERS,
    )
