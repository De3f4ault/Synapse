"""
Document model.

Uploaded documents (PDF, DOCX, etc.) with processing status tracking.
Integrates with Gemini Files API and vector embeddings.
"""

from datetime import datetime
from typing import Optional
import enum

from sqlalchemy import (
    String,
    Integer,
    DateTime,
    JSON,
    Enum as SQLEnum,
    Text,
    Boolean,
)
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base
from .mixins import TimestampMixin, SoftDeleteMixin, UserOwnedMixin


class ProcessingStatus(str, enum.Enum):
    """Enum for document processing states."""

    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class Document(Base, TimestampMixin, SoftDeleteMixin, UserOwnedMixin):
    """
    Document model for file uploads.

    Tracks uploaded documents through their processing lifecycle:
    upload → text extraction → chunking → embedding → indexing
    """

    __tablename__ = "documents"

    # Primary Key
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True, doc="Primary key")

    # File Information
    filename: Mapped[str] = mapped_column(String(255), nullable=False, doc="Original filename")

    file_path: Mapped[str] = mapped_column(
        String(500), nullable=False, doc="Path to stored file on disk"
    )

    file_type: Mapped[str] = mapped_column(
        String(50), nullable=False, doc="File type/extension (e.g., 'pdf', 'docx')"
    )

    file_size: Mapped[int] = mapped_column(Integer, nullable=False, doc="File size in bytes")

    # Content Hash for Deduplication (SHA256)
    content_hash: Mapped[Optional[str]] = mapped_column(
        String(64),
        nullable=True,  # Nullable for migration; backfill existing docs later
        index=True,
        doc="SHA256 hash of file content for duplicate detection",
    )

    # Gemini Files API Integration
    gemini_file_uri: Mapped[Optional[str]] = mapped_column(
        String(500), nullable=True, default=None, doc="URI of file uploaded to Gemini Files API"
    )

    gemini_file_expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        default=None,
        doc="Expiration timestamp for Gemini file (48 hours after upload)",
    )

    # Processing Status
    processing_status: Mapped[ProcessingStatus] = mapped_column(
        SQLEnum(ProcessingStatus, native_enum=False),
        default=ProcessingStatus.PENDING,
        nullable=False,
        index=True,
        doc="Current processing status",
    )

    # Content Metadata
    page_count: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True, default=None, doc="Number of pages (for PDFs)"
    )

    word_count: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True, default=None, doc="Approximate word count"
    )

    ocr_performed: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, doc="Whether OCR was used to extract text"
    )

    file_metadata: Mapped[Optional[dict]] = mapped_column(
        JSON, nullable=True, default=None, doc="Additional metadata (author, creation date, etc.)"
    )

    content_text: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True, default=None, doc="Extracted text content from the document"
    )

    # User Annotations & Classification
    sector: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True, default="Uncategorized", doc="User-defined sector/category"
    )

    notes: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True, default=None, doc="User notes attached to this document"
    )

    # AI-Generated Content (cached)
    ai_summary: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True, default=None, doc="AI-generated summary of the document"
    )

    # Reading Progress (0.0 to 1.0)
    reading_progress: Mapped[Optional[float]] = mapped_column(
        nullable=True, default=0.0, doc="Reading progress (0.0 = start, 1.0 = finished)"
    )
    # ----------------------------------------------------------------------

    # Relationships
    # chunks: One-to-many with DocumentChunk (defined in document_chunk.py)
    # user: Many-to-one with User (from UserOwnedMixin)

    def __repr__(self) -> str:
        """String representation of Document."""
        return (
            f"<Document(id={self.id}, filename='{self.filename}', "
            f"status={self.processing_status.value})>"
        )

    @property
    def is_processed(self) -> bool:
        """Check if document processing is complete."""
        return self.processing_status == ProcessingStatus.COMPLETED

    @property
    def gemini_file_expired(self) -> bool:
        """Check if Gemini file has expired."""
        if not self.gemini_file_expires_at:
            return True
        from datetime import datetime, timezone

        return datetime.now(timezone.utc) > self.gemini_file_expires_at
