"""
Background task definitions - ENHANCED.

Includes document processing with embedding generation.
"""

import asyncio
import logging
from typing import Any, Dict
from celery import Task, shared_task
from celery.exceptions import Retry

logger = logging.getLogger(__name__)


class BaseTask(Task):
    """
    Base task with common error handling and retry logic.
    """

    autoretry_for = (Exception,)
    retry_kwargs = {"max_retries": 3, "countdown": 60}
    retry_backoff = True
    retry_backoff_max = 600
    retry_jitter = True

    def on_failure(self, exc, task_id, args, kwargs, einfo):
        """Handle task failure."""
        logger.error(
            f"Task {self.name} [{task_id}] failed: {exc}",
            extra={"task_id": task_id, "args": args, "kwargs": kwargs},
        )

    def on_retry(self, exc, task_id, args, kwargs, einfo):
        """Handle task retry."""
        logger.warning(
            f"Task {self.name} [{task_id}] retrying: {exc}",
            extra={"task_id": task_id, "retry_count": self.request.retries},
        )

    def on_success(self, retval, task_id, args, kwargs):
        """Handle task success."""
        logger.info(f"Task {self.name} [{task_id}] completed successfully")


def _process_chunk_batch(
    session,
    document,
    batch: list,
    embedder,
    upserter,
    collection_name: str,
) -> Dict[str, int]:
    """
    Process a batch of chunks: save to DB, embed, upsert to Qdrant.

    Designed for streaming ingestion - handles one batch at a time.
    Uses deterministic chunk IDs for idempotent re-ingestion.

    Args:
        session: Database session
        document: Document model instance
        batch: List of chunk dicts from iter_chunks()
        embedder: Embedding model instance
        upserter: Qdrant batch upserter
        collection_name: Qdrant collection name

    Returns:
        Dict with chunks and embeddings count
    """
    from app.models.document_chunk import DocumentChunk

    # Step 1: Save chunk records to DB WITH embedding_id (deterministic UUID)
    # The embedding_id links PG chunks to Qdrant points
    for chunk_data in batch:
        chunk = DocumentChunk(
            document_id=document.id,
            content=chunk_data["content"],
            chunk_index=chunk_data["chunk_index"],
            start_char=chunk_data["start_char"],
            end_char=chunk_data["end_char"],
            embedding_id=chunk_data["chunk_id"],  # Deterministic UUID from iter_chunks
        )
        session.add(chunk)
    session.commit()

    # Step 2: Generate embeddings for batch
    batch_texts = [c["content"] for c in batch]
    batch_embeddings = embedder.encode(batch_texts, normalize=True).tolist()

    # Step 3: Prepare payloads - IDs already match embedding_id in DB
    batch_payloads = []
    batch_ids = []
    for chunk_data in batch:
        batch_payloads.append(
            {
                "text": chunk_data["content"],
                "source_id": str(document.id),
                "source_type": "documents",
                "title": document.filename,
                "chunk_index": chunk_data["chunk_index"],
                "start_char": chunk_data["start_char"],
                "end_char": chunk_data["end_char"],
                "user_id": document.user_id,
                "char_count": len(chunk_data["content"]),
            }
        )
        batch_ids.append(chunk_data["chunk_id"])

    # Step 4: Upsert to Qdrant
    count = upserter.upsert_batch(
        collection_name=collection_name,
        vectors=batch_embeddings,
        payloads=batch_payloads,
        ids=batch_ids,
    )

    return {"chunks": len(batch), "embeddings": count}


