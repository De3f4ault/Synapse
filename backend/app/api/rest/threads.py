"""
Chat Threads REST API endpoints.

Thread = Topic Isolation
- Threads partition context within a session
- They represent "new lines of inquiry"
- Messages in threads do NOT inherit future context from main conversation

INVARIANT: Threads and Branches are MUTUALLY EXCLUSIVE.
- If thread_id IS NOT NULL → parent_message_id MUST BE NULL
- If parent_message_id IS NOT NULL → thread_id MUST BE NULL

Mental model: "Let's park this and talk about X"
UX: Grok-style slide-out panel
"""

from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
import structlog

from app.api.deps import get_db, get_current_user
from app.models.user import User

# Chat models from module interface (temporary migration)
from app.modules.chat.interface import ChatSession, ChatThread, ChatMessage, MessageRole
from app.schemas.chat import (
    ThreadCreate,
    ThreadUpdate,
    ThreadResponse,
    ThreadListResponse,
    ThreadMessageCreate,
)
from app.schemas.chat import ChatMessageResponse

logger = structlog.get_logger(__name__)
router = APIRouter()


# ============================================================================
# Helper Functions
# ============================================================================


async def verify_session_ownership(
    session_id: int,
    user_id: int,
    db: AsyncSession,
) -> ChatSession:
    """Verify user owns the session."""
    result = await db.execute(
        select(ChatSession).where(
            and_(
                ChatSession.id == session_id,
                ChatSession.user_id == user_id,
                ChatSession.deleted_at.is_(None),
            )
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return session


async def get_thread_or_404(
    thread_id: int,
    user_id: int,
    db: AsyncSession,
) -> ChatThread:
    """Get thread and verify ownership via session."""
    result = await db.execute(
        select(ChatThread)
        .join(ChatSession, ChatThread.session_id == ChatSession.id)
        .where(
            and_(
                ChatThread.id == thread_id,
                ChatSession.user_id == user_id,
                ChatSession.deleted_at.is_(None),
            )
        )
    )
    thread = result.scalar_one_or_none()
    if not thread:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found")
    return thread


def thread_to_response(thread: ChatThread) -> ThreadResponse:
    """Convert ChatThread model to response schema."""
    return ThreadResponse(
        id=thread.id,
        session_id=thread.session_id,
        created_from_message_id=thread.created_from_message_id,
        title=thread.title,
        summary=thread.summary,
        message_count=thread.message_count,
        created_at=thread.created_at,
        updated_at=thread.updated_at,
    )


# ============================================================================
# Endpoints - Thread CRUD
# ============================================================================


@router.get(
    "/sessions/{session_id}/threads",
    response_model=ThreadListResponse,
    summary="List threads in session",
    description="Get all threads for a chat session",
)
async def list_threads(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all threads in a session."""
    # Verify session ownership
    await verify_session_ownership(session_id, current_user.id, db)

    # Get threads
    result = await db.execute(
        select(ChatThread)
        .where(ChatThread.session_id == session_id)
        .order_by(ChatThread.created_at.desc())
    )
    threads = result.scalars().all()

    return ThreadListResponse(threads=[thread_to_response(t) for t in threads], total=len(threads))


@router.post(
    "/sessions/{session_id}/threads",
    response_model=ThreadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create thread",
    description="Start a new thread for topic isolation",
)
async def create_thread(
    session_id: int,
    data: ThreadCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new thread for topic isolation.

    This starts a focused discussion that doesn't pollute
    the main conversation's context.
    """
    # Verify session ownership
    await verify_session_ownership(session_id, current_user.id, db)

    # Validate root message if provided
    root_message = None
    if data.root_message_id:
        result = await db.execute(
            select(ChatMessage).where(
                and_(
                    ChatMessage.id == data.root_message_id,
                    ChatMessage.session_id == session_id,
                )
            )
        )
        root_message = result.scalar_one_or_none()
        if not root_message:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Root message not found in session"
            )

    # Generate title if not provided
    title = data.title
    if not title:
        if root_message:
            # Use first 50 chars of root message
            title = (
                root_message.content[:50] + "..."
                if len(root_message.content) > 50
                else root_message.content
            )
        else:
            title = f"Thread {datetime.now().strftime('%Y-%m-%d %H:%M')}"

    # Create thread
    thread = ChatThread(
        session_id=session_id,
        created_from_message_id=data.root_message_id,
        title=title,
    )
    db.add(thread)
    await db.commit()
    await db.refresh(thread)

    logger.info(
        "thread_created",
        thread_id=thread.id,
        session_id=session_id,
        user_id=current_user.id,
    )

    return thread_to_response(thread)


@router.get(
    "/threads/{thread_id}",
    response_model=ThreadResponse,
    summary="Get thread",
    description="Get a specific thread",
)
async def get_thread(
    thread_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific thread."""
    thread = await get_thread_or_404(thread_id, current_user.id, db)
    return thread_to_response(thread)


@router.patch(
    "/threads/{thread_id}",
    response_model=ThreadResponse,
    summary="Update thread",
    description="Update thread title or summary",
)
async def update_thread(
    thread_id: int,
    data: ThreadUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update thread metadata."""
    thread = await get_thread_or_404(thread_id, current_user.id, db)

    if data.title is not None:
        thread.title = data.title
    if data.summary is not None:
        thread.summary = data.summary

    await db.commit()
    await db.refresh(thread)

    return thread_to_response(thread)


@router.delete(
    "/threads/{thread_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete thread",
    description="Delete a thread and all its messages",
)
async def delete_thread(
    thread_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a thread and all its messages."""
    thread = await get_thread_or_404(thread_id, current_user.id, db)

    await db.delete(thread)
    await db.commit()

    logger.info(
        "thread_deleted",
        thread_id=thread_id,
        user_id=current_user.id,
    )


# ============================================================================
# Endpoints - Thread Messages
# ============================================================================


@router.get(
    "/threads/{thread_id}/messages",
    response_model=List[ChatMessageResponse],
    summary="Get thread messages",
    description="Get all messages in a thread",
)
async def get_thread_messages(
    thread_id: int,
    limit: int = Query(100, ge=1, le=500, description="Max messages"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get messages from a thread."""
    # Verify ownership and get thread
    await get_thread_or_404(thread_id, current_user.id, db)

    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.thread_id == thread_id)
        .order_by(ChatMessage.created_at.asc())
        .limit(limit)
    )
    messages = result.scalars().all()

    return [
        ChatMessageResponse(
            id=msg.id,
            session_id=msg.session_id,
            role=msg.role,
            content=msg.content,
            tokens=msg.tokens,
            model_used=msg.model_used,
            function_calls=msg.function_calls if isinstance(msg.function_calls, dict) else None,
            grounding_sources=msg.grounding_sources
            if isinstance(msg.grounding_sources, dict)
            else None,
            attachments=msg.attachments,
            created_at=msg.created_at,
        )
        for msg in messages
    ]


@router.post(
    "/threads/{thread_id}/messages",
    response_model=ChatMessageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Send thread message",
    description="Send a message in a thread (non-streaming)",
)
async def create_thread_message(
    thread_id: int,
    data: ThreadMessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a message in a thread.

    INVARIANT: thread_id is set, parent_message_id is NULL.
    This enforces mutual exclusivity with branches.
    """
    thread = await get_thread_or_404(thread_id, current_user.id, db)

    # Create user message
    # Note: parent_message_id is NULL (enforcing thread/branch exclusivity)
    message = ChatMessage(
        session_id=thread.session_id,
        thread_id=thread_id,
        parent_message_id=None,  # INVARIANT: threads don't use parent_message_id
        role=MessageRole.USER,
        content=data.content,
    )
    db.add(message)
    await db.commit()
    await db.refresh(message)

    # Build thread-scoped chat history for context
    thread_history = []
    try:
        history_result = await db.execute(
            select(ChatMessage)
            .where(ChatMessage.thread_id == thread_id)
            .order_by(ChatMessage.created_at.asc())
        )
        existing_messages = history_result.scalars().all()
        for msg in existing_messages:
            thread_history.append(
                {
                    "role": msg.role.value if hasattr(msg.role, "value") else str(msg.role),
                    "content": msg.content or "",
                }
            )
    except Exception as hist_error:
        logger.warning(
            "thread_history_build_failed",
            thread_id=thread_id,
            error=str(hist_error)[:100],
        )
        thread_history = []

    # Generate AI response through orchestrator
    try:
        from app.core.ai.orchestrator import get_orchestrator

        orchestrator = get_orchestrator()

        full_response = ""
        total_tokens = 0
        model_used = None

        async for chunk in orchestrator.handle_message_stream(
            message=data.content,
            user_id=current_user.id,
            session_id=thread.session_id,
            context={},
            chat_history=thread_history,
        ):
            chunk_type = chunk.get("type")

            if chunk_type == "token":
                full_response += chunk.get("text", "")
                model_used = chunk.get("model", model_used)
            elif chunk_type == "complete":
                metadata = chunk.get("metadata", {})
                total_tokens = metadata.get("total_tokens", 0)
                model_used = metadata.get("model_used", model_used)

        if not full_response:
            full_response = "I wasn't able to generate a response. Please try again."

        # Save assistant message in the thread
        assistant_message = ChatMessage(
            session_id=thread.session_id,
            thread_id=thread_id,
            parent_message_id=None,  # INVARIANT: threads don't use parent_message_id
            role=MessageRole.ASSISTANT,
            content=full_response,
            tokens=total_tokens or max(1, len(full_response) // 4),
            model_used=model_used,
        )
        db.add(assistant_message)
        await db.commit()
        await db.refresh(assistant_message)

        logger.info(
            "thread_ai_response_saved",
            thread_id=thread_id,
            message_id=assistant_message.id,
            tokens=assistant_message.tokens,
        )

        return ChatMessageResponse(
            id=assistant_message.id,
            session_id=assistant_message.session_id,
            role=assistant_message.role,
            content=assistant_message.content,
            tokens=assistant_message.tokens,
            model_used=assistant_message.model_used,
            function_calls=None,
            grounding_sources=None,
            attachments=assistant_message.attachments,
            created_at=assistant_message.created_at,
        )

    except Exception as ai_error:
        logger.error(
            "thread_ai_response_failed",
            thread_id=thread_id,
            error=str(ai_error),
            exc_info=True,
        )
        # Return the user message if AI generation fails
        return ChatMessageResponse(
            id=message.id,
            session_id=message.session_id,
            role=message.role,
            content=message.content,
            tokens=message.tokens,
            model_used=message.model_used,
            function_calls=None,
            grounding_sources=None,
            attachments=message.attachments,
            created_at=message.created_at,
        )
