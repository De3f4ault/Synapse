"""
Chat message model.

Individual messages within chat sessions.
Tracks content, role, and AI model usage.
"""

from datetime import datetime
from typing import Optional
import enum

from sqlalchemy import String, Text, Integer, JSON, ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Enum as SQLEnum

from .base import Base


class MessageRole(str, enum.Enum):
    """Enum for message roles."""
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class ChatMessage(Base):
    """
    Chat message model.

    Represents individual messages in a conversation. Tracks role (user/assistant),
    content, and metadata about AI generation (model used, tokens, function calls).
    """

    __tablename__ = "chat_messages"

    # Primary Key
    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
        doc="Primary key"
    )

    # Foreign Keys
    session_id: Mapped[int] = mapped_column(
        ForeignKey("chat_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="ID of the chat session"
    )

    # Message Content
    role: Mapped[MessageRole] = mapped_column(
        SQLEnum(MessageRole, native_enum=False),
        nullable=False,
        doc="Role of the message sender"
    )

    content: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        doc="Message content"
    )

    # AI Metadata (for assistant messages)
    tokens: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        doc="Token count for this message"
    )

    model_used: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        default=None,
        doc="AI model used (e.g., 'flash', 'pro', 'flash-lite')"
    )

    function_calls: Mapped[Optional[dict]] = mapped_column(
        JSON,
        nullable=True,
        default=None,
        doc="Function calls made by assistant (tool usage)"
    )

    grounding_sources: Mapped[Optional[dict]] = mapped_column(
        JSON,
        nullable=True,
        default=None,
        doc="Grounding sources used (if grounding enabled)"
    )

    # Timestamp
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
        doc="Timestamp when message was created"
    )

    # Relationships
    # session: Many-to-one with ChatSession

    def __repr__(self) -> str:
        """String representation of ChatMessage."""
        return (
            f"<ChatMessage(id={self.id}, session_id={self.session_id}, "
            f"role={self.role.value})>"
        )

    @property
    def is_user_message(self) -> bool:
        """Check if message is from user."""
        return self.role == MessageRole.USER

    @property
    def is_assistant_message(self) -> bool:
        """Check if message is from assistant."""
        return self.role == MessageRole.ASSISTANT
