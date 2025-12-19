"""RAG Service Layer - Production business logic wrapper."""

from typing import Dict, List, Optional
import time
import structlog

from app.core.ai.rag.pipeline.rag_pipeline import RAGPipeline
from app.schemas.rag import SourceType, LLMEnhancementStrategy

logger = structlog.get_logger(__name__)


class RAGService:
    """
    RAG service - bridges API and RAG pipeline.
    
    Responsibilities:
    - Validate requests
    - Call RAG pipeline
    - Handle errors gracefully
    - Track performance metrics
    - Manage caching (via pipeline)
    
    Production patterns:
    - Singleton instance
    - Structured logging
    - Error handling with fallbacks
    - Performance tracking
    """
    
    def __init__(self):
        """Initialize RAG service with production config."""
        logger.info("initializing_rag_service")
        
        # Initialize RAG pipeline with all features enabled
        self.pipeline = RAGPipeline(
            # Phase 1: Reranking
            enable_reranking=True,
            
            # Phase 2: Personalization
            enable_learning_aware=True,
            enable_query_enhancement=True,
            
            # Phase 3: Advanced features
            enable_advanced_chunking=True,
            enable_llm_enhancement=True,
            enable_feedback_loops=True,
            llm_provider="gemini",  # Use Gemini for query enhancement
            llm_enhancement_strategy="rewrite"  # Default strategy
        )
        
        logger.info("rag_service_initialized",
            features_enabled=[
                "reranking",
                "learning_aware",
                "query_enhancement",
                "advanced_chunking",
                "llm_enhancement",
                "feedback_loops"
            ]
        )
    
    async def ingest_document(
        self,
        user_id: int,
        document_text: str,
        document_id: str,
        document_title: str,
        source_type: str = "documents"
    ) -> Dict:
        """
        Ingest document into RAG system.
        
        Args:
            user_id: User ID
            document_text: Document text content
            document_id: Unique document identifier
            document_title: Document title
            source_type: Source type (documents, notes, code)
        
        Returns:
            Dict with {document_id, chunks, status}
        
        Raises:
            ValueError: If validation fails
            Exception: If ingestion fails
        """
        logger.info(
            "ingesting_document",
            user_id=user_id,
            document_id=document_id,
            text_length=len(document_text),
            source_type=source_type
        )
        
        try:
            # Call pipeline
            start_time = time.time()
            
            result = await self.pipeline.ingest_document(
                user_id=user_id,
                document_text=document_text,
                document_id=document_id,
                document_title=document_title,
                source_type=source_type
            )
            
            elapsed_ms = (time.time() - start_time) * 1000
            
            logger.info(
                "document_ingested",
                user_id=user_id,
                document_id=document_id,
                chunks=result["chunks"],
                elapsed_ms=elapsed_ms
            )
            
            return result
        
        except ValueError as e:
            logger.error(
                "document_ingestion_validation_error",
                error=str(e),
                document_id=document_id
            )
            raise
        
        except Exception as e:
            logger.error(
                "document_ingestion_failed",
                error=str(e),
                document_id=document_id,
                exc_info=True
            )
            raise
    
    async def query(
        self,
        user_id: int,
        query: str,
        top_k: int = 5,
        source_type: str = "documents",
        enable_llm_enhancement: bool = True,
        llm_strategy: str = "rewrite"
    ) -> Dict:
        """
        Query RAG system with all enhancements.
        
        Args:
            user_id: User ID
            query: Search query
            top_k: Number of results
            source_type: Source to search
            enable_llm_enhancement: Enable LLM enhancement
            llm_strategy: LLM enhancement strategy
        
        Returns:
            Dict with {query, chunks, count, ...}
        
        Raises:
            ValueError: If validation fails
            Exception: If query fails
        """
        logger.info(
            "querying_rag",
            user_id=user_id,
            query=query[:100],
            top_k=top_k,
llm_enhancement=enable_llm_enhancement,
            llm_strategy=llm_strategy
        )
        
        try:
            # Track performance
            start_time = time.time()
            
            # Temporarily override LLM enhancement if needed
            original_llm_enabled = self.pipeline.enable_llm_enhancement
            original_strategy = self.pipeline.llm_enhancement_strategy
            
            if not enable_llm_enhancement:
                self.pipeline.enable_llm_enhancement = False
            elif llm_strategy != original_strategy:
                self.pipeline.llm_enhancement_strategy = llm_strategy
            
            try:
                # Call pipeline
                result = await self.pipeline.query(
                    user_id=user_id,
                    query=query,
                    top_k=top_k,
                    source_type=source_type
                )
                
                # Add performance metrics
                elapsed_ms = (time.time() - start_time) * 1000
                result["processing_time_ms"] = round(elapsed_ms, 2)
                
                logger.info(
                    "query_completed",
                    user_id=user_id,
                    results=result["count"],
                    elapsed_ms=elapsed_ms,
                    llm_enhanced=result.get("llm_enhanced", False)
                )
                
                return result
            
            finally:
                # Restore original settings
                self.pipeline.enable_llm_enhancement = original_llm_enabled
                self.pipeline.llm_enhancement_strategy = original_strategy
        
        except ValueError as e:
            logger.error(
                "query_validation_error",
                error=str(e),
                query=query[:100]
            )
            raise
        
        except Exception as e:
            logger.error(
                "query_failed",
                error=str(e),
                query=query[:100],
                exc_info=True
            )
            raise
    
    async def process_feedback(
        self,
        user_id: int,
        query: str,
        results: List[Dict],
        clicked_indices: List[int],
        time_spent_ms: float,
        helpful_rating: Optional[int] = None
    ) -> Dict:
        """
        Process user feedback for adaptive learning.
        
        Args:
            user_id: User ID
            query: Original query
            results: Query results
            clicked_indices: Indices of clicked results
            time_spent_ms: Time spent (ms)
            helpful_rating: Optional rating (1-5)
        
        Returns:
            Dict with {status, topics_updated, message}
        """
        logger.info(
            "processing_feedback",
            user_id=user_id,
            query=query[:100],
            clicks=len(clicked_indices),
            time_ms=time_spent_ms,
            rating=helpful_rating
        )
        
        try:
            # Call pipeline feedback processor
            await self.pipeline.process_feedback(
                user_id=user_id,
                query=query,
                results=results,
                clicked_indices=clicked_indices,
                time_spent_ms=time_spent_ms,
                helpful_rating=helpful_rating
            )
            
            # Extract topics from clicked results
            topics_updated = set()
            for idx in clicked_indices:
                if 0 <= idx < len(results):
                    topics = results[idx].get("metadata", {}).get("topics", [])
                    topics_updated.update(topics)
            
            logger.info(
                "feedback_processed",
                user_id=user_id,
                topics=list(topics_updated)
            )
            
            return {
                "status": "processed",
                "topics_updated": len(topics_updated),
                "message": f"Mastery scores updated for {', '.join(sorted(topics_updated))}" if topics_updated else "Feedback recorded"
            }
        
        except Exception as e:
            logger.error(
                "feedback_processing_failed",
                error=str(e),
                exc_info=True
            )
            # Don't fail - feedback is non-critical
            return {
                "status": "error",
                "topics_updated": 0,
                "message": f"Feedback processing failed: {str(e)}"
            }


# Singleton instance
_rag_service: Optional[RAGService] = None


def get_rag_service() -> RAGService:
    """
    Get RAG service singleton.
    
    Pattern: Singleton to ensure we reuse pipeline instance
    and maintain caching across requests.
    """
    global _rag_service
    
    if _rag_service is None:
        _rag_service = RAGService()
    
    return _rag_service
