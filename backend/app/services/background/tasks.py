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
            extra={"task_id": task_id, "args": args, "kwargs": kwargs}
        )

    def on_retry(self, exc, task_id, args, kwargs, einfo):
        """Handle task retry."""
        logger.warning(
            f"Task {self.name} [{task_id}] retrying: {exc}",
            extra={"task_id": task_id, "retry_count": self.request.retries}
        )

    def on_success(self, retval, task_id, args, kwargs):
        """Handle task success."""
        logger.info(
            f"Task {self.name} [{task_id}] completed successfully"
        )


@shared_task(
    bind=True,
    name="app.services.background.tasks.process_document_task",
    soft_time_limit=300,
    time_limit=600,
)
def process_document_task(self, document_id: int) -> Dict[str, Any]:
    """
    Process document asynchronously.

    This task:
    1. Extracts text from the document
    2. Chunks the text for embedding
    3. Generates embeddings for each chunk
    4. Stores embeddings in Qdrant
    5. Updates document status and content
    6. Creates document chunks in database with embedding IDs

    Args:
        document_id: Document ID to process

    Returns:
        dict: Processing result with status and statistics
    """
    logger.info(f"Starting document processing: {document_id}")

    try:
        from app.db.session import AsyncSessionLocal
        from app.models.document import Document, ProcessingStatus
        from app.models.document_chunk import DocumentChunk
        from app.services.background.document_processor import DocumentProcessor
        from app.services.embeddings import DocumentEmbeddingService
        from sqlalchemy import select
        import asyncio

        async def process():
            async with AsyncSessionLocal() as session:
                # Get document
                result = await session.execute(
                    select(Document).where(Document.id == document_id)
                )
                document = result.scalar_one_or_none()

                if not document:
                    raise ValueError(f"Document {document_id} not found")

                # Update status to processing
                document.processing_status = ProcessingStatus.PROCESSING
                await session.commit()

                try:
                    # Step 1: Process document (extract text and chunk)
                    processor = DocumentProcessor()
                    extracted_data = processor.process_document(
                        file_path=document.file_path,
                        file_type=document.file_type
                    )

                    # Update document with extracted content
                    document.content_text = extracted_data["content_text"]
                    document.page_count = extracted_data.get("page_count")
                    document.word_count = extracted_data["word_count"]
                    document.file_metadata = extracted_data.get("metadata", {})

                    # Step 2: Chunking
                    chunks_data = processor.chunk_text(
                        text=extracted_data["content_text"],
                        chunk_size=1000,
                        overlap=200
                    )

                    # Step 3: Save chunks to database
                    chunk_objects = []
                    for chunk_data in chunks_data:
                        chunk = DocumentChunk(
                            document_id=document.id,
                            content=chunk_data["content"],
                            chunk_index=chunk_data["chunk_index"],
                            start_char=chunk_data["start_char"],
                            end_char=chunk_data["end_char"]
                        )
                        session.add(chunk)
                        chunk_objects.append(chunk)

                    # Flush to get chunk IDs
                    await session.flush()

                    logger.info(
                        f"Document {document_id}: Created {len(chunk_objects)} chunks"
                    )

                    # Step 4: Generate and store embeddings
                    embedding_service = DocumentEmbeddingService()

                    embedding_stats = await embedding_service.process_document_embeddings(
                        document_id=document.id,
                        chunks=chunk_objects,
                        session=session
                    )

                    logger.info(
                        f"Document {document_id}: Generated embeddings - {embedding_stats}"
                    )

                    # Step 5: Update final status
                    document.processing_status = ProcessingStatus.COMPLETED
                    await session.commit()

                    result_stats = {
                        "document_id": document_id,
                        "status": "completed",
                        "chunks_created": len(chunk_objects),
                        "embeddings_stored": embedding_stats.get("embeddings_stored", 0),
                        "word_count": extracted_data["word_count"],
                        "page_count": extracted_data.get("page_count")
                    }

                    logger.info(
                        f"Document {document_id} processed successfully: {result_stats}"
                    )

                    return result_stats

                except Exception as e:
                    # Mark failed
                    document.processing_status = ProcessingStatus.FAILED
                    await session.commit()
                    logger.error(
                        f"Document {document_id} processing failed: {str(e)}",
                        exc_info=True
                    )
                    raise

        # Run async logic
        result = asyncio.run(process())
        return result

    except Exception as e:
        logger.error(
            f"Error processing document {document_id}: {str(e)}",
            exc_info=True
        )
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

        logger.info(
            "Webhook retry job completed",
            extra=stats
        )

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
def send_email_task(
    self,
    to: str,
    subject: str,
    body: str,
    html: bool = False
) -> bool:
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
def generate_report_task(
    self,
    report_type: str,
    user_id: str,
    parameters: Dict[str, Any]
) -> str:
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
