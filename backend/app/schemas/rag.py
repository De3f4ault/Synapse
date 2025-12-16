"""Pydantic schemas for RAG API - Production-ready validation."""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator
from enum import Enum


class SourceType(str, Enum):
    """Content source types."""
    DOCUMENTS = "documents"
    NOTES = "notes"
    CODE = "code"
    FLASHCARDS = "flashcards"


class LLMEnhancementStrategy(str, Enum):
    """LLM query enhancement strategies."""
    REWRITE = "rewrite"
    HYDE = "hyde"
    MULTI_QUERY = "multi_query"
    DECOMPOSE = "decompose"


class TaskStatus(str, Enum):
    """Background task status."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


# ==================== REQUEST SCHEMAS ====================

class DocumentIngestRequest(BaseModel):
    """Request to ingest document into RAG."""
    document_id: str = Field(
        ...,
        description="Unique document identifier",
        min_length=1,
        max_length=255
    )
    title: str = Field(
        ...,
        description="Document title",
        min_length=1,
        max_length=500
    )
    text: str = Field(
        ...,
        description="Document text content",
        min_length=10  # Minimum 10 chars
    )
    source_type: SourceType = Field(
        default=SourceType.DOCUMENTS,
        description="Content source type"
    )
    
    @field_validator("text")
    @classmethod
    def validate_text_length(cls, v: str) -> str:
        """Validate text not too large (max 10MB)."""
        max_size = 10 * 1024 * 1024  # 10MB
        if len(v.encode('utf-8')) > max_size:
            raise ValueError(f"Text too large (max {max_size} bytes)")
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "document_id": "bio_textbook_ch5",
                "title": "Chapter 5: Cellular Processes",
                "text": "Photosynthesis is the process...",
                "source_type": "documents"
            }
        }


class QueryRequest(BaseModel):
    """Request to query RAG system."""
    query: str = Field(
        ...,
        description="User query",
        min_length=1,
        max_length=1000
    )
    top_k: int = Field(
        default=5,
        ge=1,
        le=50,
        description="Number of results to return"
    )
    source_type: SourceType = Field(
        default=SourceType.DOCUMENTS,
        description="Content source to search"
    )
    enable_llm_enhancement: bool = Field(
        default=True,
        description="Enable LLM query enhancement (GPT-4/Claude)"
    )
    llm_strategy: LLMEnhancementStrategy = Field(
        default=LLMEnhancementStrategy.REWRITE,
        description="LLM enhancement strategy"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "query": "How does photosynthesis work?",
                "top_k": 5,
                "source_type": "documents",
                "enable_llm_enhancement": True,
                "llm_strategy": "rewrite"
            }
        }


class FeedbackRequest(BaseModel):
    """User feedback on RAG query results."""
    query: str = Field(..., description="Original query")
    results: List[Dict[str, Any]] = Field(..., description="Query results")
    clicked_indices: List[int] = Field(
        ...,
        description="Indices of clicked results",
        min_length=0
    )
    time_spent_ms: float = Field(
        ...,
        ge=0,
        description="Time spent reviewing results (milliseconds)"
    )
    helpful_rating: Optional[int] = Field(
        default=None,
        ge=1,
        le=5,
        description="User rating (1-5 stars)"
    )


# ==================== RESPONSE SCHEMAS ====================

class DocumentIngestResponse(BaseModel):
    """Response from document ingestion."""
    document_id: str
    status: TaskStatus
    chunks: Optional[int] = Field(
        default=None,
        description="Number of chunks created (if completed)"
    )
    task_id: Optional[str] = Field(
        default=None,
        description="Celery task ID (if processing)"
    )
    message: Optional[str] = Field(
        default=None,
        description="Status message"
    )


class QueryChunk(BaseModel):
    """Single result chunk from RAG query."""
    text: str = Field(description="Chunk text content")
    score: float = Field(description="Relevance score")
    metadata: Dict[str, Any] = Field(description="Chunk metadata")


class QueryResponse(BaseModel):
    """Response from RAG query."""
    query: str = Field(description="Enhanced query used")
    original_query: str = Field(description="Original user query")
    chunks: List[QueryChunk] = Field(description="Retrieved chunks")
    count: int = Field(description="Number of chunks returned")
    
    # Feature flags
    reranked: bool = Field(description="Cross-encoder reranking applied")
    learning_aware: bool = Field(description="Learning-aware boosting applied")
    query_enhanced: bool = Field(description="Query expansion applied")
    llm_enhanced: bool = Field(description="LLM enhancement applied")
    
    # Metadata
    processing_time_ms: Optional[float] = Field(
        default=None,
        description="Total processing time (ms)"
    )


class FeedbackResponse(BaseModel):
    """Response from feedback submission."""
    status: str = Field(description="Processing status")
    topics_updated: int = Field(
        default=0,
        description="Number of topics updated"
    )
    message: Optional[str] = None


#  ==================== BACKGROUND TASK SCHEMAS ====================

class TaskStatusResponse(BaseModel):
    """Status of background task."""
    task_id: str
    status: TaskStatus
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    progress: Optional[int] = Field(
        default=None,
        ge=0,
        le=100,
        description="Progress percentage (0-100)"
    )


class BatchIngestRequest(BaseModel):
    """Batch ingest multiple documents."""
    documents: List[DocumentIngestRequest] = Field(
        ...,
        min_length=1,
        max_length=100,  # Max 100 docs per batch
        description="Documents to ingest"
    )


class BatchIngestResponse(BaseModel):
    """Response from batch ingestion."""
    task_id: str = Field(description="Batch task ID")
    document_count: int = Field(description="Number of documents")
    status: TaskStatus
    message: str
