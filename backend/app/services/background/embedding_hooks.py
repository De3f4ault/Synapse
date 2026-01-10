"""
Model event hooks for automatic embedding generation.

DEPRECATED: SQLAlchemy hooks no longer trigger Celery tasks.

ARCHITECTURAL CHANGE (2026-01-08):
- Transactional entities (notes, flashcards) now embed SYNCHRONOUSLY in service layer
- This file is kept for backwards compatibility and logging only
- See: app.modules.notes.service._generate_embeddings
- See: app.modules.flashcards.service._generate_embeddings

The embedding boundary module handles all embedding operations:
- app.core.ai.embeddings.boundary

"""

import structlog

logger = structlog.get_logger(__name__)


def setup_embedding_hooks():
    """
    Register SQLAlchemy event hooks for embedding generation.

    NOTE: As of 2026-01-08, these hooks are NO-OPs.
    Embedding is now handled synchronously in the service layer.

    This function is kept for backwards compatibility.
    """
    logger.info("embedding_hooks_setup", mode="disabled", reason="sync_embedding_in_service_layer")


# Legacy hooks kept for reference but not registered
# The service layer (_generate_embeddings) now handles all embedding inline


def _trigger_note_embedding(note_id: int, title: str, content: str):
    """DEPRECATED: Celery task trigger for notes."""
    logger.debug("legacy_note_embedding_hook_called", note_id=note_id, status="no_op")


def _trigger_flashcard_embedding(flashcard_id: int, front_text: str, back_text: str):
    """DEPRECATED: Celery task trigger for flashcards."""
    logger.debug(
        "legacy_flashcard_embedding_hook_called", flashcard_id=flashcard_id, status="no_op"
    )
