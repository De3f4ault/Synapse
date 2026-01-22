"""
Chat thread model.

Threads represent topic isolation within a chat session.
They partition context for focused discussion without
polluting the main conversation.

INVARIANT: Threads are orthogonal to branches.
- If a message has thread_id, it MUST NOT have parent_message_id
- If a message has parent_message_id, it MUST NOT have thread_id

Threads change the question.
Branches change the answer.
"""

from typing import Optional, TYPE_CHECKING

from sqlalchemy import String, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from .mixins import TimestampMixin

if TYPE_CHECKING:
    from .chat_session import ChatSession
    from .chat_message import ChatMessage


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

    # Messages in this thread (uses ChatMessage.thread_id as the FK)
    messages: Mapped[list["ChatMessage"]] = relationship(
        "ChatMessage",
        back_populates="thread",
        lazy="selectin",
        order_by="ChatMessage.created_at",
        foreign_keys="ChatMessage.thread_id",
    )

    # Origin message (uses created_from_message_id as the FK)
    # This is the message that spawned the thread, NOT a member of the thread
    origin_message: Mapped[Optional["ChatMessage"]] = relationship(
        "ChatMessage",
        foreign_keys=[created_from_message_id],
        lazy="selectin",
    )

    # Computed Properties
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
