"""
Document lifecycle service.

Extracted from rest/documents.py — centralizes file validation, storage,
thumbnail generation, and multi-backend cleanup (disk, Qdrant, Gemini).
"""

import hashlib
import os
import uuid
from typing import Optional

import pypdfium2 as pdfium
from fastapi import UploadFile, HTTPException, status
from PIL import Image

from app.core.config import settings
from app.utils.logging import get_logger

logger = get_logger(__name__)

# ============================================================================
# Configuration
# ============================================================================

ALLOWED_EXTENSIONS = frozenset({
    # Documents
    ".pdf", ".docx", ".txt", ".md", ".epub",
    # Images (OCR support)
    ".png", ".jpg", ".jpeg", ".tiff", ".tif", ".bmp", ".gif", ".webp",
})

MAX_FILE_SIZE = 100 * 1024 * 1024  # 100 MB
UPLOAD_DIR = settings.UPLOAD_DIR or "data/uploads"


# ============================================================================
# File Operations
# ============================================================================


def get_file_extension(filename: str) -> str:
    """Extract lowercase file extension."""
    return os.path.splitext(filename)[1].lower()


def validate_file(file: UploadFile) -> tuple[bool, Optional[str]]:
    """Validate uploaded file extension. Returns (is_valid, error_message)."""
    ext = get_file_extension(file.filename)
    if ext not in ALLOWED_EXTENSIONS:
        return False, f"File type {ext} not allowed. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
    return True, None


def generate_upload_path(user_id: int, filename: str) -> str:
    """Generate unique upload path with UUID filename."""
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    ext = get_file_extension(filename)
    return os.path.join(UPLOAD_DIR, f"{uuid.uuid4()}{ext}")


async def save_uploaded_file(file: UploadFile, filepath: str) -> tuple[int, str]:
    """
    Stream file to disk while computing SHA-256 hash.

    Returns:
        (file_size_bytes, sha256_hex_digest)
    """
    total_size = 0
    sha256 = hashlib.sha256()

    with open(filepath, "wb") as f:
        while chunk := await file.read(8192):
            if total_size + len(chunk) > MAX_FILE_SIZE:
                f.close()
                os.remove(filepath)
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"File too large. Maximum size: {MAX_FILE_SIZE / 1024 / 1024:.0f}MB",
                )
            f.write(chunk)
            sha256.update(chunk)
            total_size += len(chunk)

    return total_size, sha256.hexdigest()


# ============================================================================
# Thumbnail Generation
# ============================================================================


def generate_thumbnail(file_path: str, mime_type: str = "application/pdf") -> Optional[str]:
    """Generate a 500px-max thumbnail for PDFs or images. Returns path or None."""
    try:
        thumb_path = f"{file_path}_thumb.png"
        if os.path.exists(thumb_path):
            return thumb_path

        image = None

        if "pdf" in mime_type:
            pdf = pdfium.PdfDocument(file_path)
            page = pdf[0]
            bitmap = page.render(scale=2)
            image = bitmap.to_pil()
            page.close()
            pdf.close()

        elif "image" in mime_type:
            with Image.open(file_path) as img:
                if img.mode in ("RGBA", "P"):
                    img = img.convert("RGB")
                image = img.copy()

        if image:
            image.thumbnail((500, 500))
            image.save(thumb_path, format="PNG", optimize=True)
            return thumb_path

    except Exception as e:
        logger.error("thumbnail_generation_failed", file_path=file_path, error=str(e))

    return None


# ============================================================================
# Background Processing
# ============================================================================


async def trigger_document_processing(document_id: int) -> bool:
    """Queue document for background processing (Celery). Returns True on success."""
    try:
        from app.services.background.tasks import process_document_task
        task = process_document_task.delay(document_id)
        logger.info("document_queued", document_id=document_id, task_id=task.id)
        return True
    except ImportError:
        logger.warning("celery_unavailable", document_id=document_id)
        return False
    except Exception as e:
        logger.error("queue_failed", document_id=document_id, error=str(e))
        return False


# ============================================================================
# Cleanup Helpers
# ============================================================================


async def cleanup_document_vectors(document_id: int, user_id: int) -> bool:
    """Delete document embeddings from Qdrant."""
    try:
        from app.core.ai.rag.vector_store.qdrant.client import get_qdrant_client
        from qdrant_client import models

        client = get_qdrant_client().get_client()
        collection = f"synapse_v2_user_{user_id}_documents"

        client.delete(
            collection_name=collection,
            points_selector=models.FilterSelector(
                filter=models.Filter(
                    must=[
                        models.FieldCondition(
                            key="metadata.document_id",
                            match=models.MatchValue(value=str(document_id)),
                        )
                    ]
                )
            ),
        )
        logger.info("qdrant_vectors_deleted", document_id=document_id)
        return True
    except Exception as e:
        logger.error("qdrant_cleanup_failed", document_id=document_id, error=str(e))
        return False


async def cleanup_gemini_file(gemini_file_uri: Optional[str]) -> bool:
    """Delete document from Gemini Files API if uploaded."""
    if not gemini_file_uri:
        return True
    try:
        from google import genai
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        file_id = gemini_file_uri.split("/")[-1]
        client.files.delete(name=f"files/{file_id}")
        logger.info("gemini_file_deleted", file_id=file_id)
        return True
    except Exception as e:
        logger.error("gemini_cleanup_failed", error=str(e))
        return True  # File will expire naturally


async def cleanup_physical_file(filepath: str) -> bool:
    """Delete physical file from disk."""
    try:
        if os.path.exists(filepath):
            os.remove(filepath)
            logger.info("file_deleted", filepath=filepath)
        return True
    except Exception as e:
        logger.error("file_delete_failed", filepath=filepath, error=str(e))
        return False
