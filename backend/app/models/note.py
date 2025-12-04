"""
Note model.

Hierarchical note-taking system with support for markdown, HTML, and plain text.
Supports parent-child relationships for organizing notes.
"""

from typing import Optional
import enum

from sqlalchemy import String, Text, Integer, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from .mixins import TimestampMixin, SoftDeleteMixin, UserOwnedMixin


class NoteFormat(str, enum.Enum):
    """Enum for note content formats."""
    MARKDOWN = "markdown"
    HTML = "html"
    PLAIN = "plain"


class Note(Base, TimestampMixin, SoftDeleteMixin, UserOwnedMixin):
    """
    Note model with hierarchical structure.

    Supports parent-child relationships for organizing notes in a tree structure.
    Can store content in multiple formats (markdown, HTML, plain text).
    """

    __tablename__ = "notes"

    # Primary Key
    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
        doc="Primary key"
    )

    # Content
    title: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
        doc="Title of the note"
    )

    content: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        doc="Content of the note"
    )

    format: Mapped[NoteFormat] = mapped_column(
        SQLEnum(NoteFormat, native_enum=False),
        default=NoteFormat.MARKDOWN,
        nullable=False,
        doc="Format of the note content"
    )

    # Hierarchy
    parent_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("notes.id", ondelete="CASCADE"),
        nullable=True,
        default=None,
        index=True,
        doc="ID of parent note (NULL for root notes)"
    )

    # Vector Embedding Reference
    embedding_id: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        default=None,
        doc="Reference to vector embedding in LanceDB"
    )

    # Relationships
    # versions: One-to-many with NoteVersion (defined in note_version.py)
    # tags: Many-to-many with Tag (requires association table)
    # children: One-to-many self-referential relationship
    children: Mapped[list["Note"]] = relationship(
        "Note",
        back_populates="parent",
        cascade="all, delete-orphan",
        foreign_keys=[parent_id]
    )

    # parent: Many-to-one self-referential relationship
    parent: Mapped[Optional["Note"]] = relationship(
        "Note",
        back_populates="children",
        remote_side=[id],
        foreign_keys=[parent_id]
    )

    # user: Many-to-one with User (provided by UserOwnedMixin)

    def __repr__(self) -> str:
        """String representation of Note."""
        return (
            f"<Note(id={self.id}, title='{self.title[:30]}...', "
            f"user_id={self.user_id})>"
        )

    @property
    def is_root(self) -> bool:
        """Check if this is a root note (no parent)."""
        return self.parent_id is None

    @property
    def depth(self) -> int:
        """Calculate depth in hierarchy (0 for root)."""
        depth = 0
        current = self
        while current.parent_id is not None:
            depth += 1
            current = current.parent
        return depth
