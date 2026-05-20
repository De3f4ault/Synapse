"""
colbert_tasks.py — Resilient ColBERT backfill task.

Encodes all existing text DocumentChunk rows with answerai-colbert-small-v1
and upserts their token matrices into the synapse_colbert Qdrant collection.

Usage:
    make backfill-colbert
    # or directly:
    from app.services.background.celery_app import celery_app
    celery_app.send_task("colbert.backfill_colbert")

Resilience model (mirrors process_document_task):
- Uses keyset pagination (WHERE id > last_id) instead of OFFSET — stable
  against concurrent inserts and O(log n) at any depth into the table.
- On SoftTimeLimitExceeded: captures cursor (last_id), re-queues itself
  with resume_from_id=last_id and countdown=60s. Zero re-work on resume.
- Idempotent: upsert overwrites any already-written points harmlessly.
- Non-destructive: never modifies synapse_dense or PG rows.
"""

from __future__ import annotations

import structlog
from typing import Any, Dict, List

from celery import shared_task

logger = structlog.get_logger(__name__)


# Process chunks in pages of this size to bound memory per iteration.
_PAGE_SIZE = 50


@shared_task(
    bind=True,
    name="colbert.backfill_colbert",
    soft_time_limit=7200,   # 2 hr — large corpora on CPU can be slow
    time_limit=7500,
    max_retries=0,           # Self-requeues on SoftTimeLimitExceeded
    queue="rag",
)
def backfill_colbert(self, resume_from_id: int = 0) -> Dict[str, Any]:
    """
    Encode all existing document chunks with ColBERT and upsert to synapse_colbert.

    Reads DocumentChunk rows from Postgres in pages of _PAGE_SIZE using keyset
    pagination (WHERE id > last_id ORDER BY id), encodes each with
    AnswerAIColBERTEmbedder, and upserts to synapse_colbert.

    On SoftTimeLimitExceeded the task saves its cursor (last chunk id processed)
    and re-queues itself with resume_from_id set — identical to how
    process_document_task handles large-document timeouts.

    Args:
        resume_from_id: Keyset cursor — only process chunks with id > this value.
                        0 means start from the beginning (default).

    Returns:
        dict with total_chunks_scanned, total_upserted, skipped counts.
    """
    from sqlalchemy import select, and_, func
    from sqlalchemy.orm import selectinload

    from app.db.session import SessionLocal
    from app.models.document_chunk import DocumentChunk
    from app.models.document import Document
    from app.core.ai.rag.embeddings.models.colbert_embedder import get_colbert_embedder
    from app.core.ai.rag.vector_store.qdrant.client import get_qdrant_client
    from app.core.ai.rag.vector_store.qdrant.collection_manager import (
        CollectionManager,
        SHARED_COLBERT_COLLECTION,
    )
    from app.core.ai.rag.vector_store.operations.upsert import VectorUpsert

    is_resume = resume_from_id > 0
    logger.info(
        "colbert_backfill_start",
        page_size=_PAGE_SIZE,
        resume_from_id=resume_from_id,
        is_resume=is_resume,
    )

    # ── Init shared resources ──────────────────────────────────────────────────
    colbert = get_colbert_embedder()
    qdrant_client = get_qdrant_client().get_client()

    # Ensure synapse_colbert collection exists (idempotent)
    CollectionManager(client=qdrant_client).create_colbert_collection()
    upserter = VectorUpsert(qdrant_client)

    total_chunks = 0
    total_upserted = 0
    total_skipped = 0
    page = 0
    last_id = resume_from_id  # keyset cursor — advances to chunks[-1].id each page

    # ── Base WHERE predicate (shared by COUNT and paging queries) ──────────────
    def _base_where(after_id: int):
        clauses = [
            DocumentChunk.id > after_id,
            DocumentChunk.is_parent.is_(False),
            DocumentChunk.embedding_id.is_not(None),
            DocumentChunk.content.is_not(None),
        ]
        return and_(*clauses)

    try:
        with SessionLocal() as session:
            # COUNT(*) of remaining chunks (respects resume cursor)
            total_count_n = session.execute(
                select(func.count(DocumentChunk.id)).where(_base_where(resume_from_id))
            ).scalar_one()

            logger.info(
                "colbert_backfill_chunk_count",
                total=total_count_n,
                remaining=total_count_n,
            )
            self.update_state(
                state="PROGRESS",
                meta={"total": total_count_n, "done": 0, "upserted": 0, "skipped": 0},
            )

            # ── Keyset pagination loop ─────────────────────────────────────────
            while True:
                stmt = (
                    select(DocumentChunk)
                    .options(selectinload(DocumentChunk.document))
                    .where(_base_where(last_id))
                    .order_by(DocumentChunk.id)
                    .limit(_PAGE_SIZE)
                )
                chunks: List[DocumentChunk] = session.execute(stmt).scalars().all()

                if not chunks:
                    break  # Done — no more rows past last_id

                # Advance keyset cursor to the last row we received
                last_id = chunks[-1].id

                # Filter: skip image chunks (empty content)
                text_chunks = [c for c in chunks if c.content and len(c.content.strip()) > 0]
                skipped_this_page = len(chunks) - len(text_chunks)
                total_skipped += skipped_this_page

                if text_chunks:
                    texts = [c.content for c in text_chunks]
                    ids   = [str(c.embedding_id) for c in text_chunks]

                    payloads = [
                        {
                            "user_id": str(c.document.user_id) if c.document else "",
                            "source_id": str(c.document_id),
                            "chunk_index": c.chunk_index or 0,
                            "content_type": "text",
                        }
                        for c in text_chunks
                    ]

                    # Encode token matrices
                    multivecs = colbert.encode_documents(texts)

                    # Upsert colbert multivectors to synapse_colbert
                    upserted = upserter.upsert_colbert_batch(
                        collection_name=SHARED_COLBERT_COLLECTION,
                        multivectors=multivecs,
                        payloads=payloads,
                        ids=ids,
                    )
                    total_upserted += upserted

                total_chunks += len(chunks)
                page += 1

                self.update_state(
                    state="PROGRESS",
                    meta={
                        "total": total_count_n,
                        "done": total_chunks,
                        "upserted": total_upserted,
                        "skipped": total_skipped,
                        "last_id": last_id,
                    },
                )

                logger.debug(
                    "colbert_backfill_page_done",
                    page=page,
                    done=total_chunks,
                    total=total_count_n,
                    upserted=total_upserted,
                    last_id=last_id,
                )

                # Progress INFO every 10 pages (~500 chunks)
                if page % 10 == 0:
                    pct = round(total_chunks / total_count_n * 100, 1) if total_count_n else 0
                    logger.info(
                        "colbert_backfill_progress",
                        page=page,
                        done=total_chunks,
                        total=total_count_n,
                        upserted=total_upserted,
                        pct=pct,
                        last_id=last_id,
                    )

    except Exception as e:
        # ── SoftTimeLimitExceeded: checkpoint and self-requeue ─────────────────
        try:
            from billiard.exceptions import SoftTimeLimitExceeded as _SLTE
        except ImportError:
            _SLTE = None

        if _SLTE is not None and isinstance(e, _SLTE):
            logger.warning(
                "colbert_backfill_soft_timeout",
                last_id=last_id,
                done=total_chunks,
                total_upserted=total_upserted,
                requeue_countdown=60,
            )
            # Re-queue with cursor — worker has 60s to free memory before picking it up
            backfill_colbert.apply_async(
                kwargs={"resume_from_id": last_id},
                countdown=60,
            )
            return {
                "status": "soft_timeout_requeued",
                "resume_from_id": last_id,
                "chunks_done_this_run": total_chunks,
                "upserted_this_run": total_upserted,
            }

        # All other exceptions: re-raise so Celery marks task FAILURE
        raise

    result = {
        "status": "completed",
        "resume_from_id": resume_from_id,   # where this run started
        "total_chunks_scanned": total_chunks,
        "total_upserted": total_upserted,
        "total_skipped": total_skipped,
        "collection": SHARED_COLBERT_COLLECTION,
    }

    logger.info("colbert_backfill_complete", **result)
    return result
