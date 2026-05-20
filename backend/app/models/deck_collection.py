"""
DeckCollection Model — Folder/collection hierarchy for organising decks.

One extra organisational layer:
    DeckCollection (folder)
        └── Deck
              └── Flashcard

Supports optional nesting via self-referential parent_id.
We start single-depth and enable nesting later when the UI is ready.
"""

from typing import Optional

from sqlalchemy import ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base
from .mixins import TimestampMixin, UserOwnedMixin


class DeckCollection(Base, TimestampMixin, UserOwnedMixin):
    """
    A named folder that groups related decks.

    Attributes:
        name: Display name (e.g. "Mathematics", "Computer Science")
        description: Optional longer description
        parent_id: Optional FK for nested collections (not yet used in UI)
        name_embedding_hint: Lowercased name stored for similarity matching
                             without a full pgvector call. Populated on save.
    """

    __tablename__ = "deck_collections"
    __table_args__ = (
        # Primary lookup: all collections for a user
        Index("ix_deck_collections_user_id", "user_id"),
        # For AI categorisation similarity check (query by user + name)
        Index("ix_deck_collections_user_name", "user_id", "name"),
    )

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True, doc="Primary key"
    )

    name: Mapped[str] = mapped_column(
        String(255), nullable=False, doc="Display name of the collection"
    )

    description: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True, doc="Optional description"
    )

    # Self-referential parent for nested collections.
    # nullable=True means root-level collections have no parent.
    parent_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("deck_collections.id", ondelete="SET NULL"),
        nullable=True,
        default=None,
        doc="Parent collection ID for nesting (null = root level)",
    )

    def __repr__(self) -> str:
        return f"<DeckCollection(id={self.id}, name='{self.name}', user_id={self.user_id})>"