@shared_task(
    bind=True,
    name="app.services.background.tasks.process_document_task",
    soft_time_limit=600,  # Increased for large docs
    time_limit=900,
)
def process_document_task(self, document_id: int) -> Dict[str, Any]:
    """
    Process document asynchronously with MEMORY-SAFE batch processing.

    INVARIANT: No background task may allocate memory proportional to total document size.
    This is enforced via batch embedding - chunks are processed in groups of BATCH_SIZE.

    Flow:
    1. Extract text from document
    2. Create chunk records in DB (batched commits)
    3. Generate embeddings in batches (BATCH_SIZE at a time)
    4. Upsert to Qdrant incrementally
    5. GC between batches to prevent memory buildup

    Args:
        document_id: Document ID to process

    Returns:
        dict: Processing result with status and statistics
    """
    import gc

    # Memory-safe batch size - limits peak memory usage
    BATCH_SIZE = 20

    logger.info(f"Starting document processing (batch mode): {document_id}")

    try:
        from app.db.session import SessionLocal
        from app.models.document import Document, ProcessingStatus
        from app.services.background.document_processor import DocumentProcessor
        from app.core.ai.embeddings.boundary import get_embedder
        from app.core.ai.rag.vector_store.qdrant.batch_upserter import BatchUpserter
        from app.core.ai.rag.vector_store.qdrant.collection_manager import CollectionManager
        from sqlalchemy import select

        with SessionLocal() as session:
            # INVARIANT: Never process soft-deleted documents.
            result = session.execute(
                select(Document).where(Document.id == document_id, Document.deleted_at.is_(None))
            )
            document = result.scalar_one_or_none()

            if not document:
                logger.warning(f"Document {document_id} not found or deleted, skipping")
                return {
                    "status": "skipped",
                    "reason": "not_found_or_deleted",
                    "document_id": document_id,
                }

            # GUARD: Skip documents already being processed or completed
            if document.processing_status == ProcessingStatus.PROCESSING:
                logger.info(f"Document {document_id} already PROCESSING, skipping")
                return {
                    "status": "skipped",
                    "reason": "already_processing",
                    "document_id": document_id,
                }

            if document.processing_status == ProcessingStatus.COMPLETED:
                logger.info(f"Document {document_id} already COMPLETED, skipping")
                return {
                    "status": "skipped",
                    "reason": "already_completed",
                    "document_id": document_id,
                }

            # Update status to processing
            document.processing_status = ProcessingStatus.PROCESSING
            session.commit()

            try:
                # IDEMPOTENCY: Delete ALL derived artifacts before re-processing
                # This ensures retries start clean
                from sqlalchemy import text as sql_text

                # 1. Delete existing PG chunks
                deleted_chunks = session.execute(
                    sql_text("DELETE FROM document_chunks WHERE document_id = :doc_id"),
                    {"doc_id": document.id},
                )
                if deleted_chunks.rowcount > 0:
                    logger.info(
                        f"Document {document_id}: Cleaned {deleted_chunks.rowcount} existing chunks"
                    )

                # 2. Delete existing Qdrant points
                from app.core.ai.rag.vector_store.qdrant.client import get_qdrant_client
                from qdrant_client.http import models as qdrant_models

                qdrant_client = get_qdrant_client().get_client()
                collection_name = f"synapse_v2_user_{document.user_id}_documents"

                try:
                    # Check if collection exists before deleting
                    qdrant_client.get_collection(collection_name)
                    qdrant_client.delete(
                        collection_name=collection_name,
                        points_selector=qdrant_models.FilterSelector(
                            filter=qdrant_models.Filter(
                                must=[
                                    qdrant_models.FieldCondition(
                                        key="source_id",
                                        match=qdrant_models.MatchValue(value=str(document.id)),
                                    )
                                ]
                            )
                        ),
                    )
                    logger.info(
                        f"Document {document_id}: Cleaned Qdrant points for collection {collection_name}"
                    )
                except Exception as qdrant_err:
                    # Collection might not exist yet - that's OK
                    logger.debug(f"Qdrant cleanup skipped: {qdrant_err}")

                session.commit()

                # Step 1: Extract text (this is the one atomic operation we can't batch)
                processor = DocumentProcessor()
                extracted_data = processor.process_document(
                    file_path=document.file_path, file_type=document.file_type
                )

                # Update document metadata immediately
                document.content_text = extracted_data["content_text"]
                document.page_count = extracted_data.get("page_count")
                document.word_count = extracted_data["word_count"]
                document.file_metadata = extracted_data.get("metadata", {})
                document.ocr_performed = extracted_data.get("ocr_performed", False)
                session.commit()

                logger.info(
                    f"Document {document_id}: Extracted {extracted_data['word_count']} words, "
                    f"{extracted_data.get('page_count', 'N/A')} pages"
                )

                # Step 2: Initialize embedder and Qdrant upserter early
                embedder = get_embedder()
                from app.core.ai.rag.vector_store.qdrant.client import get_qdrant_client

                qdrant_client = get_qdrant_client().get_client()
                collection_manager = CollectionManager(client=qdrant_client)
                upserter = BatchUpserter()

                collection_name = collection_manager.create_user_collection(
                    document.user_id, "documents"
                )

                # Step 3: STREAMING INGESTION
                # INVARIANT: Never hold full chunk list in memory
                # Process chunks as they're yielded from generator

                batch = []
                chunks_processed = 0
                embeddings_stored = 0
                chunk_records_created = 0

                logger.info(f"Document {document_id}: Starting streaming chunk processing")

                for chunk_data in processor.iter_chunks(
                    text=extracted_data["content_text"],
                    document_id=str(document.id),
                    chunk_size=1000,
                    overlap=200,
                ):
                    batch.append(chunk_data)

                    # Process batch when full
                    if len(batch) >= BATCH_SIZE:
                        batch_result = _process_chunk_batch(
                            session=session,
                            document=document,
                            batch=batch,
                            embedder=embedder,
                            upserter=upserter,
                            collection_name=collection_name,
                        )
                        chunk_records_created += batch_result["chunks"]
                        embeddings_stored += batch_result["embeddings"]
                        chunks_processed += len(batch)
                        batch.clear()

                        # CRITICAL: Force garbage collection between batches
                        gc.collect()

                        logger.debug(
                            f"Document {document_id}: Processed {chunks_processed} chunks, "
                            f"{embeddings_stored} embeddings"
                        )

                # Flush remaining batch
                if batch:
                    batch_result = _process_chunk_batch(
                        session=session,
                        document=document,
                        batch=batch,
                        embedder=embedder,
                        upserter=upserter,
                        collection_name=collection_name,
                    )
                    chunk_records_created += batch_result["chunks"]
                    embeddings_stored += batch_result["embeddings"]
                    chunks_processed += len(batch)
                    batch.clear()

                # Step 4: Lifecycle invariant validation
                # Only mark COMPLETED if chunks == embeddings
                if chunk_records_created == embeddings_stored and chunk_records_created > 0:
                    document.processing_status = ProcessingStatus.COMPLETED
                    final_status = "completed"
                elif chunk_records_created > 0:
                    # Partial success - some chunks, not all embedded
                    # This allows manual recovery without re-processing
                    document.processing_status = ProcessingStatus.FAILED
                    final_status = "partial"
                    logger.warning(
                        f"Document {document_id}: PARTIAL - chunks={chunk_records_created}, "
                        f"embeddings={embeddings_stored}"
                    )
                else:
                    # No chunks created
                    document.processing_status = ProcessingStatus.FAILED
                    final_status = "failed_no_chunks"
                    logger.error(f"Document {document_id}: No chunks created")

                session.commit()

                result_stats = {
                    "document_id": document_id,
                    "status": final_status,
                    "chunks_created": chunk_records_created,
                    "embeddings_stored": embeddings_stored,
                    "word_count": extracted_data["word_count"],
                    "page_count": extracted_data.get("page_count"),
                    "ocr_performed": extracted_data.get("ocr_performed", False),
                    "batch_size": BATCH_SIZE,
                    "streaming": True,
                }

                logger.info(f"Document {document_id} processed: {result_stats}")
                return result_stats

            except MemoryError:
                # Do NOT retry OOM failures - mark and skip
                document.processing_status = ProcessingStatus.FAILED
                session.commit()
                logger.error(f"Document {document_id} OOM - marked FAILED, not retrying")
                from celery.exceptions import Ignore

                raise Ignore()

            except Exception as e:
                # Mark failed
                document.processing_status = ProcessingStatus.FAILED
                session.commit()
                logger.error(f"Document {document_id} processing failed: {str(e)}", exc_info=True)
                raise

    except Exception as e:
        logger.error(f"Error processing document {document_id}: {str(e)}", exc_info=True)
        raise


