"""
Learning Signal Celery Tasks — Background extraction and mastery update.

Runs outside the SSE stream:
1. LLMExtractor processes the conversation dump
2. Valid signals update concept_mastery via UPSERT
3. Redis context cache is invalidated
4. Next session picks up updated mastery

Cost: ~$0.000045 per extraction (gemini-2.5-flash-lite).
"""

import asyncio
import structlog
from typing import Any, Dict, List, Optional

from app.services.background.celery_app import celery_app

logger = structlog.get_logger(__name__)

# ── Signal type → mastery delta constants ─────────────────────────────────
SIGNAL_DELTAS = {
    "concept_introduced": 0.15,
    "concept_reinforced": 0.10,
    "mastery_demonstrated": 0.20,
    "gap_detected": -0.05,
}

def _run_async(coro):
    """Run an async coroutine on a persistent event loop. 
    Prevents 'Event loop is closed' errors with globally cached DB engines in Celery workers."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_closed():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop.run_until_complete(coro)



@celery_app.task(
    bind=True,
    name="learning.process_signals",
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=300,
    retry_jitter=True,
    max_retries=3,
    acks_late=True,
    soft_time_limit=75,   # 3 models × 18s each = 54s + extraction overhead
    time_limit=100,       # Hard ceiling with comfortable margin
    track_started=True,
)
def process_learning_signals(
    self,
    user_id: int,
    session_id: Optional[int],
    conversation: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Extract learning signals from a conversation and update mastery.

    Runs in Celery worker — never blocks the student's SSE stream.

    Args:
        user_id: Student who had the conversation
        session_id: Chat session ID (for observability)
        conversation: List of model_dump'd AgentMessage dicts
                      (SystemMessages already filtered out)
    """
    logger.info(
        "learning_task_started",
        task_id=self.request.id,
        user_id=user_id,
        session_id=session_id,
        message_count=len(conversation),
    )

    async def _process():
        from app.core.ai.agents.middleware.learning_signals import LLMExtractor
        from app.db.session import AsyncSessionLocal
        from sqlalchemy import text

        # 1. Extract signals via LLM
        extractor = LLMExtractor()
        signals = await extractor.extract(conversation)

        if not signals:
            logger.info(
                "no_learning_signals",
                user_id=user_id,
                session_id=session_id,
            )
            return {"status": "completed", "signals_extracted": 0, "signals_applied": 0}

        logger.info(
            "learning_signals_extracted",
            user_id=user_id,
            session_id=session_id,
            concepts_introduced=sum(1 for s in signals if s.signal_type == "concept_introduced"),
            concepts_reinforced=sum(1 for s in signals if s.signal_type == "concept_reinforced"),
            gaps_found=sum(1 for s in signals if s.signal_type == "gap_detected"),
            mastery_demonstrated=sum(1 for s in signals if s.signal_type == "mastery_demonstrated"),
        )

        # 2. Update concept_mastery via UPSERT
        applied = 0
        async with AsyncSessionLocal() as db:
            for signal in signals:
                delta = SIGNAL_DELTAS.get(signal.signal_type, 0.0)

                try:
                    await db.execute(
                        text("""
                            INSERT INTO concept_mastery 
                                (user_id, concept, subject_area, mastery_score, 
                                 exposure_count, source, last_exposure, first_exposure,
                                 created_at, updated_at)
                            VALUES 
                                (:user_id, :concept, :subject_area, 
                                 GREATEST(0.0, LEAST(:delta, 1.0)),
                                 1, 'conversation', NOW(), NOW(), NOW(), NOW())
                            ON CONFLICT (user_id, concept) DO UPDATE SET
                                mastery_score = GREATEST(0.0, LEAST(
                                    concept_mastery.mastery_score + :delta, 1.0
                                )),
                                exposure_count = concept_mastery.exposure_count + 1,
                                last_exposure = NOW(),
                                source = 'conversation',
                                updated_at = NOW()
                        """),
                        {
                            "user_id": user_id,
                            "concept": signal.concept,
                            "subject_area": None,  # LLM doesn't reliably assign this yet
                            "delta": delta,
                        },
                    )
                    applied += 1
                except Exception as e:
                    logger.warning(
                        "concept_mastery_upsert_failed",
                        concept=signal.concept,
                        error=str(e),
                    )

            await db.commit()

        # 3. Invalidate context cache (kv_store UNLOGGED table)
        # ContextEngine._get_cache_key() produces "context:{user_id}".
        # We instantiate PgCacheClient directly — get_cache() raises RuntimeError
        # in Celery workers because FastAPI lifespan never runs init_cache().
        try:
            from app.db.session import AsyncSessionLocal
            from app.services.cache.pg_cache import PgCacheClient

            cache = PgCacheClient(session_factory=AsyncSessionLocal)
            deleted = await cache.delete(f"context:{user_id}")
            if deleted:
                logger.debug("context_cache_invalidated", user_id=user_id)
            else:
                logger.debug("context_cache_key_not_found", user_id=user_id)
        except Exception as e:
            # Non-fatal — ContextEngine rebuilds from PostgreSQL on next request
            logger.debug("cache_invalidation_skipped", error=str(e))

        logger.info(
            "mastery_updated",
            user_id=user_id,
            session_id=session_id,
            signals_processed=len(signals),
            signals_applied=applied,
        )

        return {
            "status": "completed",
            "signals_extracted": len(signals),
            "signals_applied": applied,
        }

    try:
        result = _run_async(_process())

        logger.info(
            "learning_task_completed",
            task_id=self.request.id,
            user_id=user_id,
            result=result,
        )
        return result

    except Exception as e:
        logger.error(
            "learning_task_failed",
            task_id=self.request.id,
            user_id=user_id,
            error=str(e),
            retry_count=self.request.retries,
            exc_info=True,
        )
        raise


# ── Auto-categorisation task ──────────────────────────────────────────────────


@celery_app.task(
    bind=True,
    name="flashcards.auto_categorise_deck",
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=120,
    retry_jitter=True,
    max_retries=2,
    acks_late=True,
    soft_time_limit=45,
    time_limit=90,
)
def auto_categorise_deck(self, deck_id: int, user_id: int) -> Dict[str, Any]:
    """
    Run AI collection categorisation for a newly created deck.

    Fires after deck generation (both document-based and topic-based).
    Never blocks the generation response — runs in the Celery worker.

    Flow:
        1. CollectionService.suggest_collection() calls gemini-flash-lite
        2. If a matching collection exists → assign the deck to it
        3. If no match → create a new collection and assign
        4. If AI fails → deck stays uncategorised (graceful degradation)

    Args:
        deck_id: The newly created deck
        user_id: Owner of the deck
    """
    logger.info(
        "auto_categorise_started",
        task_id=self.request.id,
        deck_id=deck_id,
        user_id=user_id,
    )

    async def _run():
        from app.db.session import AsyncSessionLocal
        from app.services.flashcards.collection_service import CollectionService

        async with AsyncSessionLocal() as db:
            service = CollectionService(db)
            result = await service.auto_assign_deck(deck_id, user_id)
            return result

    try:
        result = _run_async(_run())

        logger.info(
            "auto_categorise_completed",
            task_id=self.request.id,
            deck_id=deck_id,
            user_id=user_id,
            result=result,
        )
        return {"status": "completed", "assignment": result}

    except Exception as exc:
        logger.error(
            "auto_categorise_failed",
            task_id=self.request.id,
            deck_id=deck_id,
            user_id=user_id,
            error=str(exc),
            retry_count=self.request.retries,
            exc_info=True,
        )
        raise
