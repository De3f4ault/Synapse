"""
Document management REST API endpoints.

Thin controller — business logic lives in:
- Service layer: app/services/document_service.py
- Schemas: app/schemas/document.py
"""

import os
from typing import List, Optional

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status, Query
from fastapi.responses import JSONResponse, FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from datetime import datetime
import logging
import base64

from app.api.deps import get_db, get_current_user, PaginationParams
from app.services.permissions.service import PermissionService
from app.models.user import User
from app.models.document import Document, ProcessingStatus
from app.models.document_chunk import DocumentChunk
from app.schemas.common import MessageResponse
from app.schemas.document import (
    DocumentResponse,
    DocumentUpdateRequest,
    DocumentChunkResponse,
    ProcessingStatusResponse,
    ConflictType,
    DuplicateConflictResponse,
    MoveDocumentRequest,
    SummaryResponse,
)
from app.services.document.service import (
    get_file_extension,
    validate_file,
    generate_upload_path,
    save_uploaded_file,
    generate_thumbnail,
    cleanup_physical_file,
    check_upload_conflicts,
    replace_document_file,
    generate_ai_summary,
)

logger = logging.getLogger(__name__)
router = APIRouter()


# ============================================================================
# Upload & Replace
# ============================================================================


@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(..., description="Document file to upload"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload a document for processing. Returns 409 Conflict on duplicates."""
    is_valid, error_msg = validate_file(file)
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error_msg)

    filepath = generate_upload_path(current_user.id, file.filename)
    try:
        file_size, content_hash = await save_uploaded_file(file, filepath)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {e}")

    # Check for collisions
    conflict = await check_upload_conflicts(db, current_user.id, content_hash, file.filename)
    if conflict:
        os.remove(filepath)
        doc = conflict["existing_doc"]
        ctype = conflict["conflict_type"]
        messages = {
            "exact_duplicate": f"This exact file '{file.filename}' already exists in your library.",
            "same_content": f"This file's content already exists as '{doc.filename}'.",
            "same_filename": f"A different document named '{file.filename}' already exists.",
        }
        resp = DuplicateConflictResponse(
            conflict_type=ConflictType(ctype),
            existing_document_id=doc.id,
            existing_filename=doc.filename,
            existing_file_size=doc.file_size,
            existing_uploaded_at=doc.created_at,
            message=messages[ctype],
        )
        return JSONResponse(status_code=status.HTTP_409_CONFLICT, content=resp.model_dump(mode="json"))

    file_type = get_file_extension(file.filename)[1:]
    new_doc = Document(
        user_id=current_user.id, filename=file.filename, file_path=filepath,
        file_type=file_type, file_size=file_size, content_hash=content_hash,
        processing_status=ProcessingStatus.PENDING,
    )
    db.add(new_doc)
    await db.commit()
    await db.refresh(new_doc)

    logger.info(f"Document uploaded: {new_doc.id} ({file.filename}) by user {current_user.id}")

    # Route through DMS ingestion pipeline
    from app.services.background.tasks import consume_document
    consume_document.delay({
        "source_path": filepath,
        "original_filename": file.filename,
        "user_id": current_user.id,
        "document_id": new_doc.id,
    })

    return _doc_response(new_doc)


@router.put("/{document_id}/replace", response_model=DocumentResponse)
async def replace_document(
    document_id: int,
    file: UploadFile = File(..., description="New document file"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Replace an existing document's file while preserving its ID."""
    doc = await _get_doc_or_404(document_id, current_user, db)
    try:
        await replace_document_file(db, doc, file, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to replace document: {e}")
    return _doc_response(doc)


# ============================================================================
# List / Get / Delete
# ============================================================================


@router.get("", response_model=List[DocumentResponse])
async def list_documents(
    folder_id: Optional[int] = Query(None, description="Filter by folder ID"),
    smart_view: Optional[str] = Query(None, description="Smart view: recent, favorites, archived"),
    processing_status: Optional[str] = Query(None, description="Filter by status"),
    search: Optional[str] = Query(None, description="Search by filename"),
    sort_by: Optional[str] = Query("updated_at", description="Sort field"),
    sort_order: Optional[str] = Query("desc", description="asc or desc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List user's documents with folder, smart view, and status filtering."""
    perm_service = PermissionService(db)
    stmt = perm_service.get_accessible_query(current_user.id)

    # Smart views
    if smart_view == "recent":
        stmt = stmt.where(Document.is_archived.is_(False)).order_by(Document.updated_at.desc())
    elif smart_view == "favorites":
        stmt = stmt.where(Document.is_favorite.is_(True))
    elif smart_view == "archived":
        stmt = stmt.where(Document.is_archived.is_(True))
    elif folder_id is not None:
        stmt = stmt.where(Document.folder_id == folder_id)

    if processing_status:
        stmt = stmt.where(Document.processing_status == processing_status)
    if search:
        stmt = stmt.where(Document.filename.ilike(f"%{search}%"))

    # Sorting
    sort_col = getattr(Document, sort_by, Document.updated_at)
    stmt = stmt.order_by(sort_col.desc() if sort_order == "desc" else sort_col.asc())
    stmt = stmt.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(stmt)
    return [_doc_response(d) for d in result.scalars().all()]


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    """Get a specific document."""
    return _doc_response(await _get_doc_or_404(document_id, current_user, db))


@router.delete("/{document_id}", response_model=MessageResponse)
async def delete_document(
    document_id: int,
    keep_file: bool = Query(False, description="Keep physical file on disk"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a document (soft delete + physical cleanup by default)."""
    doc = await _get_doc_or_404(document_id, current_user, db)
    doc.deleted_at = datetime.utcnow()
    await db.commit()

    if not keep_file:
        await cleanup_physical_file(doc.file_path)
        await cleanup_physical_file(f"{doc.file_path}_thumb.png")

    return MessageResponse(message="Document deleted successfully")


# ============================================================================
# Chunks & Processing
# ============================================================================


@router.get("/{document_id}/chunks", response_model=List[DocumentChunkResponse])
async def get_document_chunks(
    document_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all chunks for a document."""
    await _get_doc_or_404(document_id, current_user, db)
    result = await db.execute(
        select(DocumentChunk)
        .where(DocumentChunk.document_id == document_id)
        .order_by(DocumentChunk.chunk_index)
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return [
        DocumentChunkResponse(
            id=c.id, document_id=c.document_id, content=c.content,
            chunk_index=c.chunk_index, page=c.page, start_char=c.start_char,
            end_char=c.end_char, embedding_id=c.embedding_id,
        )
        for c in result.scalars().all()
    ]


@router.get("/{document_id}/status", response_model=ProcessingStatusResponse)
async def get_processing_status(
    document_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    """Get document processing status."""
    doc = await _get_doc_or_404(document_id, current_user, db)
    progress = {ProcessingStatus.PENDING: 0.0, ProcessingStatus.PROCESSING: 50.0, ProcessingStatus.COMPLETED: 100.0, ProcessingStatus.FAILED: 0.0}
    messages = {ProcessingStatus.PENDING: "Queued", ProcessingStatus.PROCESSING: "Processing", ProcessingStatus.COMPLETED: "Complete", ProcessingStatus.FAILED: "Failed"}
    return ProcessingStatusResponse(
        document_id=doc.id, status=doc.processing_status,
        progress_percentage=progress[doc.processing_status],
        message=messages[doc.processing_status],
    )


@router.post("/{document_id}/process", response_model=MessageResponse)
async def trigger_processing(
    document_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    """Manually trigger document processing."""
    doc = await _get_doc_or_404(document_id, current_user, db)
    if doc.processing_status not in [ProcessingStatus.PENDING, ProcessingStatus.FAILED]:
        raise HTTPException(status_code=400, detail=f"Cannot reprocess document in status: {doc.processing_status.value}")
    doc.processing_status = ProcessingStatus.PENDING
    await db.commit()

    from app.services.background.tasks import reprocess_document
    reprocess_document.delay(document_id)

    return MessageResponse(message="Document processing triggered")


# ============================================================================
# Content & Thumbnails
# ============================================================================


@router.get("/{document_id}/content")
async def get_document_content(
    document_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    """Stream the raw document file."""
    doc = await _get_doc_or_404(document_id, current_user, db)
    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
    media_types = {"pdf": "application/pdf", "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png"}
    return FileResponse(doc.file_path, media_type=media_types.get(doc.file_type, "application/octet-stream"),
                        filename=doc.filename, content_disposition_type="inline")


@router.get("/{document_id}/thumb")
async def get_document_thumbnail(
    document_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    """Serve the document thumbnail."""
    doc = await _get_doc_or_404(document_id, current_user, db)
    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="Original file not found")
    mime = "application/pdf" if doc.file_type == "pdf" else f"image/{doc.file_type}"
    thumb_path = generate_thumbnail(doc.file_path, mime)
    if not thumb_path or not os.path.exists(thumb_path):
        raise HTTPException(status_code=404, detail="Thumbnail not available")
    return FileResponse(thumb_path, media_type="image/png")


@router.get("/batch/thumbs")
async def get_batch_thumbnails(
    ids: str = Query(..., description="Comma-separated document IDs"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Batch fetch document thumbnails (base64)."""
    try:
        doc_ids = [int(i.strip()) for i in ids.split(",") if i.strip()]
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid document IDs format")
    if not doc_ids:
        return {"thumbnails": {}}
    if len(doc_ids) > 50:
        raise HTTPException(status_code=400, detail="Maximum 50 documents per request")

    perm_service = PermissionService(db)
    accessible_stmt = perm_service.get_accessible_query(current_user.id)
    result = await db.execute(
        accessible_stmt.where(Document.id.in_(doc_ids))
    )
    thumbnails = {}
    for doc in result.scalars().all():
        if not os.path.exists(doc.file_path):
            thumbnails[str(doc.id)] = None
            continue
        mime = "application/pdf" if doc.file_type == "pdf" else f"image/{doc.file_type}"
        tp = generate_thumbnail(doc.file_path, mime)
        if tp and os.path.exists(tp):
            try:
                with open(tp, "rb") as f:
                    thumbnails[str(doc.id)] = {"data": f"data:image/png;base64,{base64.b64encode(f.read()).decode()}", "filename": doc.filename}
            except Exception:
                thumbnails[str(doc.id)] = None
        else:
            thumbnails[str(doc.id)] = None
    return {"thumbnails": thumbnails}


# ============================================================================
# Metadata Updates
# ============================================================================


@router.patch("/{document_id}", response_model=DocumentResponse)
async def update_document(
    document_id: int, update_data: DocumentUpdateRequest,
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    """Update document metadata."""
    doc = await _get_doc_or_404(document_id, current_user, db, permission="change")
    if update_data.sector is not None:
        doc.sector = update_data.sector
    if update_data.notes is not None:
        doc.notes = update_data.notes
    if update_data.reading_progress is not None:
        doc.reading_progress = max(0.0, min(1.0, update_data.reading_progress))
    if update_data.title is not None:
        doc.filename = update_data.title
    if update_data.is_favorite is not None:
        doc.is_favorite = update_data.is_favorite
    if update_data.is_archived is not None:
        doc.is_archived = update_data.is_archived
    await db.commit()
    await db.refresh(doc)

    # Auto-rename: if title changed, move physical files to match new
    # template path. Sourced from Paperless signals/handlers.py L71-100.
    if update_data.title is not None:
        try:
            from app.services.storage.file_manager import FileManager
            fm = FileManager()
            fm.update_filename_and_move_files(doc)
            await db.commit()
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"Auto-rename failed for doc {doc.id}: {e}")

    # Fire DOCUMENT_UPDATED workflow trigger (best-effort)
    try:
        from app.services.workflows.engine import run_workflows
        from app.models.workflow import WorkflowTriggerType
        await run_workflows(
            trigger_type=WorkflowTriggerType.DOCUMENT_UPDATED,
            document_id=document_id,
            db=db,
        )
    except Exception:
        pass  # Workflow failure must never break API response

    return _doc_response(doc)


@router.patch("/{document_id}/move", response_model=DocumentResponse)
async def move_document(
    document_id: int, request: MoveDocumentRequest,
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    """Move a document to a different folder."""
    doc = await _get_doc_or_404(document_id, current_user, db, permission="change")
    if request.folder_id is not None:
        from app.models import DocumentFolder
        folder = await db.get(DocumentFolder, request.folder_id)
        if not folder or folder.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Target folder not found")
    doc.folder_id = request.folder_id
    await db.commit()
    await db.refresh(doc)
    return _doc_response(doc)


@router.post("/{document_id}/summary", response_model=SummaryResponse)
async def generate_document_summary(
    document_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    """Generate or retrieve cached AI summary."""
    doc = await _get_doc_or_404(document_id, current_user, db)
    try:
        result = await generate_ai_summary(doc, db)
        return SummaryResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"AI summary generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Summary generation failed: {e}")


# ============================================================================
# Internal Helpers
# ============================================================================


async def _get_doc_or_404(
    document_id: int, user: User, db: AsyncSession,
    permission: str = "view",
) -> Document:
    """Fetch document with 3-tier permission check (owner → public → ACL)."""
    perm_service = PermissionService(db)
    if not await perm_service.has_permission(user.id, document_id, permission):
        raise HTTPException(status_code=404, detail="Document not found")
    result = await db.execute(
        select(Document).where(and_(Document.id == document_id, Document.deleted_at.is_(None)))
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


def _doc_response(doc: Document) -> DocumentResponse:
    return DocumentResponse(
        id=doc.id, filename=doc.filename, file_type=doc.file_type, file_size=doc.file_size,
        processing_status=doc.processing_status, page_count=doc.page_count, word_count=doc.word_count,
        ocr_performed=doc.ocr_performed, gemini_file_uri=doc.gemini_file_uri,
        gemini_file_expired=doc.gemini_file_expired, user_id=doc.user_id,
        created_at=doc.created_at, updated_at=doc.updated_at,
        correspondent_id=getattr(doc, "correspondent_id", None),
        document_type_id=getattr(doc, "document_type_id", None),
        storage_path_id=getattr(doc, "storage_path_id", None),
    )