# All other tasks remain unchanged below this line


@shared_task(
    base=BaseTask,
    bind=True,
    name="tasks.retry_failed_webhooks",
    soft_time_limit=300,
    time_limit=600,
)
def retry_failed_webhooks_task(self) -> Dict[str, int]:
    """
    Retry all failed webhooks that are due for retry.

    This is a scheduled task that runs periodically (e.g., every 5 minutes).

    Returns:
        dict: Retry statistics
    """
    logger.info("Starting webhook retry job")

    try:
        from app.db.session import SessionLocal
        from app.core.events.webhooks.retry import retry_failed_webhooks_sync

        with SessionLocal() as session:
            stats = retry_failed_webhooks_sync(session)

        logger.info("Webhook retry job completed", extra=stats)

        return stats

    except Exception as e:
        logger.error(f"Webhook retry job failed: {e}", exc_info=True)
        raise


@shared_task(
    base=BaseTask,
    bind=True,
    name="tasks.send_email",
    soft_time_limit=30,
    time_limit=60,
)
def send_email_task(self, to: str, subject: str, body: str, html: bool = False) -> bool:
    """
    Send email asynchronously.

    Args:
        to: Recipient email
        subject: Email subject
        body: Email body
        html: Whether body is HTML

    Returns:
        bool: True if sent successfully
    """
    logger.info(f"Sending email to {to}: {subject}")

    try:
        from ...services.email.sender import EmailSender

        logger.info(f"Email sent successfully to {to}")
        return True

    except Exception as e:
        logger.error(f"Error sending email to {to}: {e}")
        raise


