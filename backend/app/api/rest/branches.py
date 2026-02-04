"""
Branch API endpoints.

Counterfactual exploration: Create and navigate alternate reasoning paths.

INVARIANT: Branches exist when parent_message_id IS NOT NULL
INVARIANT: Branches are mutually exclusive with threads (thread_id XOR parent_message_id)
INVARIANT: Only one sibling can be active at a time

Model routing: Branches often use long-context models (Qwen, DeepSeek)
for better reasoning with full ancestry.
"""

from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, update
from pydantic import BaseModel, Field
import structlog

from app.api.deps import get_db, get_current_user
from app.models.user import User

# Chat models from module interface (temporary migration)
from app.modules.chat.interface import ChatSession, ChatMessage, MessageRole
from app.schemas.chat import ChatMessageResponse

logger = structlog.get_logger(__name__)
router = APIRouter()


# ============================================================================
# Schemas
# ============================================================================


class BranchCreateRequest(BaseModel):
    """Request to create a branch from a message."""

    prompt: Optional[str] = Field(
        None,
        description="Optional rephrased prompt. If not provided, regenerates from same context.",
    )
    model_override: Optional[str] = Field(
        None,
        description="Force specific model (e.g., 'qwen3-235b', 'deepseek-r1'). Default uses routing.",
    )


class BranchSiblingInfo(BaseModel):
    """Info about a sibling branch."""

    id: int
    is_active: bool
    version: int
    model_used: Optional[str]
    created_at: datetime
    content_preview: str = Field(description="First 100 chars of content")


class BranchSiblingsResponse(BaseModel):
    """Response with sibling branches."""

    parent_message_id: int
    total_siblings: int
    current_index: int
    siblings: List[BranchSiblingInfo]


class BranchActivateResponse(BaseModel):
    """Response after activating a branch."""

    success: bool
    activated_id: int
    deactivated_count: int


# ============================================================================
# Helper Functions
# ============================================================================


async def get_message_ancestry(
    db: AsyncSession, message_id: int, max_depth: int = 50
) -> List[dict]:
    """
    Reconstruct the full conversation ancestry for a message.

    Walks up the parent chain to build context for branch generation.
    Returns messages in chronological order (oldest first).

    Args:
        db: Database session
        message_id: Starting message ID
        max_depth: Maximum messages to retrieve (prevents infinite loops)

    Returns:
        List of message dicts with role and content
    """
    ancestry = []
    current_id = message_id
    depth = 0

    while current_id and depth < max_depth:
        message = await db.get(ChatMessage, current_id)
        if not message:
            break

        ancestry.append(
            {
                "role": message.role.value,
                "content": message.content,
                "id": message.id,
            }
        )

        # Walk up to parent
        current_id = message.parent_message_id
        depth += 1

    # Reverse to get chronological order (oldest first)
    ancestry.reverse()

    # Also get messages from same session that came before this chain
    if ancestry:
        first_in_chain = ancestry[0]["id"]
        first_message = await db.get(ChatMessage, first_in_chain)
        if first_message:
            # Get earlier messages from main conversation (not branched)
            earlier_result = await db.execute(
                select(ChatMessage)
                .where(
                    and_(
                        ChatMessage.session_id == first_message.session_id,
                        ChatMessage.parent_message_id.is_(None),  # Main conversation only
                        ChatMessage.id < first_in_chain,
                        ChatMessage.is_active.is_(True),
                    )
                )
                .order_by(ChatMessage.created_at.asc())
            )
            earlier_messages = earlier_result.scalars().all()

            # Prepend earlier messages
            earlier_context = [
                {"role": m.role.value, "content": m.content, "id": m.id} for m in earlier_messages
            ]
            ancestry = earlier_context + ancestry

    return ancestry


async def verify_message_ownership(
    db: AsyncSession, message_id: int, user_id: int
) -> tuple[ChatMessage, ChatSession]:
    """
    Verify that a message exists and user owns it.

    Returns:
        Tuple of (message, session)

    Raises:
        HTTPException if not found or not authorized
    """
    message = await db.get(ChatMessage, message_id)
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found",
        )

    session = await db.get(ChatSession, message.session_id)
    if not session or session.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this message",
        )

    return message, session


