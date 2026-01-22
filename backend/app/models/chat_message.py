"""
Chat message model.

Individual messages within chat sessions.
Tracks content, role, and AI model usage.
Supports conversation branching via tree structure.
"""

from datetime import datetime
from typing import Optional, List, TYPE_CHECKING
import enum


from sqlalchemy import String, Text, Integer, Boolean, JSON, ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Enum as SQLEnum

from .base import Base
from app.db.types import Vector

if TYPE_CHECKING:
    from .chat_thread import ChatThread


class MessageRole(str, enum.Enum):
    """Enum for message roles."""

    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


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
    # INVARIANT: If thread_id is set, parent_message_id MUST be NULL
    parent_message_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("chat_messages.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        doc="Parent message ID (NULL for root messages, set for branched/forked messages)",
    )

    # Thread association (for topic isolation)
    # INVARIANT: If parent_message_id is set, thread_id MUST be NULL
    thread_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("chat_threads.id", ondelete="CASCADE"),
        nullable=True,
        default=None,
        index=True,
        doc="Thread ID (NULL for main conversation, set for thread messages)",
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
    embedding: Mapped[Optional[list[float]]] = mapped_column(
        Vector(384),  # MiniLM-L6-v2 dimension
        nullable=True,
        default=None,
        doc="Vector embedding (384-dim) for semantic search",
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

    # Timestamp
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
        doc="Timestamp when message was created",
    )

    # Relationships
    # session: Many-to-one with ChatSession

    # Self-referential relationships for branching tree
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

    # Thread relationship (uses thread_id as FK)
    # IMPORTANT: foreign_keys specified to disambiguate from ChatThread.created_from_message_id
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

        Example output:
            Session: React Hooks Study
            Q: What is photosynthesis?
            A: Photosynthesis is the process by which plants...
        """
        parts = []

        # Add session title as contextual prior (if available)
        if hasattr(self, "session") and self.session and self.session.title:
            parts.append(f"Session: {self.session.title}")

        # For assistant messages: include parent question for full Q+A context
        if self.role == MessageRole.ASSISTANT and self.parent:
            parts.append(f"Q: {self.parent.content}")
            parts.append(f"A: {self.content}")
        else:
            # User messages or standalone: just the content
            parts.append(self.content)

        return "\n".join(parts)
