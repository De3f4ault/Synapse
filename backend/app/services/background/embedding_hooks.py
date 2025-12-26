"""
Model event hooks for automatic embedding generation.

These hooks trigger Celery tasks when notes/flashcards are created or updated,
ensuring embeddings are kept in sync with content changes.

Usage:
    Call setup_embedding_hooks() once during app startup.
"""

import structlog
from sqlalchemy import event
from sqlalchemy.orm import Session

from app.models.note import Note
from app.models.flashcard import Flashcard

logger = structlog.get_logger(__name__)


def setup_embedding_hooks():
    """
    Register SQLAlchemy event hooks for embedding generation.

    Call this once during application startup (e.g., in create_app).
    """
    logger.info("setting_up_embedding_hooks")

    # Note: after_insert and after_update
    event.listen(Note, "after_insert", _on_note_insert)
    event.listen(Note, "after_update", _on_note_update)

    # Flashcard: after_insert and after_update
    event.listen(Flashcard, "after_insert", _on_flashcard_insert)
    event.listen(Flashcard, "after_update", _on_flashcard_update)

    logger.info("embedding_hooks_registered")


def _trigger_note_embedding(note_id: int, title: str, content: str):
    """Trigger Celery task for note embedding (non-blocking)."""
    try:
        from app.services.background.embedding_tasks import generate_note_embedding_task

        generate_note_embedding_task.apply_async(
            kwargs={
                "note_id": note_id,
                "title": title or "",
                "content": content or "",
            },
            countdown=2,  # Small delay to ensure DB commit
        )
        logger.debug("note_embedding_task_queued", note_id=note_id)
    except Exception as e:
        logger.error("failed_to_queue_note_embedding", note_id=note_id, error=str(e))


def _trigger_flashcard_embedding(flashcard_id: int, front_text: str, back_text: str):
    """Trigger Celery task for flashcard embedding (non-blocking)."""
    try:
        from app.services.background.embedding_tasks import generate_flashcard_embedding_task

        generate_flashcard_embedding_task.apply_async(
            kwargs={
                "flashcard_id": flashcard_id,
                "front_text": front_text or "",
                "back_text": back_text or "",
            },
            countdown=2,
        )
        logger.debug("flashcard_embedding_task_queued", flashcard_id=flashcard_id)
    except Exception as e:
        logger.error("failed_to_queue_flashcard_embedding", flashcard_id=flashcard_id, error=str(e))


def _on_note_insert(mapper, connection, target: Note):
    """Handle note insertion - queue embedding generation."""
    if target.deleted_at is not None:
        return  # Skip soft-deleted

    _trigger_note_embedding(note_id=target.id, title=target.title, content=target.content)


def _on_note_update(mapper, connection, target: Note):
    """Handle note update - re-generate embedding if content changed."""
    if target.deleted_at is not None:
        return  # Skip soft-deleted

    # Check if title or content was modified
    from sqlalchemy import inspect

    state = inspect(target)
    history_title = state.attrs.title.history
    history_content = state.attrs.content.history

    # Only regenerate if title or content actually changed
    if history_title.has_changes() or history_content.has_changes():
        _trigger_note_embedding(note_id=target.id, title=target.title, content=target.content)


def _on_flashcard_insert(mapper, connection, target: Flashcard):
    """Handle flashcard insertion - queue embedding generation."""
    if target.deleted_at is not None:
        return

    _trigger_flashcard_embedding(
        flashcard_id=target.id, front_text=target.front_text, back_text=target.back_text
    )


def _on_flashcard_update(mapper, connection, target: Flashcard):
    """Handle flashcard update - re-generate embedding if content changed."""
    if target.deleted_at is not None:
        return

    from sqlalchemy import inspect

    state = inspect(target)
    history_front = state.attrs.front_text.history
    history_back = state.attrs.back_text.history

    if history_front.has_changes() or history_back.has_changes():
        _trigger_flashcard_embedding(
            flashcard_id=target.id, front_text=target.front_text, back_text=target.back_text
        )
