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
from sqlalchemy import select, and_, func, text
from datetime import datetime
import logging
import base64

from app.api.deps import get_db, get_current_user, PaginationParams
from app.services.permissions.service import PermissionService
from app.models.user import User
from app.models.document import Document, ProcessingStatus
from app.models.document_chunk import DocumentChunk
from app.schemas.common import MessageResponse
from app.schemas.documents import (
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
from app.models.document_note import DocumentNote
from app.schemas.documents import DocumentNoteCreate, DocumentNoteResponse
from app.schemas.documents import DocumentMetadataResponse
from app.schemas.documents import BulkEditRequest
from app.services.document.service import (
    get_file_extension,
    validate_file,
    generate_upload_path,
    save_uploaded_file,
    generate_thumbnail,
    cleanup_physical_file,
    cleanup_document_vectors,
    cleanup_gemini_file,
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

    return DocumentResponse.model_validate(new_doc)


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


@router.get(
    "/statistics",
    response_model=None,
    summary="Get DMS statistics",
    description="Dashboard statistics: document/correspondent/type/tag totals, inbox count, storage.",
)
async def get_statistics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return dashboard statistics matching Paperless StatisticsView."""
    from app.models.correspondent import Correspondent
    from app.models.document_type import DocumentType
    from app.models.tag import Tag
    from app.schemas.documents import DocumentStatisticsResponse
    from datetime import datetime, timedelta

    now = datetime.utcnow()
    first_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    first_of_last_month = (first_of_month - timedelta(days=1)).replace(day=1)

    # All counts in parallel
    docs_total = (await db.execute(
        select(func.count(Document.id)).where(
            and_(Document.user_id == current_user.id, Document.deleted_at.is_(None))
        )
    )).scalar() or 0

    docs_inbox = (await db.execute(
        select(func.count(Document.id)).where(
            and_(
                Document.user_id == current_user.id,
                Document.deleted_at.is_(None),
                Document.folder_id.is_(None),
            )
        )
    )).scalar() or 0

    storage_bytes = (await db.execute(
        select(func.coalesce(func.sum(Document.file_size), 0)).where(
            and_(Document.user_id == current_user.id, Document.deleted_at.is_(None))
        )
    )).scalar() or 0

    docs_this_month = (await db.execute(
        select(func.count(Document.id)).where(
            and_(
                Document.user_id == current_user.id,
                Document.deleted_at.is_(None),
                Document.created_at >= first_of_month,
            )
        )
    )).scalar() or 0

    docs_last_month = (await db.execute(
        select(func.count(Document.id)).where(
            and_(
                Document.user_id == current_user.id,
                Document.deleted_at.is_(None),
                Document.created_at >= first_of_last_month,
                Document.created_at < first_of_month,
            )
        )
    )).scalar() or 0

    correspondents_total = (await db.execute(
        select(func.count(Correspondent.id)).where(Correspondent.user_id == current_user.id)
    )).scalar() or 0

    types_total = (await db.execute(
        select(func.count(DocumentType.id)).where(DocumentType.user_id == current_user.id)
    )).scalar() or 0

    tags_total = (await db.execute(
        select(func.count(Tag.id)).where(Tag.user_id == current_user.id)
    )).scalar() or 0

    return DocumentStatisticsResponse(
        documents_total=docs_total,
        documents_inbox=docs_inbox,
        correspondents_total=correspondents_total,
        document_types_total=types_total,
        tags_total=tags_total,
        storage_total_bytes=storage_bytes,
        documents_this_month=docs_this_month,
        documents_last_month=docs_last_month,
    )




# ============================================================================
# Bulk Edit (Paperless-ngx bulk_edit.py, 12 operations)
# ============================================================================


@router.post(
    "/bulk_edit",
    response_model=MessageResponse,
    summary="Bulk edit documents",
    description="Apply an operation to multiple documents at once.",
)
async def bulk_edit(
    body: BulkEditRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Dispatch a bulk edit operation.

    Matching Paperless-ngx POST /api/documents/bulk_edit/.
    """
    from app.services.document.bulk_edit import dispatch

    # Verify user has access to all documents
    accessible = (await db.execute(
        select(Document.id).where(
            and_(
                Document.id.in_(body.documents),
                Document.user_id == current_user.id,
                Document.deleted_at.is_(None),
            )
        )
    )).scalars().all()

    if len(accessible) != len(body.documents):
        missing = set(body.documents) - set(accessible)
        raise HTTPException(
            status_code=404,
            detail=f"Documents not found or not accessible: {missing}",
        )

    try:
        result = await dispatch(
            db=db,
            user_id=current_user.id,
            doc_ids=body.documents,
            method=body.method,
            parameters=body.parameters,
        )
        return MessageResponse(message=result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


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


@router.delete("/{document_id}", response_model=MessageResponse, operation_id="delete_document")
async def delete_document(
    document_id: int,
    keep_file: bool = Query(False, description="Keep physical file on disk"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a document (soft delete + physical cleanup)."""
    doc = await _get_doc_or_404(document_id, current_user, db)
    doc.deleted_at = datetime.utcnow()
    await db.commit()

    logger.info(f"Document soft-deleted: {doc.id}")
    await cleanup_document_vectors(doc.id, current_user.id)
    await cleanup_gemini_file(doc.gemini_file_uri)

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
    # Progress reflects the two-pipeline architecture:
    # 0% queued → 15% parsing → 40% parsed/awaiting RAG → 70% chunking → 100% done
    progress = {
        ProcessingStatus.PENDING:   0.0,
        ProcessingStatus.PARSING:   15.0,
        ProcessingStatus.PARSED:    40.0,
        ProcessingStatus.CHUNKING:  70.0,
        ProcessingStatus.COMPLETED: 100.0,
        ProcessingStatus.FAILED:    0.0,
    }
    messages = {
        ProcessingStatus.PENDING:   "Queued — waiting for processing",
        ProcessingStatus.PARSING:   "Parsing document — extracting text and metadata",
        ProcessingStatus.PARSED:    "Text ready — building knowledge base",
        ProcessingStatus.CHUNKING:  "Indexing — embedding into knowledge base",
        ProcessingStatus.COMPLETED: "Ready — fully searchable",
        ProcessingStatus.FAILED:    "Processing failed — please try re-uploading",
    }
    return ProcessingStatusResponse(
        document_id=doc.id, status=doc.processing_status,
        progress_percentage=progress.get(doc.processing_status, 0.0),
        message=messages.get(doc.processing_status, "Unknown status"),
    )


@router.post("/{document_id}/process", response_model=MessageResponse)
async def trigger_processing(
    document_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    """Manually trigger document processing."""
    doc = await _get_doc_or_404(document_id, current_user, db)
    # Allow re-trigger from PENDING, PARSED (unchunked), or FAILED
    retriggerable = {ProcessingStatus.PENDING, ProcessingStatus.PARSED, ProcessingStatus.FAILED}
    if doc.processing_status not in retriggerable:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot reprocess document in status '{doc.processing_status.value}'. "
                   f"Must be one of: {', '.join(s.value for s in retriggerable)}",
        )
    doc.processing_status = ProcessingStatus.PENDING
    await db.commit()

    from app.services.background.tasks import reprocess_document
    reprocess_document.delay(document_id)

    return MessageResponse(message="Document processing triggered")


# ============================================================================
# Document Notes (Paperless-ngx models.py L680-712)
# ============================================================================


@router.get(
    "/{document_id}/notes",
    response_model=List[DocumentNoteResponse],
    summary="List document notes",
)
async def list_document_notes(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all notes for a document."""
    await _get_doc_or_404(document_id, current_user, db)
    result = await db.execute(
        select(DocumentNote, User.full_name)
        .join(User, DocumentNote.user_id == User.id)
        .where(DocumentNote.document_id == document_id)
        .order_by(DocumentNote.created_at.desc())
    )
    return [
        DocumentNoteResponse(
            id=note.id,
            document_id=note.document_id,
            user_id=note.user_id,
            note=note.note,
            created_at=note.created_at,
            username=full_name,
        )
        for note, full_name in result.all()
    ]


@router.post(
    "/{document_id}/notes",
    response_model=DocumentNoteResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a note to a document",
)
async def create_document_note(
    document_id: int,
    body: DocumentNoteCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a note on a document. Matching Paperless POST /documents/{id}/notes/."""
    await _get_doc_or_404(document_id, current_user, db)
    new_note = DocumentNote(
        document_id=document_id,
        user_id=current_user.id,
        note=body.note,
    )
    db.add(new_note)
    await db.commit()
    await db.refresh(new_note)
    return DocumentNoteResponse(
        id=new_note.id,
        document_id=new_note.document_id,
        user_id=new_note.user_id,
        note=new_note.note,
        created_at=new_note.created_at,
        username=current_user.full_name,
    )


@router.delete(
    "/{document_id}/notes/{note_id}",
    response_model=MessageResponse,
    summary="Delete a document note",
)
async def delete_document_note(
    document_id: int,
    note_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a note. Only the author or document owner can delete."""
    await _get_doc_or_404(document_id, current_user, db)
    result = await db.execute(
        select(DocumentNote).where(
            and_(
                DocumentNote.id == note_id,
                DocumentNote.document_id == document_id,
            )
        )
    )
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    if note.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the note author can delete")
    await db.delete(note)
    await db.commit()
    return MessageResponse(message="Note deleted")


# ============================================================================
# Document Metadata (Paperless DocumentViewSet.metadata())
# ============================================================================


@router.get(
    "/{document_id}/metadata",
    response_model=DocumentMetadataResponse,
    summary="Get document metadata",
    description="Technical metadata: checksums, MIME type, archive info.",
)
async def get_document_metadata(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return technical metadata matching Paperless metadata() endpoint."""
    doc = await _get_doc_or_404(document_id, current_user, db)
    archive_size = None
    if doc.archive_path and os.path.exists(doc.archive_path):
        archive_size = os.path.getsize(doc.archive_path)
    return DocumentMetadataResponse(
        original_filename=doc.original_filename or doc.filename,
        original_mime_type=doc.mime_type,
        original_checksum=doc.content_hash,
        archive_checksum=doc.archive_checksum,
        original_size=doc.file_size,
        archive_size=archive_size,
        lang=doc.file_metadata.get("lang") if doc.file_metadata else None,
        has_archive_version=doc.archive_path is not None,
    )




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
    return FileResponse(
        thumb_path, 
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=86400, immutable"}
    )





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

