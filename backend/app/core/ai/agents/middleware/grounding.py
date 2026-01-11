"""
Grounding Middleware - Injects RAG evidence into agent context.

This middleware runs during the pre-execution stage of agent execution.
It retrieves evidence from the Search Intelligence Bus and injects it
into the context, where the agent's _get_system_prompt() can use it.

Flow:
    before_execution() →
        GroundingService.ground() →
        context["grounding"] = GroundingResult

The agent then accesses context["grounding"].formatted_prompt_block
in its _get_system_prompt() method.
"""

from typing import Any, Dict
import structlog

from app.services.grounding import (
    get_grounding_service,
    GroundingResult,
)


logger = structlog.get_logger(__name__)


class GroundingMiddleware:
    """
    Middleware that injects RAG evidence into agent context.

    This runs in the pre-execution stage, retrieving evidence from
    the Search Intelligence Bus and making it available to the agent.

    Usage:
        from app.core.ai.agents.middleware.grounding import GroundingMiddleware

        agent_config = AgentConfig(
            name="tutor",
            ...,
            middleware=[GroundingMiddleware()],
        )
    """

    def __init__(
        self,
        max_chunks: int = 5,
        min_confidence: float = 0.3,
        max_latency_ms: int = 250,
        surface: str = "chat",
    ):
        """
        Initialize grounding middleware.

        Args:
            max_chunks: Maximum evidence chunks to retrieve
            min_confidence: Minimum confidence threshold
            max_latency_ms: Maximum latency budget for grounding
            surface: Surface identifier for search context
        """
        self.max_chunks = max_chunks
        self.min_confidence = min_confidence
        self.max_latency_ms = max_latency_ms
        self.surface = surface

    async def before_execution(
        self,
        agent: Any,
        state: Any,
        context: Dict[str, Any],
        user_id: int,
    ) -> None:
        """
        Run grounding before agent execution.

        Retrieves evidence from the Search Intelligence Bus and
        adds it to the context for the agent to use.

        Args:
            agent: The agent instance
            state: Agent execution state
            context: Execution context (will be modified)
            user_id: User ID
        """
        # Extract the user's query from the last human message
        query = context.get("input", "")
        if not query:
            # Try to find it in state
            for msg in reversed(state.messages if hasattr(state, "messages") else []):
                if hasattr(msg, "content") and hasattr(msg, "__class__"):
                    if msg.__class__.__name__ == "HumanMessage":
                        query = msg.content
                        break

        if not query:
            logger.debug("grounding_skipped_no_query", user_id=user_id)
            context["grounding"] = GroundingResult(evidence=[])
            return

        try:
            # Get grounding service
            grounding_service = get_grounding_service()

            # Retrieve and format evidence
            result = await grounding_service.ground(
                query=query,
                user_id=user_id,
                surface=self.surface,
                max_chunks=self.max_chunks,
                min_confidence=self.min_confidence,
                max_latency_ms=self.max_latency_ms,
            )

            # Inject into context
            context["grounding"] = result

            logger.info(
                "grounding_middleware_complete",
                user_id=user_id,
                has_grounding=result.has_grounding,
                evidence_count=result.source_count,
                latency_ms=result.grounding_latency_ms,
            )

        except Exception as e:
            logger.error(
                "grounding_middleware_failed",
                user_id=user_id,
                error=str(e),
            )
            # Graceful degradation: empty grounding
            context["grounding"] = GroundingResult(evidence=[])

    async def after_execution(
        self,
        agent: Any,
        state: Any,
        context: Dict[str, Any],
        user_id: int,
    ) -> None:
        """
        Run after agent execution.

        Records evidence usage for feedback tracking.

        Args:
            agent: The agent instance
            state: Agent execution state
            context: Execution context
            user_id: User ID
        """
        grounding: GroundingResult = context.get("grounding")

        if grounding and grounding.has_grounding:
            # 1. Analyze output for citations (Heuristic: look for "Source X")
            # This turns "available" evidence into "used" evidence
            output = ""
            if hasattr(state, "output") and state.output:
                output = state.output
            elif isinstance(state, dict):
                output = state.get("output", "")

            used_ids = []
            if output:
                import re

                # Pattern: "Source 1", "Source 2", etc.
                # Corresponds to the index in the grounding.evidence list (1-based)
                cited_indices = re.findall(r"Source\s+(\d+)", output, re.IGNORECASE)

                for idx_str in cited_indices:
                    try:
                        idx = int(idx_str) - 1  # 0-based
                        if 0 <= idx < len(grounding.evidence):
                            used_ids.append(grounding.evidence[idx].id)
                    except ValueError:
                        continue

            # Update usage signal
            grounding.evidence_usage.used_evidence_ids = list(set(used_ids))

            # Store evidence usage in state metadata for later analysis
            state.metadata["grounding_sources"] = [
                {
                    "id": e.id,
                    "title": e.title,
                    "confidence": e.confidence,
                }
                for e in grounding.evidence
            ]
            state.metadata["evidence_usage"] = grounding.evidence_usage.model_dump()

            logger.debug(
                "grounding_usage_recorded",
                user_id=user_id,
                evidence_count=grounding.source_count,
            )
