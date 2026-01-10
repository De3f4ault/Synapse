"""
Celery task for OCR document processing.

Provides background task for OCR-intensive document processing,
with proper thread management for Tesseract.
"""

import os
import logging
from typing import Dict, Any

from app.services.background.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(
    bind=True,
    name="ocr.process_document",
    # Retry with exponential backoff
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=600,
    retry_jitter=True,
    max_retries=2,
    # Task reliability
    acks_late=True,
    reject_on_worker_lost=True,
    # Timeouts - OCR can be slow for large documents
    soft_time_limit=600,  # 10 minutes soft limit
    time_limit=900,  # 15 minutes hard limit
    # Tracking
    track_started=True,
)
def ocr_document_task(
    self,
    file_path: str,
    mime_type: str = None,
    **options,
) -> Dict[str, Any]:
    """
    Process document with OCR in background.

    This task is designed for OCR-intensive processing that may take
    a long time. Uses proper thread management for Tesseract.

    Args:
        file_path: Path to the document file
        mime_type: Optional MIME type (auto-detected if None)
        **options: Additional options passed to OcrProcessor

    Returns:
        Dict with extracted text and metadata
    """
    # Critical: Set thread limit for Tesseract (per-page parallelism)
    os.environ["OMP_THREAD_LIMIT"] = "1"

    logger.info(
        "ocr_task_started",
        extra={
            "task_id": self.request.id,
            "file_path": file_path,
            "mime_type": mime_type,
        },
    )

    try:
        from app.services.ocr import OcrProcessor, OcrConfig

        # Create config with any overrides
        config = OcrConfig(**options) if options else None

        with OcrProcessor(config=config) as processor:
            result = processor.process_file(file_path, mime_type)

        logger.info(
            "ocr_task_completed",
            extra={
                "task_id": self.request.id,
                "text_length": len(result.get("text", "")),
                "page_count": result.get("page_count"),
                "method": result.get("method"),
            },
        )

        return {
            "status": "completed",
            "text": result.get("text", ""),
            "page_count": result.get("page_count"),
            "ocr_performed": result.get("ocr_performed", True),
            "method": result.get("method"),
        }

    except Exception as e:
        logger.error(
            "ocr_task_failed",
            extra={
                "task_id": self.request.id,
                "error": str(e),
            },
            exc_info=True,
        )
        raise


@celery_app.task(
    bind=True,
    name="ocr.batch_process",
    acks_late=True,
    soft_time_limit=1800,  # 30 minutes
    time_limit=3600,  # 1 hour
)
def ocr_batch_task(
    self,
    file_paths: list[str],
    **options,
) -> Dict[str, Any]:
    """
    Process multiple documents with OCR.

    Args:
        file_paths: List of file paths to process
        **options: Additional options for OCR

    Returns:
        Dict with results for each file
    """
    os.environ["OMP_THREAD_LIMIT"] = "1"

    logger.info(
        "ocr_batch_started",
        extra={
            "task_id": self.request.id,
            "file_count": len(file_paths),
        },
    )

    results = []

    try:
        from app.services.ocr import OcrProcessor, OcrConfig

        config = OcrConfig(**options) if options else None

        for file_path in file_paths:
            try:
                with OcrProcessor(config=config) as processor:
                    result = processor.process_file(file_path)
                    results.append(
                        {
                            "file_path": file_path,
                            "status": "completed",
                            "text_length": len(result.get("text", "")),
                        }
                    )
            except Exception as e:
                results.append(
                    {
                        "file_path": file_path,
                        "status": "failed",
                        "error": str(e),
                    }
                )

        success_count = sum(1 for r in results if r["status"] == "completed")

        logger.info(
            "ocr_batch_completed",
            extra={
                "task_id": self.request.id,
                "total": len(file_paths),
                "success": success_count,
                "failed": len(file_paths) - success_count,
            },
        )

        return {
            "status": "completed",
            "total": len(file_paths),
            "success": success_count,
            "failed": len(file_paths) - success_count,
            "results": results,
        }

    except Exception as e:
        logger.error(
            "ocr_batch_failed",
            extra={
                "task_id": self.request.id,
                "error": str(e),
            },
            exc_info=True,
        )
        raise
