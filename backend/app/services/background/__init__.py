"""
Background task service using Celery.

Provides asynchronous task execution for long-running
operations including email, reports, data processing,
DMS ingestion pipeline, and embedding generation.
"""

from .tasks import (
    consume_document,
    reprocess_document,
    process_document_task,
    send_email_task,
    generate_report_task,
    cleanup_task,
)
from .embedding_tasks import (
    generate_note_embedding_task,
    generate_flashcard_embedding_task,
    batch_backfill_notes_task,
    batch_backfill_flashcards_task,
)
from .embedding_hooks import setup_embedding_hooks
from .celery_app import celery_app
from .webhook_handlers import handle_webhook_event

__all__ = [
    "consume_document",
    "reprocess_document",
    "process_document_task",
    "send_email_task",
    "generate_report_task",
    "cleanup_task",
    "generate_note_embedding_task",
    "generate_flashcard_embedding_task",
    "batch_backfill_notes_task",
    "batch_backfill_flashcards_task",
    "setup_embedding_hooks",
    "celery_app",
    "handle_webhook_event",
]
