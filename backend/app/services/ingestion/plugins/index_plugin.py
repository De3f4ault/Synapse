"""
Index plugin — create/update document record in the database.

Final plugin in the pipeline. Creates or updates the Document row in PostgreSQL,
stores the thumbnail with the new document_id, and optionally triggers
vector embedding for search.
"""

import logging

from .base import IngestionPlugin

logger = logging.getLogger(__name__)


class IndexPlugin(IngestionPlugin):
    """
    Create or update the document record in the database.

    If doc.document_id is already set (API pre-created the row during upload),
    the existing record is UPDATED with the parsed content/metadata.
    Otherwise a new row is created.

    Sets on IngestDocument:
        - document_id (the DB record ID)

    Requires all previous plugins to have populated:
        - stored_original_path
        - text
        - metadata
        - content_hash
    """

    async def run(self, doc) -> None:
        from app.services.ingestion.pipeline import ConsumerStatusCode

        try:
            # Mark PARSING as soon as we start — gives the UI real-time visibility
            if doc.document_id:
                await self._set_status(doc.document_id, "parsing")
                # Row already created by upload endpoint — update it
                await self._update_document_record(doc)
            else:
                # No pre-existing row — create one (starts life as PARSED directly)
                document_id = await self._create_document_record(doc)
                doc.document_id = document_id

            # Auto-classify: correspondent, type, tags, storage path
            await self._auto_classify(doc)

            # Fire DOCUMENT_ADDED workflow trigger (after classification)
            await self._run_workflows(doc)

            # Store thumbnail now that we have a document_id
            if doc.thumbnail_path:
                await self._store_thumbnail(doc)

            # Trigger vector embedding (async, fire-and-forget)
            self._trigger_embedding(doc.document_id)

            logger.info(
                "Indexed document %d: %s",
                doc.document_id, doc.original_filename,
            )

        except Exception as e:
            logger.error(
                "Index failed for %s: %s", doc.original_filename, e,
                exc_info=True,
            )
            doc.status = ConsumerStatusCode.DB_ERROR
            doc.error_message = f"Database error: {e}"

    async def _set_status(self, document_id: int, status: str) -> None:
        """Update document processing_status. Best-effort — never raises."""
        try:
            from app.db.session import AsyncSessionLocal
            from app.models.document import Document, ProcessingStatus
            from sqlalchemy import select, update

            async with AsyncSessionLocal() as db:
                await db.execute(
                    update(Document)
                    .where(Document.id == document_id)
                    .values(processing_status=ProcessingStatus(status))
                )
                await db.commit()
        except Exception as e:
            logger.debug("_set_status failed (non-fatal): %s", e)


    async def _update_document_record(self, doc) -> None:
        """
        Update an existing Document row that was pre-created by the upload endpoint.

        The upload endpoint already wrote filename/file_path/size/hash/user_id.
        We fill in the content extracted by the pipeline.
        """
        from app.db.session import AsyncSessionLocal
        from app.models.document import Document, ProcessingStatus
        from sqlalchemy import select

        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(Document).where(Document.id == doc.document_id)
            )
            document = result.scalar_one_or_none()
            if not document:
                logger.warning(
                    "Document %d not found for update — creating instead",
                    doc.document_id,
                )
                # Fall back to create
                new_id = await self._create_document_record(doc)
                doc.document_id = new_id
                return

            # Update fields set by the DMS pipeline
            document.content_text = doc.text
            document.page_count = doc.page_count
            document.ocr_performed = bool(doc.archive_path)
            # DMS pipeline complete — text extracted, stored, classified.
            # Set PARSED (not COMPLETED) so process_document_task knows to embed this document.
            document.processing_status = ProcessingStatus.PARSED

            if doc.stored_original_path:
                document.file_path = doc.stored_original_path
            if doc.archive_path:
                document.archive_path = doc.stored_archive_path
                document.archive_checksum = doc.archive_checksum
            if doc.metadata:
                document.file_metadata = doc.metadata
            if doc.created_date:
                document.created_date = (
                    doc.created_date.date()
                    if hasattr(doc.created_date, "date")
                    else doc.created_date
                )

            # Persist word count if available
            if doc.text:
                document.word_count = len(doc.text.split())

            await db.commit()
            logger.debug("Updated document record: id=%d status=PARSED", document.id)

    async def _create_document_record(self, doc) -> int:
        """
        Create a new Document row in PostgreSQL.

        Only called when the upload endpoint did NOT pre-create the row
        (e.g. watch-folder / direct pipeline invocation).
        """
        from app.db.session import AsyncSessionLocal
        from app.models.document import Document, ProcessingStatus
        from pathlib import Path

        async with AsyncSessionLocal() as db:
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
                word_count=len(doc.text.split()) if doc.text else 0,
                # DMS pipeline done — set PARSED, not COMPLETED.
                # COMPLETED is set by process_document_task after Qdrant embedding.
                processing_status=ProcessingStatus.PARSED,
                user_id=doc.user_id,
                folder_id=doc.folder_id,
                file_metadata=doc.metadata if doc.metadata else None,
                ocr_performed=bool(doc.archive_path),
            )

            if doc.created_date:
                document.created_date = (
                    doc.created_date.date()
                    if hasattr(doc.created_date, "date")
                    else doc.created_date
                )

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

    async def _auto_classify(self, doc) -> None:
        """
        Run auto-classification on the document (best-effort).

        Applies matching rules + AI classification to assign:
        correspondent, document type, tags, and storage path.
        """
        if not doc.document_id:
            return

        try:
            from app.db.session import AsyncSessionLocal
            from app.services.classification.auto_assign import auto_classify_document

            async with AsyncSessionLocal() as db:
                result = await auto_classify_document(doc.document_id, db)

            logger.info(
                "Auto-classification complete for document %d: %s",
                doc.document_id, result,
            )
        except Exception as e:
            # Classification failure should never abort the pipeline
            logger.warning(
                "Auto-classification failed for document %d: %s",
                doc.document_id, e,
            )

    async def _run_workflows(self, doc) -> None:
        """
        Fire DOCUMENT_ADDED workflow trigger after classification.

        Best-effort: workflow failure must never abort the pipeline.
        """
        if not doc.document_id:
            return

        try:
            from app.db.session import AsyncSessionLocal
            from app.services.workflows.engine import run_workflows
            from app.models.workflow import WorkflowTriggerType

            async with AsyncSessionLocal() as db:
                fired = await run_workflows(
                    trigger_type=WorkflowTriggerType.DOCUMENT_ADDED,
                    document_id=doc.document_id,
                    db=db,
                    source="api_upload",
                    filename=doc.original_filename,
                )
                if fired:
                    logger.info(
                        "Workflow: %d workflow(s) fired for document %d",
                        fired, doc.document_id,
                    )
        except Exception as e:
            logger.warning(
                "Workflow trigger failed for document %d: %s",
                doc.document_id, e,
            )

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
