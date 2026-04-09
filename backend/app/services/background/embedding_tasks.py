"""
Celery tasks for generating and syncing embeddings to PostgreSQL (pgvector).

Hybrid Architecture:
- Notes/Flashcards → PostgreSQL (pgvector) for hybrid BM25+vector search
- Documents → Qdrant (existing pipeline) for complex chunking

Uses embedding model defined in boundary.py (dimension from EMBEDDING_DIM).

Memory Notes:
- PyTorch + Sentence-Transformers requires ~950MB on import
- Worker memory limit set to 1.5GB to prevent premature recycling
- Model is cached per-worker via get_embedder() for 20x speedup
"""

import structlog
from typing import Optional, Dict, Any
from celery import group
from sqlalchemy import text

from app.services.background.celery_app import celery_app
from app.core.ai.embeddings.boundary import get_embedder, EMBEDDING_DIM

logger = structlog.get_logger(__name__)


# ==================== NOTE EMBEDDING TASKS ====================


@celery_app.task(
    bind=True,
    name="embedding.generate_note_embedding",
    queue="embeddings",
    max_retries=3,
    default_retry_delay=30,
    acks_late=True,
    reject_on_worker_lost=True,
)
def generate_note_embedding_task(
    self,
    note_id: int,
    title: str,
    content: str,
) -> Dict[str, Any]:
    """
    Generate embedding for a note and store in PostgreSQL.

    Args:
        note_id: Note ID
        title: Note title
        content: Note content

    Returns:
        Dict with task result
    """
    logger.info(
        "generating_note_embedding",
        note_id=note_id,
        title_length=len(title) if title else 0,
        content_length=len(content) if content else 0,
    )

    try:
        # Combine title and content for embedding
        text_to_embed = f"{title or ''}\n\n{content or ''}"[:8000]  # Limit text length

        if not text_to_embed.strip():
            logger.warning("empty_note_content", note_id=note_id)
            return {"status": "skipped", "reason": "empty_content", "note_id": note_id}

        # Generate embedding
        embedder = get_embedder()
        embedding = embedder.encode(text_to_embed)

        # Convert to list for PostgreSQL (encode returns 2D array, get first element)
        embedding_list = embedding[0].tolist() if embedding.ndim > 1 else embedding.tolist()
        embedding_str = f"[{','.join(map(str, embedding_list))}]"

        # Update PostgreSQL (sync call inside Celery)
        from app.db.session import SessionLocal

        with SessionLocal() as db:
            # Use CAST() instead of :: to avoid SQLAlchemy parameter parsing issues
            result = db.execute(
                text(f"""
                    UPDATE developer_schema.notes 
                    SET embedding = CAST(:embedding AS vector({EMBEDDING_DIM}))
                    WHERE id = :note_id AND deleted_at IS NULL
                """),
                {"embedding": embedding_str, "note_id": note_id},
            )
            db.commit()

            # Safety check: if rowcount is 0, note was deleted between hook and task
            if result.rowcount == 0:
                logger.warning("note_not_found_or_deleted", note_id=note_id)
                return {"status": "skipped", "reason": "not_found_or_deleted", "note_id": note_id}

        logger.info("note_embedding_generated", note_id=note_id)
        return {"status": "success", "note_id": note_id}

    except Exception as e:
        logger.error("note_embedding_error", note_id=note_id, error=str(e), exc_info=True)
        # Retry with exponential backoff
        raise self.retry(exc=e, countdown=30 * (2**self.request.retries))


# ==================== FLASHCARD EMBEDDING TASKS ====================


@celery_app.task(
    bind=True,
    name="embedding.generate_flashcard_embedding",
    queue="embeddings",
    max_retries=3,
    default_retry_delay=30,
    acks_late=True,
    reject_on_worker_lost=True,
)
def generate_flashcard_embedding_task(
    self,
    flashcard_id: int,
    front_text: str,
    back_text: str,
) -> Dict[str, Any]:
    """
    Generate embedding for a flashcard and store in PostgreSQL.

    Args:
        flashcard_id: Flashcard ID
        front_text: Front text
        back_text: Back text

    Returns:
        Dict with task result
    """
    logger.info(
        "generating_flashcard_embedding",
        flashcard_id=flashcard_id,
        front_length=len(front_text) if front_text else 0,
        back_length=len(back_text) if back_text else 0,
    )

    try:
        # Combine front and back for embedding
        text_to_embed = f"{front_text or ''}\n\n{back_text or ''}"[:4000]

        if not text_to_embed.strip():
            logger.warning("empty_flashcard_content", flashcard_id=flashcard_id)
            return {"status": "skipped", "reason": "empty_content", "flashcard_id": flashcard_id}

        # Generate embedding
        embedder = get_embedder()
        embedding = embedder.encode(text_to_embed)

        # Convert to list for PostgreSQL (encode returns 2D array, get first element)
        embedding_list = embedding[0].tolist() if embedding.ndim > 1 else embedding.tolist()
        embedding_str = f"[{','.join(map(str, embedding_list))}]"

        # Update PostgreSQL
        from app.db.session import SessionLocal

        with SessionLocal() as db:
            # Use CAST() instead of :: to avoid SQLAlchemy parameter parsing issues
            result = db.execute(
                text(f"""
                    UPDATE developer_schema.flashcards 
                    SET content_embedding = CAST(:embedding AS vector({EMBEDDING_DIM}))
                    WHERE id = :flashcard_id AND deleted_at IS NULL
                """),
                {"embedding": embedding_str, "flashcard_id": flashcard_id},
            )
            db.commit()

            # Safety check: if rowcount is 0, flashcard was deleted between hook and task
            if result.rowcount == 0:
                logger.warning("flashcard_not_found_or_deleted", flashcard_id=flashcard_id)
                return {
                    "status": "skipped",
                    "reason": "not_found_or_deleted",
                    "flashcard_id": flashcard_id,
                }

        logger.info("flashcard_embedding_generated", flashcard_id=flashcard_id)
        return {"status": "success", "flashcard_id": flashcard_id}

    except Exception as e:
        logger.error(
            "flashcard_embedding_error", flashcard_id=flashcard_id, error=str(e), exc_info=True
        )
        raise self.retry(exc=e, countdown=30 * (2**self.request.retries))


