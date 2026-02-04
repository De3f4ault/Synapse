"""
Chat Module — HTTP API Layer.

This module defines the REST API endpoints for the Chat functionality.
It acts as a thin interface layer that handles:
- Request validation and parsing
- Dependency injection (User, Database)
- Delegation to the ChatService for business logic
- Response formatting and error handling

Architecture:
    API Layer -> Service Layer -> Repository Layer -> Database

Usage:
    All routes are prefixed with /chat (configured in router.py).
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field
import structlog
import json
import uuid as uuid_lib

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.schemas.chat import (
    ChatSessionCreate,
    ChatSessionResponse,
    ChatMessageCreate,
    ChatMessageResponse,
)
from app.core.ai.providers.factory import get_provider
from app.core.ai.contracts.task import AITask
from app.core.ai.router import router as model_router

from .service import get_chat_service

logger = structlog.get_logger(__name__)
router = APIRouter()


# -----------------------------------------------------------------------------
# Request/Response Schemas
# -----------------------------------------------------------------------------


class ChatSessionUpdate(BaseModel):
    """Schema for updating a chat session."""

    title: str = Field(..., min_length=1, max_length=200, description="Session title")


class EditMessageRequest(BaseModel):
    """Schema for editing a message (triggering a branch)."""

    content: str = Field(..., min_length=1, max_length=5000, description="New message content")


class ConversationTreeResponse(BaseModel):
    """Schema for the full conversation tree structure."""

    session_id: int
    messages: List[ChatMessageResponse]
    branch_points: List[int] = Field(
        default_factory=list, description="Message IDs with multiple children"
    )


class AIModelResponse(BaseModel):
    """Schema for AI model information."""

    id: str
    name: str
    description: str
    capabilities: List[str]
    max_tokens: int
    supports_vision: bool
    supports_search: bool


class NotesMessageCreate(BaseModel):
    """Schema for notes AI message request."""

    content: str = Field(..., min_length=1, max_length=10000)


class ConversationSearchResult(BaseModel):
    """Schema for conversation search results."""

    session_id: int = Field(..., description="ID of the matching session")
    session_title: str = Field(..., description="Title of the session")
    match_type: str = Field(
        ..., description="Type of match: 'title', 'user_message', or 'assistant_message'"
    )
    matched_snippet: str = Field(..., description="Snippet containing the matched text")
    message_id: int | None = Field(None, description="ID of the matched message (if message match)")
    created_at: str = Field(..., description="ISO timestamp of the match")
    relevance_score: float = Field(1.0, description="Relevance score for ranking")


# -----------------------------------------------------------------------------
# Session Management Routes
# -----------------------------------------------------------------------------


@router.get(
    "/sessions",
    response_model=List[ChatSessionResponse],
    summary="List chat sessions",
    description="Retrieve user's chat sessions with pagination",
)
async def list_sessions(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List user's chat sessions.

    Optimized to use a single query for session retrieval to avoid N+1 issues.
    """
    service = get_chat_service(db)
    return await service.list_sessions(current_user.id, page=page, page_size=page_size)


