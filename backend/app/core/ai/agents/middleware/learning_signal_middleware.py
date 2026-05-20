"""
Learning Signal Middleware — Post-execution middleware that queues
learning signal extraction for background processing.

This middleware fires in after_execution (< 1ms) and queues a Celery
task that does the actual LLM extraction. The student's SSE stream
is never blocked by extraction latency.

Flow:
    Session ends
    → after_execution fires (queues Celery task in < 1ms)
    → SSE stream closes cleanly
    → Celery task: LLMExtractor runs on conversation dump
    → Signals validated, noise filtered
    → concept_mastery table updated
    → Redis cache invalidated
    → Next session picks up updated mastery
"""

from __future__ import annotations

from typing import Any, Dict

import structlog

from app.core.ai.agents.messages import SystemMessage

logger = structlog.get_logger(__name__)


class LearningSignalMiddleware:
    """
    Post-execution middleware that queues learning signal extraction.

    Designed to be non-blocking: after_execution only serializes the
    conversation and dispatches a Celery task. No LLM calls happen
    on the SSE critical path.
    """

    def __init__(self):
        self.logger = logger.bind(middleware="learning_signals")

    async def before_execution(
        self,
        agent: Any,
        state: Any,
        context: Dict[str, Any],
        user_id: int,
    ) -> None:
        """No-op — learning signals are extracted after execution."""
        pass

    async def after_execution(
        self,
        agent: Any,
        state: Any,
        context: Dict[str, Any],
        user_id: int,
    ) -> None:
        """
        Queue learning signal extraction as a background Celery task.

        Runs in < 1ms — just serializes messages and fires the task.
        The actual LLM extraction happens in the Celery worker.
        """
        try:
            # Filter out SystemMessage — contains injected context (user data)
            # and is not needed for concept extraction.
            conversation_dump = [
                m.model_dump()
                for m in state.messages
                if not isinstance(m, SystemMessage)
            ]

            if not conversation_dump:
                return

            session_id = context.get("session_id")

            # Fire-and-forget Celery task
            from app.services.background.learning_tasks import process_learning_signals

            process_learning_signals.delay(
                user_id=user_id,
                session_id=session_id,
                conversation=conversation_dump,
            )

            self.logger.info(
                "learning_extraction_queued",
                user_id=user_id,
                session_id=session_id,
                message_count=len(conversation_dump),
            )

        except Exception as e:
            # Never crash the stream on signal extraction failure
            self.logger.warning(
                "learning_extraction_queue_failed",
                user_id=user_id,
                error=str(e),
            )
