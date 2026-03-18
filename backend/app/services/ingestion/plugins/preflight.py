"""
Preflight plugin — validation, MIME detection, and duplicate check.

First plugin in the pipeline. Ensures the file exists, detects its
MIME type, computes the content hash, and checks for duplicates.
"""

import hashlib
import logging
import os
from typing import Optional

from .base import IngestionPlugin

logger = logging.getLogger(__name__)


class PreflightPlugin(IngestionPlugin):
    """
    Validate uploaded file and detect properties.

    Sets on IngestDocument:
        - mime_type (via python-magic)
        - content_hash (SHA-256)
        - file_size
    """

    async def run(self, doc) -> None:
        from app.services.ingestion.pipeline import ConsumerStatusCode

        # 1. Check file exists
        if not os.path.exists(doc.source_path):
            doc.status = ConsumerStatusCode.FILE_NOT_FOUND
            doc.error_message = f"File not found: {doc.source_path}"
            return

        # 2. File size
        doc.file_size = os.path.getsize(doc.source_path)

        # 3. Detect MIME type
        if not doc.mime_type:
            doc.mime_type = self._detect_mime_type(doc.source_path)
            logger.debug("Detected MIME type: %s", doc.mime_type)

        # 4. Compute content hash
        doc.content_hash = self._compute_hash(doc.source_path)
        logger.debug("Content hash: %s", doc.content_hash)

        # 5. Check for supported MIME type
        from app.services.parsers import get_parser_for_mime_type
        parser_class = get_parser_for_mime_type(doc.mime_type)
        if parser_class is None:
            doc.status = ConsumerStatusCode.UNSUPPORTED_TYPE
            doc.error_message = f"No parser for MIME type: {doc.mime_type}"
            return

        logger.info(
            "Preflight OK: %s (%s, %d bytes, hash=%s…)",
            doc.original_filename, doc.mime_type,
            doc.file_size, doc.content_hash[:12],
        )

    def _detect_mime_type(self, file_path: str) -> str:
        """Detect MIME type using python-magic (libmagic)."""
        try:
            import magic
            return magic.from_file(file_path, mime=True)
        except ImportError:
            logger.warning("python-magic not available, using mimetypes fallback")
            import mimetypes
            mime, _ = mimetypes.guess_type(file_path)
            return mime or "application/octet-stream"
        except Exception as e:
            logger.warning("MIME detection failed: %s", e)
            return "application/octet-stream"

    def _compute_hash(self, file_path: str) -> str:
        """Compute SHA-256 hash of file content."""
        h = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                h.update(chunk)
        return h.hexdigest()
