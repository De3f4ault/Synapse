"""
Document management REST API endpoints.

Document upload, processing status, and chunk retrieval.
"""

import os
import enum
from typing import List, Optional

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, text
from pydantic import BaseModel
from app.schemas.common import MessageResponse
from datetime import datetime
import logging

from app.api.deps import get_db, get_current_user, PaginationParams
from app.models.user import User
from app.models.document import Document, ProcessingStatus
from app.models.document_chunk import DocumentChunk
from app.core.config import settings

# Extracted service layer — file ops, thumbnails, cleanup
from app.services.document_service import (
    get_file_extension,
    validate_file,
    generate_upload_path,
    save_uploaded_file,
    generate_thumbnail,
    trigger_document_processing,
    cleanup_document_vectors,
    cleanup_gemini_file,
    cleanup_physical_file,
    ALLOWED_EXTENSIONS,
    MAX_FILE_SIZE,
)

logger = logging.getLogger(__name__)
router = APIRouter()


# Schemas — single source of truth: app/schemas/document.py
from app.schemas.document import (
    DocumentResponse,
    DocumentUpdateRequest,
    DocumentChunkResponse,
    ProcessingStatusResponse,
    ConflictType,
    DuplicateConflictResponse,
    MoveDocumentRequest,
    SummaryResponse,
    StorageBreakdownItem,
    RecentActivityItem,
)


# ============================================================================
# Endpoints
# ============================================================================


