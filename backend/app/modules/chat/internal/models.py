"""
Chat Module — ORM Models

All SQLAlchemy models for the Chat domain.

IMPORTANT: These models are INTERNAL to the Chat module.
No other module should import directly from this file.
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional, List, Literal
import enum

from sqlalchemy import (
    String,
    Text,
    Integer,
    Boolean,
    Numeric,
    JSON,
    ForeignKey,
    DateTime,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Enum as SQLEnum

# Core imports from shared infrastructure
from app.models.base import Base
from app.models.mixins import TimestampMixin, SoftDeleteMixin, UserOwnedMixin
from app.db.types import Vector
from app.core.ai.embeddings.boundary import EMBEDDING_DIM


# =============================================================================
# ENUMS
# =============================================================================


class MessageRole(str, enum.Enum):
    """Enum for message roles."""

    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


# =============================================================================
# CHAT SESSION
# =============================================================================


class ChatSession(Base, TimestampMixin, SoftDeleteMixin, UserOwnedMixin):
    """
    Chat session model.

    Represents a conversation thread with the AI tutor. Sessions can be
    general or focused on specific documents. Tracks token usage and costs.
    """

    __tablename__ = "chat_sessions"

    # Primary Key
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True, doc="Primary key")

    # Session Information
    title: Mapped[str] = mapped_column(
        String(500), nullable=False, doc="Session title (auto-generated or user-set)"
    )

    # Context Configuration
    document_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("documents.id", ondelete="SET NULL"),
        nullable=True,
        default=None,
        index=True,
        doc="Optional document to chat about",
    )

    context_modules: Mapped[Optional[dict]] = mapped_column(
        JSON,
        nullable=True,
        default=None,
        doc="List of modules to include in context (e.g., ['flashcards', 'notes'])",
    )

    # Session Source — discriminator so tutor sessions never appear in Chat sidebar.
    # 'chat'  = normal user-initiated conversation (default, visible in sidebar)
    # 'tutor' = Card Tutor session, deck-scoped (only visible from deck detail page)
    source: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="chat",
        server_default="chat",
        index=True,
        doc="Session source: 'chat' (normal) or 'tutor' (Card Tutor, hidden from main sidebar)",
    )

    # Deck anchor — for tutor sessions this links the session to one deck.
    # When source='tutor', all messages in this session relate to cards of this deck.
    deck_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("decks.id", ondelete="SET NULL"),
        nullable=True,
        default=None,
        index=True,
        doc="Deck this tutor session is anchored to (tutor sessions only)",
    )

    # Resource Tracking
    total_tokens_used: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False, doc="Total tokens consumed in this session"
    )

    total_cost: Mapped[Decimal] = mapped_column(
        Numeric(precision=10, scale=6),
        default=Decimal("0.000000"),
        nullable=False,
        doc="Estimated total cost (USD)",
    )

    # Relationships
    threads: Mapped[List["ChatThread"]] = relationship(
        "ChatThread",
        back_populates="session",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="ChatThread.created_at",
    )

    @property
    def thread_count(self) -> int:
        """Number of threads in this session."""
        return len(self.threads) if self.threads else 0

    def __repr__(self) -> str:
        """String representation of ChatSession."""
        return f"<ChatSession(id={self.id}, title='{self.title[:30]}...', user_id={self.user_id})>"


# =============================================================================
# CHAT MESSAGE
# =============================================================================


class ChatMessage(Base):
    """
    Chat message model with branching and threading support.

    Represents individual messages in a conversation. Tracks role (user/assistant),
    content, and metadata about AI generation (model used, tokens, function calls).

    INVARIANT: Threads and Branches are MUTUALLY EXCLUSIVE.
    - If thread_id IS NOT NULL → parent_message_id MUST BE NULL
    - If parent_message_id IS NOT NULL → thread_id MUST BE NULL

    Threading Model (Topic Isolation):
    - thread_id: Associates message with a side thread
    - Threads partition context, not inherit it
    - Mental model: "Let's talk about something else"

    Branching Model (Counterfactual Exploration):
    - parent_message_id: Creates tree structure for branching
    - version: Tracks edits/regenerations of the same logical message
    - is_active: Marks which branch is currently "active"
    - Mental model: "What if we answered differently?"

    One-sentence distinction:
        Threads change the question.
        Branches change the answer.
    """

    __tablename__ = "chat_messages"

    # Primary Key
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True, doc="Primary key")

    # Foreign Keys
    session_id: Mapped[int] = mapped_column(
        ForeignKey("chat_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="ID of the chat session",
    )

    # Branching: Self-referential tree structure
    parent_message_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("chat_messages.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        doc="Parent message ID (NULL for root messages, set for branched/forked messages)",
    )

    # Thread association (for topic isolation)
    thread_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("chat_threads.id", ondelete="CASCADE"),
        nullable=True,
        default=None,
        index=True,
        doc="Thread ID (NULL for main conversation, set for thread messages)",
    )

    # Card Tutor anchor — which flashcard this message is associated with.
    # Set on all messages within a Card Tutor session so we can query
    # "all conversations the user had while studying card 142".
    card_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("flashcards.id", ondelete="SET NULL"),
        nullable=True,
        default=None,
        index=True,
        doc="Flashcard this message is anchored to (Card Tutor sessions only)",
    )

    # Version tracking for edits/regenerations
    version: Mapped[int] = mapped_column(
        Integer, default=1, nullable=False, doc="Version number (increments on edit/regenerate)"
    )

    # Branch selection
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        index=True,
        doc="Whether this message is on the active branch path",
    )

    # Message Content
    role: Mapped[MessageRole] = mapped_column(
        SQLEnum(MessageRole, native_enum=False), nullable=False, doc="Role of the message sender"
    )

    content: Mapped[str] = mapped_column(Text, nullable=False, doc="Message content")

    # Embedding for hybrid search (Q+A pair embedding for assistant messages)
    embedding: Mapped[Optional[List[float]]] = mapped_column(
        Vector(EMBEDDING_DIM),
        nullable=True,
        default=None,
        doc="Vector embedding for semantic search (dimension from boundary.EMBEDDING_DIM)",
    )

    # AI Metadata (for assistant messages)
    tokens: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False, doc="Token count for this message"
    )

    model_used: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        default=None,
        doc="AI model used (e.g., 'flash', 'pro', 'flash-lite')",
    )

    function_calls: Mapped[Optional[dict]] = mapped_column(
        JSON, nullable=True, default=None, doc="Function calls made by assistant (tool usage)"
    )

    grounding_sources: Mapped[Optional[dict]] = mapped_column(
        JSON, nullable=True, default=None, doc="Grounding sources used (if grounding enabled)"
    )

    # Attachments (images, documents uploaded in chat)
    attachments: Mapped[Optional[list]] = mapped_column(
        JSON,
        nullable=True,
        default=None,
        doc="Attached files [{document_id, filename, content_type, size_bytes}]",
    )

    # Timestamp
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
        doc="Timestamp when message was created",
    )

    # Relationships
    children: Mapped[List["ChatMessage"]] = relationship(
        "ChatMessage",
        back_populates="parent",
        foreign_keys=[parent_message_id],
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    parent: Mapped[Optional["ChatMessage"]] = relationship(
        "ChatMessage",
        back_populates="children",
        remote_side=[id],
        foreign_keys=[parent_message_id],
    )

    thread: Mapped[Optional["ChatThread"]] = relationship(
        "ChatThread",
        back_populates="messages",
        lazy="selectin",
        foreign_keys=[thread_id],
    )

    def __repr__(self) -> str:
        """String representation of ChatMessage."""
        return f"<ChatMessage(id={self.id}, session_id={self.session_id}, role={self.role.value}, v{self.version})>"

    @property
    def is_user_message(self) -> bool:
        """Check if message is from user."""
        return self.role == MessageRole.USER

    @property
    def is_assistant_message(self) -> bool:
        """Check if message is from assistant."""
        return self.role == MessageRole.ASSISTANT

    @property
    def is_root(self) -> bool:
        """Check if this is a root message (no parent)."""
        return self.parent_message_id is None

    @property
    def in_thread(self) -> bool:
        """Check if this message belongs to a thread (topic isolation)."""
        return self.thread_id is not None

    @property
    def is_branched(self) -> bool:
        """Check if this message is a branch (counterfactual)."""
        return self.parent_message_id is not None

    @property
    def is_branch_point(self) -> bool:
        """Check if this message has multiple children (branch point)."""
        return len(self.children) > 1 if self.children else False

    @property
    def has_alternate_versions(self) -> bool:
        """Check if there are sibling messages (alternatives from same parent)."""
        if self.parent is None:
            return False
        return len(self.parent.children) > 1

    @property
    def embedding_text(self) -> str:
        """
        Generate rich text for embedding.

        Strategy (Q+A pair embedding with session context):
        - Session title provides topical prior
        - User question (parent) provides intent
        - Assistant answer provides meaning
        """
        parts = []

        if hasattr(self, "session") and self.session and self.session.title:
            parts.append(f"Session: {self.session.title}")

        if self.role == MessageRole.ASSISTANT and self.parent:
            parts.append(f"Q: {self.parent.content}")
            parts.append(f"A: {self.content}")
        else:
            parts.append(self.content)

        return "\n".join(parts)


# =============================================================================
# CHAT THREAD
# =============================================================================


class ChatThread(Base, TimestampMixin):
    """
    Chat thread model for topic isolation.

    Threads belong to sessions and contain messages.
    They represent "new lines of inquiry" that don't
    inherit future context from the main conversation.

    Mental model: "Let's park this and talk about X"
    UX: Grok-style slide-out panel
    """

    __tablename__ = "chat_threads"

    # Primary Key
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True, doc="Primary key")

    # Parent Session
    session_id: Mapped[int] = mapped_column(
        ForeignKey("chat_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Session this thread belongs to",
    )

    # Origin Point (optional)
    created_from_message_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("chat_messages.id", ondelete="SET NULL"),
        nullable=True,
        default=None,
        doc="Message that spawned this thread (for context)",
    )

    # Thread Metadata
    title: Mapped[str] = mapped_column(
        String(500), nullable=False, doc="Thread title (auto-generated or user-set)"
    )

    summary: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True, default=None, doc="AI-generated summary of thread discussion"
    )

    # Relationships
    session: Mapped["ChatSession"] = relationship(
        "ChatSession", back_populates="threads", lazy="selectin"
    )

    messages: Mapped[List["ChatMessage"]] = relationship(
        "ChatMessage",
        back_populates="thread",
        lazy="selectin",
        order_by="ChatMessage.created_at",
        foreign_keys="ChatMessage.thread_id",
    )

    origin_message: Mapped[Optional["ChatMessage"]] = relationship(
        "ChatMessage",
        foreign_keys=[created_from_message_id],
        lazy="selectin",
    )

    @property
    def message_count(self) -> int:
        """Number of messages in this thread."""
        return len(self.messages) if self.messages else 0

    def __repr__(self) -> str:
        """String representation of ChatThread."""
        return (
            f"<ChatThread(id={self.id}, title='{self.title[:30]}...', "
            f"session_id={self.session_id})>"
        )


# =============================================================================
# MODULE EXPORTS
# =============================================================================

__all__ = [
    "MessageRole",
    "ChatSession",
    "ChatMessage",
    "ChatThread",
]
