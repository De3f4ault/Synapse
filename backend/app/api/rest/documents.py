"""
Document management REST API endpoints.

Document upload, processing status, and chunk retrieval.
Complete implementation with background processing task triggers.
"""

import os
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from pydantic import BaseModel, Field
from datetime import datetime
import logging

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.document import Document, ProcessingStatus
from app.models.document_chunk import DocumentChunk
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()


# ============================================================================
# Configuration
# ============================================================================

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt", ".md", ".epub"}
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB
UPLOAD_DIR = settings.UPLOAD_DIR or "data/uploads"


# ============================================================================
# Request/Response Schemas
# ============================================================================

class DocumentResponse(BaseModel):
    """Document response."""
    id: int
    filename: str
    file_type: str
    file_size: int
    processing_status: ProcessingStatus
    page_count: Optional[int]
    word_count: Optional[int]
    gemini_file_uri: Optional[str]
    gemini_file_expired: bool
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DocumentChunkResponse(BaseModel):
    """Document chunk response."""
    id: int
    document_id: int
    content: str
    chunk_index: int
    page: Optional[int]
    start_char: int
    end_char: int
    embedding_id: Optional[str]

    class Config:
        from_attributes = True


class ProcessingStatusResponse(BaseModel):
    """Processing status check response."""
    document_id: int
    status: ProcessingStatus
    progress_percentage: float
    message: str


class MessageResponse(BaseModel):
    """Simple message response."""
    message: str


# ============================================================================
# Helper Functions
# ============================================================================

def get_file_extension(filename: str) -> str:
    """Extract file extension."""
    return os.path.splitext(filename)[1].lower()


def validate_file(file: UploadFile) -> tuple[bool, Optional[str]]:
    """
    Validate uploaded file.

    Returns:
        (is_valid, error_message)
    """
    # Check extension
    ext = get_file_extension(file.filename)
    if ext not in ALLOWED_EXTENSIONS:
        return False, f"File type {ext} not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"

    # File size is checked during upload
    return True, None


def generate_upload_path(user_id: int, filename: str) -> str:
    """Generate unique upload path for file."""
    # Create user directory structure
    user_dir = os.path.join(UPLOAD_DIR, f"user_{user_id}", "documents")
    os.makedirs(user_dir, exist_ok=True)

    # Generate unique filename
    file_ext = get_file_extension(filename)
    unique_filename = f"{uuid.uuid4()}{file_ext}"

    return os.path.join(user_dir, unique_filename)


async def save_uploaded_file(file: UploadFile, filepath: str) -> int:
    """
    Save uploaded file to disk.

    Returns:
        int: File size in bytes
    """
    total_size = 0

    with open(filepath, "wb") as f:
        while chunk := await file.read(8192):  # 8KB chunks
            if total_size + len(chunk) > MAX_FILE_SIZE:
                # Clean up partial file
                f.close()
                os.remove(filepath)
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"File too large. Maximum size: {MAX_FILE_SIZE / 1024 / 1024}MB"
                )
            f.write(chunk)
            total_size += len(chunk)

    return total_size


async def trigger_document_processing(document_id: int) -> bool:
    """
    Trigger background processing of a document.

    Queues the document for:
    1. Text extraction
    2. Chunking
    3. Embedding generation
    4. Vector store indexing
    5. Gemini Files API upload (if applicable)

    Args:
        document_id: ID of document to process

    Returns:
        bool: True if task was queued successfully
    """
    try:
        # Import here to avoid circular dependency
        from app.services.background.tasks import process_document_task

        # Queue background task (async using Celery)
        task = process_document_task.delay(document_id)

        logger.info(f"Document {document_id} queued for processing (task_id: {task.id})")
        return True

    except ImportError:
        logger.warning("Background tasks module not available - document processing deferred")
        # Celery not configured - document will be processed manually later
        return False
    except Exception as e:
        logger.error(f"Failed to queue document {document_id} for processing: {str(e)}")
        return False


async def cleanup_document_vectors(document_id: int, user_id: int) -> bool:
    """
    Delete document embeddings from Qdrant vector store.

    Args:
        document_id: ID of document
        user_id: ID of user (for collection name)

    Returns:
        bool: True if cleanup successful
    """
    try:
        from app.core.ai.rag.vector_store.qdrant.client import get_qdrant_client
        from qdrant_client import models

        qdrant_client = get_qdrant_client()
        client = qdrant_client.get_client()

        # Get user's document collection name
        collection_name = f"synapse_v2_user_{user_id}_documents"

        # Delete points matching document_id
        client.delete(
            collection_name=collection_name,
            points_selector=models.FilterSelector(
                filter=models.Filter(
                    must=[
                        models.FieldCondition(
                            key="metadata.document_id",
                            match=models.MatchValue(value=str(document_id))
                        )
                    ]
                )
            )
        )

        logger.info(f"Deleted vector embeddings from Qdrant for document {document_id}")
        return True

    except Exception as e:
        logger.error(f"Error cleaning up Qdrant vectors for document {document_id}: {str(e)}")
        return False


