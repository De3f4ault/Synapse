"""
Store plugin — save files to dual-path storage (original + archive).

Uses FileManager to resolve template-based paths and store files
in the originals and archive directories.
"""

import logging

from .base import IngestionPlugin

logger = logging.getLogger(__name__)


class StorePlugin(IngestionPlugin):
    """
    Store document files using the FileManager.

    Sets on IngestDocument:
        - stored_original_path (absolute path to stored original)
        - stored_archive_path  (absolute path to stored archive, if exists)
        - archive_checksum     (SHA-256 of archive file)
    """

    async def run(self, doc) -> None:
        from app.services.ingestion.pipeline import ConsumerStatusCode
        from app.services.storage.file_manager import FileManager

        file_manager = FileManager()

        try:
            # Resolve the storage path from metadata
            relative_path = file_manager.resolve_path(
                doc.original_filename,
                created_date=doc.created_date,
                correspondent=doc.metadata.get("author"),
                title=doc.metadata.get("title"),
            )

            # 1. Store original
            doc.stored_original_path = file_manager.store_original(
                doc.source_path, relative_path,
            )

            # 2. Store archive (if parser generated one)
            if doc.archive_path:
                doc.stored_archive_path = file_manager.store_archive(
                    doc.archive_path, relative_path,
                )
                doc.archive_checksum = FileManager.compute_checksum(
                    doc.stored_archive_path,
                )

            # 3. Store thumbnail (if parser generated one)
            # thumbnail_path will be updated after we have a document_id (in IndexPlugin)
            # For now, keep the parser's temp thumbnail path

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
