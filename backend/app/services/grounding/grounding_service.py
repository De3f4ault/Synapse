"""
Grounding Service - Evidence retrieval and formatting for LLM grounding.

This service bridges the Search Intelligence Bus and Agent execution.
It is the ONLY path for evidence to reach the LLM.

Flow:
    User Message → GroundingService.ground() → Search Bus → Evidence Selection → Formatted Prompt

The agent never talks to Qdrant or RAG directly - it talks ONLY to this service.
"""

import time
from typing import List, Optional
import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.intelligence import (
    EvidenceChunk,
    EvidenceUsage,
    GroundingResult,
)
from app.schemas.search import SearchContext, SearchIntent
from app.schemas.search import UnifiedSearchResult
from app.services.search.unified_service import UnifiedSearchService
from app.core.ai.rag.query_enhancement.context_rewriter import get_context_rewriter


logger = structlog.get_logger(__name__)


# =============================================================================
# Grounding Prompt Constants (FROZEN - DO NOT MODIFY)
# =============================================================================

GROUNDING_SYSTEM_PROMPT = """You are an assistant that answers using provided evidence when available.

Rules:
- Evidence snippets are partial and may not fully answer the question.
- Do NOT assume evidence is complete or authoritative.
- If evidence is insufficient, say so explicitly.
- Do NOT invent details not present in evidence.
- Cite sources by their title when using evidence."""

GROUNDING_INSTRUCTION = """Use the evidence above if relevant.
If evidence does not fully answer the question, explain the limitation."""


# =============================================================================
# Evidence Formatting (Deterministic)
# =============================================================================


def format_evidence_for_prompt(evidence: List[EvidenceChunk]) -> str:
    """
    Format evidence for LLM prompt injection.

    Returns a delimited, structured evidence block.
    Properties:
    - Explicit boundary (<EVIDENCE>) for parsing
    - Confidence is advisory, not authoritative
    - No engine names, no raw scores
    - Deterministic output for same input

    Args:
        evidence: List of evidence chunks

    Returns:
        Formatted evidence block string
    """
    if not evidence:
        return ""

    sources = []
    for i, chunk in enumerate(evidence, 1):
        confidence_label = chunk.confidence_level.value
        confidence_pct = int(chunk.confidence * 100)

        source_block = f"""Source {i}:
Title: {chunk.title}
Confidence: {confidence_label} ({confidence_pct}%)
Snippet:
\"{chunk.snippet.strip()}\""""
        sources.append(source_block)

    return f"""<EVIDENCE>
{chr(10).join(sources)}
</EVIDENCE>"""


def format_grounded_prompt(evidence: List[EvidenceChunk], user_question: str) -> str:
    """
    Format the complete grounded prompt for the LLM.
    Combines evidence block + user question + instruction.

    Args:
        evidence: List of evidence chunks
        user_question: The user's question

    Returns:
        Complete grounded prompt string
    """
    evidence_block = format_evidence_for_prompt(evidence)

    if not evidence_block:
        # No grounding - LLM answers from knowledge
        return f"Question:\n{user_question}"

    return f"""{evidence_block}

Question:
{user_question}

{GROUNDING_INSTRUCTION}"""


# =============================================================================
# Evidence Selection
# =============================================================================


def select_evidence(
    results: List[UnifiedSearchResult],
    max_chunks: int = 5,
    min_confidence: float = 0.3,
) -> List[EvidenceChunk]:
    """
    Select and transform evidence from unified search results.

    Selection criteria:
    - Only role='evidence' results
    - Must have snippet content
    - Must have parent_id or root_id
    - Above minimum confidence threshold
    - Limited to max_chunks

    Args:
        results: Raw unified search results
        max_chunks: Maximum evidence chunks to include
        min_confidence: Minimum confidence threshold

    Returns:
        List of selected evidence chunks
    """
    evidence = []

    for result in results:
        # Contract enforcement: only evidence role
        if result.role != "evidence":
            logger.debug(
                "grounding_non_evidence_filtered", role=result.role, id=str(result.id.id)
            )
            continue

        # Must have snippet
        if not result.snippet:
            continue

        # Must link to source document
        if not result.id.parent_id and not result.id.root_id:
            logger.warning("grounding_orphan_chunk_filtered", id=str(result.id.id))
            continue

        # Compute confidence — cross-encoder returns raw logits (e.g. 6.71),
        # but EvidenceChunk requires 0-1. Use sigmoid for logit normalization.
        confidence = result.confidence if result.confidence is not None else 0.5
        if confidence > 1.0:
            import math
            confidence = 1.0 / (1.0 + math.exp(-confidence))  # sigmoid

        # Filter by minimum confidence
        if confidence < min_confidence:
            continue

        # Normalize similarity score the same way
        similarity = (
            result.scores.get("similarity", 0.0)
            or result.scores.get("vector", 0.0)
            or 0.0
        )
        if similarity > 1.0:
            import math
            similarity = 1.0 / (1.0 + math.exp(-similarity))

        # Transform to EvidenceChunk
        chunk = EvidenceChunk(
            id=str(result.id.id),
            title=result.title,
            snippet=result.snippet,
            parent_id=str(result.id.parent_id) if result.id.parent_id else None,
            root_id=str(result.id.root_id) if result.id.root_id else None,
            confidence=confidence,
            similarity=similarity,
            # Image routing fields — only present for rag-sourced image chunks
            content_type=result.metadata.get("content_type", "text") if result.metadata else "text",
            storage_path=result.metadata.get("storage_path") if result.metadata else None,
        )
        evidence.append(chunk)

        # Limit to max chunks
        if len(evidence) >= max_chunks:
            break

    return evidence


