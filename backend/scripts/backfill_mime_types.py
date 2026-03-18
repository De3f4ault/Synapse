#!/usr/bin/env python3
"""
Backfill MIME types for existing documents.

Scans all documents where mime_type IS NULL and sets it based on:
1. File extension mapping (fast, no I/O)
2. python-magic detection (if file exists on disk)

Idempotent — safe to run multiple times.

Usage:
    cd backend && python -m scripts.backfill_mime_types
"""

import asyncio
import logging
import os
import sys

# Add parent to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(message)s")
logger = logging.getLogger("backfill_mime_types")

# Extension → MIME type mapping
MIME_MAP = {
    "pdf": "application/pdf",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "doc": "application/msword",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "txt": "text/plain",
    "md": "text/markdown",
    "epub": "application/epub+zip",
    "html": "text/html",
    "htm": "text/html",
    "png": "image/png",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "tiff": "image/tiff",
    "tif": "image/tiff",
    "bmp": "image/bmp",
    "gif": "image/gif",
    "webp": "image/webp",
}


async def backfill():
    from sqlalchemy import select, update
    from app.db.session import AsyncSessionLocal
    from app.models.document import Document

    async with AsyncSessionLocal() as db:
        # Find documents with no MIME type
        result = await db.execute(
            select(Document).where(Document.mime_type.is_(None))
        )
        docs = result.scalars().all()

        if not docs:
            logger.info("No documents need MIME type backfill")
            return 0

        updated = 0
        for doc in docs:
            mime = None

            # 1. Try extension mapping
            ext = doc.file_type.lower() if doc.file_type else ""
            ext = ext.lstrip(".")
            mime = MIME_MAP.get(ext)

            # 2. Try python-magic if file exists
            if not mime and doc.file_path and os.path.exists(doc.file_path):
                try:
                    import magic
                    mime = magic.from_file(doc.file_path, mime=True)
                except Exception:
                    pass

            if mime:
                doc.mime_type = mime
                updated += 1
                logger.debug("Set %s → %s (doc %d)", doc.filename, mime, doc.id)
            else:
                logger.warning("Could not determine MIME for doc %d: %s", doc.id, doc.filename)

        if updated:
            await db.commit()

        logger.info("Backfilled MIME types: %d/%d documents updated", updated, len(docs))
        return updated


if __name__ == "__main__":
    asyncio.run(backfill())
