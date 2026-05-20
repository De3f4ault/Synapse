"""
Chat attachment upload endpoint.

Handles image/file uploads for chat messages.
Files are stored as Documents in the knowledge bank with source_metadata
linking back to the chat session.

Supports: PNG, JPEG, WebP, GIF, PDF (Phase 1: images only)
Max size: 20MB per file
"""

import os
import uuid
import hashlib
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.document import Document, ProcessingStatus
from app.core.config import settings

router = APIRouter()

# Configuration
DATA_DIR = getattr(settings, "DATA_DIR", "data")
UPLOAD_DIR = os.path.join(DATA_DIR, "uploads", "documents")
THUMBNAIL_DIR = os.path.join(DATA_DIR, "thumbnails")
MAX_CHAT_UPLOAD_SIZE = 20 * 1024 * 1024  # 20MB
MAX_FILES_PER_MESSAGE = 5

ALLOWED_IMAGE_TYPES = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/heic": ".heic",
}

ALLOWED_DOC_TYPES = {
    "application/pdf": ".pdf",
}

ALLOWED_TYPES = {**ALLOWED_IMAGE_TYPES, **ALLOWED_DOC_TYPES}


class ChatAttachmentResponse(BaseModel):
    """Response from uploading a chat attachment."""

    document_id: int = Field(description="Document ID in knowledge bank")
    filename: str = Field(description="Original filename")
    content_type: str = Field(description="MIME type")
    size_bytes: int = Field(description="File size in bytes")
    url: str = Field(description="URL to access the file")
    thumbnail_url: Optional[str] = Field(default=None, description="Thumbnail URL (images only)")


def _generate_thumbnail(source_path: str, thumb_path: str, max_width: int = 400):
    """Generate a WebP thumbnail for an image."""
    try:
        from PIL import Image

        with Image.open(source_path) as img:
            # Convert RGBA to RGB for WebP
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")

            # Resize maintaining aspect ratio
            ratio = max_width / img.width
            if ratio < 1:
                new_size = (max_width, int(img.height * ratio))
                img = img.resize(new_size, Image.LANCZOS)

            img.save(thumb_path, "WebP", quality=80)
            return True
    except Exception:
        return False