def create_evidence_usage_signal(
    evidence: List[EvidenceChunk], used_ids: Optional[List[str]] = None
) -> EvidenceUsage:
    """
    Create an evidence usage signal for feedback tracking.

    Args:
        evidence: List of available evidence chunks
        used_ids: Optional list of IDs that were actually used/cited

    Returns:
        EvidenceUsage signal
    """
    avg_confidence = 0.0
    if evidence:
        avg_confidence = sum(e.confidence for e in evidence) / len(evidence)

    return EvidenceUsage(
        available_evidence_ids=[e.id for e in evidence],
        used_evidence_ids=used_ids or [],
        avg_confidence=avg_confidence,
        is_grounded=len(evidence) > 0,
        answer_quality_proxy=None,  # Set later by user feedback
    )


# =============================================================================
# Grounding Service
# =============================================================================


class GroundingService:
    """
    Service for grounding LLM responses with evidence.

    This is the ONLY path for evidence to reach the LLM.
    The agent never talks to Qdrant or RAG directly.

    Usage:
        grounding_service = GroundingService(unified_search_service)
        result = await grounding_service.ground(
            query="How does photosynthesis work?",
            user_id=1,
            surface="chat",
        )

        if result.has_grounding:
            system_prompt += result.formatted_prompt_block
    """

    def __init__(self, db: AsyncSession):
        """
        Initialize grounding service.

        Args:
            db: Async database session (required for UnifiedSearchService)
        """
        self.unified_search = UnifiedSearchService(db)

    async def ground(
        self,
        query: str,
        user_id: int,
        surface: str = "chat",
        max_chunks: int = 5,
        min_confidence: float = 0.3,
        max_latency_ms: int = 15000,
        history: Optional[List[dict]] = None,
    ) -> GroundingResult:
        """
        Retrieve and format evidence for LLM grounding.

        When ``history`` is provided and the query is context-dependent
        (pronouns, continuation phrases, bare references), the
        ``ContextAwareRewriter`` resolves it into a self-contained search
        string before retrieval.  The rewrite step replaces HyDE in those
        cases — an already-resolved query doesn't need further expansion.

        Args:
            query: User's raw question
            user_id: User ID for access control / personalisation
            surface: Surface making the request (chat, study, etc.)
            max_chunks: Maximum evidence chunks to return
            min_confidence: Minimum cross-encoder confidence threshold
            max_latency_ms: Latency budget for the full search call
            history: Recent conversation turns in
                     ``[{"role": str, "content": str}]`` format,
                     chronological order (oldest first).

        Returns:
            GroundingResult with evidence and formatted prompt block
        """
        start_time = time.time()
        original_query = query

        try:
            # ── Context-aware query rewriting ────────────────────────────────
            # For short ambiguous queries (pronouns, "build on this", etc.)
            # resolve the implicit reference using conversation history BEFORE
            # hitting the vector store.  This turns a -1.4 cross-encoder score
            # into a -0.5 by searching for something semantically meaningful.
            rewriter = get_context_rewriter()
            if history and rewriter.is_context_dependent(query):
                query = await rewriter.rewrite(query, history)
                logger.info(
                    "grounding_query_rewritten",
                    original=original_query,
                    resolved=query,
                    user_id=user_id,
                )

            # Build search context (query is NOT a field on SearchContext)
            context = SearchContext(
                user_id=user_id,
                intent=SearchIntent.RETRIEVE_CONTEXT,
                surface=surface,
                max_latency_ms=max_latency_ms,
                max_results_per_engine=max_chunks * 2,  # Get more, filter down
            )

            # Execute unified search (query is the first arg, context is the second)
            response = await self.unified_search.search(query, context)

            # Flatten results from all engines (intent already filtered participation)
            # The service handles engine failures via status check
            all_results = []
            if hasattr(response, "engines"):
                for engine in response.engines:
                    if engine.status == "ok" and engine.results:
                        all_results.extend(engine.results)

            # Select evidence from results
            evidence = select_evidence(
                results=all_results,
                max_chunks=max_chunks,
                min_confidence=min_confidence,
            )

            # Format for prompt
            formatted = format_evidence_for_prompt(evidence)

            # Create usage signal
            usage = create_evidence_usage_signal(evidence)

            latency_ms = (time.time() - start_time) * 1000

            query_rewritten = query != original_query
            logger.info(
                "grounding_complete",
                user_id=user_id,
                original_query=original_query[:80],
                resolved_query=query[:80] if query_rewritten else None,
                query_rewritten=query_rewritten,
                evidence_count=len(evidence),
                has_grounding=len(evidence) > 0,
                latency_ms=round(latency_ms, 2),
            )

            return GroundingResult(
                evidence=evidence,
                formatted_prompt_block=formatted,
                evidence_usage=usage,
                grounding_latency_ms=latency_ms,
            )

        except Exception as e:
            latency_ms = (time.time() - start_time) * 1000
            logger.error(
                "grounding_failed",
                user_id=user_id,
                error=str(e),
                latency_ms=round(latency_ms, 2),
            )

            # Graceful degradation: return empty grounding
            return GroundingResult(
                evidence=[],
                formatted_prompt_block="",
                evidence_usage=EvidenceUsage(is_grounded=False),
                grounding_latency_ms=latency_ms,
            )

    def get_system_prompt(self) -> str:
        """
        Get the immutable grounding system prompt.

        Returns:
            The grounding system prompt constant
        """
        return GROUNDING_SYSTEM_PROMPT


# =============================================================================
# Factory
# =============================================================================


def get_grounding_service(db: AsyncSession) -> GroundingService:
    """
    Create a grounding service for the current request.

    Not a singleton — needs a fresh db session per request
    (same lifecycle as UnifiedSearchService).

    Args:
        db: Async database session for the current request

    Returns:
        GroundingService instance
    """
    return GroundingService(db)
