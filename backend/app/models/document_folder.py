"""
DocumentFolder model.

Hierarchical folder structure for organizing documents.
Supports drag-and-drop reordering via lexorank.
"""

from typing import Optional, TYPE_CHECKING

from sqlalchemy import (
    String,
    Boolean,
    ForeignKey,
    UniqueConstraint,
    Index,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from .mixins import TimestampMixin, UserOwnedMixin

if TYPE_CHECKING:
    from .document import Document


class DocumentFolder(Base, TimestampMixin, UserOwnedMixin):
    """
    Folder model for document organization.

    Implements an adjacency list tree structure with lexorank ordering
    for stable drag-and-drop reordering.
    """

    __tablename__ = "document_folders"

    # Primary Key
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True, doc="Primary key")

    # Folder name
    name: Mapped[str] = mapped_column(String(255), nullable=False, doc="Folder display name")

    # Parent folder (null = root level)
    parent_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("document_folders.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
        doc="Parent folder ID (null for root folders)",
    )

    # Lexorank for stable ordering (backend-generated only)
    rank: Mapped[str] = mapped_column(
        String(64), nullable=False, default="a0", doc="Lexorank string for sibling ordering"
    )

    # System folders (Inbox, Archive, etc.) cannot be deleted/renamed
    is_system: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, doc="System folder flag (prevents deletion/rename)"
    )

    # Pinned folders appear at top
    is_pinned: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, doc="Pin folder to top of list"
    )

    # Customization settings (icon, color, etc.)
    settings: Mapped[Optional[dict]] = mapped_column(
        JSONB, nullable=True, default=None, doc="Folder settings: {icon: string, color: string}"
    )

    # -------------------------------------------------------------------------
    # Relationships
    # -------------------------------------------------------------------------

    # Self-referential relationship for tree structure
    children: Mapped[list["DocumentFolder"]] = relationship(
        "DocumentFolder",
        back_populates="parent",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    parent: Mapped[Optional["DocumentFolder"]] = relationship(
        "DocumentFolder",
        back_populates="children",
        remote_side="DocumentFolder.id",
    )

    # Documents in this folder
    documents: Mapped[list["Document"]] = relationship(
        "Document",
        back_populates="folder",
        foreign_keys="Document.folder_id",
    )

    # -------------------------------------------------------------------------
    # Constraints
    # -------------------------------------------------------------------------

    __table_args__ = (
        # Prevent duplicate folder names under the same parent
        UniqueConstraint("user_id", "parent_id", "name", name="uq_folder_name_per_parent"),
        # Index for efficient tree queries
        Index("ix_document_folders_parent", "user_id", "parent_id"),
    )

    def __repr__(self) -> str:
        """String representation of DocumentFolder."""
        return (
            f"<DocumentFolder(id={self.id}, name='{self.name}', "
            f"parent_id={self.parent_id}, is_system={self.is_system})>"
        )

    @property
    def is_root(self) -> bool:
        """Check if this is a root folder."""
        return self.parent_id is None


# Default system folders (seeded on user creation)
DEFAULT_SYSTEM_FOLDERS = [
    {"name": "Inbox", "rank": "a0", "settings": {"icon": "inbox", "color": "#8B5CF6"}},
    {"name": "Notes", "rank": "a1", "settings": {"icon": "file-text", "color": "#F59E0B"}},
    {"name": "Books", "rank": "a2", "settings": {"icon": "book-open", "color": "#EC4899"}},
    {"name": "Media", "rank": "a3", "settings": {"icon": "image", "color": "#06B6D4"}},
    {"name": "Projects", "rank": "a4", "settings": {"icon": "folder-kanban", "color": "#10B981"}},
    {"name": "Exports", "rank": "a5", "settings": {"icon": "download", "color": "#6366F1"}},
    {"name": "Archive", "rank": "a6", "settings": {"icon": "archive", "color": "#6B7280"}},
]
