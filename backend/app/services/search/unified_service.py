"""Unified Search Service - The Search Intelligence Bus.

Orchestrates search across specialized engines (Hybrid, RAG, Graph)
and returns results in the unified contract format.

GUARANTEES:
1. No ordering is applied across engines
2. Results are ALWAYS per-engine envelopes
3. Engines participate based on intent, not query hacks
4. Soft timeouts enforce budget constraints
5. Partial truth beats silent failure
"""

import asyncio
import time
from datetime import datetime
from typing import List, Optional
import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.search_identity import SearchEntityIdentity, IdentityAuthority
from app.schemas.search_result import UnifiedSearchResult, SearchRole, AssertionType
from app.schemas.search_context import SearchContext, get_participating_engines
from app.schemas.search_response import EngineResult, UnifiedSearchResponse
from app.services.search.contract import enforce_contract
from app.services.search.adapters import (
    adapt_hybrid_note_results,
    adapt_hybrid_flashcard_results,
    adapt_chat_message_results,
    adapt_gie_concepts,
)

logger = structlog.get_logger(__name__)


class UnifiedSearchService:
    """
    The Search Intelligence Bus.

    Aggregates facts from specialized engines without applying ranking.
    Consumers (UI) decide meaning based on role, assertion type, and signals.

    INVARIANTS:
    - No ranking logic in this service
    - Results always returned per-engine
    - Engines self-select based on intent
    - Budget constraints are soft-enforced
    """

    def __init__(self, db: AsyncSession):
        """
        Initialize the unified search service.

        Args:
            db: Database session for engine access
        """
        self.db = db
        self._rag_pipeline = None
        logger.info("unified_search_service_initialized")

    @property
    def rag_pipeline(self):
        """Lazy-load RAG pipeline."""
        if self._rag_pipeline is None:
            from app.core.ai.rag.pipeline.rag_pipeline import RAGPipeline

            self._rag_pipeline = RAGPipeline(
                enable_llm_enhancement=True,
                llm_provider="gemini",
                llm_enhancement_strategy="rewrite",  # Options: rewrite, hyde, multi_query, decompose
            )
        return self._rag_pipeline

    async def search(
        self,
        query: str,
        context: SearchContext,
    ) -> UnifiedSearchResponse:
        """
        Execute unified search across all participating engines.

        Args:
            query: Search query text
            context: Search context with intent, surface, and budget

        Returns:
            UnifiedSearchResponse with per-engine result envelopes
        """
        start = time.perf_counter()

        logger.info(
            "unified_search_start",
            query=query[:50] if query else "[empty]",
            intent=context.intent,
            surface=context.surface,
            user_id=context.user_id,
        )

        # Determine which engines participate
        participating = get_participating_engines(context.intent)

        # =================================================================
        # IMPORTANT: Run engines carefully to avoid concurrent session use.
        # The db session can only handle one operation at a time.
        # - hybrid and graph use self.db → must run sequentially
        # - rag uses Qdrant (external) → can run in parallel
        # =================================================================

        overall_timeout = context.max_latency_ms / 1000 * 1.5  # 50% buffer
        engine_results: List[EngineResult] = []

        try:
            async with asyncio.timeout(overall_timeout):
                # Separate db-dependent and external engines
                db_engines = [e for e in participating if e in ("hybrid", "graph")]
                external_engines = [e for e in participating if e not in ("hybrid", "graph")]

                # Run db-dependent engines SEQUENTIALLY
                for engine in db_engines:
                    try:
                        result = await self._run_engine(engine, query, context)
                        engine_results.append(result)
                    except Exception as e:
                        logger.error("engine_sequential_error", engine=engine, error=str(e))
                        engine_results.append(
                            EngineResult(
                                engine=engine,
                                results=[],
                                latency_ms=0,
                                status="error",
                                error_message=str(e),
                            )
                        )
                        # IMPORTANT: Rollback to prevent transaction poisoning
                        # so subsequent engines can still work
                        try:
                            await self.db.rollback()
                        except Exception:
                            pass  # Rollback failure is not fatal

                # Run external engines (RAG) in parallel
                if external_engines:
                    external_tasks = [self._run_engine(e, query, context) for e in external_engines]
                    external_results = await asyncio.gather(*external_tasks, return_exceptions=True)

                    for i, result in enumerate(external_results):
                        if isinstance(result, Exception):
                            engine_results.append(
                                EngineResult(
                                    engine=external_engines[i],
                                    results=[],
                                    latency_ms=0,
                                    status="error",
                                    error_message=str(result),
                                )
                            )
                        else:
                            engine_results.append(result)

        except asyncio.TimeoutError:
            logger.warning("unified_search_overall_timeout", timeout_s=overall_timeout)
            # Fill in timeouts for any engines we didn't process
            processed_engines = {r.engine for r in engine_results}
            for e in participating:
                if e not in processed_engines:
                    engine_results.append(
                        EngineResult(
                            engine=e,
                            results=[],
                            latency_ms=int(overall_timeout * 1000),
                            status="timeout",
                            error_message="Overall search timeout",
                        )
                    )

        # Use engine_results directly (already a list of EngineResult)
        envelopes = engine_results

        # Calculate totals
        total_results = sum(len(e.results) for e in envelopes)
        response_time_ms = int((time.perf_counter() - start) * 1000)

        logger.info(
            "unified_search_complete",
            query=query[:50] if query else "[empty]",
            total_results=total_results,
            engines_ok=len([e for e in envelopes if e.is_healthy]),
            engines_failed=len([e for e in envelopes if not e.is_healthy]),
            response_time_ms=response_time_ms,
        )

        # =====================================================================
        # ANALYTICS: Fire-and-forget — never blocks the search response
        # =====================================================================
        try:
            from app.services.search.analytics import log_search_query, detect_reformulation

            # Extract per-engine metrics from envelopes
            engine_latencies = {e.engine: e.latency_ms for e in envelopes}
            engine_candidates = {e.engine: len(e.results) for e in envelopes}
            engines_used = [e.engine for e in envelopes if e.is_healthy]

            query_id = await log_search_query(
                self.db,
                user_id=context.user_id,
                query=query,
                intent=context.intent if isinstance(context.intent, str) else str(context.intent),
                surface=context.surface,
                result_count=total_results,
                engines_used=engines_used,
                candidate_count_hybrid=engine_candidates.get("hybrid"),
                candidate_count_rag=engine_candidates.get("rag"),
                candidate_count_graph=engine_candidates.get("graph"),
                total_latency_ms=response_time_ms,
                hybrid_latency_ms=engine_latencies.get("hybrid"),
                rag_latency_ms=engine_latencies.get("rag"),
                graph_latency_ms=engine_latencies.get("graph"),
            )

            # Detect reformulations in the background (doesn't block response)
            if query_id:
                asyncio.create_task(
                    detect_reformulation(
                        self.db,
                        user_id=context.user_id,
                        current_query_id=query_id,
                    )
                )
        except Exception as e:
            # Analytics NEVER blocks search
            logger.warning("analytics_logging_failed", error=str(e)[:100])

        # =====================================================================
        # ZERO-RESULT RECOVERY: Auto-retry + Suggestions
        # Guardrails: max 1 retry, only if stopword stripping changes query
        # =====================================================================
        suggestions = None
        auto_retry_query = None

        if total_results == 0:
            try:
                from app.services.search.zero_result_handler import (
                    should_retry,
                    fetch_suggestions,
                )

                # Always fetch suggestions for zero-result queries
                suggestions = await fetch_suggestions(self.db, context.user_id, query, limit=5)

                # Try auto-retry with stopword stripping
                do_retry, retry_query = should_retry(query)
                if do_retry:
                    logger.info(
                        "zero_result_auto_retry",
                        original=query[:50],
                        retry=retry_query[:50],
                    )
                    auto_retry_query = retry_query

                    # Re-run with stripped query (same engines, same context)
                    retry_envelopes: List[EngineResult] = []
                    for engine in participating:
                        try:
                            result = await self._run_engine(engine, retry_query, context)
                            retry_envelopes.append(result)
                        except Exception:
                            pass

                    retry_total = sum(len(e.results) for e in retry_envelopes)
                    if retry_total > 0:
                        envelopes = retry_envelopes
                        total_results = retry_total
                        response_time_ms = int((time.perf_counter() - start) * 1000)

                    # Log retry in analytics
                    try:
                        from app.services.search.analytics import log_search_query

                        await log_search_query(
                            self.db,
                            user_id=context.user_id,
                            query=retry_query,
                            intent=context.intent
                            if isinstance(context.intent, str)
                            else str(context.intent),
                            surface=context.surface,
                            result_count=retry_total,
                            engines_used=[e.engine for e in retry_envelopes if e.is_healthy],
                            total_latency_ms=response_time_ms,
                            auto_retry=True,
                        )
                    except Exception:
                        pass  # Analytics never blocks

            except Exception as e:
                logger.warning("zero_result_recovery_failed", error=str(e)[:100])

        return UnifiedSearchResponse(
            query=query,
            context=context,
            engines=envelopes,
            total_results=total_results,
            response_time_ms=response_time_ms,
            suggestions=suggestions,
            auto_retry_query=auto_retry_query,
        )

    async def _run_engine(
        self,
        engine: str,
        query: str,
        context: SearchContext,
    ) -> EngineResult:
        """
        Run a single engine with budget enforcement.

        Args:
            engine: Engine identifier (hybrid, rag, graph)
            query: Search query
            context: Search context

        Returns:
            EngineResult envelope
        """
        start = time.perf_counter()
        timeout_s = context.max_latency_ms / 1000

        try:
            async with asyncio.timeout(timeout_s):
                if engine == "hybrid":
                    results = await self._run_hybrid(query, context)
                elif engine == "rag":
                    results = await self._run_rag(query, context)
                elif engine == "graph":
                    results = await self._run_graph(query, context)
                else:
                    raise ValueError(f"Unknown engine: {engine}")

                # Enforce contract
                validated = enforce_contract(results, engine, strict=False)

                # =============================================================
                # Phase 3B.1: Apply Adaptive Ranking Weights
                # =============================================================
                # Apply weights AFTER core scoring, BEFORE budget limiting.
                # This biases ordering without affecting relevance truth.
                weighted = await self._apply_ranking_weights(validated, context.surface)

                # Respect budget
                limited = weighted[: context.max_results_per_engine]

                latency_ms = int((time.perf_counter() - start) * 1000)

                return EngineResult(
                    engine=engine,
                    results=limited,
                    latency_ms=latency_ms,
                    status="ok",
                )

        except asyncio.TimeoutError:
            logger.warning("engine_timeout", engine=engine, timeout_ms=context.max_latency_ms)
            return EngineResult(
                engine=engine,
                results=[],
                latency_ms=context.max_latency_ms,
                status="timeout",
            )

        except Exception as e:
            logger.error("engine_error", engine=engine, error=str(e), exc_info=True)
            return EngineResult(
                engine=engine,
                results=[],
                latency_ms=int((time.perf_counter() - start) * 1000),
                status="error",
                error_message=str(e),
            )

    async def _apply_ranking_weights(
        self,
        results: List[UnifiedSearchResult],
        surface: str,
    ) -> List[UnifiedSearchResult]:
        """
        Apply Phase 3B.1 ranking weights to search results.

        Weights are applied post-scoring, pre-rerank. This biases ordering
        without affecting relevance truth.

        Respects feature flags:
        - ENABLE_ADAPTIVE_RANKING: master switch
        - ADAPTIVE_RANKING_SHADOW_MODE: log only, don't modify
        """
        from app.services.intelligence import get_ranking_adapter

        adapter = get_ranking_adapter()

        if not adapter.is_enabled():
            return results

        if not results:
            return results

        # Convert to dicts for adapter
        result_dicts = []
        for r in results:
            result_dicts.append(
                {
                    "id": str(r.id.id),
                    "entity_id": str(r.id.id),
                    "entity_type": r.id.type,
                    "score": r.confidence or 0.0,
                }
            )

        # Apply weights (may log in shadow mode)
        weighted_dicts = await adapter.apply_weights(
            results=result_dicts,
            surface=surface,
            entity_type="chunk",  # Most common for search
            session=self.db,
        )

        # If shadow mode, return original results unchanged
        if adapter.is_shadow_mode():
            return results

        # Map weighted scores back to results
        score_map = {d["id"]: d.get("score", d.get("_weight_applied", 1.0)) for d in weighted_dicts}

        # Update confidence with weighted scores
        for r in results:
            entity_id = str(r.id.id)
            if entity_id in score_map:
                # Store original confidence and apply weight
                original = r.confidence or 0.0
                weighted_score = score_map[entity_id]
                if weighted_score != original:
                    # Add signal indicating weight was applied
                    r.signals["_original_confidence"] = original
                    r.signals["_weight_applied"] = True
                    r.confidence = weighted_score

        # Re-sort by confidence (weighted)
        results.sort(key=lambda x: x.confidence or 0.0, reverse=True)

        return results

    async def _run_hybrid(
        self,
        query: str,
        context: SearchContext,
    ) -> List[UnifiedSearchResult]:
        """Execute hybrid search via V2 (SQL-level BM25 + Vector with RRF).

        Uses HybridSearchServiceV2 static methods instead of the old V1 singleton.
        All three entity types are searched: notes, flashcards, chat messages.
        """
        from app.services.search.hybrid_v2 import HybridSearchServiceV2

        results: List[UnifiedSearchResult] = []

        # Search notes via V2 (SQL-level RRF)
        note_results = await HybridSearchServiceV2.search_notes_typed(
            user_id=context.user_id,
            query=query,
            db=self.db,
            limit=context.max_results_per_engine,
        )
        results.extend(adapt_hybrid_note_results(note_results, context.user_id))

        # Search flashcards via V2 (SQL-level RRF)
        flashcard_results = await HybridSearchServiceV2.search_flashcards_typed(
            user_id=context.user_id,
            query=query,
            db=self.db,
            limit=context.max_results_per_engine,
        )
        results.extend(adapt_hybrid_flashcard_results(flashcard_results, context.user_id))

        # Search chat messages via V2 (search_conversations_v3)
        try:
            chat_results = await HybridSearchServiceV2.search_chat_messages(
                user_id=context.user_id,
                query=query,
                db=self.db,
                limit=context.max_results_per_engine,
            )
            results.extend(adapt_chat_message_results(chat_results, context.user_id))
        except Exception as e:
            # Chat search is optional - don't fail the whole search if it errors
            logger.warning("chat_search_failed", error=str(e)[:100])

        # Deterministic ranking guarantee: stable sort prevents ordering drift
        # Safe None handling: -(None or 0.0) is valid, -None would crash
        results.sort(
            key=lambda r: (
                -(r.confidence or 0.0),
                r.id.id,
            )
        )

        return results

    async def _run_rag(
        self,
        query: str,
        context: SearchContext,
    ) -> List[UnifiedSearchResult]:
        """Execute RAG retrieval (Qdrant vector search)."""
        # Use RAG pipeline query
        rag_result = await self.rag_pipeline.query(
            user_id=context.user_id,
            query=query,
            top_k=context.max_results_per_engine,
            source_type="documents",
        )

        # Extract chunks from RAG result
        chunks = rag_result.get("chunks", [])

        # RAG pipeline returns dicts, not NodeWithScore
        # Create lightweight adapter
        adapted = []
        now = datetime.utcnow()

        for chunk in chunks:
            source_id = chunk.get("metadata", {}).get("source_id")

            identity = SearchEntityIdentity(
                id=str(hash(chunk.get("text", "")[:50])),  # Generate ID from content
                type="chunk",
                authority=IdentityAuthority.SYSTEM_DERIVED,
                parent_id=source_id,
                root_id=source_id,
                store="qdrant",
            )

            adapted.append(
                UnifiedSearchResult(
                    id=identity,
                    role=SearchRole.EVIDENCE,
                    title=chunk.get("metadata", {}).get("title", "Document Chunk"),
                    snippet=chunk.get("text", "")[:300],
                    url=f"/documents/{source_id}" if source_id else None,
                    source="rag",
                    scores={
                        "vector": chunk.get("score", 0.0),
                    },
                    signals={
                        "chunk_index": chunk.get("metadata", {}).get("chunk_index", 0),
                    },
                    assertion_type=AssertionType.INFERENTIAL,
                    confidence=chunk.get("score", 0.0),
                    valid_at=now,
                )
            )

        return adapted

    async def _run_graph(
        self,
        query: str,
        context: SearchContext,
    ) -> List[UnifiedSearchResult]:
        """Execute Graph Intelligence Engine query."""
        from sqlalchemy import text

        # Query the GIE SQL function
        result = await self.db.execute(
            text("SELECT * FROM developer_schema.get_intelligence_summary(:user_id, :limit)"),
            {"user_id": context.user_id, "limit": context.max_results_per_engine},
        )
        rows = result.fetchall()

        # Transform to concept format
        concepts = []
        for row in rows:
            concepts.append(
                {
                    "concept_id": str(row.concept_id),
                    "concept_name": row.concept_name,
                    "mastery": float(row.mastery or 0),
                    "stability": float(row.stability or 0.5),
                    "volatility": float(row.volatility or 0.5),
                    "category": row.category,
                }
            )

        return adapt_gie_concepts(concepts, context.user_id)


# =============================================================================
# Singleton Access
# =============================================================================

_unified_service: Optional[UnifiedSearchService] = None


async def get_unified_search_service(db: AsyncSession) -> UnifiedSearchService:
    """Get or create the unified search service."""
    # Note: We create a new instance per request because it needs the db session
    return UnifiedSearchService(db)