# ==================== BATCH BACKFILL TASKS ====================


@celery_app.task(
    bind=True,
    name="embedding.batch_backfill_notes",
    queue="embeddings",
    time_limit=3600,  # 1 hour max
)
def batch_backfill_notes_task(
    self, user_id: Optional[int] = None, batch_size: int = 50, skip_existing: bool = True
) -> Dict[str, Any]:
    """
    Backfill embeddings for existing notes.

    Args:
        user_id: Optional user ID to filter (None = all users)
        batch_size: Number of notes to process per batch
        skip_existing: Skip notes that already have embeddings

    Returns:
        Dict with backfill stats
    """
    logger.info(
        "starting_notes_backfill",
        user_id=user_id,
        batch_size=batch_size,
        skip_existing=skip_existing,
    )

    from app.db.session import SessionLocal

    try:
        with SessionLocal() as db:
            # Get notes without embeddings
            where_clause = ""
            params = {}

            if skip_existing:
                where_clause += " AND embedding IS NULL"
            if user_id:
                where_clause += " AND user_id = :user_id"
                params["user_id"] = user_id

            result = db.execute(
                text(f"""
                    SELECT id, title, content
                    FROM developer_schema.notes
                    WHERE deleted_at IS NULL {where_clause}
                    ORDER BY id
                """),
                params,
            )
            notes = result.mappings().all()

        total = len(notes)
        logger.info("notes_to_backfill", count=total)

        if total == 0:
            return {"status": "complete", "processed": 0, "total": 0}

        # Create batch of tasks
        tasks = []
        for note in notes:
            tasks.append(
                generate_note_embedding_task.s(
                    note_id=note["id"], title=note["title"] or "", content=note["content"] or ""
                )
            )

        # Execute in batches using Celery group
        job = group(tasks)
        result = job.apply_async()

        logger.info("notes_backfill_started", total_tasks=total)
        return {"status": "started", "total_tasks": total, "group_id": str(result.id)}

    except Exception as e:
        logger.error("notes_backfill_error", error=str(e), exc_info=True)
        return {"status": "error", "error": str(e)}


@celery_app.task(
    bind=True,
    name="embedding.batch_backfill_flashcards",
    queue="embeddings",
    time_limit=3600,
)
def batch_backfill_flashcards_task(
    self, user_id: Optional[int] = None, batch_size: int = 100, skip_existing: bool = True
) -> Dict[str, Any]:
    """
    Backfill embeddings for existing flashcards.

    Args:
        user_id: Optional user ID to filter
        batch_size: Number of flashcards per batch
        skip_existing: Skip flashcards with existing embeddings

    Returns:
        Dict with backfill stats
    """
    logger.info(
        "starting_flashcards_backfill",
        user_id=user_id,
        batch_size=batch_size,
        skip_existing=skip_existing,
    )

    from app.db.session import SessionLocal

    try:
        with SessionLocal() as db:
            # Get flashcards without embeddings (through deck ownership)
            where_clause = ""
            params = {}

            if skip_existing:
                where_clause += " AND f.content_embedding IS NULL"
            if user_id:
                where_clause += " AND d.user_id = :user_id"
                params["user_id"] = user_id

            result = db.execute(
                text(f"""
                    SELECT f.id, f.front_text, f.back_text
                    FROM developer_schema.flashcards f
                    INNER JOIN developer_schema.decks d ON f.deck_id = d.id
                    WHERE f.deleted_at IS NULL 
                      AND d.deleted_at IS NULL 
                      {where_clause}
                    ORDER BY f.id
                """),
                params,
            )
            flashcards = result.mappings().all()

        total = len(flashcards)
        logger.info("flashcards_to_backfill", count=total)

        if total == 0:
            return {"status": "complete", "processed": 0, "total": 0}

        # Create batch of tasks
        tasks = []
        for card in flashcards:
            tasks.append(
                generate_flashcard_embedding_task.s(
                    flashcard_id=card["id"],
                    front_text=card["front_text"] or "",
                    back_text=card["back_text"] or "",
                )
            )

        # Execute in batches
        job = group(tasks)
        result = job.apply_async()

        logger.info("flashcards_backfill_started", total_tasks=total)
        return {"status": "started", "total_tasks": total, "group_id": str(result.id)}

    except Exception as e:
        logger.error("flashcards_backfill_error", error=str(e), exc_info=True)
        return {"status": "error", "error": str(e)}
