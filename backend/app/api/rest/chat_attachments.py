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

    # Determine processing status — images skip pipeline
    is_image = content_type in ALLOWED_IMAGE_TYPES
    proc_status = ProcessingStatus.COMPLETED if is_image else ProcessingStatus.PENDING

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
