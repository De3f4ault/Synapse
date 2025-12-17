"""
LlamaIndex Query Engine for RAG retrieval.

This module provides a query engine interface that wraps the RAG pipeline
for use in vector search operations (e.g., note search).
"""

from typing import Optional, List, Any
from dataclasses import dataclass, field
import structlog

logger = structlog.get_logger(__name__)


@dataclass
class NodeMetadata:
    """Metadata for a retrieved node."""
    note_id: int = 0
    title: str = ""
    source_type: str = "notes"
    chunk_index: int = 0
    
    def get(self, key: str, default: Any = None) -> Any:
        """Dict-like get for compatibility."""
        return getattr(self, key, default)


@dataclass
class TextNode:
    """Represents a text node from retrieval."""
    text: str
    metadata: NodeMetadata = field(default_factory=NodeMetadata)
    
    def get_content(self) -> str:
        """Get the text content."""
        return self.text


@dataclass
class NodeWithScore:
    """A node with its relevance score."""
    node: TextNode
    score: float = 0.0


@dataclass 
class QueryResponse:
    """Response from a query operation."""
    source_nodes: List[NodeWithScore] = field(default_factory=list)
    response: str = ""


class QueryEngine:
    """
    Query engine for RAG-based retrieval.
    
    Wraps the RAG pipeline to provide a simple query interface
    compatible with the notes service vector search.
    """
    
    def __init__(
        self,
        collection_name: str,
        top_k: int = 5,
        user_id: Optional[int] = None
    ):
        """
        Initialize query engine.
        
        Args:
            collection_name: Name of the Qdrant collection
            top_k: Number of results to return
            user_id: User ID (extracted from collection_name if not provided)
        """
        self.collection_name = collection_name
        self.top_k = top_k
        
        # Extract user_id from collection_name if needed
        # Format: notes_user_{user_id}
        if user_id is None and "user_" in collection_name:
            try:
                self.user_id = int(collection_name.split("user_")[1])
            except (ValueError, IndexError):
                self.user_id = 0
        else:
            self.user_id = user_id or 0
        
        self._pipeline = None
        logger.debug(
            "query_engine_initialized",
            collection=collection_name,
            top_k=top_k,
            user_id=self.user_id
        )
    
    async def _get_pipeline(self):
        """Lazy-load the RAG pipeline."""
        if self._pipeline is None:
            from app.core.ai.rag.pipeline.rag_pipeline import RAGPipeline
            self._pipeline = RAGPipeline()
        return self._pipeline
    
    async def query(self, query_str: str) -> QueryResponse:
        """
        Execute a query against the RAG system.
        
        Args:
            query_str: The search query
            
        Returns:
            QueryResponse with source nodes
        """
        logger.debug(
            "query_engine_query",
            query=query_str[:50],
            user_id=self.user_id,
            top_k=self.top_k
        )
        
        try:
            pipeline = await self._get_pipeline()
            
            # Determine source type from collection name
            source_type = "notes"
            if "documents" in self.collection_name:
                source_type = "documents"
            elif "code" in self.collection_name:
                source_type = "code"
            
            # Query the RAG pipeline
            result = await pipeline.query(
                user_id=self.user_id,
                query=query_str,
                top_k=self.top_k,
                source_type=source_type
            )
            
            # Convert to QueryResponse format
            source_nodes = []
            for chunk in result.get("chunks", []):
                metadata = chunk.get("metadata", {})
                
                node = TextNode(
                    text=chunk.get("text", ""),
                    metadata=NodeMetadata(
                        note_id=metadata.get("source_id", 0),
                        title=metadata.get("title", ""),
                        source_type=metadata.get("source_type", source_type),
                        chunk_index=metadata.get("chunk_index", 0)
                    )
                )
                
                source_nodes.append(NodeWithScore(
                    node=node,
                    score=chunk.get("score", 0.0)
                ))
            
            logger.debug(
                "query_engine_results",
                results=len(source_nodes)
            )
            
            return QueryResponse(source_nodes=source_nodes)
            
        except Exception as e:
            logger.error(
                "query_engine_error",
                error=str(e),
                query=query_str[:50]
            )
            # Return empty response on error
            return QueryResponse(source_nodes=[])


# Singleton cache for query engines
_query_engines: dict = {}


async def get_query_engine(
    collection_name: str,
    top_k: int = 5
) -> QueryEngine:
    """
    Get or create a query engine for the specified collection.
    
    Args:
        collection_name: Qdrant collection name (e.g., "notes_user_123")
        top_k: Number of results to return
        
    Returns:
        QueryEngine instance
    """
    cache_key = f"{collection_name}_{top_k}"
    
    if cache_key not in _query_engines:
        _query_engines[cache_key] = QueryEngine(
            collection_name=collection_name,
            top_k=top_k
        )
        logger.debug(
            "query_engine_created",
            collection=collection_name,
            top_k=top_k
        )
    
    return _query_engines[cache_key]
