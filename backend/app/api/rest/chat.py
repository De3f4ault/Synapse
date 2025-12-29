"""
Chat REST API endpoints.

Non-streaming chat sessions with AI agent integration.
For streaming, use WebSocket endpoint instead.

Complete implementation with TutorAgent integration and user context.

"""

from typing import List, Optional
from datetime import datetime
import json
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, delete, text
from pydantic import BaseModel, Field
import structlog
from app.core.ai.agents.factory import create_agent
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.chat_session import ChatSession
from app.models.chat_message import ChatMessage, MessageRole

logger = structlog.get_logger(__name__)
router = APIRouter()


# ============================================================================
# Schemas
# ============================================================================


class ChatSessionCreate(BaseModel):
    """Chat session creation."""

    title: Optional[str] = Field(None, max_length=500, description="Custom session title")
    document_id: Optional[int] = Field(None, description="Optional document for context")
    context_modules: Optional[List[str]] = Field(
        default_factory=lambda: ["flashcards", "notes"],
        description="Modules to include in context building",
    )


class ChatSessionUpdate(BaseModel):
    """Chat session update."""

    title: str = Field(..., min_length=1, max_length=200, description="Session title")


class ChatSessionResponse(BaseModel):
    """Chat session response."""

    id: int
    title: str
    document_id: Optional[int]
    message_count: int
    total_tokens: int
    created_at: datetime
    updated_at: datetime


class ChatMessageCreate(BaseModel):
    """Chat message creation."""

    content: str = Field(..., min_length=1, max_length=5000, description="Message content")


class ChatMessageResponse(BaseModel):
    """Chat message response."""

    id: int
    session_id: int
    role: MessageRole
    content: str
    tokens: int
    model_used: Optional[str]
    function_calls: Optional[dict] = None
    grounding_sources: Optional[dict] = None
    created_at: datetime
    # Branching fields
    parent_message_id: Optional[int] = None
    version: int = 1
    is_active: bool = True
    has_children: bool = False


# File upload response
class FileUploadResponse(BaseModel):
    """File upload response for chat."""

    id: str
    filename: str
    file_type: str
    file_size: int
    url: str
    preview_url: Optional[str] = None
    uploaded_at: datetime


# AI Model response
class AIModelResponse(BaseModel):
    """AI model information."""

    id: str
    name: str
    description: str
    capabilities: List[str]
    max_tokens: int
    supports_vision: bool
    supports_search: bool


# ============================================================================
# Helper Functions - Token Counting
# ============================================================================


