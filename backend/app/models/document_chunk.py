"""
Document chunk model.

Represents text chunks extracted from documents for vector search.
Essential for RAG (Retrieval Augmented Generation) pipeline.
"""

from typing import Optional

from sqlalchemy import String, Text, Integer, JSON, ForeignKey
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
        doc="Reference to vector embedding in LanceDB"
    )

    # Metadata
    chunk_metadata: Mapped[Optional[dict]] = mapped_column(
        JSON,
        nullable=True,
        default=None,
        doc="Additional chunk metadata (heading, section, etc.)"
    )
    # Relationships
    # document: Many-to-one with Document

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