@router.post(
    "/sessions",
    response_model=ChatSessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create chat session",
    description="Start a new chat session",
)
async def create_session(
    session_data: ChatSessionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new chat session."""
    service = get_chat_service(db)
    return await service.create_session(
        current_user.id,
        title=session_data.title,
        document_id=session_data.document_id,
        context_modules=session_data.context_modules,
    )


@router.get(
    "/sessions/{session_id}",
    response_model=ChatSessionResponse,
    summary="Get chat session",
    description="Retrieve a specific chat session by ID",
)
async def get_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get details of a specific chat session."""
    service = get_chat_service(db)
    result = await service.get_session(session_id, current_user.id)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return result


@router.patch(
    "/sessions/{session_id}",
    response_model=ChatSessionResponse,
    summary="Update chat session",
    description="Update session details (e.g., title)",
)
async def update_session(
    session_id: int,
    session_update: ChatSessionUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a chat session."""
    service = get_chat_service(db)
    result = await service.update_session_title(session_id, current_user.id, session_update.title)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return result


@router.delete(
    "/sessions/{session_id}",
    response_model=dict,
    summary="Delete chat session",
    description="Soft-delete a chat session",
)
async def delete_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete (archive) a chat session."""
    service = get_chat_service(db)
    deleted = await service.delete_session(session_id, current_user.id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return {"message": "Session deleted successfully"}


# -----------------------------------------------------------------------------
# Search Routes
# -----------------------------------------------------------------------------


@router.get(
    "/search",
    response_model=List[ConversationSearchResult],
    summary="Search conversations",
    description="Search across session titles and message content using full-text search",
)
async def search_conversations(
    query: str = Query(..., min_length=1, max_length=200, description="Search query"),
    limit: int = Query(20, ge=1, le=100, description="Maximum results to return"),
    include_messages: bool = Query(True, description="Include message content matches"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[ConversationSearchResult]:
    """
    Search across session titles and message content.

    Results are ranked by relevance:
    1. Title matches (highest priority)
    2. Recent message matches
    3. Older message matches

    Uses PostgreSQL full-text search for queries >= 3 chars, ILIKE fallback otherwise.
    """
    from .internal.repository import ChatSessionRepository, ChatMessageRepository
    from .internal.models import MessageRole

    session_repo = ChatSessionRepository(db)
    message_repo = ChatMessageRepository(db)

    results: List[ConversationSearchResult] = []
    seen_sessions: set[int] = set()

    # 1. Search session titles (highest priority)
    title_matches = await session_repo.search_sessions(current_user.id, query, limit=limit)
    for session, score in title_matches:
        if session.id not in seen_sessions:
            seen_sessions.add(session.id)
            results.append(
                ConversationSearchResult(
                    session_id=session.id,
                    session_title=session.title,
                    match_type="title",
                    matched_snippet=session.title[:200],
                    message_id=None,
                    created_at=session.created_at.isoformat(),
                    relevance_score=score * 2.0,  # Boost title matches
                )
            )

    # 2. Search message content
    if include_messages:
        message_limit = limit - len(results) if len(results) < limit else limit // 2
        message_matches = await message_repo.search_messages(
            current_user.id, query, limit=message_limit
        )
        for message, session, score in message_matches:
            if session.id not in seen_sessions:
                seen_sessions.add(session.id)
                match_type = (
                    "user_message" if message.role == MessageRole.USER else "assistant_message"
                )
                # Create snippet around match
                content = message.content or ""
                snippet = content[:300] + "..." if len(content) > 300 else content

                results.append(
                    ConversationSearchResult(
                        session_id=session.id,
                        session_title=session.title,
                        match_type=match_type,
                        matched_snippet=snippet,
                        message_id=message.id,
                        created_at=message.created_at.isoformat(),
                        relevance_score=score,
                    )
                )

    # Sort by relevance score descending
    results.sort(key=lambda r: r.relevance_score, reverse=True)

    return results[:limit]


# -----------------------------------------------------------------------------
# Message Management Routes
# -----------------------------------------------------------------------------


@router.get(
    "/sessions/{session_id}/messages",
    response_model=List[ChatMessageResponse],
    summary="Get chat messages",
    description="Retrieve messages from a chat session",
)
async def get_messages(
    session_id: int,
    limit: int = Query(100, ge=1, le=500, description="Max messages to return"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get messages for a session, ordered by creation time."""
    service = get_chat_service(db)
    result = await service.get_messages(session_id, current_user.id, limit=limit)
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return result


@router.post(
    "/sessions/{session_id}/messages",
    response_model=ChatMessageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Send chat message",
    description="Send a message and get an AI response (non-streaming)",
)
async def send_message(
    session_id: int,
    message_data: ChatMessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Send a user message and receive an AI response.

    This endpoint orchestrates:
    1. Saving the user message.
    2. Calling the AI orchestrator.
    3. Saving and returning the AI response.
    """
    service = get_chat_service(db)
    try:
        result = await service.send_message_with_ai(
            session_id, current_user.id, message_data.content
        )
        if result is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
        return result
    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process message: {str(e)}",
        )


@router.delete(
    "/messages/{message_id}",
    response_model=dict,
    summary="Delete message",
    description="Delete a specific message",
)
async def delete_message(
    message_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a specific message."""
    service = get_chat_service(db)
    success = await service.delete_message(message_id, current_user.id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
    return {"message": "Message deleted successfully"}


@router.post(
    "/messages/{message_id}/regenerate",
    response_model=ChatMessageResponse,
    summary="Regenerate message",
    description="Regenerate the last AI response",
)
async def regenerate_message(
    message_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Regenerate an AI response for a specific message context."""
    service = get_chat_service(db)
    try:
        result = await service.regenerate_message(message_id, current_user.id)
        if result is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Message not found or not an assistant message",
            )
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to regenerate message: {str(e)}",
        )


@router.post(
    "/messages/{message_id}/edit",
    response_model=List[ChatMessageResponse],
    summary="Edit message (creates branch)",
    description="Edit a user message. This creates a new conversation branch.",
)
async def edit_message(
    message_id: int,
    edit_data: EditMessageRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Edit a user message.

    Instead of overwriting, this operation:
    1. Creates a new version of the user message (branching).
    2. Generates a new AI response for the new context.
    3. Returns the new message pair.
    """
    service = get_chat_service(db)
    try:
        result = await service.edit_message_with_branch(
            message_id, current_user.id, edit_data.content
        )
        if result is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Message not found or not a user message",
            )
        return result
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to edit message: {str(e)}",
        )


# -----------------------------------------------------------------------------
# Branching & History Routes
# -----------------------------------------------------------------------------


@router.get(
    "/sessions/{session_id}/tree",
    response_model=ConversationTreeResponse,
    summary="Get conversation tree",
    description="Retrieve the full conversation tree including all branches",
)
async def get_conversation_tree(
    session_id: int,
    include_inactive: bool = Query(False, description="Include inactive (archived) branches"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get the full conversation tree structure.

    Returns all messages and identifies branch points where the conversation diverged.
    """
    service = get_chat_service(db)
    result = await service.get_conversation_tree(session_id, current_user.id, include_inactive)
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return result


@router.post(
    "/messages/{message_id}/switch-branch",
    response_model=dict,
    summary="Switch active branch",
    description="Switch the active conversation path to a different branch",
)
async def switch_branch(
    message_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Switch the active conversation branch.

    This activates the target message and its descendants while deactivating
    sibling branches.
    """
    service = get_chat_service(db)
    result = await service.switch_branch(message_id, current_user.id)
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
    return {"message": "Branch switched successfully", "active_message_id": result}


# -----------------------------------------------------------------------------
# Extras: Export, Models, Dashboard, Notes
# -----------------------------------------------------------------------------


@router.get(
    "/sessions/{session_id}/export",
    summary="Export conversation",
    description="Export conversation history as JSON or Markdown",
)
async def export_conversation(
    session_id: int,
    format: str = Query("json", pattern="^(json|markdown)$", description="Export format"),
    include_full_tree: bool = Query(False, description="Include all branches (not just active)"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Export conversation history.

    Supports JSON (machine-readable) and Markdown (human-readable) formats.
    """
    service = get_chat_service(db)
    result = await service.export_conversation(
        session_id, current_user.id, format, include_full_tree
    )
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    return Response(
        content=result["content"],
        media_type=result["media_type"],
        headers={"Content-Disposition": f'attachment; filename="{result["filename"]}"'},
    )


@router.get(
    "/models",
    response_model=List[AIModelResponse],
    summary="List AI models",
    description="Get list of available AI models",
)
async def list_models(db: AsyncSession = Depends(get_db)):
    """List all available AI models and their capabilities."""
    service = get_chat_service(db)
    models = service.get_ai_models()
    return [AIModelResponse(**m) for m in models]


@router.post(
    "/sessions/dashboard/message",
    response_model=ChatMessageResponse,
    summary="Dashboard Orchestrator Message",
    description="Send message to dashboard orchestrator with full system access",
)
async def send_dashboard_message(
    message_data: ChatMessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Send a message to the Dashboard Orchestrator.

    The Dashboard Orchestrator has broader access to system tools and context
    than the standard chat agent.
    """
    service = get_chat_service(db)
    try:
        return await service.send_dashboard_message(current_user.id, message_data.content)
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Dashboard AI error: {str(e)}",
        )


@router.post(
    "/sessions/notes/message",
    response_model=ChatMessageResponse,
    summary="Notes AI Message",
    description="Send message to Notes AI for text editing assistance",
)
async def send_notes_message(
    message_data: NotesMessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Send a message to the Notes specific AI agent."""
    service = get_chat_service(db)
    try:
        return await service.send_notes_message(current_user.id, message_data.content)
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Notes AI error: {str(e)}",
        )


@router.post(
    "/sessions/notes/stream",
    summary="Notes AI Streaming",
    description="Stream AI response for notes text editing with Server-Sent Events",
)
async def stream_notes_message(
    message_data: NotesMessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Stream AI response for notes editor using Server-Sent Events (SSE).

    This endpoint bypasses the standard service layer return type to provide
    a streaming response directly to the client.
    """

    async def generate_sse():
        try:
            logger.info("notes_stream_started", user_id=current_user.id)

            # Route to best provider
            routing = model_router.route(task=AITask.GENERAL_ASSISTANCE)
            provider = get_provider(routing.provider)
            model_id = routing.model_id

            block_id = str(uuid_lib.uuid4())[:8]

            # Send message-start event
            yield f"data: {json.dumps({'type': 'message-start', 'id': block_id})}\n\n"

            full_text = ""
            async for chunk in provider.stream_with_tools(
                prompt=message_data.content,
                tools=[],
                model=model_id,
                temperature=0.7,
            ):
                chunk_type = chunk.get("type", "")
                if chunk_type == "text":
                    text = chunk.get("content", "")
                    full_text += text
                    yield f"data: {json.dumps({'type': 'text-delta', 'textDelta': text})}\n\n"
                elif chunk_type == "error":
                    yield f"data: {json.dumps({'type': 'error', 'error': chunk.get('message', 'Unknown error')})}\n\n"

            # Send finish event
            yield f"data: {json.dumps({'type': 'finish', 'finishReason': 'stop'})}\n\n"

            logger.info(
                "notes_stream_completed", user_id=current_user.id, text_length=len(full_text)
            )

        except Exception as e:
            logger.error("notes_stream_error", user_id=current_user.id, error=str(e))
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        generate_sse(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "x-vercel-ai-ui-message-stream": "v1",
        },
    )
