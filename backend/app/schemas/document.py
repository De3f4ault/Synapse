"""
Document schemas.
"""

from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


class DocumentUpload(BaseModel):
    """Document upload schema (used with multipart/form-data)."""

    # Note: Actual file is handled separately by FastAPI's UploadFile
    # This schema is for additional metadata if needed

    class Config:
        json_schema_extra = {"example": {"note": "Metadata can be included here if needed"}}


class DocumentResponse(BaseModel):
    """Document response schema."""

    id: int = Field(description="Document ID")
    user_id: int = Field(description="Owner user ID")
    filename: str = Field(description="Original filename")
    file_path: str = Field(description="Storage path")
    file_type: str = Field(description="File type (extension)")
    file_size: int = Field(description="File size in bytes")
    gemini_file_uri: Optional[str] = Field(default=None, description="Gemini Files API URI")
    gemini_file_expires_at: Optional[datetime] = Field(
        default=None, description="Gemini file expiration"
    )
    processing_status: str = Field(
        description="Processing status (pending, processing, completed, failed)"
    )
    page_count: Optional[int] = Field(default=None, description="Number of pages (for PDFs)")
    word_count: Optional[int] = Field(default=None, description="Word count")
    ocr_performed: bool = Field(default=False, description="Whether OCR was used to extract text")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Additional metadata")
    created_at: datetime = Field(description="Upload time")
    updated_at: datetime = Field(description="Last update time")

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "user_id": 1,
                "filename": "biology_textbook.pdf",
                "file_path": "uploads/users/1/documents/biology_textbook.pdf",
                "file_type": ".pdf",
                "file_size": 5242880,
                "gemini_file_uri": "gs://gemini-files/abc123",
                "gemini_file_expires_at": "2025-11-08T12:00:00Z",
                "processing_status": "completed",
                "page_count": 150,
                "word_count": 45000,
                "metadata": {"author": "Jane Doe", "creation_date": "2024-01-01"},
                "created_at": "2025-11-06T10:00:00Z",
                "updated_at": "2025-11-06T10:30:00Z",
            }
        }


class DocumentChunkResponse(BaseModel):
    """Document chunk response schema."""

    id: int = Field(description="Chunk ID")
    document_id: int = Field(description="Parent document ID")
    content: str = Field(description="Chunk text content")
    chunk_index: int = Field(description="Chunk index within document")
    page: Optional[int] = Field(default=None, description="Page number (for PDFs)")
    start_char: int = Field(description="Start character position")
    end_char: int = Field(description="End character position")
    score: Optional[float] = Field(default=None, description="Relevance score (for search results)")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Additional metadata")
    created_at: datetime = Field(description="Creation time")

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "document_id": 1,
                "content": "Photosynthesis is the process by which green plants...",
                "chunk_index": 0,
                "page": 5,
                "start_char": 0,
                "end_char": 512,
                "score": 0.95,
                "metadata": {"section": "Chapter 2: Plant Biology"},
                "created_at": "2025-11-06T10:30:00Z",
            }
        }


class DocumentProcessingStatus(BaseModel):
    """Document processing status schema."""

    document_id: int = Field(description="Document ID")
    status: str = Field(description="Processing status")
    progress: float = Field(ge=0.0, le=1.0, description="Processing progress (0.0-1.0)")
    message: str = Field(description="Status message")
    chunks_processed: int = Field(description="Number of chunks processed")
    total_chunks: Optional[int] = Field(default=None, description="Total chunks to process")
    error: Optional[str] = Field(default=None, description="Error message if failed")

    class Config:
        json_schema_extra = {
            "example": {
                "document_id": 1,
                "status": "processing",
                "progress": 0.65,
                "message": "Processing chunks...",
                "chunks_processed": 65,
                "total_chunks": 100,
                "error": None,
            }
        }


class DocumentAnalysisRequest(BaseModel):
    """Document analysis request schema."""

    document_id: int = Field(description="Document ID to analyze")
    analysis_type: str = Field(description="Type of analysis (summary, key_concepts, questions)")
    options: Optional[Dict[str, Any]] = Field(default=None, description="Analysis options")

    class Config:
        json_schema_extra = {
            "example": {
                "document_id": 1,
                "analysis_type": "summary",
                "options": {"max_length": 500, "focus_areas": ["main_concepts", "key_findings"]},
            }
        }


class DocumentAnalysisResponse(BaseModel):
    """Document analysis response schema."""

    document_id: int = Field(description="Document ID")
    analysis_type: str = Field(description="Type of analysis")
    result: Dict[str, Any] = Field(description="Analysis results")
    model_used: str = Field(description="AI model used")
    tokens_used: int = Field(description="Tokens consumed")
    created_at: datetime = Field(description="Analysis time")

    class Config:
        json_schema_extra = {
            "example": {
                "document_id": 1,
                "analysis_type": "summary",
                "result": {
                    "summary": "This document covers the fundamentals of photosynthesis...",
                    "key_concepts": ["photosynthesis", "chloroplasts", "light reactions"],
                    "main_topics": ["Plant Biology", "Energy Conversion"],
                },
                "model_used": "gemini-1.5-flash",
                "tokens_used": 1250,
                "created_at": "2025-11-06T12:00:00Z",
            }
        }
