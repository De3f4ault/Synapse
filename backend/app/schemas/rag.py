"""
RAG (Retrieval-Augmented Generation) schemas ().
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class RAGSource(BaseModel):
    """RAG source metadata schema."""

    type: str = Field(description="Source type (note, document, flashcard)")
    id: int = Field(description="Source content ID")
    title: str = Field(description="Source title")
    url: Optional[str] = Field(default=None, description="Source URL")
    page: Optional[int] = Field(default=None, description="Page number (for documents)")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Additional metadata")

    class Config:
        json_schema_extra = {
            "example": {
                "type": "document",
                "id": 1,
                "title": "Biology Textbook",
                "url": "/documents/1",
                "page": 42,
                "metadata": {
                    "chapter": "Cell Biology",
                    "section": "Mitochondria"
                }
            }
        }


class RAGChunk(BaseModel):
    """RAG chunk schema (retrieved content)."""

    text: str = Field(description="Chunk text content")
    score: float = Field(ge=0.0, le=1.0, description="Relevance score")
    source: RAGSource = Field(description="Source metadata")
    chunk_index: Optional[int] = Field(default=None, description="Chunk index in source")
    embedding_distance: Optional[float] = Field(default=None, description="Embedding distance")
    highlighted: Optional[str] = Field(default=None, description="Highlighted text with query terms")

    class Config:
        json_schema_extra = {
            "example": {
                "text": "Mitochondria are the powerhouses of the cell, generating ATP through cellular respiration...",
                "score": 0.95,
                "source": {
                    "type": "document",
                    "id": 1,
                    "title": "Biology Textbook",
                    "page": 42
                },
                "chunk_index": 5,
                "embedding_distance": 0.15,
                "highlighted": "<mark>Mitochondria</mark> are the powerhouses..."
            }
        }


class RAGQueryRequest(BaseModel):
    """RAG query request schema."""

    query: str = Field(min_length=1, max_length=10000, description="Search query")
    user_id: int = Field(description="User ID for personalized context")
    top_k: int = Field(default=5, ge=1, le=20, description="Number of results to return")
    filters: Optional[Dict[str, Any]] = Field(default=None, description="Filters (source_type, modules, etc.)")
    use_reranking: bool = Field(default=True, description="Use cross-encoder reranking")
    use_synapse_boost: bool = Field(default=True, description="Boost weak areas")
    include_sources: bool = Field(default=True, description="Include source metadata")

    class Config:
        json_schema_extra = {
            "example": {
                "query": "What is the role of mitochondria in cellular respiration?",
                "user_id": 1,
                "top_k": 5,
                "filters": {
                    "source_types": ["document", "note"],
                    "modules": ["documents", "notes"]
                },
                "use_reranking": True,
                "use_synapse_boost": True,
                "include_sources": True
            }
        }


class RAGQueryResponse(BaseModel):
    """RAG query response schema."""

    query: str = Field(description="Original query")
    chunks: List[RAGChunk] = Field(description="Retrieved chunks")
    user_context: Optional[Dict[str, Any]] = Field(default=None, description="User context used")
    weak_areas_coverage: Optional[Dict[str, float]] = Field(default=None, description="Coverage of weak areas")
    metadata: Dict[str, Any] = Field(description="Query metadata")

    class Config:
        json_schema_extra = {
            "example": {
                "query": "What is the role of mitochondria?",
                "chunks": [
                    {
                        "text": "Mitochondria are the powerhouses of the cell...",
                        "score": 0.95,
                        "source": {
                            "type": "document",
                            "id": 1,
                            "title": "Biology Textbook",
                            "page": 42
                        }
                    }
                ],
                "user_context": {
                    "weak_areas": ["Cellular Respiration"],
                    "recent_topics": ["Photosynthesis"]
                },
                "weak_areas_coverage": {
                    "Cellular Respiration": 0.80
                },
                "metadata": {
                    "total_results": 15,
                    "query_time_ms": 120,
                    "reranked": True,
                    "synapse_boost_applied": True
                }
            }
        }


class RAGIndexRequest(BaseModel):
    """RAG indexing request schema."""

    user_id: int = Field(description="User ID")
    content_type: str = Field(pattern="^(note|document|flashcard)$", description="Content type to index")
    content_id: int = Field(description="Content ID")
    force_reindex: bool = Field(default=False, description="Force reindexing even if already indexed")

    class Config:
        json_schema_extra = {
            "example": {
                "user_id": 1,
                "content_type": "document",
                "content_id": 1,
                "force_reindex": False
            }
        }


class RAGIndexResponse(BaseModel):
    """RAG indexing response schema."""

    success: bool = Field(description="Whether indexing succeeded")
    content_type: str = Field(description="Content type indexed")
    content_id: int = Field(description="Content ID")
    chunks_created: int = Field(description="Number of chunks created")
    embeddings_generated: int = Field(description="Number of embeddings generated")
    index_id: str = Field(description="Llama Index index ID")
    message: str = Field(description="Status message")

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "content_type": "document",
                "content_id": 1,
                "chunks_created": 50,
                "embeddings_generated": 50,
                "index_id": "user_1",
                "message": "Document indexed successfully"
            }
        }


class RAGContextBuildRequest(BaseModel):
    """RAG context build request schema."""

    query: str = Field(description="Query for context")
    retrieved_chunks: List[RAGChunk] = Field(description="Retrieved chunks")
    user_context: Dict[str, Any] = Field(description="User context")
    max_tokens: int = Field(default=8000, ge=1000, le=20000, description="Maximum tokens")

    class Config:
        json_schema_extra = {
            "example": {
                "query": "Explain mitochondria",
                "retrieved_chunks": [...],
                "user_context": {
                    "weak_areas": ["Cellular Respiration"]
                },
                "max_tokens": 8000
            }
        }


class RAGContextBuildResponse(BaseModel):
    """RAG context build response schema."""

    formatted_context: str = Field(description="Formatted context string for LLM")
    tokens_used: int = Field(description="Tokens in context")
    chunks_included: int = Field(description="Number of chunks included")
    sources: List[RAGSource] = Field(description="Unique sources")
    truncated: bool = Field(description="Whether context was truncated")

    class Config:
        json_schema_extra = {
            "example": {
                "formatted_context": "User Learning Context:\n- Weak Areas: Cellular Respiration\n\nRelevant Information:\n1. [Document: Biology Textbook, Page 42]\nMitochondria are...",
                "tokens_used": 7500,
                "chunks_included": 5,
                "sources": [
                    {
                        "type": "document",
                        "id": 1,
                        "title": "Biology Textbook"
                    }
                ],
                "truncated": False
            }
        }
