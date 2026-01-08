"""
Background task definitions - ENHANCED.

Includes document processing with embedding generation.
"""

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


async def _process_chunk_batch(
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

    # Step 1: Save chunk records to DB
    for chunk_data in batch:
        chunk = DocumentChunk(
            document_id=document.id,
            content=chunk_data["content"],
            chunk_index=chunk_data["chunk_index"],
            start_char=chunk_data["start_char"],
            end_char=chunk_data["end_char"],
        )
        session.add(chunk)
    await session.commit()

    # Step 2: Generate embeddings for batch
    batch_texts = [c["content"] for c in batch]
    batch_embeddings = embedder.encode(batch_texts, normalize=True).tolist()

    # Step 3: Prepare payloads with deterministic IDs (from iter_chunks)
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
                "user_id": document.user_id,
                "char_count": len(chunk_data["content"]),
            }
        )
        # Use deterministic chunk_id from iter_chunks for idempotent upserts
        batch_ids.append(chunk_data["chunk_id"])

    # Step 4: Upsert to Qdrant
    count = await upserter.upsert_batch(
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
        from app.db.session import AsyncSessionLocal
        from app.models.document import Document, ProcessingStatus
        from app.services.background.document_processor import DocumentProcessor
        from app.core.ai.rag.embeddings.models.all_minilm import AllMiniLMEmbedder
        from app.core.ai.rag.vector_store.qdrant.batch_upserter import BatchUpserter
        from app.core.ai.rag.vector_store.qdrant.collection_manager import CollectionManager
        from sqlalchemy import select
        import asyncio

        async def process():
            async with AsyncSessionLocal() as session:
                # INVARIANT: Never process soft-deleted documents.
                result = await session.execute(
                    select(Document).where(
                        Document.id == document_id, Document.deleted_at.is_(None)
                    )
                )
                document = result.scalar_one_or_none()

                if not document:
                    logger.warning(f"Document {document_id} not found or deleted, skipping")
                    return {
                        "status": "skipped",
                        "reason": "not_found_or_deleted",
                        "document_id": document_id,
                    }

                # Update status to processing
                document.processing_status = ProcessingStatus.PROCESSING
                await session.commit()

                try:
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
                    await session.commit()

                    logger.info(
                        f"Document {document_id}: Extracted {extracted_data['word_count']} words, "
                        f"{extracted_data.get('page_count', 'N/A')} pages"
                    )

                    # Step 2: Initialize embedder and Qdrant upserter early
                    embedder = AllMiniLMEmbedder()
                    collection_manager = CollectionManager()
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
                            batch_result = await _process_chunk_batch(
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
                        batch_result = await _process_chunk_batch(
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

                    # Step 4: Mark complete
                    document.processing_status = ProcessingStatus.COMPLETED
                    await session.commit()

                    result_stats = {
                        "document_id": document_id,
                        "status": "completed",
                        "chunks_created": chunk_records_created,
                        "embeddings_stored": embeddings_stored,
                        "word_count": extracted_data["word_count"],
                        "page_count": extracted_data.get("page_count"),
                        "ocr_performed": extracted_data.get("ocr_performed", False),
                        "batch_size": BATCH_SIZE,
                        "streaming": True,
                    }

                    logger.info(f"Document {document_id} processed successfully: {result_stats}")
                    return result_stats

                except MemoryError:
                    # Do NOT retry OOM failures - mark and skip
                    document.processing_status = ProcessingStatus.FAILED
                    await session.commit()
                    logger.error(f"Document {document_id} OOM - marked FAILED, not retrying")
                    from celery.exceptions import Ignore

                    raise Ignore()

                except Exception as e:
                    # Mark failed
                    document.processing_status = ProcessingStatus.FAILED
                    await session.commit()
                    logger.error(
                        f"Document {document_id} processing failed: {str(e)}", exc_info=True
                    )
                    raise

        # Run async logic
        result = asyncio.run(process())
        return result

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
        from app.db.session import AsyncSessionLocal
        from app.core.events.webhooks.retry import retry_failed_webhooks
        import asyncio

        async def run_retry():
            async with AsyncSessionLocal() as session:
                return await retry_failed_webhooks(session)

        stats = asyncio.run(run_retry())

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
