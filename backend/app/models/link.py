"""
Link model.

Represents connections between entities in Synapse.
Enables the knowledge graph and interconnected learning experience.
"""

import enum
from typing import Optional

from sqlalchemy import String, Float, Integer, JSON, Enum as SQLEnum, Index
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base
from .mixins import TimestampMixin, UserOwnedMixin


class LinkType(str, enum.Enum):
    """Types of links between entities."""
    MANUAL = "manual"         # User-created explicit link
    MENTION = "mention"       # [[wiki-style]] reference in content
    DERIVED = "derived"       # Derived from source (quiz from notes, flashcards from doc)
    SUGGESTED = "suggested"   # AI suggested, not yet accepted
    SEMANTIC = "semantic"     # Auto-detected via RAG similarity


class EntityType(str, enum.Enum):
    """Entity types that can be linked."""
    NOTE = "note"
    DECK = "deck"
    FLASHCARD = "flashcard"
    DOCUMENT = "document"
    QUIZ = "quiz"
    CHAT_SESSION = "chat_session"


class Link(Base, TimestampMixin, UserOwnedMixin):
    """
    Link model for knowledge graph connections.

    Stores bidirectional relationships between any two entities.
    Powers the knowledge graph, related content, and backlinks features.
    """

    __tablename__ = "links"

    # Primary Key
    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
        doc="Primary key"
    )

    # Source Entity
    source_type: Mapped[EntityType] = mapped_column(
        SQLEnum(EntityType, native_enum=False),
        nullable=False,
        doc="Type of the source entity"
    )

    source_id: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        doc="ID of the source entity"
    )

    # Target Entity
    target_type: Mapped[EntityType] = mapped_column(
        SQLEnum(EntityType, native_enum=False),
        nullable=False,
        doc="Type of the target entity"
    )

    target_id: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        doc="ID of the target entity"
    )

    # Link Properties
    link_type: Mapped[LinkType] = mapped_column(
        SQLEnum(LinkType, native_enum=False),
        default=LinkType.MANUAL,
        nullable=False,
        doc="Type of link relationship"
    )

    strength: Mapped[float] = mapped_column(
        Float,
        default=1.0,
        nullable=False,
        doc="Link strength/confidence (0.0-1.0)"
    )

    label: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        default=None,
        doc="Optional human-readable label for the link"
    )

    # Metadata
    link_metadata: Mapped[Optional[dict]] = mapped_column(
        JSON,
        nullable=True,
        default=None,
        doc="Additional metadata (context, snippet, AI reasoning, etc.)"
    )

    # Indexes for efficient querying
    __table_args__ = (
        # Find all links FROM an entity
        Index('ix_links_source', 'source_type', 'source_id'),
        # Find all links TO an entity (backlinks)
        Index('ix_links_target', 'target_type', 'target_id'),
        # Find links by type
        Index('ix_links_type', 'link_type'),
        # User's links
        Index('ix_links_user', 'user_id'),
    )

    def __repr__(self) -> str:
        """String representation of Link."""
        return (
            f"<Link(id={self.id}, "
            f"{self.source_type.value}:{self.source_id} -> "
            f"{self.target_type.value}:{self.target_id}, "
            f"type={self.link_type.value})>"
        )

    @property
    def source_key(self) -> str:
        """Get composite key for source entity."""
        return f"{self.source_type.value}:{self.source_id}"

    @property
    def target_key(self) -> str:
        """Get composite key for target entity."""
        return f"{self.target_type.value}:{self.target_id}"

    @property
    def is_accepted(self) -> bool:
        """Check if link is user-accepted (not just suggested)."""
        return self.link_type != LinkType.SUGGESTED
