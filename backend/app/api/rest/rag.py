"""
RAG REST API endpoints - Production implementation.

Research-backed patterns:
- FastAPI async/await throughout
- Pydantic validation
- Smart task routing (inline vs Celery)
- Proper error handling
- Performance tracking
"""

import time
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from typing import Annotated

from app.api.deps import get_current_user
from app.models import User
from app.schemas.rag import (
    DocumentIngestRequest,
    DocumentIngestResponse,
    QueryRequest,
    QueryResponse,
    QueryChunk,
    FeedbackRequest,
    FeedbackResponse,
    BatchIngestRequest,
    BatchIngestResponse,
    TaskStatusResponse,
    TaskStatus as TaskStatusEnum
)
from app.services.rag import get_rag_service
from app.services.background.rag_tasks import (
    ingest_document_task,
    batch_ingest_documents_task
)

import structlog

logger = structlog.get_logger(__name__)

router = APIRouter()


# ==================== DOCUMENT INGESTION ====================

@router.post(
    "/documents/ingest",
    response_model=DocumentIngestResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Ingest document into RAG",
    description="Ingest document with smart routing: small docs processed inline, large docs queued to Celery"
)
async def ingest_document(
    request: DocumentIngestRequest,
    current_user: Annotated[User, Depends(get_current_user)]
):
    """
    Ingest document into RAG system.
    
    Smart routing based on research:
    - Small documents (<10KB): Process inline for low latency
    - Large documents (>=10KB): Queue to Celery for background processing
    
    This prevents blocking the API while ensuring fast response for common cases.
    """
    logger.info(
        "document_ingest_request",
        user_id=current_user.id,
        document_id=request.document_id,
        text_length=len(request.text),
        source_type=request.source_type
    )
    
    # Smart routing threshold: 10KB
    size_threshold = 10 * 1024  # 10KB
    is_small = len(request.text.encode('utf-8')) < size_threshold
    
    if is_small:
        # Process inline (fast path)
        logger.debug("processing_inline", document_id=request.document_id)
        
        try:
            rag_service = get_rag_service()
            
            result = await rag_service.ingest_document(
                user_id=current_user.id,
                document_text=request.text,
                document_id=request.document_id,
                document_title=request.title,
                source_type=request.source_type.value
            )
            
            return DocumentIngestResponse(
                document_id=request.document_id,
                status=TaskStatusEnum.COMPLETED,
                chunks=result.get("chunks", 0),
                message="Document ingested successfully"
            )
        
        except Exception as e:
            logger.error(
                "inline_ingestion_failed",
                error=str(e),
                document_id=request.document_id
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Ingestion failed: {str(e)}"
            )
    
    else:
        # Queue to Celery (background path)
        logger.debug("queuing_to_celery", document_id=request.document_id)
        
        try:
            # Dispatch to Celery with non-blocking call
            # Research: Use asyncio.to_thread to prevent blocking
            import asyncio
            
            task = await asyncio.to_thread(
                ingest_document_task.delay,
                user_id=current_user.id,
                document_text=request.text,
                document_id=request.document_id,
                document_title=request.title,
                source_type=request.source_type.value
            )
            
            return DocumentIngestResponse(
                document_id=request.document_id,
                status=TaskStatusEnum.PROCESSING,
                task_id=task.id,
                message=f"Document queued for processing (task: {task.id})"
            )
        
        except Exception as e:
            logger.error(
                "celery_dispatch_failed",
                error=str(e),
                document_id=request.document_id
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to queue document: {str(e)}"
            )


@router.post(
    "/documents/batch",
    response_model=BatchIngestResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Batch ingest documents"
)
async def batch_ingest(
    request: BatchIngestRequest,
    current_user: Annotated[User, Depends(get_current_user)]
):
    """Batch ingest multiple documents (always async via Celery)."""
    logger.info(
        "batch_ingest_request",
        user_id=current_user.id,
        document_count=len(request.documents)
    )
    
    try:
        # Convert to dicts
        documents = [
            {
                "document_id": doc.document_id,
                "title": doc.title,
                "text": doc.text,
                "source_type": doc.source_type.value
            }
            for doc in request.documents
        ]
        
        # Dispatch to Celery
        import asyncio
        
        task = await asyncio.to_thread(
            batch_ingest_documents_task.delay,
            user_id=current_user.id,
            documents=documents
        )
        
        return BatchIngestResponse(
            task_id=task.id,
            document_count=len(request.documents),
            status=TaskStatusEnum.PROCESSING,
            message=f"Batch ingestion started for {len(request.documents)} documents"
        )
    
    except Exception as e:
        logger.error("batch_ingest_failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Batch ingestion failed: {str(e)}"
        )


