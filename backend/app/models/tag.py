"""
Tag model (evolved for DMS classification).

User-defined tags for organizing and categorizing content.
Now inherits MatchingModel for auto-assignment matching,
and supports hierarchy (parent_id) and inbox marking.

Sourced from Paperless-ngx: documents/models.py Tag (L101-138).
"""

from typing import Optional

from sqlalchemy import String, Integer, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .matching import MatchingModel


class Tag(MatchingModel):
    """
    Tag model for content organization with auto-assignment.

    Enhanced with:
    - MatchingModel fields (match, matching_algorithm, is_insensitive)
    - Hierarchy support (parent_id for nested tags)
    - Inbox tag flag (auto-applied to new documents)
    - Color coding for visual organization

    Paperless reference: documents/models.py Tag (L101-138).
    """

    __tablename__ = "tags"

    # Primary Key
    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True,
        doc="Primary key",
    )

    # Tag-specific fields
    color: Mapped[str] = mapped_column(
        String(7), nullable=False, default="#a6cee3",
        doc="Hex color code (e.g., '#a6cee3')",
    )

    is_inbox_tag: Mapped[bool] = mapped_column(
        Boolean, default=False,
        doc="Auto-applied to all newly consumed documents",
    )

    # Hierarchy (self-referential, max depth 5)
    parent_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("tags.id", ondelete="SET NULL"),
        nullable=True,
        doc="Parent tag for hierarchy (NULL = root tag)",
    )

    # Relationships
    parent = relationship(
        "Tag",
        remote_side=[id],
        back_populates="children",
    )

    children = relationship(
        "Tag",
        back_populates="parent",
        cascade="all",
    )

    documents = relationship(
        "Document",
        secondary="document_tags",
        back_populates="tags",
        lazy="dynamic",
    )

    # Constraints
    __table_args__ = (
        UniqueConstraint("user_id", "name", name="uq_user_tag_name"),
    )

    def __repr__(self) -> str:
        return f"<Tag(id={self.id}, name='{self.name}', user_id={self.user_id})>"
