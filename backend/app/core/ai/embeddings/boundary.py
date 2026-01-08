"""
Embedding Boundary — Single source of truth for all embedding operations.

ARCHITECTURAL PRINCIPLE:
- Transactional entities (notes, flashcards) embed synchronously in service layer
- Bulk entities (documents) embed asynchronously via Celery
- No heavy work in SQLAlchemy hooks

This module provides:
- Sync embedding for pgvector entities (~20ms per call)
- Version tracking for model upgrades
- Circuit breaker for failure isolation
- Bulk mode detection for large operations

Usage:
    from app.core.ai.embeddings.boundary import embed_text_sync, EMBEDDING_VERSION

    entity.embedding = embed_text_sync(text)
    entity.embedding_model = EMBEDDING_VERSION
    entity.embedding_status = EmbeddingStatus.READY
"""

import time
import structlog
from typing import List, Optional, Tuple
from enum import Enum
from threading import Lock
from dataclasses import dataclass

logger = structlog.get_logger(__name__)

# =============================================================================
# VERSION CONSTANTS
# =============================================================================

EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"
EMBEDDING_DIM = 384
EMBEDDING_VERSION_NUMBER = 1
EMBEDDING_VERSION = f"{EMBEDDING_MODEL_NAME}@{EMBEDDING_DIM}@v{EMBEDDING_VERSION_NUMBER}"

# Text limits
MAX_TEXT_LENGTH = 8000
SYNC_EMBED_LIMIT = 20  # Max items to embed synchronously in one request


# =============================================================================
# EMBEDDING STATUS ENUM
# =============================================================================


class EmbeddingStatus(str, Enum):
    PENDING = "PENDING"  # Never embedded
    READY = "READY"  # Successfully embedded
    FAILED = "FAILED"  # Embedding failed, retry needed
    STALE = "STALE"  # Old model version, needs re-embed


# =============================================================================
# SEARCH POLICY
# =============================================================================
# Defines how entities with different embedding statuses appear in search

SEARCH_POLICY = {
    # Status: (vector_search, text_search)
    EmbeddingStatus.READY: (True, True),
    EmbeddingStatus.FAILED: (False, True),  # BM25 fallback
    EmbeddingStatus.PENDING: (False, False),  # Not searchable yet
    EmbeddingStatus.STALE: (True, True),  # Use old embedding until refreshed
}


# =============================================================================
# CIRCUIT BREAKER
# =============================================================================


@dataclass
class CircuitBreakerState:
    failures: int = 0
    last_failure_time: float = 0.0
    is_open: bool = False

    FAILURE_THRESHOLD = 5
    RESET_TIMEOUT_SECONDS = 60.0


_circuit_breaker = CircuitBreakerState()
_circuit_lock = Lock()


def _check_circuit_breaker() -> bool:
    """Returns True if embedding should proceed, False if circuit is open."""
    with _circuit_lock:
        if not _circuit_breaker.is_open:
            return True

        # Check if enough time has passed to reset
        if (
            time.time() - _circuit_breaker.last_failure_time
            > _circuit_breaker.RESET_TIMEOUT_SECONDS
        ):
            _circuit_breaker.is_open = False
            _circuit_breaker.failures = 0
            logger.info("embedding_circuit_breaker_reset")
            return True

        return False


def _record_failure():
    """Record an embedding failure for circuit breaker."""
    with _circuit_lock:
        _circuit_breaker.failures += 1
        _circuit_breaker.last_failure_time = time.time()

        if _circuit_breaker.failures >= _circuit_breaker.FAILURE_THRESHOLD:
            _circuit_breaker.is_open = True
            logger.warning("embedding_circuit_breaker_opened", failures=_circuit_breaker.failures)


def _record_success():
    """Reset failure count on success."""
    with _circuit_lock:
        _circuit_breaker.failures = 0


# =============================================================================
# CACHED EMBEDDER SINGLETON
# =============================================================================

_embedder = None
_embedder_lock = Lock()


def get_embedder():
    """Get or create embedder instance (cached singleton)."""
    global _embedder
    if _embedder is None:
        with _embedder_lock:
            if _embedder is None:
                from app.core.ai.rag.embeddings.models.all_minilm import AllMiniLMEmbedder

                logger.info("initializing_embedder_singleton")
                _embedder = AllMiniLMEmbedder()
    return _embedder


# =============================================================================
# CORE EMBEDDING FUNCTIONS
# =============================================================================


def embed_text_sync(
    text: str, max_length: int = MAX_TEXT_LENGTH
) -> Tuple[Optional[List[float]], EmbeddingStatus]:
    """
    Synchronously embed text for pgvector entities.

    Args:
        text: Text to embed
        max_length: Max characters to process

    Returns:
        Tuple of (embedding_vector, status)

    Performance:
        ~10-30ms for typical note/flashcard content
    """
    # Circuit breaker check
    if not _check_circuit_breaker():
        logger.warning("embedding_skipped_circuit_open")
        return None, EmbeddingStatus.FAILED

    # Validate input
    if not text or not text.strip():
        logger.warning("embedding_skipped_empty_text")
        return None, EmbeddingStatus.FAILED

    # Truncate to max length
    text = text[:max_length]

    start_time = time.time()

    try:
        embedder = get_embedder()
        embedding = embedder.encode([text], normalize=True)

        # Handle 2D array (batch of 1)
        if embedding.ndim > 1:
            embedding = embedding[0]

        embedding_list = embedding.tolist()

        elapsed_ms = (time.time() - start_time) * 1000

        logger.debug(
            "embedding_sync_complete", text_length=len(text), latency_ms=round(elapsed_ms, 1)
        )

        _record_success()
        return embedding_list, EmbeddingStatus.READY

    except Exception as e:
        elapsed_ms = (time.time() - start_time) * 1000

        logger.error(
            "embedding_sync_failed",
            error=str(e),
            text_length=len(text),
            latency_ms=round(elapsed_ms, 1),
            exc_info=True,
        )

        _record_failure()
        return None, EmbeddingStatus.FAILED


def should_embed_sync(item_count: int) -> bool:
    """
    Determine if items should be embedded synchronously or async.

    Args:
        item_count: Number of items to embed

    Returns:
        True if sync embedding is appropriate, False for async
    """
    return item_count <= SYNC_EMBED_LIMIT


def get_embedding_version() -> str:
    """Get current embedding version string."""
    return EMBEDDING_VERSION


def is_embedding_stale(model_version: Optional[str]) -> bool:
    """Check if an embedding needs to be regenerated."""
    if model_version is None:
        return True
    return model_version != EMBEDDING_VERSION
