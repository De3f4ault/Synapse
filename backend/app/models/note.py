"""
Note model.

BlockSuite-powered note system with JSONB content storage.
Supports parent-child relationships for organizing notes.

VAULT RULE: Database stores raw BlockSuite snapshots. No parsing or modification.
"""

from typing import Optional, Any
import enum

from sqlalchemy import String, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from .mixins import TimestampMixin, SoftDeleteMixin, UserOwnedMixin
from app.db.types import Vector
from app.core.ai.embeddings.boundary import EMBEDDING_DIM


class NoteFormat(str, enum.Enum):
    """Enum for note content formats.

    `editor_version` (e.g. 'tiptap@2', 'excalidraw@0') is now the canonical
    source of truth. This column is kept for backwards compatibility only.
    New notes default to TIPTAP.

    CRITICAL: SQLAlchemy stores the member NAME (e.g. 'TIPTAP'), not the string
    value (e.g. 'tiptap'). Direct SQL inserts/updates MUST use uppercase names.
    """

    MARKDOWN = "markdown"
    HTML = "html"
    PLAIN = "plain"
    BLOCKSUITE = "blocksuite"  # Legacy — kept for existing rows
    TIPTAP = "tiptap"          # Current default for all new notes


class Note(Base, TimestampMixin, SoftDeleteMixin, UserOwnedMixin):
    """
    Note model with hierarchical structure.

    Content is stored as raw JSONB (BlockSuite Doc snapshot).
    The backend never parses or modifies this data - Engine Sovereignty.
    """

    __tablename__ = "notes"

    # Primary Key
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True, doc="Primary key")

    # Content
    title: Mapped[str] = mapped_column(String(500), nullable=False, doc="Title of the note")

    content: Mapped[Any] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
        doc="Raw BlockSuite snapshot (JSONB). Backend MUST NOT parse or modify.",
    )

    # Editor version tracking
    editor_version: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        default=None,
        doc="Editor version (e.g., 'tiptap@2', 'excalidraw@0'). NULL = legacy data.",
    )

    # Plain text extracted from content at save time — used by embeddings, BM25, RAG
    content_text: Mapped[Optional[str]] = mapped_column(
        String(),
        nullable=True,
        default=None,
        doc="Extracted plain text from content. Set by frontend at save time. "
            "Used by embedding pipeline, BM25, and RAG. Backend never computes this.",
    )

    # DEPRECATED: Kept for backwards compatibility. editor_version is canonical.
    format: Mapped[NoteFormat] = mapped_column(
        SQLEnum(NoteFormat, native_enum=False),
        default=NoteFormat.TIPTAP,
        nullable=False,
        doc="Deprecated format enum. editor_version is the canonical source. Default: TIPTAP.",
    )

    # Hierarchy
    parent_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("notes.id", ondelete="CASCADE"),
        nullable=True,
        default=None,
        index=True,
        doc="ID of parent note (NULL for root notes)",
    )

    # Vector Embedding Reference (legacy - for Qdrant)
    embedding_id: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True, default=None, doc="Reference to vector embedding in Qdrant"
    )

    # Vector Embedding (pgvector - for hybrid search)
    embedding: Mapped[Optional[list[float]]] = mapped_column(
        Vector(EMBEDDING_DIM),
        nullable=True,
        default=None,
        doc="Vector embedding for semantic search (dimension from boundary.EMBEDDING_DIM)",
    )

    # Embedding versioning (for model upgrades and failure tracking)
    embedding_model: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        default=None,
        doc="Embedding model version (e.g., 'all-MiniLM-L6-v2@384@v1')",
    )

    embedding_status: Mapped[Optional[str]] = mapped_column(
        String(20),
        nullable=True,
        default="PENDING",
        doc="Embedding status: PENDING, READY, FAILED, STALE",
    )

    # Journal date (YYYY-MM-DD format) - marks this note as a journal for that date
    journal_date: Mapped[Optional[str]] = mapped_column(
        String(10),
        nullable=True,
        default=None,
        index=True,
        doc="Journal date in YYYY-MM-DD format. NULL = not a journal.",
    )

    # Favorites flag
    is_favorite: Mapped[bool] = mapped_column(
        default=False,
        nullable=False,
        index=True,
        doc="Whether this note is marked as favorite",
    )

    # Archive flag (for Smart Views)
    is_archived: Mapped[bool] = mapped_column(
        default=False,
        nullable=False,
        index=True,
        doc="Whether this note is archived",
    )

    # Relationships
    # versions: One-to-many with NoteVersion (defined in note_version.py)
    # tags: Many-to-many with Tag (requires association table)
    # children: One-to-many self-referential relationship
    children: Mapped[list["Note"]] = relationship(
        "Note", back_populates="parent", cascade="all, delete-orphan", foreign_keys=[parent_id]
    )

    # parent: Many-to-one self-referential relationship
    parent: Mapped[Optional["Note"]] = relationship(
        "Note", back_populates="children", remote_side=[id], foreign_keys=[parent_id]
    )

    # user: Many-to-one with User (provided by UserOwnedMixin)

    def __repr__(self) -> str:
        """String representation of Note."""
        return f"<Note(id={self.id}, title='{self.title[:30]}...', user_id={self.user_id})>"

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