@router.post(
    "/upload",
    response_model=ChatAttachmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a chat attachment",
)
async def upload_chat_attachment(
    file: UploadFile = File(...),
    session_id: Optional[int] = Form(default=None),
    caption: Optional[str] = Form(default=None),  # User-provided context for image retrieval
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Upload a file for use in chat messages.

    Creates a Document record in the knowledge bank with source_metadata
    linking to the chat session. Images skip the processing pipeline.
    """
    # Validate MIME type
    content_type = file.content_type or "application/octet-stream"
    if content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type: {content_type}. Allowed: {', '.join(ALLOWED_TYPES.keys())}",
        )

    # Read file content
    content = await file.read()
    file_size = len(content)

    if file_size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empty file",
        )

    if file_size > MAX_CHAT_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size: {MAX_CHAT_UPLOAD_SIZE // (1024 * 1024)}MB",
        )

    # Generate unique filename
    ext = ALLOWED_TYPES.get(content_type, ".bin")
    file_id = str(uuid.uuid4())
    safe_filename = f"{file_id}{ext}"

    # Content hash for dedup
    content_hash = hashlib.sha256(content).hexdigest()

    # Check for duplicate
    existing = await db.execute(
        select(Document).where(
            and_(
                Document.user_id == current_user.id,
                Document.content_hash == content_hash,
                Document.deleted_at.is_(None),
            )
        )
    )
    existing_doc = existing.scalar_one_or_none()

    if existing_doc:
        # Return existing document (dedup)
        thumbnail_url = None
        if content_type in ALLOWED_IMAGE_TYPES:
            thumb_name = f"{existing_doc.id}_thumb.webp"
            thumb_path = os.path.join(THUMBNAIL_DIR, thumb_name)
            if os.path.exists(thumb_path):
                thumbnail_url = f"/api/v1/chat/attachments/thumbnail/{existing_doc.id}"

        return ChatAttachmentResponse(
            document_id=existing_doc.id,
            filename=existing_doc.filename,
            content_type=content_type,
            size_bytes=existing_doc.file_size,
            url=f"/api/v1/chat/attachments/{existing_doc.id}/file",
            thumbnail_url=thumbnail_url,
        )

    # Create user upload directory
    user_upload_dir = os.path.join(UPLOAD_DIR, str(current_user.id))
    os.makedirs(user_upload_dir, exist_ok=True)

    # Save file
    file_path = os.path.join(user_upload_dir, safe_filename)
    with open(file_path, "wb") as f:
        f.write(content)

    # Store relative path (relative to data/)
    relative_path = os.path.relpath(file_path, DATA_DIR)

    # Determine processing status:
    # - Images: PENDING — Celery vision task embeds them into synapse_dense.
    # - Docs (PDF): PENDING — existing document ingestion pipeline handles them.
    # Previously images were set to COMPLETED immediately (no Qdrant embedding).
    # Sprint 1 change: images now go through NomicVisionEmbedder asynchronously.
    is_image = content_type in ALLOWED_IMAGE_TYPES
    proc_status = ProcessingStatus.PENDING

    # Build source metadata
    source_meta = {"source": "chat"}
    if session_id:
        source_meta["chat_session_id"] = session_id

    # Create Document record
    document = Document(
        user_id=current_user.id,
        filename=file.filename or safe_filename,
        file_path=relative_path,
        file_type=ext.lstrip("."),
        file_size=file_size,
        mime_type=content_type,
        content_hash=content_hash,
        processing_status=proc_status,
        source_metadata=source_meta,
        original_filename=file.filename,
    )
    db.add(document)
    await db.commit()
    await db.refresh(document)

    # Generate thumbnail for images
    thumbnail_url = None
    if is_image:
        os.makedirs(THUMBNAIL_DIR, exist_ok=True)
        thumb_name = f"{document.id}_thumb.webp"
        thumb_path = os.path.join(THUMBNAIL_DIR, thumb_name)
        if _generate_thumbnail(file_path, thumb_path):
            thumbnail_url = f"/api/v1/chat/attachments/thumbnail/{document.id}"

    # Dispatch vision embedding task for images.
    # The task embeds the image into synapse_dense via NomicVisionEmbedder and
    # updates processing_status to COMPLETED when done.
    # caption is forwarded so the task can populate surrounding_context;
    # if None, the task uses the cleaned filename as fallback.
    if is_image:
        from app.services.background.tasks import embed_image_task
        embed_image_task.apply_async(
            args=[document.id, caption],
            queue="rag",
        )

    return ChatAttachmentResponse(
        document_id=document.id,
        filename=document.filename,
        content_type=content_type,
        size_bytes=file_size,
        url=f"/api/v1/chat/attachments/{document.id}/file",
        thumbnail_url=thumbnail_url,
    )


@router.get(
    "/{document_id}/file",
    summary="Download a chat attachment",
)
async def download_chat_attachment(
    document_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Serve an attachment file. Only the owning user can access."""
    result = await db.execute(
        select(Document).where(
            and_(
                Document.id == document_id,
                Document.user_id == current_user.id,
                Document.deleted_at.is_(None),
            )
        )
    )
    document = result.scalar_one_or_none()

    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attachment not found")

    file_path = document.file_path
    if not os.path.isabs(file_path):
        file_path = os.path.join(DATA_DIR, file_path)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found on disk")

    return FileResponse(
        path=file_path,
        filename=document.filename,
        media_type=document.mime_type or "application/octet-stream",
    )


@router.get(
    "/thumbnail/{document_id}",
    summary="Get attachment thumbnail",
)
async def get_attachment_thumbnail(
    document_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Serve a thumbnail for an image attachment."""
    # Verify ownership
    result = await db.execute(
        select(Document.id).where(
            and_(
                Document.id == document_id,
                Document.user_id == current_user.id,
                Document.deleted_at.is_(None),
            )
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attachment not found")

    thumb_path = os.path.join(THUMBNAIL_DIR, f"{document_id}_thumb.webp")
    if not os.path.exists(thumb_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thumbnail not found")

    return FileResponse(path=thumb_path, media_type="image/webp")


class CaptionUpdateRequest(BaseModel):
    """Request body for updating an image attachment's user caption."""
    caption: str = Field(
        ...,
        min_length=1,
        max_length=1000,
        description="User-provided context to append to the LLM-generated caption",
    )


@router.patch(
    "/{document_id}/caption",
    status_code=status.HTTP_200_OK,
    summary="Update user caption for an image attachment",
)
async def update_attachment_caption(
    document_id: int,
    body: CaptionUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Append a user-provided caption to an image attachment's surrounding_context.

    Called at message-send time (not at upload time) so the user's typed message
    can be captured as contextual metadata for retrieval. The LLM-generated caption
    from the vision ingestion task remains the primary surrounding_context — this
    call appends "User context: {caption}" as a suffix.

    If the image task has already completed (COMPLETED status), patches the Qdrant
    point payload in-place via set_payload (no re-embedding required).

    If the task is still running (PENDING/PROCESSING), saves the caption to
    source_metadata so it can be used on retry or a follow-up patch.

    Non-image attachments (PDFs) are ignored silently — captions only apply to
    image embeddings that have a Qdrant point.
    """
    # Load document, verify ownership
    result = await db.execute(
        select(Document).where(
            and_(
                Document.id == document_id,
                Document.user_id == current_user.id,
                Document.deleted_at.is_(None),
            )
        )
    )
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attachment not found")

    # Only image attachments have Qdrant points — PDFs use the text pipeline
    if document.mime_type not in ALLOWED_IMAGE_TYPES:
        return {"status": "skipped", "reason": "not_an_image"}

    user_caption = body.caption.strip()

    # Persist caption in Postgres source_metadata (durable record)
    meta = dict(document.source_metadata or {})
    meta["user_caption"] = user_caption
    document.source_metadata = meta
    await db.commit()

    # If image embedding has completed, patch the Qdrant payload in-place.
    # set_payload merges the given keys — other payload fields are untouched.
    if document.processing_status == ProcessingStatus.COMPLETED:
        try:
            import uuid as _uuid
            from app.core.ai.rag.vector_store.qdrant.client import get_qdrant_client

            point_id = str(_uuid.uuid5(_uuid.NAMESPACE_OID, f"image:{document.id}"))
            qdrant = get_qdrant_client()

            # Retrieve current surrounding_context (may already have LLM caption)
            points = qdrant.get_client().retrieve(
                collection_name="synapse_dense",
                ids=[point_id],
                with_payload=True,
            )
            current_context = ""
            if points:
                current_context = points[0].payload.get("surrounding_context", "") or ""

            # Build updated context: if LLM caption exists, append user note; else use user caption only
            if current_context and not current_context.endswith(f"User context: {user_caption}"):
                # Strip any stale user-context suffix before appending fresh one
                base = current_context.split(". User context:")[0].rstrip(". ")
                new_context = f"{base}. User context: {user_caption}" if base else user_caption
            else:
                new_context = user_caption

            qdrant.get_client().set_payload(
                collection_name="synapse_dense",
                payload={"surrounding_context": new_context},
                points=[point_id],
            )
        except Exception as patch_err:
            # Non-fatal — Postgres record is the durable copy; log and continue
            import structlog as _structlog
            _log = _structlog.get_logger(__name__)
            _log.warning("caption_qdrant_patch_failed", document_id=document_id, error=str(patch_err))

    return {"status": "updated", "document_id": document_id}
