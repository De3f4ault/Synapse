"""
Note version history model.

Tracks all versions of notes for audit trail and undo functionality.
Preserves complete history of note changes.
"""

from datetime import datetime

from sqlalchemy import String, Text, Integer, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Enum as SQLEnum

from .base import Base
from .note import NoteFormat


class NoteVersion(Base):
    """
    Note version history.

    Stores snapshots of note content at each edit. Enables:
    - Version history browsing
    - Undo/redo functionality
    - Audit trail
    """

    __tablename__ = "note_versions"

    # Primary Key
    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
        doc="Primary key"
    )

    # Foreign Keys
    note_id: Mapped[int] = mapped_column(
        ForeignKey("notes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="ID of the note this version belongs to"
    )

    created_by: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=False,
        doc="ID of the user who created this version"
    )

    # Version Information
    version_number: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        doc="Sequential version number (1, 2, 3, ...)"
    )

    # Snapshot of Content
    title: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
        doc="Title at this version"
    )

    content: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        doc="Content at this version"
    )

    format: Mapped[NoteFormat] = mapped_column(
        SQLEnum(NoteFormat, native_enum=False),
        nullable=False,
        doc="Format at this version"
    )

    # Timestamp
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
        doc="Timestamp when this version was created"
    )

    # Relationships
    # note: Many-to-one with Note
    # creator: Many-to-one with User

    def __repr__(self) -> str:
        """String representation of NoteVersion."""
        return (
            f"<NoteVersion(id={self.id}, note_id={self.note_id}, "
            f"version={self.version_number}, created_at={self.created_at})>"
        )
