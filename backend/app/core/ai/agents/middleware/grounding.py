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

from typing import Any, Dict, Optional
import structlog

from app.services.grounding import (
    get_grounding_service,
    GroundingResult,
)
from app.db.session import AsyncSessionLocal


logger = structlog.get_logger(__name__)


class GroundingMiddleware:
    """
    Middleware that injects RAG evidence into agent context.

    This runs in the pre-execution stage, retrieving evidence from
    the Search Intelligence Bus and making it available to the agent.

    Creates its own database session for search queries, following
    the same isolation pattern as stream_ai_response's context building.

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
        max_latency_ms: int = 15000,
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

        Creates an isolated db session for search queries to avoid
        contaminating the caller's transaction.

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

        # Pull conversation history injected by execute_stream/execute.
        # Used by GroundingService to run the context-aware rewriter before
        # the vector search, turning vague follow-ups into specific queries.
        chat_history: list = context.get("chat_history") or []

        # Create isolated db session for search (same pattern as stream_ai_response)
        grounding_db: Optional["AsyncSessionLocal"] = None
        try:
            grounding_db = AsyncSessionLocal()

            # Get grounding service with its own db session
            grounding_service = get_grounding_service(grounding_db)

            # Retrieve and format evidence
            result = await grounding_service.ground(
                query=query,
                user_id=user_id,
                surface=self.surface,
                max_chunks=self.max_chunks,
                min_confidence=self.min_confidence,
                max_latency_ms=self.max_latency_ms,
                history=chat_history,
            )

            await grounding_db.commit()

            # === IMAGE RETRIEVAL ROUTING ===
            # If any evidence chunk is an image, load the bytes from disk and
            # inject them into context so base_agent sends a vision completion.
            # The alias upgrade is non-fatal — if file loading fails, we still
            # ground with the text snippet (surrounding_context) from Qdrant.
            image_bytes_list = []
            if result.has_grounding:
                for ev_chunk in result.evidence:
                    if ev_chunk.content_type == "image" and ev_chunk.storage_path:
                        try:
                            import os, base64, io
                            from PIL import Image as _PILImage

                            img_path = ev_chunk.storage_path
                            if not os.path.exists(img_path):
                                logger.warning(
                                    "grounding_image_file_missing",
                                    path=img_path,
                                    chunk_id=ev_chunk.id,
                                )
                                continue

                            with _PILImage.open(img_path) as img:
                                img = img.convert("RGB")
                                # Resize to 1024px max — same as captioner
                                w, h = img.size
                                if max(w, h) > 1024:
                                    scale = 1024 / max(w, h)
                                    img = img.resize(
                                        (int(w * scale), int(h * scale)),
                                        _PILImage.LANCZOS,
                                    )
                                buf = io.BytesIO()
                                img.save(buf, format="JPEG", quality=85)
                                b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
                                image_bytes_list.append(b64)

                        except Exception as _img_err:
                            logger.warning(
                                "grounding_image_load_failed",
                                path=ev_chunk.storage_path,
                                error=str(_img_err),
                            )

            if image_bytes_list:
                context["image_bytes"] = image_bytes_list
                context["litellm_alias"] = "synapse-vision"
                logger.info(
                    "grounding_vision_upgrade",
                    images_loaded=len(image_bytes_list),
                    alias="synapse-vision",
                )

            # Inject grounding evidence into context
            context["grounding"] = result

            # Pre-populate grounding_sources in state metadata so they
            # survive even if after_execution fails. after_execution
            # will update with citation-tracking enrichment.
            if result.has_grounding:
                state.metadata["grounding_sources"] = [
                    {
                        "id": e.id,
                        "title": e.title,
                        "confidence": e.confidence,
                    }
                    for e in result.evidence
                ]

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
            if grounding_db:
                try:
                    await grounding_db.rollback()
                except Exception:
                    pass
            # Graceful degradation: empty grounding
            context["grounding"] = GroundingResult(evidence=[])
        finally:
            if grounding_db:
                try:
                    await grounding_db.close()
                except Exception:
                    pass

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
        Enriches grounding_sources metadata (already set in before_execution)
        with citation analysis from the LLM output.

        Args:
            agent: The agent instance
            state: Agent execution state
            context: Execution context
            user_id: User ID
        """
        try:
            grounding: GroundingResult = context.get("grounding")

            if not grounding or not grounding.has_grounding:
                return

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

            # Update grounding_sources with enriched data (already set in before_execution)
            state.metadata["grounding_sources"] = [
                {
                    "id": e.id,
                    "title": e.title,
                    "confidence": e.confidence,
                }
                for e in grounding.evidence
            ]
            state.metadata["evidence_usage"] = grounding.evidence_usage.model_dump()

            logger.info(
                "grounding_usage_recorded",
                user_id=user_id,
                evidence_count=grounding.source_count,
                cited_count=len(used_ids),
            )
        except Exception as e:
            logger.error(
                "grounding_after_execution_failed",
                user_id=user_id,
                error=str(e),
                exc_info=True,
            )
