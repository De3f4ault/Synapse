"""
Store plugin — save files to dual-path storage (original + archive).

Uses FileManager to resolve template-based paths and store files
in the originals and archive directories.

Updated for Phase 7 ORM-aware FileManager API — builds a document-
like namespace from IngestDocument to pass to resolve_path/store_*.
"""

import logging
from types import SimpleNamespace

from .base import IngestionPlugin

logger = logging.getLogger(__name__)


class StorePlugin(IngestionPlugin):
    """
    Store document files using the FileManager.

    Sets on IngestDocument:
        - stored_original_path (relative path in originals_dir)
        - stored_archive_path  (relative path in archive_dir)
        - archive_checksum     (SHA-256 of archive file)
    """

    async def run(self, doc) -> None:
        from app.services.ingestion.pipeline import ConsumerStatusCode
        from app.services.storage.file_manager import FileManager

        file_manager = FileManager()

        try:
            # Build a document-like namespace for the ORM-aware FileManager.
            # FileManager.resolve_path() expects an object with attributes:
            #   filename, correspondent, document_type, created_date,
            #   created_at, storage_path_id, id
            doc_ns = SimpleNamespace(
                id=doc.document_id or 0,
                filename=doc.original_filename,
                correspondent=SimpleNamespace(name=doc.metadata.get("author")) if doc.metadata.get("author") else None,
                document_type=None,
                created_date=doc.created_date.date() if doc.created_date and hasattr(doc.created_date, "date") else doc.created_date,
                created_at=doc.created_date,
                storage_path_id=None,
                archive_path=None,
                file_path=None,
            )

            # 1. Store original
            doc.stored_original_path = file_manager.store_original(
                doc.source_path, doc_ns,
            )

            # 2. Store archive (if parser generated one)
            if doc.archive_path:
                doc.stored_archive_path = file_manager.store_archive(
                    doc.archive_path, doc_ns,
                )
                import os
                archive_full = os.path.join(
                    file_manager.config.archive_dir,
                    doc.stored_archive_path,
                )
                doc.archive_checksum = FileManager.compute_checksum(archive_full)

            # 3. Thumbnail stored later in IndexPlugin (needs document_id)

            logger.info(
                "Stored %s: original=%s, archive=%s",
                doc.original_filename,
                doc.stored_original_path,
                "yes" if doc.stored_archive_path else "no",
            )

        except Exception as e:
            logger.error(
                "Storage failed for %s: %s", doc.original_filename, e,
                exc_info=True,
            )
            doc.status = ConsumerStatusCode.STORAGE_FAILED
            doc.error_message = f"Storage error: {e}"