async def cleanup_gemini_file(document: Document) -> bool:
    """
    Delete document from Gemini Files API if uploaded.

    Args:
        document: Document model instance

    Returns:
        bool: True if cleanup successful (or no Gemini file)
    """
    try:
        if not document.gemini_file_uri:
            return True

        import google.generativeai as genai
        from app.core.config import settings

        genai.configure(api_key=settings.GEMINI_API_KEY)

        # Extract file ID from URI (format: "files/FILE_ID")
        file_id = document.gemini_file_uri.split("/")[-1]

        # Delete the file
        genai.delete_file(file_id)

        logger.info(f"Deleted file from Gemini Files API: {file_id}")
        return True

    except Exception as e:
        logger.error(f"Error deleting Gemini file: {str(e)}")
        # Don't fail if Gemini cleanup errors - file will expire naturally
        return True


async def cleanup_physical_file(filepath: str) -> bool:
    """
    Delete physical file from storage.

    Args:
        filepath: Path to file on disk

    Returns:
        bool: True if cleanup successful (or file doesn't exist)
    """
    try:
        if os.path.exists(filepath):
            os.remove(filepath)
            logger.info(f"Deleted physical file: {filepath}")
            return True
        else:
            logger.debug(f"Physical file not found: {filepath}")
            return True

    except Exception as e:
        logger.error(f"Error deleting physical file {filepath}: {str(e)}")
        return False


# ============================================================================
# Endpoints
# ============================================================================