@shared_task(
    base=BaseTask,
    bind=True,
    name="tasks.generate_report",
    soft_time_limit=600,
    time_limit=900,
)
def generate_report_task(self, report_type: str, user_id: str, parameters: Dict[str, Any]) -> str:
    """
    Generate report asynchronously.

    Args:
        report_type: Type of report to generate
        user_id: User ID requesting report
        parameters: Report parameters

    Returns:
        str: Report file path
    """
    logger.info(f"Generating {report_type} report for user {user_id}")

    try:
        from ...services.analytics.reports import ReportGenerator
        from ...services.storage.manager import StorageManager

        logger.info(f"Report {report_type} generated for user {user_id}")

        return "path/to/report.pdf"

    except Exception as e:
        logger.error(f"Error generating report {report_type}: {e}")
        raise


@shared_task(
    base=BaseTask,
    bind=True,
    name="tasks.cleanup",
)
def cleanup_task(self, cleanup_type: str) -> Dict[str, int]:
    """
    Perform cleanup operations.

    Args:
        cleanup_type: Type of cleanup ('temp_files', 'old_logs', etc.)

    Returns:
        dict: Cleanup statistics
    """
    logger.info(f"Running cleanup task: {cleanup_type}")

    try:
        stats = {}

        if cleanup_type == "temp_files":
            from ...services.storage.manager import StorageManager

            stats["files_deleted"] = 0

        elif cleanup_type == "old_logs":
            stats["logs_deleted"] = 0

        elif cleanup_type == "expired_cache":
            stats["cache_keys_expired"] = 0

        logger.info(f"Cleanup {cleanup_type} completed: {stats}")
        return stats

    except Exception as e:
        logger.error(f"Error in cleanup task {cleanup_type}: {e}")
        raise


@shared_task(
    name="tasks.process_webhook",
    soft_time_limit=60,
    time_limit=120,
)
def process_webhook_task(event_type: str, event_data: Dict[str, Any]) -> bool:
    """
    Process webhook event asynchronously.

    Args:
        event_type: Type of webhook event
        event_data: Event data payload

    Returns:
        bool: True if processed successfully
    """
    logger.info(f"Processing webhook event: {event_type}")

    try:
        from .webhook_handlers import handle_webhook_event

        result = handle_webhook_event(event_type, event_data)

        logger.info(f"Webhook event {event_type} processed successfully")
        return result

    except Exception as e:
        logger.error(f"Error processing webhook {event_type}: {e}")
        raise