# ==================== QUERY ====================

@router.post(
    "/query",
    response_model=QueryResponse,
    summary="Query RAG system",
    description="Query RAG with all Phase 3 enhancements (LLM, reranking, personalization)"
)
async def query_rag(
    request: QueryRequest,
    current_user: Annotated[User, Depends(get_current_user)]
):
    """
    Query RAG system with all enhancements.
    
    Processed synchronously (most queries <1s with caching).
    """
    logger.info(
        "rag_query_request",
        user_id=current_user.id,
        query=request.query[:100],
        llm_enhancement=request.enable_llm_enhancement
    )
    
    try:
        start_time = time.time()
        
        rag_service = get_rag_service()
        
        result = await rag_service.query(
            user_id=current_user.id,
            query=request.query,
            top_k=request.top_k,
            source_type=request.source_type.value,
            enable_llm_enhancement=request.enable_llm_enhancement,
            llm_strategy=request.llm_strategy.value
        )
        
        # Convert to response schema
        chunks = [
            QueryChunk(
                text=chunk["text"],
                score=chunk["score"],
                metadata=chunk["metadata"]
            )
            for chunk in result.get("chunks", [])
        ]
        
        response = QueryResponse(
            query=result.get("query", request.query),
            original_query=result.get("original_query", request.query),
            chunks=chunks,
            count=len(chunks),
            reranked=result.get("reranked", False),
            learning_aware=result.get("learning_aware", False),
            query_enhanced=result.get("query_enhanced", False),
            llm_enhanced=result.get("llm_enhanced", False),
            processing_time_ms=result.get("processing_time_ms")
        )
        
        logger.info(
            "rag_query_completed",
            user_id=current_user.id,
            results=response.count,
            processing_ms=response.processing_time_ms
        )
        
        return response
    
    except Exception as e:
        logger.error(
            "rag_query_failed",
            error=str(e),
            query=request.query[:100],
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Query failed: {str(e)}"
        )


# ==================== FEEDBACK ====================

@router.post(
    "/feedback",
    response_model=FeedbackResponse,
    summary="Submit feedback",
    description="Submit user feedback for adaptive learning"
)
async def submit_feedback(
    request: FeedbackRequest,
    current_user: Annotated[User, Depends(get_current_user)]
):
    """Submit feedback for adaptive learning (updates mastery scores)."""
    logger.info(
        "feedback_request",
        user_id=current_user.id,
        query=request.query[:100],
        clicks=len(request.clicked_indices)
    )
    
    try:
        rag_service = get_rag_service()
        
        result = await rag_service.process_feedback(
            user_id=current_user.id,
            query=request.query,
            results=request.results,
            clicked_indices=request.clicked_indices,
            time_spent_ms=request.time_spent_ms,
            helpful_rating=request.helpful_rating
        )
        
        return FeedbackResponse(**result)
    
    except Exception as e:
        logger.error("feedback_processing_failed", error=str(e))
        # Don't fail - feedback is non-critical
        return FeedbackResponse(
            status="error",
            topics_updated=0,
            message=f"Feedback processing failed: {str(e)}"
        )


# ==================== TASK STATUS ====================

@router.get(
    "/tasks/{task_id}",
    response_model=TaskStatusResponse,
    summary="Get task status"
)
async def get_task_status(
    task_id: str,
    current_user: Annotated[User, Depends(get_current_user)]
):
    """Get status of background task."""
    from celery.result import AsyncResult
    from app.services.background.celery_app import celery_app
    
    result = AsyncResult(task_id, app=celery_app)
    
    # Map Celery states to our enum
    status_map = {
        "PENDING": TaskStatusEnum.PENDING,
        "STARTED": TaskStatusEnum.PROCESSING,
        "PROGRESS": TaskStatusEnum.PROCESSING,
        "SUCCESS": TaskStatusEnum.COMPLETED,
        "FAILURE": TaskStatusEnum.FAILED,
        "RETRY": TaskStatusEnum.PROCESSING
    }
    
    task_status = status_map.get(result.state, TaskStatusEnum.PENDING)
    
    response = TaskStatusResponse(
        task_id=task_id,
        status=task_status,
        result=result.result if task_status == TaskStatusEnum.COMPLETED else None,
        error=str(result.info) if task_status == TaskStatusEnum.FAILED else None
    )
    
    # Extract progress if available
    if result.state == "PROGRESS" and isinstance(result.info, dict):
        response.progress = result.info.get("percent")
    
    return response
