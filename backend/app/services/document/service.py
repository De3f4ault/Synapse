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


async def store_to_final_path(doc, db) -> str:
    """
    Move a document from its upload path to the template-based originals directory.

    Called after processing when metadata (correspondent, type) is known.
    Updates doc.file_path and doc.content_hash in-place (caller must commit).

    Sourced from Paperless consumer.py L496-505 — dual-path store after parse.

    Returns:
        New relative path in originals_dir.
    """
    from app.services.storage.file_manager import FileManager

    fm = FileManager()

    # Current path is the upload location
    old_path = doc.file_path
    if not os.path.exists(old_path):
        logger.warning(f"store_to_final_path: source {old_path} not found, skipping")
        return doc.file_path

    # Move to template-based location
    new_rel = fm.store_original(old_path, doc)
    doc.file_path = new_rel

    # Recompute checksum at final location
    final_full = os.path.join(fm.config.originals_dir, new_rel)
    doc.content_hash = fm.compute_checksum(final_full)

    logger.info(f"Document {doc.id} stored: {old_path} → {new_rel}")
    return new_rel


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
    """Queue document for background processing via DMS ingestion pipeline."""
    try:
        from app.services.background.tasks import consume_document
        from app.db.session import AsyncSessionLocal
        from app.models.document import Document

        async with AsyncSessionLocal() as db:
            doc = await db.get(Document, document_id)
            if not doc:
                logger.error("document_not_found", document_id=document_id)
                return False

            consume_document.delay({
                "source_path": doc.file_path,
                "original_filename": doc.filename,
                "user_id": doc.user_id,
                "document_id": document_id,
            })
        logger.info("document_queued_dms", document_id=document_id)
        return True
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


# ============================================================================
# Upload Orchestration
# ============================================================================


async def check_upload_conflicts(
    db, user_id: int, content_hash: str, filename: str
) -> Optional[dict]:
    """
    Check for hash and filename collisions.

    Returns None if no conflict, or a dict with conflict info:
    {"conflict_type": ..., "existing_doc": doc}
    """
    from sqlalchemy import select, and_, func
    from app.models.document import Document

    # Hash collision
    hash_result = await db.execute(
        select(Document).where(and_(
            Document.content_hash == content_hash,
            Document.user_id == user_id,
            Document.deleted_at.is_(None),
        ))
    )
    hash_doc = hash_result.scalars().first()

    # Filename collision
    name_result = await db.execute(
        select(Document).where(and_(
            func.lower(Document.filename) == filename.lower(),
            Document.user_id == user_id,
            Document.deleted_at.is_(None),
        ))
    )
    name_doc = name_result.scalars().first()

    if hash_doc and name_doc and hash_doc.id == name_doc.id:
        return {"conflict_type": "exact_duplicate", "existing_doc": hash_doc}
    elif hash_doc:
        return {"conflict_type": "same_content", "existing_doc": hash_doc}
    elif name_doc:
        return {"conflict_type": "same_filename", "existing_doc": name_doc}

    return None


# ============================================================================
# Replace Orchestration
# ============================================================================


async def replace_document_file(db, doc, file: UploadFile, user_id: int):
    """
    Replace an existing document's file: save new file, update record,
    cleanup old file/vectors/gemini, trigger reprocessing.

    Mutates doc in-place and commits.
    """
    from app.models.document import ProcessingStatus

    is_valid, error_msg = validate_file(file)
    if not is_valid:
        raise ValueError(error_msg)

    new_filepath = generate_upload_path(user_id, file.filename)
    file_size, content_hash = await save_uploaded_file(file, new_filepath)

    old_filepath = doc.file_path

    doc.filename = file.filename
    doc.file_path = new_filepath
    doc.file_type = get_file_extension(file.filename)[1:]
    doc.file_size = file_size
    doc.content_hash = content_hash
    doc.processing_status = ProcessingStatus.PENDING
    doc.gemini_file_uri = None
    doc.gemini_file_expires_at = None
    doc.content_text = None
    doc.page_count = None
    doc.word_count = None
    doc.ai_summary = None

    await db.commit()
    await db.refresh(doc)

    logger.info(f"Document replaced: {doc.id} with {file.filename}")

    await cleanup_physical_file(old_filepath)
    await cleanup_physical_file(f"{old_filepath}_thumb.png")
    await cleanup_document_vectors(doc.id, user_id)
    await cleanup_gemini_file(doc.gemini_file_uri)
    await trigger_document_processing(doc.id)


# ============================================================================
# AI Summary
# ============================================================================


async def generate_ai_summary(doc, db) -> dict:
    """
    Generate AI summary for a document using Gemini.

    Returns {"summary": str, "cached": bool}.
    """
    if doc.ai_summary:
        return {"summary": doc.ai_summary, "cached": True}

    if not doc.content_text:
        raise ValueError("Document has no extracted text. Wait for processing to complete.")

    from google import genai
    from app.core.ai.registry.models import DEFAULT_TOKENIZER_MODEL

    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    content = doc.content_text[:30000] if len(doc.content_text) > 30000 else doc.content_text

    prompt = f"""Provide a concise summary of this document in 3-5 paragraphs.
Focus on the main topics, key takeaways, and important concepts.

Document Title: {doc.filename}

Content:
{content}"""

    response = client.models.generate_content(model=DEFAULT_TOKENIZER_MODEL, contents=prompt)
    summary = response.text

    doc.ai_summary = summary
    await db.commit()

    logger.info(f"AI summary generated for document {doc.id}")
    return {"summary": summary, "cached": False}
