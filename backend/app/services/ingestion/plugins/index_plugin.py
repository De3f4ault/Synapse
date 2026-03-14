"""
Index plugin — create/update document record in the database.

Final plugin in the pipeline. Creates the Document row in PostgreSQL,
stores the thumbnail with the new document_id, and optionally triggers
vector embedding for search.
"""

import logging

from .base import IngestionPlugin

logger = logging.getLogger(__name__)


class IndexPlugin(IngestionPlugin):
    """
    Create the document record in the database.

    Sets on IngestDocument:
        - document_id (the new DB record ID)

    Requires all previous plugins to have populated:
        - stored_original_path
        - text
        - metadata
        - content_hash
    """

    async def run(self, doc) -> None:
        from app.services.ingestion.pipeline import ConsumerStatusCode

        try:
            document_id = await self._create_document_record(doc)
            doc.document_id = document_id

            # Store thumbnail now that we have a document_id
            if doc.thumbnail_path:
                await self._store_thumbnail(doc)

            # Trigger vector embedding (async, fire-and-forget)
            self._trigger_embedding(document_id)

            logger.info(
                "Indexed document %d: %s",
                document_id, doc.original_filename,
            )

        except Exception as e:
            logger.error(
                "Index failed for %s: %s", doc.original_filename, e,
                exc_info=True,
            )
            doc.status = ConsumerStatusCode.DB_ERROR
            doc.error_message = f"Database error: {e}"

    async def _create_document_record(self, doc) -> int:
        """
        Create the Document row in PostgreSQL.

        Uses the existing async session pattern from Synapse.
        """
        from app.db.session import get_db_session
        from app.models.document import Document, ProcessingStatus
        from pathlib import Path

        async with get_db_session() as db:
            document = Document(
                filename=doc.original_filename,
                file_path=doc.stored_original_path or doc.source_path,
                file_type=Path(doc.original_filename).suffix.lstrip("."),
                file_size=doc.file_size,
                content_hash=doc.content_hash,
                mime_type=doc.mime_type,
                archive_path=doc.stored_archive_path,
                archive_checksum=doc.archive_checksum,
                original_filename=doc.original_filename,
                content_text=doc.text,
                page_count=doc.page_count,
                processing_status=ProcessingStatus.COMPLETED,
                user_id=doc.user_id,
                folder_id=doc.folder_id,
                file_metadata=doc.metadata if doc.metadata else None,
                ocr_performed=bool(doc.archive_path),
            )

            # Set created_date if parser found one
            if doc.created_date:
                document.created_date = doc.created_date.date() if hasattr(doc.created_date, 'date') else doc.created_date

            db.add(document)
            await db.commit()
            await db.refresh(document)

            logger.debug("Created document record: id=%d", document.id)
            return document.id

    async def _store_thumbnail(self, doc) -> None:
        """Store thumbnail with the real document_id."""
        try:
            from app.services.storage.file_manager import FileManager
            file_manager = FileManager()
            stored = file_manager.store_thumbnail(doc.thumbnail_path, doc.document_id)
            doc.thumbnail_path = stored
        except Exception as e:
            logger.debug("Thumbnail storage failed: %s", e)

    def _trigger_embedding(self, document_id: int) -> None:
        """Fire-and-forget: queue vector embedding task."""
        try:
            from app.services.background.celery_app import celery_app
            celery_app.send_task(
                "app.services.background.tasks.process_document_task",
                args=[document_id],
                queue="documents",
            )
            logger.debug("Queued embedding task for document %d", document_id)
        except Exception as e:
            logger.warning("Failed to queue embedding task: %s", e)
