"""
Background task service using Celery.

Provides asynchronous task execution for long-running
operations including email, reports, data processing,
DMS ingestion pipeline, embedding generation, and
learning signal extraction.
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
from .learning_tasks import process_learning_signals  # noqa: F401 — registers learning.process_signals with Celery
from .colbert_tasks import backfill_colbert  # noqa: F401 — registers colbert.backfill_colbert with Celery

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
    "process_learning_signals",
]
