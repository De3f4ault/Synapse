"""
Chat Module — Repository Layer.

This module implements the repository pattern for Chat domain entities.
It abstracts the underlying data storage (SQLAlchemy/PostgreSQL) and provides
clean, type-safe interfaces for data access.

Responsibilities:
- CRUD operations for Sessions, Messages, and Threads
- Complex queries (History fetching, Tree traversal)
- Optimizations (N+1 query prevention)
"""

from typing import Optional, Sequence, List, Tuple
from datetime import datetime
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from .models import ChatSession, ChatMessage, ChatThread, MessageRole


logger = structlog.get_logger(__name__)


class ChatSessionRepository:
    """
    Repository for ChatSession entities.
    Handles lifecycle and queries for chat sessions.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_by_user(
        self,
        user_id: int,
        *,
        page: int = 1,
        page_size: int = 20,
        include_message_count: bool = True,
    ) -> Sequence[Tuple[ChatSession, int]]:
        """
        List chat sessions for a user with pagination.

        Returns a sequence of (Session, MessageCount) tuples.
        Uses an optimized LEFT JOIN + GROUP BY query to fetch message counts efficiently.
        """
        stmt = (
            select(ChatSession, func.count(ChatMessage.id).label("message_count"))
            .outerjoin(ChatMessage, ChatMessage.session_id == ChatSession.id)
            .where(
                and_(
                    ChatSession.user_id == user_id,
                    ChatSession.deleted_at.is_(None),
                )
            )
            .group_by(ChatSession.id)
            .order_by(ChatSession.updated_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        result = await self.db.execute(stmt)
        return result.all()

    async def get_by_id(
        self,
        session_id: int,
        *,
        user_id: Optional[int] = None,
        include_deleted: bool = False,
    ) -> Optional[ChatSession]:
        """
        Get a session by ID.

        Args:
            session_id: The ID of the session.
            user_id: Optional. If provided, enforces that the session belongs to this user.
            include_deleted: If True, returns even soft-deleted sessions.
        """
        conditions = [ChatSession.id == session_id]
        if user_id is not None:
            conditions.append(ChatSession.user_id == user_id)
        if not include_deleted:
            conditions.append(ChatSession.deleted_at.is_(None))

        result = await self.db.execute(select(ChatSession).where(and_(*conditions)))
        return result.scalar_one_or_none()

    async def get_with_message_count(
        self,
        session_id: int,
        *,
        user_id: Optional[int] = None,
    ) -> Optional[Tuple[ChatSession, int]]:
        """
        Get a session and its message count in a single query.
        """
        conditions = [
            ChatSession.id == session_id,
            ChatSession.deleted_at.is_(None),
        ]
        if user_id is not None:
            conditions.append(ChatSession.user_id == user_id)

        stmt = (
            select(ChatSession, func.count(ChatMessage.id).label("message_count"))
            .outerjoin(ChatMessage, ChatMessage.session_id == ChatSession.id)
            .where(and_(*conditions))
            .group_by(ChatSession.id)
        )
        result = await self.db.execute(stmt)
        return result.first()

    async def create(
        self,
        user_id: int,
        title: str,
        *,
        document_id: Optional[int] = None,
        context_modules: Optional[List[str]] = None,
    ) -> ChatSession:
        """Create a new chat session."""
        session = ChatSession(
            user_id=user_id,
            title=title,
            document_id=document_id,
            context_modules={"modules": context_modules or ["flashcards", "notes"]},
        )
        self.db.add(session)
        await self.db.flush()
        await self.db.refresh(session)
        return session

    async def update_title(
        self,
        session: ChatSession,
        title: str,
    ) -> ChatSession:
        """Update the title of a session."""
        session.title = title
        session.updated_at = datetime.utcnow()
        await self.db.flush()
        return session

    async def soft_delete(self, session: ChatSession) -> None:
        """
        Soft-delete a session.
        Sets the deleted_at timestamp; data is preserved but hidden from normal queries.
        """
        session.deleted_at = datetime.utcnow()
        await self.db.flush()

    async def update_token_count(
        self,
        session: ChatSession,
        tokens_to_add: int,
    ) -> None:
        """Increment the total token usage for a session."""
        session.total_tokens_used += tokens_to_add
        session.updated_at = datetime.utcnow()
        await self.db.flush()

    async def get_by_title(
        self,
        user_id: int,
        title: str,
    ) -> Optional[ChatSession]:
        """
        Get a session by exact title match.
        Used for special persistent sessions like 'Dashboard' or 'Notes'.
        """
        result = await self.db.execute(
            select(ChatSession).where(
                and_(
                    ChatSession.user_id == user_id,
                    ChatSession.title == title,
                    ChatSession.deleted_at.is_(None),
                )
            )
        )
        return result.scalar_one_or_none()

    async def search_sessions(
        self,
        user_id: int,
        query: str,
        *,
        limit: int = 20,
    ) -> Sequence[Tuple[ChatSession, float]]:
        """
        Full-text search on session titles using PostgreSQL FTS.

        Uses plainto_tsquery for simple queries, falls back to ILIKE for short queries.
        Returns (Session, relevance_score) tuples ordered by relevance.
        """
        from sqlalchemy import text, literal_column

        query = query.strip()
        if not query:
            return []

        # For short queries (< 3 chars), use ILIKE fallback
        if len(query) < 3:
            stmt = (
                select(ChatSession, literal_column("1.0").label("score"))
                .where(
                    and_(
                        ChatSession.user_id == user_id,
                        ChatSession.deleted_at.is_(None),
                        ChatSession.title.ilike(f"%{query}%"),
                    )
                )
                .order_by(ChatSession.updated_at.desc())
                .limit(limit)
            )
        else:
            # PostgreSQL full-text search with ts_rank
            # Using plainto_tsquery for natural language queries
            stmt = (
                select(
                    ChatSession,
                    func.ts_rank(
                        func.to_tsvector("english", ChatSession.title),
                        func.plainto_tsquery("english", query),
                    ).label("score"),
                )
                .where(
                    and_(
                        ChatSession.user_id == user_id,
                        ChatSession.deleted_at.is_(None),
                        func.to_tsvector("english", ChatSession.title).op("@@")(
                            func.plainto_tsquery("english", query)
                        ),
                    )
                )
                .order_by(text("score DESC"), ChatSession.updated_at.desc())
                .limit(limit)
            )

        result = await self.db.execute(stmt)
        return result.all()


class ChatMessageRepository:
    """
    Repository for ChatMessage entities.
    Handles message history, context retrieval, and branching logic.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_by_session(
        self,
        session_id: int,
        *,
        limit: int = 100,
        order_asc: bool = True,
    ) -> Sequence[ChatMessage]:
        """
        List messages in a session.
        """
        order = ChatMessage.created_at.asc() if order_asc else ChatMessage.created_at.desc()
        stmt = (
            select(ChatMessage)
            .where(ChatMessage.session_id == session_id)
            .order_by(order)
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def list_recent_for_context(
        self,
        session_id: int,
        *,
        max_chars: int = 16000,
        limit: int = 50,
    ) -> List[dict]:
        """
        Retrieve recent messages optimized for AI context injection.

        - Fetches newest messages first.
        - Truncates history to fit within `max_chars`.
        - Returns a list of dictionaries in chronological order (oldest -> newest).
        """
        # Fetch recent messages (newest first for truncation)
        stmt = (
            select(ChatMessage)
            .where(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.created_at.desc())
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        messages = result.scalars().all()

        # Build history with token-aware truncation
        history = []
        kept_messages = []
        current_chars = 0

        # Iterate from Newest -> Oldest (DB returned DESC)
        for msg in messages:
            msg_chars = len(msg.content or "")
            if current_chars + msg_chars > max_chars:
                break
            kept_messages.append(msg)
            current_chars += msg_chars

        # Reverse to get Chronological order (Oldest -> Newest)
        for msg in reversed(kept_messages):
            history.append(
                {
                    "role": msg.role.value if hasattr(msg.role, "value") else msg.role,
                    "content": msg.content,
                }
            )

        return history

    async def get_by_id(self, message_id: int) -> Optional[ChatMessage]:
        """Get message by ID."""
        result = await self.db.execute(select(ChatMessage).where(ChatMessage.id == message_id))
        return result.scalar_one_or_none()

    async def create(
        self,
        session_id: int,
        role: MessageRole,
        content: str,
        *,
        tokens: int = 0,
        model_used: Optional[str] = None,
        function_calls: Optional[dict] = None,
        grounding_sources: Optional[dict] = None,
        parent_message_id: Optional[int] = None,
        thread_id: Optional[int] = None,
        version: Optional[int] = None,
    ) -> ChatMessage:
        """Persist a new message to the database."""
        message = ChatMessage(
            session_id=session_id,
            role=role,
            content=content,
            tokens=tokens or max(1, len(content) // 4),  # Fallback estimation
            model_used=model_used,
            function_calls=function_calls,
            grounding_sources=grounding_sources,
            parent_message_id=parent_message_id,
            thread_id=thread_id,
        )
        if version is not None:
            message.version = version

        self.db.add(message)
        await self.db.flush()
        await self.db.refresh(message)
        return message

    async def delete(self, message_id: int) -> None:
        """Hard delete a message."""
        from sqlalchemy import delete as sql_delete

        await self.db.execute(sql_delete(ChatMessage).where(ChatMessage.id == message_id))

    async def get_with_ownership_check(
        self,
        message_id: int,
        user_id: int,
    ) -> Optional[ChatMessage]:
        """Retrieve a message ensuring the session belongs to the user."""
        stmt = (
            select(ChatMessage)
            .join(ChatSession, ChatMessage.session_id == ChatSession.id)
            .where(
                and_(
                    ChatMessage.id == message_id,
                    ChatSession.user_id == user_id,
                    ChatSession.deleted_at.is_(None),
                )
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_assistant_message_with_owner(
        self,
        message_id: int,
        user_id: int,
    ) -> Optional[ChatMessage]:
        """Retrieve an assistant message ensuring ownership."""
        stmt = (
            select(ChatMessage)
            .join(ChatSession, ChatMessage.session_id == ChatSession.id)
            .where(
                and_(
                    ChatMessage.id == message_id,
                    ChatMessage.role == MessageRole.ASSISTANT,
                    ChatSession.user_id == user_id,
                    ChatSession.deleted_at.is_(None),
                )
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_user_message_with_owner(
        self,
        message_id: int,
        user_id: int,
    ) -> Optional[ChatMessage]:
        """Retrieve a user message ensuring ownership."""
        stmt = (
            select(ChatMessage)
            .join(ChatSession, ChatMessage.session_id == ChatSession.id)
            .where(
                and_(
                    ChatMessage.id == message_id,
                    ChatMessage.role == MessageRole.USER,
                    ChatSession.user_id == user_id,
                    ChatSession.deleted_at.is_(None),
                )
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_preceding_user_message(
        self,
        session_id: int,
        before_time: datetime,
    ) -> Optional[ChatMessage]:
        """Find the immediate preceding user message before a timestamp."""
        stmt = (
            select(ChatMessage)
            .where(
                and_(
                    ChatMessage.session_id == session_id,
                    ChatMessage.role == MessageRole.USER,
                    ChatMessage.created_at < before_time,
                )
            )
            .order_by(ChatMessage.created_at.desc())
            .limit(1)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def mark_descendants_inactive(
        self,
        session_id: int,
        after_time: datetime,
    ) -> int:
        """
        Mark all messages in the session created after `after_time` as inactive.
        Used when branching to hide the 'future' that was overwritten.
        """
        from sqlalchemy import update as sql_update

        stmt = (
            sql_update(ChatMessage)
            .where(
                and_(
                    ChatMessage.session_id == session_id,
                    ChatMessage.created_at > after_time,
                    ChatMessage.is_active.is_(True),
                )
            )
            .values(is_active=False)
        )
        result = await self.db.execute(stmt)
        return result.rowcount

    async def list_active_before(
        self,
        session_id: int,
        before_time: datetime,
        *,
        limit: int = 50,
    ) -> Sequence[ChatMessage]:
        """List active messages created before a specific time."""
        stmt = (
            select(ChatMessage)
            .where(
                and_(
                    ChatMessage.session_id == session_id,
                    ChatMessage.created_at < before_time,
                    ChatMessage.is_active.is_(True),
                )
            )
            .order_by(ChatMessage.created_at.asc())
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def list_by_session_with_active_filter(
        self,
        session_id: int,
        include_inactive: bool = False,
        *,
        limit: int = 500,
    ) -> Sequence[ChatMessage]:
        """
        List messages with optional filtering for active/inactive state.
        """
        stmt = select(ChatMessage).where(ChatMessage.session_id == session_id)
        if not include_inactive:
            stmt = stmt.where(ChatMessage.is_active.is_(True))
        stmt = stmt.order_by(ChatMessage.created_at.asc()).limit(limit)
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def list_active_by_session(
        self, session_id: int, *, limit: int = 500
    ) -> Sequence[ChatMessage]:
        """List only active messages in a session."""
        return await self.list_by_session_with_active_filter(
            session_id, include_inactive=False, limit=limit
        )

    async def get_branch_points(self, session_id: int) -> List[int]:
        """
        Identify messages that act as branch points (parents to multiple messages).
        Returns a list of parent_message_ids.
        """
        stmt = (
            select(ChatMessage.parent_message_id)
            .where(ChatMessage.session_id == session_id)
            .group_by(ChatMessage.parent_message_id)
            .having(func.count(ChatMessage.id) > 1)
        )
        result = await self.db.execute(stmt)
        return [row.parent_message_id for row in result.all() if row.parent_message_id is not None]

    async def deactivate_sibling_branches(
        self,
        parent_id: int,
        exclude_id: int,
        session_id: int,
    ) -> None:
        """
        Deactivate all sibling paths from a branch point, except the chosen one.
        Also recursively deactivates their descendants.
        """
        # Get siblings
        siblings = await self.db.execute(
            select(ChatMessage).where(
                and_(
                    ChatMessage.parent_message_id == parent_id,
                    ChatMessage.id != exclude_id,
                )
            )
        )
        for sibling in siblings.scalars().all():
            sibling.is_active = False
            # Also deactivate sibling's descendants (everything chronologically after it)
            await self.mark_descendants_inactive(session_id, sibling.created_at)

    async def activate_descendants(self, message_id: int) -> None:
        """
        Recursively set is_active=True for a message tree starting from `message_id`.
        """
        stack = [message_id]
        while stack:
            current_id = stack.pop()
            # Find children of current
            desc_result = await self.db.execute(
                select(ChatMessage).where(ChatMessage.parent_message_id == current_id)
            )
            for descendant in desc_result.scalars().all():
                descendant.is_active = True
                stack.append(descendant.id)

    async def count_by_session(self, session_id: int) -> int:
        """Get the total number of messages in a session."""
        result = await self.db.execute(
            select(func.count(ChatMessage.id)).where(ChatMessage.session_id == session_id)
        )
        return result.scalar() or 0

    async def search_messages(
        self,
        user_id: int,
        query: str,
        *,
        limit: int = 50,
    ) -> Sequence[Tuple[ChatMessage, ChatSession, float]]:
        """
        Full-text search on message content using PostgreSQL FTS.

        Joins with ChatSession for ownership verification.
        Uses plainto_tsquery for natural language queries, ILIKE fallback for short queries.
        Returns (Message, Session, relevance_score) tuples ordered by relevance then recency.
        """
        from sqlalchemy import text, literal_column

        query = query.strip()
        if not query:
            return []

        # For short queries (< 3 chars), use ILIKE fallback
        if len(query) < 3:
            stmt = (
                select(
                    ChatMessage,
                    ChatSession,
                    literal_column("1.0").label("score"),
                )
                .join(ChatSession, ChatMessage.session_id == ChatSession.id)
                .where(
                    and_(
                        ChatSession.user_id == user_id,
                        ChatSession.deleted_at.is_(None),
                        ChatMessage.content.ilike(f"%{query}%"),
                    )
                )
                .order_by(ChatMessage.created_at.desc())
                .limit(limit)
            )
        else:
            # PostgreSQL full-text search with ts_rank
            stmt = (
                select(
                    ChatMessage,
                    ChatSession,
                    func.ts_rank(
                        func.to_tsvector("english", ChatMessage.content),
                        func.plainto_tsquery("english", query),
                    ).label("score"),
                )
                .join(ChatSession, ChatMessage.session_id == ChatSession.id)
                .where(
                    and_(
                        ChatSession.user_id == user_id,
                        ChatSession.deleted_at.is_(None),
                        func.to_tsvector("english", ChatMessage.content).op("@@")(
                            func.plainto_tsquery("english", query)
                        ),
                    )
                )
                .order_by(text("score DESC"), ChatMessage.created_at.desc())
                .limit(limit)
            )

        result = await self.db.execute(stmt)
        return result.all()


class ChatThreadRepository:
    """
    Repository for ChatThread entities.
    Used for managing named threads/branches (if applicable in future).
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(
        self,
        thread_id: int,
        *,
        session_id: Optional[int] = None,
    ) -> Optional[ChatThread]:
        """Get a thread by ID."""
        conditions = [ChatThread.id == thread_id]
        if session_id is not None:
            conditions.append(ChatThread.session_id == session_id)

        result = await self.db.execute(select(ChatThread).where(and_(*conditions)))
        return result.scalar_one_or_none()

    async def list_by_session(
        self,
        session_id: int,
    ) -> Sequence[ChatThread]:
        """List threads in a session."""
        stmt = (
            select(ChatThread)
            .where(ChatThread.session_id == session_id)
            .order_by(ChatThread.created_at.asc())
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def create(
        self,
        session_id: int,
        parent_message_id: int,
        title: Optional[str] = None,
    ) -> ChatThread:
        """Create a new thread."""
        thread = ChatThread(
            session_id=session_id,
            parent_message_id=parent_message_id,
            title=title,
        )
        self.db.add(thread)
        await self.db.flush()
        await self.db.refresh(thread)
        return thread


def get_repositories(
    db: AsyncSession,
) -> Tuple[
    ChatSessionRepository,
    ChatMessageRepository,
    ChatThreadRepository,
]:
    """Helper to get all initialized repositories."""
    return (
        ChatSessionRepository(db),
        ChatMessageRepository(db),
        ChatThreadRepository(db),
    )