@router.post(
    "/upload",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload document",
    description="Upload a document for processing (PDF, DOCX, TXT, MD, EPUB)"
)
async def upload_document(
    file: UploadFile = File(..., description="Document file to upload"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload a document.

    The document will be saved and queued for background processing:
    1. Text extraction
    2. Chunking
    3. Embedding generation
    4. Vector indexing
    5. Gemini Files API upload (if applicable)
    """
    # Validate file
    is_valid, error_msg = validate_file(file)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )

    # Generate upload path
    filepath = generate_upload_path(current_user.id, file.filename)

    # Save file
    try:
        file_size = await save_uploaded_file(file, filepath)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save file: {str(e)}"
        )

    # Create document record
    file_type = get_file_extension(file.filename)[1:]  # Remove leading dot

    new_document = Document(
        user_id=current_user.id,
        filename=file.filename,
        file_path=filepath,
        file_type=file_type,
        file_size=file_size,
        processing_status=ProcessingStatus.PENDING
    )

    db.add(new_document)
    await db.commit()
    await db.refresh(new_document)

    logger.info(f"Document uploaded: {new_document.id} ({file.filename}) by user {current_user.id}")

    # Trigger background processing
    processing_queued = await trigger_document_processing(new_document.id)
    if not processing_queued:
        logger.warning(f"Could not queue document {new_document.id} for processing")

    return DocumentResponse(
        id=new_document.id,
        filename=new_document.filename,
        file_type=new_document.file_type,
        file_size=new_document.file_size,
        processing_status=new_document.processing_status,
        page_count=new_document.page_count,
        word_count=new_document.word_count,
        gemini_file_uri=new_document.gemini_file_uri,
        gemini_file_expired=new_document.gemini_file_expired,
        user_id=new_document.user_id,
        created_at=new_document.created_at,
        updated_at=new_document.updated_at
    )


@router.get(
    "",
    response_model=List[DocumentResponse],
    summary="List documents",
    description="Retrieve user's uploaded documents"
)
async def list_documents(
    status_filter: Optional[ProcessingStatus] = Query(None, description="Filter by processing status"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List user's documents with optional status filtering."""
    # Build query
    query = select(Document).where(
        and_(
            Document.user_id == current_user.id,
            Document.deleted_at.is_(None)
        )
    )

    # Apply status filter
    if status_filter:
        query = query.where(Document.processing_status == status_filter)

    # Apply pagination
    query = query.offset((page - 1) * page_size).limit(page_size)
    query = query.order_by(Document.created_at.desc())

    result = await db.execute(query)
    documents = result.scalars().all()

    return [
        DocumentResponse(
            id=doc.id,
            filename=doc.filename,
            file_type=doc.file_type,
            file_size=doc.file_size,
            processing_status=doc.processing_status,
            page_count=doc.page_count,
            word_count=doc.word_count,
            gemini_file_uri=doc.gemini_file_uri,
            gemini_file_expired=doc.gemini_file_expired,
            user_id=doc.user_id,
            created_at=doc.created_at,
            updated_at=doc.updated_at
        )
        for doc in documents
    ]


@router.get(
    "/{document_id}",
    response_model=DocumentResponse,
    summary="Get document",
    description="Retrieve a specific document by ID"
)
async def get_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific document."""
    result = await db.execute(
        select(Document).where(
            and_(
                Document.id == document_id,
                Document.user_id == current_user.id,
                Document.deleted_at.is_(None)
            )
        )
    )
    doc = result.scalar_one_or_none()

    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    return DocumentResponse(
        id=doc.id,
        filename=doc.filename,
        file_type=doc.file_type,
        file_size=doc.file_size,
        processing_status=doc.processing_status,
        page_count=doc.page_count,
        word_count=doc.word_count,
        gemini_file_uri=doc.gemini_file_uri,
        gemini_file_expired=doc.gemini_file_expired,
        user_id=doc.user_id,
        created_at=doc.created_at,
        updated_at=doc.updated_at
    )


@router.delete(
    "/{document_id}",
    response_model=MessageResponse,
    summary="Delete document",
    description="Delete a document and all its chunks"
)
async def delete_document(
    document_id: int,
    delete_file: bool = Query(False, description="Also delete physical file from storage"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a document (soft delete with optional physical cleanup)."""
    result = await db.execute(
        select(Document).where(
            and_(
                Document.id == document_id,
                Document.user_id == current_user.id,
                Document.deleted_at.is_(None)
            )
        )
    )
    doc = result.scalar_one_or_none()

    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    # Soft delete
    doc.deleted_at = datetime.utcnow()
    await db.commit()

    logger.info(f"Document soft-deleted: {document_id}")

    # Clean up vector embeddings from Qdrant
    await cleanup_document_vectors(document_id, current_user.id)

    # Delete from Gemini Files API if applicable
    await cleanup_gemini_file(doc)

    # Optionally delete physical file
    if delete_file:
        await cleanup_physical_file(doc.file_path)

    return MessageResponse(message="Document deleted successfully")


@router.get(
    "/{document_id}/chunks",
    response_model=List[DocumentChunkResponse],
    summary="Get document chunks",
    description="Retrieve all chunks for a document"
)
async def get_document_chunks(
    document_id: int,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=200, description="Chunks per page"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all chunks for a document."""
    # Verify document ownership
    doc_result = await db.execute(
        select(Document).where(
            and_(
                Document.id == document_id,
                Document.user_id == current_user.id,
                Document.deleted_at.is_(None)
            )
        )
    )
    doc = doc_result.scalar_one_or_none()

    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    # Get chunks
    chunks_query = select(DocumentChunk).where(
        DocumentChunk.document_id == document_id
    ).order_by(DocumentChunk.chunk_index)

    chunks_query = chunks_query.offset((page - 1) * page_size).limit(page_size)

    chunks_result = await db.execute(chunks_query)
    chunks = chunks_result.scalars().all()

    return [
        DocumentChunkResponse(
            id=chunk.id,
            document_id=chunk.document_id,
            content=chunk.content,
            chunk_index=chunk.chunk_index,
            page=chunk.page,
            start_char=chunk.start_char,
            end_char=chunk.end_char,
            embedding_id=chunk.embedding_id
        )
        for chunk in chunks
    ]


@router.get(
    "/{document_id}/status",
    response_model=ProcessingStatusResponse,
    summary="Get processing status",
    description="Check document processing status and progress"
)
async def get_processing_status(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get document processing status."""
    result = await db.execute(
        select(Document).where(
            and_(
                Document.id == document_id,
                Document.user_id == current_user.id,
                Document.deleted_at.is_(None)
            )
        )
    )
    doc = result.scalar_one_or_none()

    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    # Calculate progress percentage
    progress_map = {
        ProcessingStatus.PENDING: 0.0,
        ProcessingStatus.PROCESSING: 50.0,
        ProcessingStatus.COMPLETED: 100.0,
        ProcessingStatus.FAILED: 0.0
    }

    message_map = {
        ProcessingStatus.PENDING: "Document queued for processing",
        ProcessingStatus.PROCESSING: "Processing document (extracting text, chunking, embedding)",
        ProcessingStatus.COMPLETED: "Document processing complete",
        ProcessingStatus.FAILED: "Document processing failed"
    }

    return ProcessingStatusResponse(
        document_id=doc.id,
        status=doc.processing_status,
        progress_percentage=progress_map[doc.processing_status],
        message=message_map[doc.processing_status]
    )


@router.post(
    "/{document_id}/process",
    response_model=MessageResponse,
    summary="Trigger processing",
    description="Manually trigger document processing (if pending or failed)"
)
async def trigger_processing(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Manually trigger document processing."""
    result = await db.execute(
        select(Document).where(
            and_(
                Document.id == document_id,
                Document.user_id == current_user.id,
                Document.deleted_at.is_(None)
            )
        )
    )
    doc = result.scalar_one_or_none()

    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    # Only allow reprocessing if pending or failed
    if doc.processing_status not in [ProcessingStatus.PENDING, ProcessingStatus.FAILED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot reprocess document in status: {doc.processing_status.value}"
        )

    # Update status to pending
    doc.processing_status = ProcessingStatus.PENDING
    await db.commit()

    logger.info(f"Document reprocessing triggered: {document_id}")

    # Trigger background processing
    processing_queued = await trigger_document_processing(document_id)
    if not processing_queued:
        logger.warning(f"Could not queue document {document_id} for processing")

    return MessageResponse(message="Document processing triggered")
