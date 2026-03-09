"""
Link model.

Represents connections between entities in Synapse.
Enables the knowledge graph and interconnected learning experience.
"""

import enum
from typing import Optional

from sqlalchemy import (
    String,
    Float,
    Integer,
    JSON,
    Enum as SQLEnum,
    Index,
    UniqueConstraint,
    CheckConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base
from .mixins import TimestampMixin, UserOwnedMixin


class LinkType(str, enum.Enum):
    """Types of links between entities."""

    MANUAL = "manual"  # User-created explicit link
    MENTION = "mention"  # [[wiki-style]] reference in content
    DERIVED = "derived"  # Derived from source (quiz from notes, flashcards from doc)
    SUGGESTED = "suggested"  # AI suggested, not yet accepted
    SEMANTIC = "semantic"  # Auto-detected via RAG similarity


class LinkEntityType(str, enum.Enum):
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

    Stores directed relationships between any two entities.
    Powers the knowledge graph, related content, and backlinks features.

    Direction convention (source → target):
        Document → Flashcard   (source produced target)
        Note     → Quiz        (source produced target)
        Deck     → Flashcard   (container → contained)
        EntityA  → EntityB     (semantic similarity, query both directions)
    """

    __tablename__ = "links"

    # Primary Key
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True, doc="Primary key")

    # Source Entity
    source_type: Mapped[LinkEntityType] = mapped_column(
        SQLEnum(LinkEntityType, native_enum=False), nullable=False, doc="Type of the source entity"
    )

    source_id: Mapped[int] = mapped_column(Integer, nullable=False, doc="ID of the source entity")

    # Target Entity
    target_type: Mapped[LinkEntityType] = mapped_column(
        SQLEnum(LinkEntityType, native_enum=False), nullable=False, doc="Type of the target entity"
    )

    target_id: Mapped[int] = mapped_column(Integer, nullable=False, doc="ID of the target entity")

    # Link Properties
    link_type: Mapped[LinkType] = mapped_column(
        SQLEnum(LinkType, native_enum=False),
        default=LinkType.MANUAL,
        nullable=False,
        doc="Type of link relationship",
    )

    strength: Mapped[float] = mapped_column(
        Float, default=1.0, nullable=False, doc="Link strength/confidence (0.0-1.0)"
    )

    label: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True, default=None, doc="Optional human-readable label for the link"
    )

    # Metadata
    link_metadata: Mapped[Optional[dict]] = mapped_column(
        JSON,
        nullable=True,
        default=None,
        doc="Additional metadata (context, snippet, AI reasoning, etc.)",
    )

    # Indexes and constraints
    __table_args__ = (
        # --- Unique constraint for idempotent upserts ---
        # A given (user, source, target, link_type) tuple can only exist once.
        # This enables ON CONFLICT DO UPDATE in create_link.
        UniqueConstraint(
            "user_id",
            "source_type",
            "source_id",
            "target_type",
            "target_id",
            "link_type",
            name="uq_link_edge",
        ),
        # --- Prevent self-links ---
        # An entity cannot link to itself (same type AND same ID).
        CheckConstraint(
            "NOT (source_type = target_type AND source_id = target_id)",
            name="ck_link_no_self_loop",
        ),
        # --- Performance indexes ---
        # Find all links FROM an entity (+ user for scoping)
        Index("ix_links_user_source", "user_id", "source_type", "source_id"),
        # Find all links TO an entity (backlinks + user for scoping)
        Index("ix_links_user_target", "user_id", "target_type", "target_id"),
        # Find links by type
        Index("ix_links_type", "link_type"),
        # User's links (kept for simple user-scoped queries)
        Index("ix_links_user", "user_id"),
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