@shared_task(
    name="tasks.scheduled_weekly_report",
)
def scheduled_weekly_report_task() -> None:
    """
    Generate and send weekly reports (scheduled task).

    This task runs weekly via Celery Beat.
    """
    logger.info("Running scheduled weekly report generation")

    try:
        logger.info("Weekly reports scheduled for all users")

    except Exception as e:
        logger.error(f"Error in scheduled weekly report: {e}")
        raise


@shared_task(
    name="tasks.index_documents",
)
def index_documents_task(document_ids: list[str]) -> Dict[str, int]:
    """
    Index multiple documents for search.

    Args:
        document_ids: List of document IDs to index

    Returns:
        dict: Indexing statistics
    """
    logger.info(f"Indexing {len(document_ids)} documents")

    try:
        stats = {
            "total": len(document_ids),
            "succeeded": 0,
            "failed": 0,
        }

        for doc_id in document_ids:
            try:
                process_document_task.delay(doc_id)
                stats["succeeded"] += 1
            except Exception as e:
                logger.error(f"Failed to index document {doc_id}: {e}")
                stats["failed"] += 1

        logger.info(f"Document indexing completed: {stats}")
        return stats

    except Exception as e:
        logger.error(f"Error in bulk indexing: {e}")
        raise


# =============================================================================
# DMS PHASE 2 — INGESTION PIPELINE TASKS
# =============================================================================