# ============================================================================
# Endpoints
# ============================================================================


@router.post(
    "/messages/{message_id}/branch",
    response_model=ChatMessageResponse,
    summary="Create a branch",
    description="Create an alternate response branching from a message",
)
async def create_branch(
    message_id: int,
    data: BranchCreateRequest = Body(default=BranchCreateRequest()),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a branch from a specific message.

    This generates an alternative response continuing from the same point
    in the conversation tree. The new branch starts as inactive.

    Flow:
    1. Verify message ownership
    2. Validate message is not in a thread (mutual exclusivity)
    3. Build full ancestry context
    4. Generate response (optionally with model override)
    5. Create new message with parent_message_id set

    Model routing:
    - Default: Uses cognitive router to select appropriate model
    - With override: Forces specified model (useful for trying different reasoning)
    """
    parent_message, session = await verify_message_ownership(db, message_id, current_user.id)

    # Enforce thread/branch mutual exclusivity
    if parent_message.thread_id is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot branch from a thread message. Threads and branches are mutually exclusive.",
        )

    logger.info(
        "creating_branch",
        message_id=message_id,
        user_id=current_user.id,
        model_override=data.model_override,
    )

    # Build full ancestry context
    ancestry = await get_message_ancestry(db, message_id)

    # Format context for AI
    chat_history = [{"role": msg["role"], "content": msg["content"]} for msg in ancestry]

    # Determine what to generate
    # If the parent is a user message, we generate an assistant response
    # If the parent is an assistant message, we regenerate from the user message before it
    if parent_message.role == MessageRole.USER:
        # Branch from user message: generate new assistant response
        prompt_content = data.prompt or parent_message.content
        generating_role = MessageRole.ASSISTANT
    else:
        # Branch from assistant message: find the user message and regenerate
        # Find the preceding user message in ancestry
        user_prompt = None
        for msg in reversed(ancestry[:-1]):  # Exclude the assistant message itself
            if msg["role"] == "user":
                user_prompt = msg["content"]
                break

        if not user_prompt:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not find a user message to branch from",
            )

        prompt_content = data.prompt or user_prompt
        generating_role = MessageRole.ASSISTANT

        # Update chat history to exclude the assistant response we're replacing
        chat_history = chat_history[:-1]

    # Generate AI response
    try:
        from app.core.ai.agents.factory import create_agent

        # Select model: use override or default to long-context model for branches
        model = data.model_override or "qwen3-235b"  # Qwen for long context reasoning

        agent = create_agent("general", model=model)
        result = await agent.execute(
            prompt_content,
            context={"history": chat_history},
        )

        response_content = result.get("content", "I could not generate a response.")
        model_used = result.get("model", model)
        tokens_used = result.get("tokens", 0)

    except Exception as e:
        logger.error("branch_generation_failed", error=str(e), message_id=message_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate branch response: {str(e)}",
        )

    # Calculate version (max version among siblings + 1)
    siblings_result = await db.execute(
        select(ChatMessage.version)
        .where(ChatMessage.parent_message_id == message_id)
        .order_by(ChatMessage.version.desc())
    )
    max_version = siblings_result.scalar() or 0

    # Create new branch message
    branch_message = ChatMessage(
        session_id=session.id,
        parent_message_id=message_id,  # This is what makes it a branch
        thread_id=None,  # Enforce mutual exclusivity
        role=generating_role,
        content=response_content,
        model_used=model_used,
        tokens=tokens_used,
        version=max_version + 1,
        is_active=False,  # Start inactive - user must explicitly activate
    )
    db.add(branch_message)
    await db.commit()
    await db.refresh(branch_message)

    logger.info(
        "branch_created",
        branch_id=branch_message.id,
        parent_id=message_id,
        version=branch_message.version,
        model=model_used,
    )

    return ChatMessageResponse(
        id=branch_message.id,
        session_id=branch_message.session_id,
        role=branch_message.role,
        content=branch_message.content,
        tokens=branch_message.tokens,
        model_used=branch_message.model_used,
        function_calls=None,
        grounding_sources=None,
        created_at=branch_message.created_at,
    )


@router.get(
    "/messages/{message_id}/siblings",
    response_model=BranchSiblingsResponse,
    summary="Get sibling branches",
    description="Get all branches that share the same parent message",
)
async def get_branch_siblings(
    message_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get all sibling branches for a message.

    Siblings are messages that share the same parent_message_id.
    This is used for the ← 2/4 → navigation UI.

    Returns:
        - Total number of siblings
        - Current message's position (1-indexed)
        - List of all siblings with preview info
    """
    message, _ = await verify_message_ownership(db, message_id, current_user.id)

    if not message.parent_message_id:
        # This is a root message, no siblings
        return BranchSiblingsResponse(
            parent_message_id=0,
            total_siblings=1,
            current_index=1,
            siblings=[
                BranchSiblingInfo(
                    id=message.id,
                    is_active=message.is_active,
                    version=message.version,
                    model_used=message.model_used,
                    created_at=message.created_at,
                    content_preview=message.content[:100] if message.content else "",
                )
            ],
        )

    # Get all siblings (messages with same parent)
    siblings_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.parent_message_id == message.parent_message_id)
        .order_by(ChatMessage.created_at.asc())
    )
    siblings = siblings_result.scalars().all()

    # Find current message's position
    current_index = 1
    for i, sibling in enumerate(siblings):
        if sibling.id == message_id:
            current_index = i + 1
            break

    siblings_info = [
        BranchSiblingInfo(
            id=s.id,
            is_active=s.is_active,
            version=s.version,
            model_used=s.model_used,
            created_at=s.created_at,
            content_preview=s.content[:100] if s.content else "",
        )
        for s in siblings
    ]

    return BranchSiblingsResponse(
        parent_message_id=message.parent_message_id,
        total_siblings=len(siblings),
        current_index=current_index,
        siblings=siblings_info,
    )


