"""
Document chunk model.

Represents text chunks extracted from documents for vector search.
Essential for RAG (Retrieval Augmented Generation) pipeline.
"""

from typing import Optional

from sqlalchemy import String, Text, Integer, JSON, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from .mixins import TimestampMixin


class DocumentChunk(Base, TimestampMixin):
    """
    Document chunk for vector search.

    Documents are split into smaller chunks for efficient embedding
    and retrieval. Each chunk maintains reference to its source document
    and position within it.
    """

    __tablename__ = "document_chunks"

    # Primary Key
    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
        doc="Primary key"
    )

    # Foreign Keys
    document_id: Mapped[int] = mapped_column(
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="ID of the parent document"
    )

    # Content
    content: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        doc="Text content of this chunk"
    )

    # Position Information
    chunk_index: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        doc="Sequential index of chunk within document (0, 1, 2, ...)"
    )

    page: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        default=None,
        doc="Page number this chunk came from (if applicable)"
    )

    start_char: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        doc="Starting character position in original document"
    )

    end_char: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        doc="Ending character position in original document"
    )

    # Vector Embedding Reference
    embedding_id: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        default=None,
        doc="Reference to vector embedding in Qdrant"
    )

    # Metadata
    chunk_metadata: Mapped[Optional[dict]] = mapped_column(
        JSON,
        nullable=True,
        default=None,
        doc="Additional chunk metadata (heading, section, etc.)"
    )

    # Parent-child chunking (Sprint 2, Item 3)
    # parent_chunk_id: FK to another DocumentChunk that is the 2048-token parent
    # of this 512-token child. NULL for orphaned chunks and parent chunks themselves.
    # is_parent: True for synthetic 2048-token windows; False for all child chunks.
    # Backward-compatible: existing chunks have is_parent=False, parent_chunk_id=NULL.
    parent_chunk_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("document_chunks.id", ondelete="SET NULL"),
        nullable=True,
        default=None,
        index=True,
        doc="FK to the parent chunk that owns this child (NULL if no parent or if IS the parent)",
    )
    is_parent: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
        doc="True if this row is a 2048-token parent window; False for all child chunks",
    )

    # Relationships
    # document: Many-to-one with Document
    document: Mapped["Document"] = relationship(
        "Document",
        foreign_keys=[document_id],
        back_populates="chunks",
        lazy="select",
    )
    children: Mapped[list["DocumentChunk"]] = relationship(
        "DocumentChunk",
        foreign_keys=[parent_chunk_id],
        back_populates="parent",
        lazy="select",
    )
    parent: Mapped[Optional["DocumentChunk"]] = relationship(
        "DocumentChunk",
        foreign_keys=[parent_chunk_id],
        back_populates="children",
        remote_side=[id],
        lazy="select",
    )

    def __repr__(self) -> str:
        """String representation of DocumentChunk."""
        return (
            f"<DocumentChunk(id={self.id}, document_id={self.document_id}, "
            f"chunk_index={self.chunk_index})>"
        )

    @property
    def length(self) -> int:
        """Calculate chunk length in characters."""
        return self.end_char - self.start_char
