"""
Chat session model.

Represents conversational sessions with AI tutor.
Tracks context configuration and resource usage.
"""

from decimal import Decimal
from typing import Optional

from sqlalchemy import String, Integer, Numeric, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from .mixins import TimestampMixin, SoftDeleteMixin, UserOwnedMixin


class ChatSession(Base, TimestampMixin, SoftDeleteMixin, UserOwnedMixin):
    """
    Chat session model.

    Represents a conversation thread with the AI tutor. Sessions can be
    general or focused on specific documents. Tracks token usage and costs.
    """

    __tablename__ = "chat_sessions"

    # Primary Key
    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
        doc="Primary key"
    )

    # Session Information
    title: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
        doc="Session title (auto-generated or user-set)"
    )

    # Context Configuration
    document_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("documents.id", ondelete="SET NULL"),
        nullable=True,
        default=None,
        index=True,
        doc="Optional document to chat about"
    )

    context_modules: Mapped[Optional[dict]] = mapped_column(
        JSON,
        nullable=True,
        default=None,
        doc="List of modules to include in context (e.g., ['flashcards', 'notes'])"
    )

    # Resource Tracking
    total_tokens_used: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        doc="Total tokens consumed in this session"
    )

    total_cost: Mapped[Decimal] = mapped_column(
        Numeric(precision=10, scale=6),
        default=Decimal("0.000000"),
        nullable=False,
        doc="Estimated total cost (USD)"
    )

    # Relationships
    # messages: One-to-many with ChatMessage (defined in chat_message.py)
    # document: Many-to-one with Document (optional)
    # user: Many-to-one with User (provided by UserOwnedMixin)

    def __repr__(self) -> str:
        """String representation of ChatSession."""
        return (
            f"<ChatSession(id={self.id}, title='{self.title[:30]}...', "
            f"user_id={self.user_id})>"
        )