@router.patch(
    "/messages/{message_id}/activate",
    response_model=BranchActivateResponse,
    summary="Activate a branch",
    description="Set a branch as the active path, deactivating siblings",
)
async def activate_branch(
    message_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Set a branch as the active path.

    This is atomic:
    1. Deactivate all siblings in one transaction
    2. Activate the target message

    INVARIANT: Only one sibling can be active at a time.
    """
    message, _ = await verify_message_ownership(db, message_id, current_user.id)

    deactivated_count = 0

    if message.parent_message_id:
        # Deactivate all siblings first
        result = await db.execute(
            update(ChatMessage)
            .where(
                and_(
                    ChatMessage.parent_message_id == message.parent_message_id,
                    ChatMessage.id != message_id,
                    ChatMessage.is_active.is_(True),
                )
            )
            .values(is_active=False)
        )
        deactivated_count = result.rowcount

    # Activate this message
    message.is_active = True
    await db.commit()

    logger.info(
        "branch_activated",
        message_id=message_id,
        deactivated_siblings=deactivated_count,
    )

    return BranchActivateResponse(
        success=True,
        activated_id=message_id,
        deactivated_count=deactivated_count,
    )


@router.get(
    "/messages/{message_id}/active-path",
    response_model=List[ChatMessageResponse],
    summary="Get active conversation path",
    description="Get all messages in the active branch path for display",
)
async def get_active_path(
    message_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get the active conversation path leading to/from this message.

    This returns the "visible" conversation when branches exist.
    Follows is_active=True path for branched messages.
    """
    message, session = await verify_message_ownership(db, message_id, current_user.id)

    # Get all messages for the session that are active
    result = await db.execute(
        select(ChatMessage)
        .where(
            and_(
                ChatMessage.session_id == session.id,
                ChatMessage.is_active.is_(True),
            )
        )
        .order_by(ChatMessage.created_at.asc())
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
            created_at=msg.created_at,
        )
        for msg in messages
    ]