def estimate_tokens(text: str) -> int:
    """
    Rough estimate of token count for text.

    Approximation: ~1 token per 4 characters (varies by model)
    More accurate token counting would use tiktoken library.

    Args:
        text: Text to count tokens for

    Returns:
        Estimated token count
    """
    return max(1, len(text) // 4)


# ============================================================================
# Helper Functions - AI Response Generation
# ============================================================================


async def generate_ai_response(
    message: str,
    user_id: int,
    session_id: int,
    context: Optional[dict] = None,
    db: Optional[AsyncSession] = None,
    chat_history: Optional[List[dict]] = None,
) -> dict:
    """
    Generate AI response using TutorAgent.

    Args:
        message: User message
        user_id: User ID for context
        session_id: Chat session ID
        context: Optional user learning context
        db: Database session

    Returns:
        dict with keys: output, model, tokens, function_calls, grounding_sources
    """
    try:
        from app.core.ai.agents.factory import AgentFactory
        from app.core.context.engine import ContextEngine

        # Build context if not provided
        if context is None and db:
            context_engine = ContextEngine(db)
            context = await context_engine.get_user_context(user_id=user_id, focus=message)

        # Create TutorAgent
        agent = await create_agent("tutor")

        # Execute agent with user message, context, and chat history
        result = await agent.execute(
            user_id=user_id, input=message, context=context or {}, chat_history=chat_history or []
        )

        # Extract response components from AgentResult dataclass
        if result.success:
            output = result.output
        else:
            output = result.error or "I apologize, but I couldn't generate a response."

        model = (
            result.metadata.get("model", "gemini-2.5-flash")
            if result.metadata
            else "gemini-2.5-flash"
        )
        tokens = result.total_tokens if result.total_tokens > 0 else estimate_tokens(output)

        #  Extract function calls and grounding sources from metadata
        function_calls = result.metadata.get("function_calls") if result.metadata else None
        grounding_sources = result.metadata.get("grounding_sources") if result.metadata else None

        logger.info(f"AI response generated for user {user_id}: {tokens} tokens")

        return {
            "output": output,
            "model": model,
            "tokens": tokens,
            "function_calls": function_calls,
            "grounding_sources": grounding_sources,
        }

    except Exception as e:
        logger.error(f"Error generating AI response: {str(e)}", exc_info=True)
        # Fallback response on error
        return {
            "output": f"I encountered an error processing your message: {str(e)}. Please try again.",
            "model": "error",
            "tokens": estimate_tokens(
                "I encountered an error processing your message. Please try again."
            ),
            "function_calls": None,
            "grounding_sources": None,
        }


# ============================================================================
# Conversation Search Endpoint
# ============================================================================


class ConversationSearchResult(BaseModel):
    """Search result for a conversation."""

    session_id: int
    session_title: str
    message_id: Optional[int] = None  # None for title-only matches
    message_role: str
    message_content: str
    message_snippet: str
    relevance_score: float
    match_type: str = "exact"  # exact, prefix, bm25, substring, fuzzy
    match_context: str = "title"  # title, user_message, assistant_message
    created_at: datetime


@router.get(
    "/search",
    response_model=List[ConversationSearchResult],
    summary="Search conversations",
    description="Production-grade full-text search with fuzzy matching",
)
async def search_conversations(
    q: str = Query(..., min_length=2, max_length=500, description="Search query"),
    limit: int = Query(20, ge=1, le=100, description="Max results"),
    include_inactive: bool = Query(False, description="Include inactive branch messages"),
    fuzzy: bool = Query(True, description="Enable fuzzy/substring matching"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Intelligent conversation search with 6-stage ranking:
    1. Exact title match (score: 10)
    2. Title prefix match (score: 8)
    3. BM25 full-word (score: 5+)
    4. Substring (score: 3/2)
    5. Fuzzy (word_similarity)

    Results include match_type and match_context for grouping.
    """
    try:
        result = await db.execute(
            text("""
                SELECT * FROM developer_schema.search_conversations_v3(
                    :user_id,
                    :query,
                    :limit,
                    :include_inactive
                )
                ORDER BY relevance_score DESC
            """),
            {
                "user_id": current_user.id,
                "query": q,
                "limit": limit,
                "include_inactive": include_inactive,
            },
        )

        rows = result.mappings().all()

        results = [
            ConversationSearchResult(
                session_id=row["session_id"],
                session_title=row["session_title"],
                message_id=row["message_id"],
                message_role=row["message_role"],
                message_content=row["message_content"],
                message_snippet=row["message_snippet"] or row["message_content"][:150],
                relevance_score=float(row["relevance_score"]) if row["relevance_score"] else 0.0,
                match_type=row["match_type"] or "exact",
                match_context=row["match_context"] or "title",
                created_at=row["created_at"],
            )
            for row in rows
        ]

        logger.info(
            f"Search '{q[:30]}' returned {len(results)} results (types: {set(r.match_type for r in results)})"
        )

        return results

    except Exception as e:
        logger.error(f"Conversation search error: {e}", exc_info=True)
        return []


@router.get(
    "/search/suggest",
    response_model=List[str],
    summary="Search suggestions",
    description="Get autocomplete suggestions based on conversation content",
)
async def search_suggestions(
    q: str = Query(..., min_length=1, max_length=100, description="Prefix to autocomplete"),
    limit: int = Query(10, ge=1, le=50, description="Max suggestions"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get autocomplete suggestions for the search box.
    Returns distinct words from user's conversations that match the prefix.
    """
    try:
        result = await db.execute(
            text("""
                WITH words AS (
                    SELECT DISTINCT 
                        unnest(string_to_array(lower(m.content), ' ')) as word
                    FROM developer_schema.chat_messages m
                    INNER JOIN developer_schema.chat_sessions s ON m.session_id = s.id
                    WHERE s.user_id = :user_id
                      AND s.deleted_at IS NULL
                      AND m.is_active = true
                )
                SELECT word
                FROM words
                WHERE word LIKE :prefix || '%'
                  AND length(word) >= 3
                  AND length(word) <= 30
                ORDER BY length(word), word
                LIMIT :limit
            """),
            {
                "user_id": current_user.id,
                "prefix": q.lower(),
                "limit": limit,
            },
        )

        suggestions = [row[0] for row in result.fetchall()]
        return suggestions

    except Exception as e:
        logger.error(f"Search suggestions error: {e}", exc_info=True)
        return []


# ============================================================================
# Endpoints - Sessions
# ============================================================================


@router.get(
    "/sessions",
    response_model=List[ChatSessionResponse],
    summary="List chat sessions",
    description="Retrieve user's chat sessions",
)
async def list_sessions(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List user's chat sessions with pagination.

    OPTIMIZED: Uses single JOIN+GROUP BY query instead of N+1 loop.
    Performance: 20+ queries → 1 query.
    """
    # Single optimized query with LEFT JOIN and GROUP BY
    stmt = (
        select(ChatSession, func.count(ChatMessage.id).label("message_count"))
        .outerjoin(ChatMessage, ChatMessage.session_id == ChatSession.id)
        .where(and_(ChatSession.user_id == current_user.id, ChatSession.deleted_at.is_(None)))
        .group_by(ChatSession.id)
        .order_by(ChatSession.updated_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )

    result = await db.execute(stmt)
    sessions_with_counts = result.all()

    return [
        ChatSessionResponse(
            id=session.id,
            title=session.title,
            document_id=session.document_id,
            message_count=count,
            total_tokens=session.total_tokens_used,
            created_at=session.created_at,
            updated_at=session.updated_at,
        )
        for session, count in sessions_with_counts
    ]


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
    # Auto-generate title if not provided
    title = session_data.title or f"Chat {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}"

    new_session = ChatSession(
        user_id=current_user.id,
        title=title,
        document_id=session_data.document_id,
        context_modules={"modules": session_data.context_modules or ["flashcards", "notes"]},
    )

    db.add(new_session)
    await db.commit()
    await db.refresh(new_session)

    logger.info(f"Chat session created: {new_session.id} for user {current_user.id}")

    return ChatSessionResponse(
        id=new_session.id,
        title=new_session.title,
        document_id=new_session.document_id,
        message_count=0,
        total_tokens=0,
        created_at=new_session.created_at,
        updated_at=new_session.updated_at,
    )


@router.get(
    "/sessions/{session_id}",
    response_model=ChatSessionResponse,
    summary="Get chat session",
    description="Retrieve a specific chat session",
)
async def get_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get a specific chat session.

    OPTIMIZED: Uses single JOIN query for session + message count.
    """
    stmt = (
        select(ChatSession, func.count(ChatMessage.id).label("message_count"))
        .outerjoin(ChatMessage, ChatMessage.session_id == ChatSession.id)
        .where(
            and_(
                ChatSession.id == session_id,
                ChatSession.user_id == current_user.id,
                ChatSession.deleted_at.is_(None),
            )
        )
        .group_by(ChatSession.id)
    )

    result = await db.execute(stmt)
    row = result.first()

    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    session, message_count = row

    return ChatSessionResponse(
        id=session.id,
        title=session.title,
        document_id=session.document_id,
        message_count=message_count,
        total_tokens=session.total_tokens_used,
        created_at=session.created_at,
        updated_at=session.updated_at,
    )


@router.delete(
    "/sessions/{session_id}",
    response_model=dict,
    summary="Delete chat session",
    description="Delete a chat session",
)
async def delete_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a chat session (soft delete)."""
    result = await db.execute(
        select(ChatSession).where(
            and_(
                ChatSession.id == session_id,
                ChatSession.user_id == current_user.id,
                ChatSession.deleted_at.is_(None),
            )
        )
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    session.deleted_at = datetime.utcnow()
    await db.commit()

    logger.info(f"Chat session deleted: {session_id}")

    return {"message": "Session deleted successfully"}


@router.patch(
    "/sessions/{session_id}",
    response_model=ChatSessionResponse,
    summary="Update chat session",
    description="Update session title",
)
async def update_session(
    session_id: int,
    session_update: ChatSessionUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update chat session title.

    OPTIMIZED: Uses single JOIN query for session + message count.
    """
    # First, get the session for update
    result = await db.execute(
        select(ChatSession).where(
            and_(
                ChatSession.id == session_id,
                ChatSession.user_id == current_user.id,
                ChatSession.deleted_at.is_(None),
            )
        )
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    session.title = session_update.title
    session.updated_at = datetime.utcnow()
    await db.commit()

    # Get updated session with message count in single query
    stmt = (
        select(ChatSession, func.count(ChatMessage.id).label("message_count"))
        .outerjoin(ChatMessage, ChatMessage.session_id == ChatSession.id)
        .where(ChatSession.id == session_id)
        .group_by(ChatSession.id)
    )
    result = await db.execute(stmt)
    row = result.first()
    session, message_count = row

    logger.info(f"Chat session updated: {session_id}, new title: {session.title}")

    return ChatSessionResponse(
        id=session.id,
        title=session.title,
        document_id=session.document_id,
        message_count=message_count,
        total_tokens=session.total_tokens_used,
        created_at=session.created_at,
        updated_at=session.updated_at,
    )


# ============================================================================
# Endpoints - Messages
# ============================================================================


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
    """Get messages from a chat session."""
    # Verify session ownership
    session_result = await db.execute(
        select(ChatSession).where(
            and_(
                ChatSession.id == session_id,
                ChatSession.user_id == current_user.id,
                ChatSession.deleted_at.is_(None),
            )
        )
    )
    session = session_result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    # Get messages
    messages_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc())
        .limit(limit)
    )
    messages = messages_result.scalars().all()

    return [
        ChatMessageResponse(
            id=msg.id,
            session_id=msg.session_id,
            role=msg.role,
            content=msg.content,
            tokens=msg.tokens,
            model_used=msg.model_used,
            # Handle legacy records where function_calls might be int instead of dict
            function_calls=msg.function_calls if isinstance(msg.function_calls, dict) else None,
            grounding_sources=msg.grounding_sources
            if isinstance(msg.grounding_sources, dict)
            else None,
            created_at=msg.created_at,
        )
        for msg in messages
    ]


@router.post(
    "/sessions/{session_id}/messages",
    response_model=ChatMessageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Send chat message",
    description="Send a message and get AI response (non-streaming)",
)
async def send_message(
    session_id: int,
    message_data: ChatMessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Send a message and receive AI response.

    For streaming responses, use WebSocket endpoint instead.
    This is a synchronous endpoint that waits for the full AI response.

    Flow:
    1. Verify session ownership
    2. Save user message
    3. Build user learning context
    4. Call TutorAgent with message and context
    5. Save AI response
    6. Update session token count
    7. Return AI response message
    """
    try:
        # Verify session ownership
        session_result = await db.execute(
            select(ChatSession).where(
                and_(
                    ChatSession.id == session_id,
                    ChatSession.user_id == current_user.id,
                    ChatSession.deleted_at.is_(None),
                )
            )
        )
        session = session_result.scalar_one_or_none()

        if not session:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

        # Save user message
        user_message = ChatMessage(
            session_id=session_id,
            role=MessageRole.USER,
            content=message_data.content,
            tokens=estimate_tokens(message_data.content),
        )
        db.add(user_message)
        await db.flush()

        logger.info(f"User message saved: {user_message.id} in session {session_id}")

        # Fetch conversation history (excluding the message we just added)
        history_result = await db.execute(
            select(ChatMessage)
            .where(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.created_at.asc())
            .limit(50)  # Limit to last 50 messages
        )
        history_messages = history_result.scalars().all()

        # Format chat history for the agent (exclude the current user message we just added)
        chat_history = [
            {"role": msg.role.value, "content": msg.content}
            for msg in history_messages
            if msg.id != user_message.id  # Exclude current message
        ]

        logger.info(f"Loaded {len(chat_history)} previous messages for context")

        # Use orchestrator for intelligent agent routing
        from app.core.ai.orchestrator import get_orchestrator

        orchestrator = get_orchestrator()
        orchestration_result = await orchestrator.handle_message(
            message=message_data.content,
            user_id=current_user.id,
            session_id=session_id,
            context={
                "document_id": session.document_id,
                "context_modules": session.context_modules,
            },
            chat_history=chat_history,
        )

        # Create AI message record from orchestration result
        # Safely get tool_calls as dict or None (not int)
        tool_calls_data = None
        if orchestration_result.metadata:
            tc = orchestration_result.metadata.get("tool_calls")
            if isinstance(tc, dict):
                tool_calls_data = tc
            elif isinstance(tc, int) and tc > 0:
                tool_calls_data = {"count": tc}

        ai_message = ChatMessage(
            session_id=session_id,
            role=MessageRole.ASSISTANT,
            content=orchestration_result.output,
            tokens=orchestration_result.tokens_used or estimate_tokens(orchestration_result.output),
            model_used=f"gemini-2.5-flash ({orchestration_result.agent_used})",
            function_calls=tool_calls_data,
            grounding_sources=None,
        )
        db.add(ai_message)

        # Update session token count
        session.total_tokens_used += user_message.tokens + ai_message.tokens

        await db.commit()
        await db.refresh(ai_message)

        logger.info(f"AI message saved: {ai_message.id} in session {session_id}")

        return ChatMessageResponse(
            id=ai_message.id,
            session_id=ai_message.session_id,
            role=ai_message.role,
            content=ai_message.content,
            tokens=ai_message.tokens,
            model_used=ai_message.model_used,
            # Ensure function_calls is dict or None
            function_calls=ai_message.function_calls
            if isinstance(ai_message.function_calls, dict)
            else None,
            grounding_sources=ai_message.grounding_sources
            if isinstance(ai_message.grounding_sources, dict)
            else None,
            created_at=ai_message.created_at,
        )

    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in send_message: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process message: {str(e)}",
        )


# Delete message endpoint
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
    """Delete a message."""
    # Get message with session verification
    result = await db.execute(
        select(ChatMessage)
        .join(ChatSession)
        .where(
            and_(
                ChatMessage.id == message_id,
                ChatSession.user_id == current_user.id,
                ChatSession.deleted_at.is_(None),
            )
        )
    )
    message = result.scalar_one_or_none()

    if not message:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")

    await db.execute(delete(ChatMessage).where(ChatMessage.id == message_id))
    await db.commit()

    logger.info(f"Message deleted: {message_id}")
    return {"message": "Message deleted successfully"}


# Regenerate message endpoint
@router.post(
    "/messages/{message_id}/regenerate",
    response_model=ChatMessageResponse,
    summary="Regenerate message",
    description="Regenerate AI response for a message",
)
async def regenerate_message(
    message_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Regenerate AI response for a message."""
    # Get original assistant message
    result = await db.execute(
        select(ChatMessage)
        .join(ChatSession)
        .where(
            and_(
                ChatMessage.id == message_id,
                ChatMessage.role == MessageRole.ASSISTANT,
                ChatSession.user_id == current_user.id,
                ChatSession.deleted_at.is_(None),
            )
        )
    )
    old_message = result.scalar_one_or_none()

    if not old_message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found or not an assistant message",
        )

    # Get the user message that triggered this response
    user_msg_result = await db.execute(
        select(ChatMessage)
        .where(
            and_(
                ChatMessage.session_id == old_message.session_id,
                ChatMessage.role == MessageRole.USER,
                ChatMessage.created_at < old_message.created_at,
            )
        )
        .order_by(ChatMessage.created_at.desc())
        .limit(1)
    )
    user_message = user_msg_result.scalar_one_or_none()

    if not user_message:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot find original user message"
        )

    # Generate new AI response
    ai_response_data = await generate_ai_response(
        message=user_message.content,
        user_id=current_user.id,
        session_id=old_message.session_id,
        db=None,
    )

    # Update existing message
    old_message.content = ai_response_data["output"]
    old_message.tokens = ai_response_data["tokens"]
    old_message.model_used = ai_response_data["model"]
    old_message.function_calls = ai_response_data["function_calls"]
    old_message.grounding_sources = ai_response_data["grounding_sources"]
    old_message.created_at = datetime.utcnow()

    await db.commit()
    await db.refresh(old_message)

    logger.info(f"Message regenerated: {message_id}")

    return ChatMessageResponse(
        id=old_message.id,
        session_id=old_message.session_id,
        role=old_message.role,
        content=old_message.content,
        tokens=old_message.tokens,
        model_used=old_message.model_used,
        function_calls=old_message.function_calls,
        grounding_sources=old_message.grounding_sources,
        created_at=old_message.created_at,
        parent_message_id=old_message.parent_message_id,
        version=old_message.version,
        is_active=old_message.is_active,
    )


# ============================================================================
# Conversation Branching Endpoints
# ============================================================================


class EditMessageRequest(BaseModel):
    """Request to edit a message (creates a branch)."""

    content: str = Field(..., min_length=1, max_length=5000, description="New message content")


class ConversationTreeResponse(BaseModel):
    """Conversation tree structure."""

    session_id: int
    messages: List[ChatMessageResponse]
    branch_points: List[int] = Field(
        default_factory=list, description="Message IDs that have multiple children"
    )


@router.post(
    "/messages/{message_id}/edit",
    response_model=List[ChatMessageResponse],
    summary="Edit message (creates branch)",
    description="Edit a user message, creating a new branch. Returns new message + AI response.",
)
async def edit_message(
    message_id: int,
    edit_data: EditMessageRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Edit a user message, creating a new branch in the conversation tree.

    Flow:
    1. Verify message ownership and that it's a user message
    2. Mark original message and its descendants as inactive
    3. Create new message with edited content (same parent as original)
    4. Generate new AI response
    5. Return both new messages
    """
    # Get original message with session verification
    result = await db.execute(
        select(ChatMessage)
        .join(ChatSession)
        .where(
            and_(
                ChatMessage.id == message_id,
                ChatMessage.role == MessageRole.USER,
                ChatSession.user_id == current_user.id,
                ChatSession.deleted_at.is_(None),
            )
        )
    )
    original_message = result.scalar_one_or_none()

    if not original_message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found or not a user message",
        )

    # Mark original message and its descendants as inactive
    # This preserves the branch but switches to the new path
    original_message.is_active = False

    # Get descendants and mark them inactive too
    descendants_result = await db.execute(
        select(ChatMessage).where(
            and_(
                ChatMessage.session_id == original_message.session_id,
                ChatMessage.created_at > original_message.created_at,
                ChatMessage.is_active == True,
            )
        )
    )
    descendants = descendants_result.scalars().all()
    for desc in descendants:
        desc.is_active = False

    # Create new edited message (same parent as original)
    new_user_message = ChatMessage(
        session_id=original_message.session_id,
        role=MessageRole.USER,
        content=edit_data.content,
        tokens=estimate_tokens(edit_data.content),
        parent_message_id=original_message.parent_message_id,
        version=original_message.version + 1,
        is_active=True,
    )
    db.add(new_user_message)
    await db.flush()

    logger.info(f"Created edited message {new_user_message.id} branching from {message_id}")

    # Fetch conversation history up to the branch point
    history_result = await db.execute(
        select(ChatMessage)
        .where(
            and_(
                ChatMessage.session_id == original_message.session_id,
                ChatMessage.created_at < original_message.created_at,
                ChatMessage.is_active == True,
            )
        )
        .order_by(ChatMessage.created_at.asc())
        .limit(50)
    )
    history_messages = history_result.scalars().all()

    chat_history = [{"role": msg.role.value, "content": msg.content} for msg in history_messages]

    # Generate new AI response
    from app.core.ai.orchestrator import get_orchestrator

    orchestrator = get_orchestrator()
    orchestration_result = await orchestrator.handle_message(
        message=edit_data.content,
        user_id=current_user.id,
        session_id=original_message.session_id,
        context={},
        chat_history=chat_history,
    )

    # Create AI response message
    new_ai_message = ChatMessage(
        session_id=original_message.session_id,
        role=MessageRole.ASSISTANT,
        content=orchestration_result.output,
        tokens=orchestration_result.tokens_used or estimate_tokens(orchestration_result.output),
        model_used=f"gemini-2.5-flash ({orchestration_result.agent_used})",
        parent_message_id=new_user_message.id,
        is_active=True,
    )
    db.add(new_ai_message)

    await db.commit()
    await db.refresh(new_user_message)
    await db.refresh(new_ai_message)

    logger.info(
        f"Branch created: edited {message_id} -> new path {new_user_message.id} -> {new_ai_message.id}"
    )

    return [
        ChatMessageResponse(
            id=new_user_message.id,
            session_id=new_user_message.session_id,
            role=new_user_message.role,
            content=new_user_message.content,
            tokens=new_user_message.tokens,
            model_used=None,
            created_at=new_user_message.created_at,
            parent_message_id=new_user_message.parent_message_id,
            version=new_user_message.version,
            is_active=new_user_message.is_active,
        ),
        ChatMessageResponse(
            id=new_ai_message.id,
            session_id=new_ai_message.session_id,
            role=new_ai_message.role,
            content=new_ai_message.content,
            tokens=new_ai_message.tokens,
            model_used=new_ai_message.model_used,
            created_at=new_ai_message.created_at,
            parent_message_id=new_ai_message.parent_message_id,
            version=new_ai_message.version,
            is_active=new_ai_message.is_active,
        ),
    ]


@router.get(
    "/sessions/{session_id}/tree",
    response_model=ConversationTreeResponse,
    summary="Get conversation tree",
    description="Get full conversation tree including all branches",
)
async def get_conversation_tree(
    session_id: int,
    include_inactive: bool = Query(False, description="Include inactive (archived) branches"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get the full conversation tree structure.

    Returns all messages with their parent relationships,
    allowing the frontend to reconstruct the tree.
    """
    # Verify session ownership
    session_result = await db.execute(
        select(ChatSession).where(
            and_(
                ChatSession.id == session_id,
                ChatSession.user_id == current_user.id,
                ChatSession.deleted_at.is_(None),
            )
        )
    )
    session = session_result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    # Build query for messages
    query = select(ChatMessage).where(ChatMessage.session_id == session_id)

    if not include_inactive:
        query = query.where(ChatMessage.is_active == True)

    query = query.order_by(ChatMessage.created_at.asc())

    messages_result = await db.execute(query)
    messages = messages_result.scalars().all()

    # Find branch points (messages with multiple children)
    # Count children for each parent_message_id
    children_count_result = await db.execute(
        select(ChatMessage.parent_message_id, func.count(ChatMessage.id).label("child_count"))
        .where(ChatMessage.session_id == session_id)
        .group_by(ChatMessage.parent_message_id)
        .having(func.count(ChatMessage.id) > 1)
    )
    branch_points = [
        row.parent_message_id
        for row in children_count_result.all()
        if row.parent_message_id is not None
    ]

    # Build response with has_children computed
    message_ids_with_children = set()
    for msg in messages:
        if msg.parent_message_id:
            message_ids_with_children.add(msg.parent_message_id)

    return ConversationTreeResponse(
        session_id=session_id,
        messages=[
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
                created_at=msg.created_at,
                parent_message_id=msg.parent_message_id,
                version=msg.version,
                is_active=msg.is_active,
                has_children=msg.id in message_ids_with_children,
            )
            for msg in messages
        ],
        branch_points=branch_points,
    )


@router.post(
    "/messages/{message_id}/switch-branch",
    response_model=dict,
    summary="Switch active branch",
    description="Switch to a different branch at a branch point",
)
async def switch_branch(
    message_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Switch to a different branch by making a message and its descendants active.

    Deactivates the currently active sibling branch.
    """
    # Get target message
    result = await db.execute(
        select(ChatMessage)
        .join(ChatSession)
        .where(
            and_(
                ChatMessage.id == message_id,
                ChatSession.user_id == current_user.id,
                ChatSession.deleted_at.is_(None),
            )
        )
    )
    target_message = result.scalar_one_or_none()

    if not target_message:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")

    # Get sibling messages (same parent) and deactivate them
    if target_message.parent_message_id:
        siblings_result = await db.execute(
            select(ChatMessage).where(
                and_(
                    ChatMessage.parent_message_id == target_message.parent_message_id,
                    ChatMessage.id != message_id,
                )
            )
        )
        siblings = siblings_result.scalars().all()

        for sibling in siblings:
            sibling.is_active = False
            # Also deactivate sibling's descendants
            desc_result = await db.execute(
                select(ChatMessage).where(
                    and_(
                        ChatMessage.session_id == target_message.session_id,
                        ChatMessage.created_at > sibling.created_at,
                        ChatMessage.parent_message_id == sibling.id,
                    )
                )
            )
            for desc in desc_result.scalars().all():
                desc.is_active = False

    # Activate target message and its descendants
    target_message.is_active = True

    # Recursively activate descendants of target
    async def activate_descendants(parent_id: int):
        desc_result = await db.execute(
            select(ChatMessage).where(ChatMessage.parent_message_id == parent_id)
        )
        for desc in desc_result.scalars().all():
            desc.is_active = True
            await activate_descendants(desc.id)

    await activate_descendants(message_id)

    await db.commit()

    logger.info(f"Switched to branch starting at message {message_id}")

    return {"message": "Branch switched successfully", "active_message_id": message_id}


# ============================================================================
# Conversation Export Endpoint
# ============================================================================


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
    Export conversation history for download.

    Formats:
    - json: Machine-readable, re-importable
    - markdown: Human-readable, shareable

    Options:
    - include_full_tree: Export all branches vs only active path
    """
    # Verify session ownership
    session_result = await db.execute(
        select(ChatSession).where(
            and_(
                ChatSession.id == session_id,
                ChatSession.user_id == current_user.id,
                ChatSession.deleted_at.is_(None),
            )
        )
    )
    session = session_result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    # Get messages
    query = select(ChatMessage).where(ChatMessage.session_id == session_id)

    if not include_full_tree:
        query = query.where(ChatMessage.is_active == True)

    query = query.order_by(ChatMessage.created_at.asc())

    messages_result = await db.execute(query)
    messages = messages_result.scalars().all()

    if format == "json":
        # JSON export
        export_data = {
            "session": {
                "id": session.id,
                "title": session.title,
                "created_at": session.created_at.isoformat(),
                "updated_at": session.updated_at.isoformat(),
                "total_tokens_used": session.total_tokens_used,
            },
            "messages": [
                {
                    "id": msg.id,
                    "role": msg.role.value,
                    "content": msg.content,
                    "tokens": msg.tokens,
                    "model_used": msg.model_used,
                    "created_at": msg.created_at.isoformat(),
                    "parent_message_id": msg.parent_message_id,
                    "version": msg.version,
                    "is_active": msg.is_active,
                }
                for msg in messages
            ],
            "exported_at": datetime.utcnow().isoformat(),
            "export_options": {
                "include_full_tree": include_full_tree,
            },
        }

        content = json.dumps(export_data, indent=2, ensure_ascii=False)
        filename = f"conversation_{session_id}_{datetime.utcnow().strftime('%Y%m%d')}.json"
        media_type = "application/json"

    else:
        # Markdown export
        lines = [
            f"# {session.title}",
            "",
            f"*Exported on {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}*",
            "",
            "---",
            "",
        ]

        for msg in messages:
            role_emoji = "👤" if msg.role.value == "user" else "🤖"
            role_name = "User" if msg.role.value == "user" else "Assistant"
            timestamp = msg.created_at.strftime("%Y-%m-%d %H:%M")

            lines.append(f"### {role_emoji} {role_name}")
            lines.append(f"*{timestamp}*")
            lines.append("")
            lines.append(msg.content)
            lines.append("")
            lines.append("---")
            lines.append("")

        # Add metadata footer
        lines.append("")
        lines.append("## Metadata")
        lines.append("")
        lines.append(f"- **Session ID**: {session.id}")
        lines.append(f"- **Messages**: {len(messages)}")
        lines.append(f"- **Total Tokens**: {session.total_tokens_used}")
        if include_full_tree:
            lines.append("- **Export Type**: Full conversation tree (including branches)")
        else:
            lines.append("- **Export Type**: Active branch only")

        content = "\n".join(lines)
        filename = f"conversation_{session_id}_{datetime.utcnow().strftime('%Y%m%d')}.md"
        media_type = "text/markdown"

    logger.info(f"Exported conversation {session_id} as {format} for user {current_user.id}")

    return Response(
        content=content,
        media_type=media_type,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )


# ============================================================================
# File Upload Endpoint
# ============================================================================


@router.post(
    "/files/upload",
    response_model=FileUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload file for chat",
    description="Upload a file to use as context in chat",
)
async def upload_chat_file(
    file: UploadFile = File(...),
    session_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload file for chat context.

    Reuses existing document upload infrastructure.
    """
    try:
        # Reuse document upload logic
        from app.api.rest.documents import upload_document as upload_doc_internal
        from app.services.storage.manager import StorageManager

        # Upload file using existing infrastructure
        storage = StorageManager()
        file_path = await storage.save_file(file=file, user_id=current_user.id, module="chat")

        # Create document record
        from app.models.document import Document

        document = Document(
            user_id=current_user.id,
            filename=file.filename,
            file_type=file.content_type or "application/octet-stream",
            file_size=file.size or 0,
            file_path=file_path,
            processing_status="pending",
        )

        db.add(document)
        await db.commit()
        await db.refresh(document)

        logger.info(f"File uploaded for chat: {document.id}, session: {session_id}")

        return FileUploadResponse(
            id=str(document.id),
            filename=document.filename,
            file_type=document.file_type,
            file_size=document.file_size,
            url=f"/api/v1/documents/{document.id}",
            preview_url=None,  # Could add thumbnail generation here
            uploaded_at=document.created_at,
        )

    except Exception as e:
        logger.error(f"Error uploading chat file: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload file: {str(e)}",
        )


# ============================================================================
# Model Selection Endpoint
# ============================================================================


@router.get(
    "/models",
    response_model=List[AIModelResponse],
    summary="List AI models",
    description="Get list of available AI models",
)
async def list_models():
    """
    List available AI models.

    Returns information about all models that can be used for chat.
    """
    models = [
        AIModelResponse(
            id="gemini-2.5-flash",
            name="Gemini 2.5 Flash",
            description="Fast and efficient model for everyday tasks",
            capabilities=["text", "code", "reasoning"],
            max_tokens=8192,
            supports_vision=False,
            supports_search=False,
        ),
        AIModelResponse(
            id="gemini-1.5-flash",
            name="Gemini 1.5 Flash",
            description="Balanced speed and capability",
            capabilities=["text", "code", "vision", "reasoning"],
            max_tokens=8192,
            supports_vision=True,
            supports_search=True,
        ),
        AIModelResponse(
            id="gemini-1.5-pro",
            name="Gemini 1.5 Pro",
            description="Most capable model for complex tasks",
            capabilities=["text", "code", "vision", "reasoning", "long-context"],
            max_tokens=32768,
            supports_vision=True,
            supports_search=True,
        ),
        AIModelResponse(
            id="gemini-2.0-flash-thinking",
            name="Gemini 2.0 Flash (Thinking)",
            description="Model with visible reasoning process",
            capabilities=["text", "code", "reasoning", "thinking"],
            max_tokens=8192,
            supports_vision=False,
            supports_search=True,
        ),
    ]

    return models


# ============================================================================
# Dashboard Orchestrator Endpoint
# ============================================================================

DASHBOARD_SESSION_STORAGE_KEY = "synapse_dashboard_session"


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
    Send message to dashboard orchestrator.

    Different from regular chat:
    - Uses DashboardAgent with ALL tools
    - Builds comprehensive context from all modules
    - Returns rich metadata for UI rendering
    - Stores in dedicated dashboard session

    The Dashboard Orchestrator has:
    - Complete knowledge of user's learning state
    - Ability to create flashcards, notes, quizzes
    - Proactive recommendations
    - Analytics and insights
    """
    try:
        logger.info(
            "dashboard_message_received",
            user_id=current_user.id,
            message_length=len(message_data.content),
        )

        # ====================================================================
        # GET OR CREATE DASHBOARD SESSION
        # ====================================================================
        # Dashboard has its own persistent session
        session_query = select(ChatSession).where(
            and_(
                ChatSession.user_id == current_user.id,
                ChatSession.title == DASHBOARD_SESSION_STORAGE_KEY,
                ChatSession.deleted_at.is_(None),
            )
        )
        result = await db.execute(session_query)
        session = result.scalar_one_or_none()

        if not session:
            # Create new dashboard session
            session = ChatSession(user_id=current_user.id, title=DASHBOARD_SESSION_STORAGE_KEY)
            db.add(session)
            await db.commit()
            await db.refresh(session)

            logger.info("dashboard_session_created", user_id=current_user.id, session_id=session.id)

        # ====================================================================
        # SAVE USER MESSAGE
        # ====================================================================
        user_message = ChatMessage(
            session_id=session.id,
            role=MessageRole.USER,
            content=message_data.content,
            tokens=estimate_tokens(message_data.content),
        )
        db.add(user_message)
        await db.commit()
        await db.refresh(user_message)

        # ====================================================================
        # BUILD COMPREHENSIVE DASHBOARD CONTEXT
        # ====================================================================
        from app.core.ai.context.dashboard_context_builder import build_dashboard_context

        context = await build_dashboard_context(user_id=current_user.id, db=db)

        logger.debug(
            "dashboard_context_built",
            user_id=current_user.id,
            flashcards=context.get("user_stats", {}).get("total_flashcards", 0),
            notes=context.get("user_stats", {}).get("total_notes", 0),
        )

        # ====================================================================
        # GET CONVERSATION HISTORY
        # ====================================================================
        history_query = (
            select(ChatMessage)
            .where(ChatMessage.session_id == session.id)
            .order_by(ChatMessage.created_at)
            .limit(20)
        )  # Last 20 messages

        history_result = await db.execute(history_query)
        history = history_result.scalars().all()

        chat_history = [
            {"role": msg.role.value, "content": msg.content}
            for msg in history[:-1]  # Exclude the message we just added
        ]

        # ====================================================================
        # CALL DASHBOARD ORCHESTRATOR
        # ====================================================================
        from app.core.ai.orchestrator import get_orchestrator

        orchestrator = get_orchestrator()

        # Force dashboard agent by adding preference to context
        context["agent_preference"] = "dashboard"

        result = await orchestrator.handle_message(
            message=message_data.content,
            user_id=current_user.id,
            session_id=session.id,
            context=context,
            chat_history=chat_history,
        )

        logger.info(
            "dashboard_orchestration_complete",
            user_id=current_user.id,
            agent_used=result.agent_used,
            tools_called=len(result.metadata.get("tool_calls", []))
            if isinstance(result.metadata.get("tool_calls"), list)
            else 0,
            tokens=result.tokens_used,
        )

        # ====================================================================
        # EXTRACT ACTIONS TAKEN
        # ====================================================================
        actions_taken = []
        tool_calls = result.metadata.get("tool_calls", [])
        # Ensure tool_calls is a list (sometimes it might be an int or other type)
        if isinstance(tool_calls, list):
            for tool_call in tool_calls:
                tool_result = tool_call.get("result", {})
                if isinstance(tool_result, dict) and tool_result.get("success"):
                    action_data = tool_result.get("data", {})
                    actions_taken.append(
                        {
                            "type": tool_call.get("tool", ""),
                            "data": action_data,
                            "message": tool_result.get("message", ""),
                        }
                    )

        # ====================================================================
        # SAVE AI RESPONSE
        # ====================================================================
        ai_message = ChatMessage(
            session_id=session.id,
            role=MessageRole.ASSISTANT,
            content=result.output,
            tokens=result.tokens_used,
            model_used=result.agent_used,
            function_calls={
                "tool_calls": result.metadata.get("tool_calls", []),
                "actions_taken": actions_taken,
            },
            grounding_sources=None,
        )
        db.add(ai_message)

        # Update session timestamp
        session.updated_at = datetime.utcnow()

        await db.commit()
        await db.refresh(ai_message)

        logger.info(
            "dashboard_message_saved",
            user_id=current_user.id,
            message_id=ai_message.id,
            actions=len(actions_taken),
        )

        # ====================================================================
        # RETURN ENRICHED RESPONSE
        # ====================================================================
        return ChatMessageResponse(
            id=ai_message.id,
            session_id=ai_message.session_id,
            role=ai_message.role,
            content=ai_message.content,
            tokens=ai_message.tokens,
            model_used=ai_message.model_used,
            function_calls=ai_message.function_calls,
            grounding_sources=ai_message.grounding_sources,
            created_at=ai_message.created_at,
        )

    except Exception as e:
        logger.error(
            "dashboard_message_error",
            user_id=current_user.id,
            error=str(e),
            error_type=type(e).__name__,
            exc_info=True,
        )

        # Create error message
        error_message = ChatMessage(
            session_id=session.id if session else None,
            role=MessageRole.ASSISTANT,
            content="I encountered an error processing your request. Please try again.",
            tokens=0,
            model_used="error",
        )

        if session:
            db.add(error_message)
            await db.commit()
            await db.refresh(error_message)

            return ChatMessageResponse(
                id=error_message.id,
                session_id=error_message.session_id,
                role=error_message.role,
                content=error_message.content,
                tokens=error_message.tokens,
                model_used=error_message.model_used,
                function_calls=None,
                grounding_sources=None,
                created_at=error_message.created_at,
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Dashboard orchestrator error: {str(e)}",
            )