@router.post(
    "/upload",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload document",
    description="Upload a document for processing (PDF, DOCX, TXT, MD, EPUB)",
)
async def upload_document(
    file: UploadFile = File(..., description="Document file to upload"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a document.

    The document will be saved and queued for background processing:
    1. Text extraction
    2. Chunking
    3. Embedding generation
    4. Vector indexing
    5. Gemini Files API upload (if applicable)

    Returns 409 Conflict with DuplicateConflictResponse if:
    - Same content hash exists (exact duplicate or same content)
    - Same filename exists (different content, same name)
    """
    from fastapi.responses import JSONResponse

    # Validate file
    is_valid, error_msg = validate_file(file)
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error_msg)

    # Generate upload path
    filepath = generate_upload_path(current_user.id, file.filename)

    # Save file and compute SHA256 hash during streaming
    try:
        file_size, content_hash = await save_uploaded_file(file, filepath)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save file: {str(e)}",
        )

    # Check for content hash collision (exact duplicate or same content)
    hash_collision_result = await db.execute(
        select(Document).where(
            and_(
                Document.content_hash == content_hash,
                Document.user_id == current_user.id,
                Document.deleted_at.is_(None),
            )
        )
    )
    hash_collision_doc = hash_collision_result.scalars().first()

    # Check for filename collision (case-insensitive)
    filename_collision_result = await db.execute(
        select(Document).where(
            and_(
                func.lower(Document.filename) == file.filename.lower(),
                Document.user_id == current_user.id,
                Document.deleted_at.is_(None),
            )
        )
    )
    filename_collision_doc = filename_collision_result.scalars().first()

    # Determine conflict type
    if (
        hash_collision_doc
        and filename_collision_doc
        and hash_collision_doc.id == filename_collision_doc.id
    ):
        # Exact duplicate: same hash + same filename
        os.remove(filepath)  # Clean up uploaded file
        conflict = DuplicateConflictResponse(
            conflict_type=ConflictType.EXACT_DUPLICATE,
            existing_document_id=hash_collision_doc.id,
            existing_filename=hash_collision_doc.filename,
            existing_file_size=hash_collision_doc.file_size,
            existing_uploaded_at=hash_collision_doc.created_at,
            message=f"This exact file '{file.filename}' already exists in your library.",
        )
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT, content=conflict.model_dump(mode="json")
        )

    elif hash_collision_doc:
        # Same content, different filename
        os.remove(filepath)  # Clean up uploaded file
        conflict = DuplicateConflictResponse(
            conflict_type=ConflictType.SAME_CONTENT,
            existing_document_id=hash_collision_doc.id,
            existing_filename=hash_collision_doc.filename,
            existing_file_size=hash_collision_doc.file_size,
            existing_uploaded_at=hash_collision_doc.created_at,
            message=f"This file's content already exists as '{hash_collision_doc.filename}'.",
        )
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT, content=conflict.model_dump(mode="json")
        )

    elif filename_collision_doc:
        # Different content, same filename
        os.remove(filepath)  # Clean up uploaded file
        conflict = DuplicateConflictResponse(
            conflict_type=ConflictType.SAME_FILENAME,
            existing_document_id=filename_collision_doc.id,
            existing_filename=filename_collision_doc.filename,
            existing_file_size=filename_collision_doc.file_size,
            existing_uploaded_at=filename_collision_doc.created_at,
            message=f"A different document named '{file.filename}' already exists.",
        )
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT, content=conflict.model_dump(mode="json")
        )

    # No conflict - create document record
    file_type = get_file_extension(file.filename)[1:]  # Remove leading dot

    new_document = Document(
        user_id=current_user.id,
        filename=file.filename,
        file_path=filepath,
        file_type=file_type,
        file_size=file_size,
        content_hash=content_hash,
        processing_status=ProcessingStatus.PENDING,
    )

    db.add(new_document)
    await db.commit()
    await db.refresh(new_document)

    logger.info(f"Document uploaded: {new_document.id} ({file.filename}) by user {current_user.id}")

    # Trigger background processing
    processing_queued = await trigger_document_processing(new_document.id)
    if not processing_queued:
        logger.warning(f"Could not queue document {new_document.id} for processing")

    return DocumentResponse.model_validate(new_document)


# ── New endpoints: storage & activity (must come before /{document_id}) ──────


@router.get(
    "/storage-breakdown",
    response_model=List[StorageBreakdownItem],
    summary="Get storage breakdown",
    description="Per-category storage usage (Images, Videos, Documents, etc.)",
)
async def get_storage_breakdown(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return storage breakdown computed by the database."""
    result = await db.execute(
        text("SELECT * FROM developer_schema.get_storage_breakdown(:uid)"),
        {"uid": current_user.id},
    )
    rows = result.fetchall()
    return [
        StorageBreakdownItem(
            type=row.type_category,
            size=row.total_bytes,
            count=row.file_count,
            color=row.color,
        )
        for row in rows
    ]


@router.get(
    "/recent-activity",
    response_model=List[RecentActivityItem],
    summary="Get recent activity",
    description="Recent user actions (uploaded, modified, favorited)",
)
async def get_recent_activity(
    limit: int = Query(15, ge=1, le=50, description="Max number of items"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return recent activity derived from document timestamps."""
    result = await db.execute(
        text("SELECT * FROM developer_schema.get_recent_activity(:uid, :lim)"),
        {"uid": current_user.id, "lim": limit},
    )
    rows = result.fetchall()
    return [
        RecentActivityItem(
            action=row.action_type,
            filename=row.filename,
            file_type=row.file_type,
            time=row.action_time,
            document_id=row.document_id,
        )
        for row in rows
    ]


@router.patch(
    "/{document_id}/favorite",
    response_model=DocumentResponse,
    summary="Toggle favorite",
    description="Toggle is_favorite flag on a document",
)
async def toggle_favorite(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Toggle the is_favorite flag."""
    doc = await _get_doc_or_404(document_id, current_user, db)
    doc.is_favorite = not doc.is_favorite
    await db.commit()
    await db.refresh(doc)
    return doc


@router.get(
    "",
    response_model=List[DocumentResponse],
    summary="List documents",
    description="Retrieve user's uploaded documents",
)
async def list_documents(
    folder_id: Optional[int] = Query(
        None, description="Filter by folder ID (null = root/unfiled documents)"
    ),
    include_all: bool = Query(
        False, description="If true, return all documents ignoring folder filter"
    ),
    view: Optional[str] = Query(
        None, description="Smart view filter: 'recent', 'favorites', or 'archived'"
    ),
    status_filter: Optional[ProcessingStatus] = Query(
        None, description="Filter by processing status"
    ),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List user's documents with folder, smart view, and status filtering.

    Smart Views (mutually exclusive with folder_id):
    - 'recent': All non-archived documents sorted by updated_at DESC
    - 'favorites': Documents with is_favorite=True
    - 'archived': Documents with is_archived=True (overrides default exclude)

    A document belongs to exactly one folder or the root (folder_id=null).
    Archived documents are excluded by default unless view='archived'.
    """
    # Build base query
    query = select(Document).where(
        and_(
            Document.user_id == current_user.id,
            Document.deleted_at.is_(None),
        )
    )

    # Smart Views take precedence over folder filtering
    if view == "archived":
        # Show archived documents
        query = query.where(Document.is_archived.is_(True))
    elif view == "favorites":
        # Show favorited documents (non-archived only)
        query = query.where(
            and_(
                Document.is_favorite.is_(True),
                Document.is_archived.is_(False),
            )
        )
    elif view == "recent":
        # Show all non-archived documents sorted by update time
        query = query.where(Document.is_archived.is_(False))
        # Use updated_at for ordering instead of created_at
        query = query.order_by(Document.updated_at.desc())
    else:
        # Default: exclude archived and apply folder filter
        query = query.where(Document.is_archived.is_(False))

        # Apply folder filter (unless include_all is true)
        if not include_all:
            if folder_id is None:
                # Root/unfiled documents
                query = query.where(Document.folder_id.is_(None))
            else:
                # Specific folder
                query = query.where(Document.folder_id == folder_id)

    # Apply status filter
    if status_filter:
        query = query.where(Document.processing_status == status_filter)

    # Apply pagination and ordering (if not already set by 'recent' view)
    if view != "recent":
        query = query.order_by(Document.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    documents = result.scalars().all()

    return [DocumentResponse.model_validate(doc) for doc in documents]


@router.get(
    "/{document_id}",
    response_model=DocumentResponse,
    summary="Get document",
    description="Retrieve a specific document by ID",
)
async def get_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific document."""
    result = await db.execute(
        select(Document).where(
            and_(
                Document.id == document_id,
                Document.user_id == current_user.id,
                Document.deleted_at.is_(None),
            )
        )
    )
    doc = result.scalar_one_or_none()

    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    return DocumentResponse.model_validate(doc)


@router.delete(
    "/{document_id}",
    response_model=MessageResponse,
    summary="Delete document",
    description="Delete a document and all its chunks",
)
async def delete_document(
    document_id: int,
    keep_file: bool = Query(False, description="Keep physical file on disk (default: delete it)"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a document (soft delete + physical cleanup by default)."""
    result = await db.execute(
        select(Document).where(
            and_(
                Document.id == document_id,
                Document.user_id == current_user.id,
                Document.deleted_at.is_(None),
            )
        )
    )
    doc = result.scalar_one_or_none()

    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    # Soft delete
    doc.deleted_at = datetime.utcnow()
    await db.commit()

    logger.info(f"Document soft-deleted: {document_id}")

    # Clean up vector embeddings from Qdrant
    await cleanup_document_vectors(document_id, current_user.id)

    # Delete from Gemini Files API if applicable
    await cleanup_gemini_file(doc.gemini_file_uri)

    # Delete physical file unless explicitly kept
    if not keep_file:
        await cleanup_physical_file(doc.file_path)
        # Clean up thumbnail if it exists
        await cleanup_physical_file(f"{doc.file_path}_thumb.png")

    return MessageResponse(message="Document deleted successfully")


@router.put(
    "/{document_id}/replace",
    response_model=DocumentResponse,
    summary="Replace document",
    description="Replace an existing document's file while preserving its ID and metadata",
)
async def replace_document(
    document_id: int,
    file: UploadFile = File(..., description="New document file"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Replace an existing document's content while preserving its ID.

    This endpoint:
    1. Validates the new file
    2. Computes new content hash
    3. Updates the document record
    4. Cleans up old file and downstream indexes
    5. Triggers reprocessing
    """
    # Get existing document
    result = await db.execute(
        select(Document).where(
            and_(
                Document.id == document_id,
                Document.user_id == current_user.id,
                Document.deleted_at.is_(None),
            )
        )
    )
    doc = result.scalar_one_or_none()

    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    # Validate new file
    is_valid, error_msg = validate_file(file)
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error_msg)

    # Save new file
    new_filepath = generate_upload_path(current_user.id, file.filename)
    try:
        file_size, content_hash = await save_uploaded_file(file, new_filepath)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save file: {str(e)}",
        )

    # Store old file path for cleanup
    old_filepath = doc.file_path

    # Update document record
    doc.filename = file.filename
    doc.file_path = new_filepath
    doc.file_type = get_file_extension(file.filename)[1:]
    doc.file_size = file_size
    doc.content_hash = content_hash
    doc.processing_status = ProcessingStatus.PENDING
    doc.gemini_file_uri = None
    doc.gemini_file_expires_at = None
    doc.content_text = None  # Clear cached text
    doc.page_count = None
    doc.word_count = None
    doc.ai_summary = None

    await db.commit()
    await db.refresh(doc)

    logger.info(f"Document replaced: {document_id} with {file.filename} by user {current_user.id}")

    # Clean up old file
    await cleanup_physical_file(old_filepath)
    # Clean up old thumbnail if it exists
    await cleanup_physical_file(f"{old_filepath}_thumb.png")

    # Clean up old vector embeddings
    await cleanup_document_vectors(document_id, current_user.id)

    # Clean up old Gemini file
    await cleanup_gemini_file(doc.gemini_file_uri)

    # Trigger reprocessing
    await trigger_document_processing(document_id)

    return DocumentResponse.model_validate(doc)


@router.get(
    "/{document_id}/chunks",
    response_model=List[DocumentChunkResponse],
    summary="Get document chunks",
    description="Retrieve all chunks for a document",
)
async def get_document_chunks(
    document_id: int,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=200, description="Chunks per page"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all chunks for a document."""
    # Verify document ownership
    doc_result = await db.execute(
        select(Document).where(
            and_(
                Document.id == document_id,
                Document.user_id == current_user.id,
                Document.deleted_at.is_(None),
            )
        )
    )
    doc = doc_result.scalar_one_or_none()

    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    # Get chunks
    chunks_query = (
        select(DocumentChunk)
        .where(DocumentChunk.document_id == document_id)
        .order_by(DocumentChunk.chunk_index)
    )

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
            embedding_id=chunk.embedding_id,
        )
        for chunk in chunks
    ]


@router.get(
    "/{document_id}/status",
    response_model=ProcessingStatusResponse,
    summary="Get processing status",
    description="Check document processing status and progress",
)
async def get_processing_status(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get document processing status."""
    result = await db.execute(
        select(Document).where(
            and_(
                Document.id == document_id,
                Document.user_id == current_user.id,
                Document.deleted_at.is_(None),
            )
        )
    )
    doc = result.scalar_one_or_none()

    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    # Calculate progress percentage
    progress_map = {
        ProcessingStatus.PENDING: 0.0,
        ProcessingStatus.PROCESSING: 50.0,
        ProcessingStatus.COMPLETED: 100.0,
        ProcessingStatus.FAILED: 0.0,
    }

    message_map = {
        ProcessingStatus.PENDING: "Document queued for processing",
        ProcessingStatus.PROCESSING: "Processing document (extracting text, chunking, embedding)",
        ProcessingStatus.COMPLETED: "Document processing complete",
        ProcessingStatus.FAILED: "Document processing failed",
    }

    return ProcessingStatusResponse(
        document_id=doc.id,
        status=doc.processing_status,
        progress_percentage=progress_map[doc.processing_status],
        message=message_map[doc.processing_status],
    )


@router.post(
    "/{document_id}/process",
    response_model=MessageResponse,
    summary="Trigger processing",
    description="Manually trigger document processing (if pending or failed)",
)
async def trigger_processing(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Manually trigger document processing."""
    result = await db.execute(
        select(Document).where(
            and_(
                Document.id == document_id,
                Document.user_id == current_user.id,
                Document.deleted_at.is_(None),
            )
        )
    )
    doc = result.scalar_one_or_none()

    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    # Only allow reprocessing if pending or failed
    if doc.processing_status not in [ProcessingStatus.PENDING, ProcessingStatus.FAILED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot reprocess document in status: {doc.processing_status.value}",
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


@router.get(
    "/{document_id}/content",
    summary="Get document content",
    description="Stream the raw document file (inline viewing)",
)
async def get_document_content(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Serve the raw document file."""
    doc = await _get_doc_or_404(document_id, current_user, db)

    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")

    # Determine media type
    media_type = "application/octet-stream"
    if doc.file_type == "pdf":
        media_type = "application/pdf"
    elif doc.file_type in ["jpg", "jpeg"]:
        media_type = "image/jpeg"
    elif doc.file_type == "png":
        media_type = "image/png"

    from fastapi.responses import FileResponse

    return FileResponse(
        doc.file_path,
        media_type=media_type,
        filename=doc.filename,
        content_disposition_type="inline",
    )


@router.get(
    "/{document_id}/thumb",
    summary="Get document thumbnail",
    description="Get a visual thumbnail/cover image for the document",
)
async def get_document_thumbnail(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Serve the document thumbnail."""
    doc = await _get_doc_or_404(document_id, current_user, db)

    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="Original file not found")

    # Determine mime type for generation
    mime_type = "application/pdf" if doc.file_type == "pdf" else f"image/{doc.file_type}"

    # Generate (or get cached) thumbnail
    thumb_path = generate_thumbnail(doc.file_path, mime_type)

    if not thumb_path or not os.path.exists(thumb_path):
        # Fallback for non-supported types or failures: return 404 so frontend shows default icon
        raise HTTPException(status_code=404, detail="Thumbnail not available")

    from fastapi.responses import FileResponse

    return FileResponse(thumb_path, media_type="image/png")


@router.get(
    "/batch/thumbs",
    summary="Get multiple document thumbnails",
    description="Fetch thumbnails for multiple documents in a single request. Returns base64-encoded PNGs.",
)
async def get_batch_thumbnails(
    ids: str = Query(..., description="Comma-separated document IDs"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Batch fetch document thumbnails.

    Performance: 1 request instead of N requests for N documents.
    Returns base64-encoded PNG thumbnails.
    """
    import base64

    # Parse document IDs
    try:
        document_ids = [int(id.strip()) for id in ids.split(",") if id.strip()]
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid document IDs format")

    if not document_ids:
        return {"thumbnails": {}}

    if len(document_ids) > 50:
        raise HTTPException(status_code=400, detail="Maximum 50 documents per request")

    # Single query to fetch all requested documents
    result = await db.execute(
        select(Document).where(
            and_(
                Document.id.in_(document_ids),
                Document.user_id == current_user.id,
                Document.deleted_at.is_(None),
            )
        )
    )
    documents = result.scalars().all()

    # Generate thumbnails for each document
    thumbnails = {}
    for doc in documents:
        if not os.path.exists(doc.file_path):
            thumbnails[str(doc.id)] = None
            continue

        mime_type = "application/pdf" if doc.file_type == "pdf" else f"image/{doc.file_type}"
        thumb_path = generate_thumbnail(doc.file_path, mime_type)

        if thumb_path and os.path.exists(thumb_path):
            try:
                with open(thumb_path, "rb") as f:
                    thumb_data = base64.b64encode(f.read()).decode("utf-8")
                thumbnails[str(doc.id)] = {
                    "data": f"data:image/png;base64,{thumb_data}",
                    "filename": doc.filename,
                }
            except Exception:
                thumbnails[str(doc.id)] = None
        else:
            thumbnails[str(doc.id)] = None

    return {"thumbnails": thumbnails}


async def _get_doc_or_404(document_id: int, user: User, db: AsyncSession) -> Document:
    result = await db.execute(
        select(Document).where(
            and_(
                Document.id == document_id,
                Document.user_id == user.id,
                Document.deleted_at.is_(None),
            )
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.patch(
    "/{document_id}",
    response_model=DocumentResponse,
    summary="Update document metadata",
    description="Update sector, notes, or reading progress for a document",
)
async def update_document(
    document_id: int,
    update_data: DocumentUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update document metadata like sector, notes, and reading progress."""
    doc = await _get_doc_or_404(document_id, current_user, db)

    # Apply updates
    if update_data.sector is not None:
        doc.sector = update_data.sector
    if update_data.notes is not None:
        doc.notes = update_data.notes
    if update_data.reading_progress is not None:
        doc.reading_progress = max(0.0, min(1.0, update_data.reading_progress))
    # Phase 2A: Document Actions
    if update_data.title is not None:
        doc.filename = update_data.title  # title maps to filename for display
    if update_data.is_favorite is not None:
        doc.is_favorite = update_data.is_favorite
    if update_data.is_archived is not None:
        doc.is_archived = update_data.is_archived

    await db.commit()
    await db.refresh(doc)

    logger.info(f"Document {document_id} updated by user {current_user.id}")
    return doc


@router.patch(
    "/{document_id}/move",
    response_model=DocumentResponse,
    summary="Move document",
    description="Move a document to a different folder",
)
async def move_document(
    document_id: int,
    request: MoveDocumentRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Move a document to a different folder."""
    doc = await _get_doc_or_404(document_id, current_user, db)

    # Validate target folder if specified
    if request.folder_id is not None:
        from app.models import DocumentFolder

        folder = await db.get(DocumentFolder, request.folder_id)
        if not folder or folder.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Target folder not found")

    doc.folder_id = request.folder_id
    await db.commit()
    await db.refresh(doc)

    logger.info(
        f"Document {document_id} moved to folder {request.folder_id} by user {current_user.id}"
    )
    return doc


@router.post(
    "/{document_id}/summary",
    response_model=SummaryResponse,
    summary="Generate AI summary",
    description="Generate or retrieve cached AI summary for a document",
)
async def generate_document_summary(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate AI summary for document content using Gemini."""
    doc = await _get_doc_or_404(document_id, current_user, db)

    # Return cached summary if exists
    if doc.ai_summary:
        return SummaryResponse(summary=doc.ai_summary, cached=True)

    # Check if document has content
    if not doc.content_text:
        raise HTTPException(
            status_code=400,
            detail="Document has no extracted text. Wait for processing to complete.",
        )

    # Generate summary using Gemini
    try:
        from google import genai
        from app.core.config import settings

        client = genai.Client(api_key=settings.GEMINI_API_KEY)

        # Truncate content if too long (Gemini has context limits)
        content = doc.content_text[:30000] if len(doc.content_text) > 30000 else doc.content_text

        prompt = f"""Provide a concise summary of this document in 3-5 paragraphs. 
Focus on the main topics, key takeaways, and important concepts.

Document Title: {doc.filename}

Content:
{content}"""

        response = client.models.generate_content(model=DEFAULT_TOKENIZER_MODEL, contents=prompt)
        summary = response.text

        # Cache the summary
        doc.ai_summary = summary
        await db.commit()

        logger.info(f"AI summary generated for document {document_id}")
        return SummaryResponse(summary=summary, cached=False)

    except Exception as e:
        logger.error(f"AI summary generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Summary generation failed: {str(e)}")