def _run_async(coro):
    """Run an async coroutine from a sync Celery task."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                return pool.submit(asyncio.run, coro).result()
        else:
            return loop.run_until_complete(coro)
    except RuntimeError:
        return asyncio.run(coro)


def _create_task_record(
    task_id: str,
    task_name: str,
    filename: str = "",
    owner_id: int = None,
) -> None:
    """Create a SynapseTask record for UI tracking (best-effort)."""
    try:
        from app.db.session import SessionLocal
        from app.models.synapse_task import SynapseTask, TaskType

        with SessionLocal() as db:
            task = SynapseTask(
                task_id=task_id,
                task_name=task_name,
                celery_task_name=f"ingestion.{task_name.lower()}",
                task_type=TaskType.AUTO,
                status="PENDING",
                task_file_name=filename,
                owner_id=owner_id,
            )
            db.add(task)
            db.commit()
    except Exception as e:
        logger.debug("Failed to create SynapseTask record: %s", e)


@shared_task(
    bind=True,
    name="ingestion.ingest_document",
    acks_late=True,
    reject_on_worker_lost=True,
    time_limit=1800,       # 30-minute hard limit
    soft_time_limit=1500,  # 25-minute soft limit
    queue="ingestion",
)
def consume_document(self: Task, consumable_data: dict):
    """
    Ingest a new document through the DMS plugin pipeline.

    Sourced from Paperless tasks.py:138-204 consume_file().

    Key reliability patterns:
    - bind=True: access to self.request for task ID
    - acks_late: message only acked after SUCCESS (survives worker crash)
    - reject_on_worker_lost: requeue if worker dies mid-task

    Args:
        consumable_data: Dict with:
            - source_path: str — path to uploaded file on disk
            - original_filename: str — user-visible filename
            - user_id: int — owning user ID
            - mime_type: str (optional) — pre-detected MIME type
            - folder_id: int (optional) — target folder
            - document_id: int (optional) — existing Document row ID
    """
    from app.services.background.progress import ProgressManager, ProgressStatus
    from app.services.ingestion import create_pipeline, IngestDocument

    source_path = consumable_data["source_path"]
    filename = consumable_data.get("original_filename", "unknown")
    user_id = consumable_data["user_id"]

    # Create SynapseTask record for UI tracking
    _create_task_record(
        task_id=self.request.id,
        task_name="CONSUME_DOCUMENT",
        filename=filename,
        owner_id=user_id,
    )

    with ProgressManager(filename, self.request.id) as progress:
        doc = IngestDocument(
            source_path=source_path,
            original_filename=filename,
            user_id=user_id,
            mime_type=consumable_data.get("mime_type"),
            folder_id=consumable_data.get("folder_id"),
        )
        doc.document_id = consumable_data.get("document_id")

        pipeline = create_pipeline()

        def progress_cb(plugin_name, step, total):
            progress.send_progress(
                ProgressStatus.WORKING,
                f"Running {plugin_name}",
                step, total,
            )

        result = _run_async(pipeline.run(doc, progress_callback=progress_cb))

    return {
        "status": result.status.value,
        "document_id": result.document_id,
        "filename": result.original_filename,
        "text_length": len(result.text) if result.text else 0,
        "error": result.error_message,
    }


@shared_task(
    bind=True,
    name="ingestion.reprocess_document",
    time_limit=900,
    soft_time_limit=600,
    queue="ingestion",
    max_retries=2,
    default_retry_delay=30,
)
def reprocess_document(self: Task, document_id: int):
    """
    Re-OCR an existing document and update content.

    Sourced from Paperless tasks.py:246-351.
    """
    from app.services.parsers import get_parser_for_mime_type
    from app.services.storage.file_manager import FileManager
    from app.models.document import Document, ProcessingStatus

    _create_task_record(
        task_id=self.request.id,
        task_name="REPROCESS_DOCUMENT",
        filename=f"doc:{document_id}",
    )

    try:
        from app.db.session import SessionLocal
        from sqlalchemy import select

        with SessionLocal() as session:
            document = session.execute(
                select(Document).where(Document.id == document_id)
            ).scalar_one_or_none()

            if not document:
                logger.error("Document %d not found for reprocessing", document_id)
                return

            mime = document.mime_type or "application/pdf"
            parser_class = get_parser_for_mime_type(mime)
            if not parser_class:
                logger.error("No parser for MIME type %s", mime)
                return

            parser = parser_class()
            try:
                document.processing_status = ProcessingStatus.PROCESSING
                session.commit()

                parser.parse(document.file_path, mime, document.filename)

                document.content_text = parser.get_text()
                document.page_count = parser.get_page_count()
                document.word_count = len((parser.get_text() or "").split())

                # Update archive if parser generates one
                archive = parser.get_archive_path()
                if archive:
                    fm = FileManager()
                    document.archive_path = str(archive)
                    document.archive_checksum = FileManager.compute_checksum(str(archive))

                document.processing_status = ProcessingStatus.COMPLETED
                session.commit()
                logger.info("Reprocessed document %d successfully", document_id)

            except Exception as e:
                document.processing_status = ProcessingStatus.FAILED
                session.commit()
                logger.exception("Reprocessing failed for document %d: %s", document_id, e)
                raise self.retry(exc=e)
            finally:
                parser.cleanup()

    except Retry:
        raise
    except Exception as e:
        logger.error("Error reprocessing document %d: %s", document_id, e)
        raise


@shared_task(name="storage.sanity_check", time_limit=300)
def run_sanity_check():
    """Nightly storage integrity check (delegated to storage module)."""
    from app.services.storage.sanity_check import run_sanity_check as _check

    async def _run():
        from app.db.session import async_session_factory
        async with async_session_factory() as db:
            return await _check(db)

    result = _run_async(_run())
    logger.info("Sanity check complete: %s", result)
    return str(result)


@shared_task(name="storage.empty_trash", time_limit=300)
def run_empty_trash():
    """Weekly hard-delete of expired soft-deleted documents."""
    from app.services.storage.sanity_check import empty_trash as _trash

    async def _run():
        from app.db.session import async_session_factory
        async with async_session_factory() as db:
            return await _trash(db)

    count = _run_async(_run())
    logger.info("Trash cleanup: deleted %d documents", count)
    return f"Deleted {count} documents"
