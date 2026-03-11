"""
Document schemas — single source of truth for all document-related API contracts.
"""

import enum
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class DocumentResponse(BaseModel):
    """Document response schema."""

    id: int = Field(description="Document ID")
    user_id: int = Field(description="Owner user ID")
    filename: str = Field(description="Original filename")
    file_type: str = Field(description="File type (extension)")
    file_size: int = Field(description="File size in bytes")
    processing_status: str = Field(description="Processing status")
    page_count: Optional[int] = Field(default=None, description="Number of pages")
    word_count: Optional[int] = Field(default=None, description="Word count")
    ocr_performed: bool = Field(default=False, description="Whether OCR was used")
    gemini_file_uri: Optional[str] = Field(default=None, description="Gemini Files API URI")
    gemini_file_expired: bool = Field(default=False, description="Whether Gemini file has expired")
    created_at: datetime = Field(description="Upload time")
    updated_at: datetime = Field(description="Last update time")
    # Extended fields
    sector: Optional[str] = Field(default="Uncategorized", description="Document sector/category")
    notes: Optional[str] = Field(default=None, description="User notes on document")
    ai_summary: Optional[str] = Field(default=None, description="AI-generated summary")
    reading_progress: Optional[float] = Field(default=0.0, description="Reading progress 0.0-1.0")
    # Folder & flags (Phase 2: UI overhaul)
    folder_id: Optional[int] = Field(default=None, description="Folder ID (null = Inbox)")
    is_favorite: bool = Field(default=False, description="Favorite flag")
    is_pinned: bool = Field(default=False, description="Pinned to top")
    is_archived: bool = Field(default=False, description="Archived flag")

    class Config:
        from_attributes = True


class DocumentUpdateRequest(BaseModel):
    """Document metadata update request."""

    sector: Optional[str] = None
    notes: Optional[str] = None
    reading_progress: Optional[float] = None
    title: Optional[str] = None
    is_favorite: Optional[bool] = None
    is_archived: Optional[bool] = None


class DocumentChunkResponse(BaseModel):
    """Document chunk response schema."""

    id: int = Field(description="Chunk ID")
    document_id: int = Field(description="Parent document ID")
    content: str = Field(description="Chunk text content")
    chunk_index: int = Field(description="Chunk index within document")
    page: Optional[int] = Field(default=None, description="Page number")
    start_char: int = Field(description="Start character position")
    end_char: int = Field(description="End character position")
    embedding_id: Optional[str] = Field(default=None, description="Embedding vector ID")

    class Config:
        from_attributes = True


class ProcessingStatusResponse(BaseModel):
    """Processing status check response."""

    document_id: int = Field(description="Document ID")
    status: str = Field(description="Processing status")
    progress_percentage: float = Field(description="Processing progress 0-100")
    message: str = Field(description="Status message")


class ConflictType(str, enum.Enum):
    """Types of document conflicts during upload."""

    EXACT_DUPLICATE = "exact_duplicate"
    SAME_CONTENT = "same_content"
    SAME_FILENAME = "same_filename"


class DuplicateConflictResponse(BaseModel):
    """Response returned when a duplicate document is detected (409 Conflict)."""

    conflict_type: ConflictType
    existing_document_id: int
    existing_filename: str
    existing_file_size: int
    existing_uploaded_at: datetime
    message: str


class MoveDocumentRequest(BaseModel):
    """Request to move a document to a different folder."""

    folder_id: Optional[int] = Field(default=None, description="Target folder ID, None = Inbox")


class SummaryResponse(BaseModel):
    """AI summary response."""

    summary: str
    cached: bool = False


class DocumentAnalysisRequest(BaseModel):
    """Document analysis request schema."""

    document_id: int = Field(description="Document ID to analyze")
    analysis_type: str = Field(description="Type of analysis (summary, key_concepts, questions)")
    options: Optional[Dict[str, Any]] = Field(default=None, description="Analysis options")


class DocumentAnalysisResponse(BaseModel):
    """Document analysis response schema."""

    document_id: int = Field(description="Document ID")
    analysis_type: str = Field(description="Type of analysis")
    result: Dict[str, Any] = Field(description="Analysis results")
    model_used: str = Field(description="AI model used")
    tokens_used: int = Field(description="Tokens consumed")
    created_at: datetime = Field(description="Analysis time")


# ─── File Manager UI schemas ─────────────────────────────────────────────────


class StorageBreakdownItem(BaseModel):
    """Per-category storage usage for the file manager storage widgets."""

    type: str = Field(description="Category name (Images, Videos, Documents, etc.)")
    size: int = Field(description="Total bytes used by this category")
    count: int = Field(description="Number of files in this category")
    color: str = Field(description="Hex color code for UI display")


class RecentActivityItem(BaseModel):
    """Recent user action derived from document timestamps."""

    action: str = Field(description="Action type (uploaded, modified, favorited)")
    filename: str = Field(description="Document filename")
    file_type: str = Field(description="File extension")
    time: datetime = Field(description="When the action occurred")
    document_id: int = Field(description="Associated document ID")
