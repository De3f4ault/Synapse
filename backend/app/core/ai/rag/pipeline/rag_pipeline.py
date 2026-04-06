"""Main RAG pipeline orchestrator."""

from typing import Dict, List, Optional, Any
import structlog
from qdrant_client.http import models

from app.core.ai.rag.config.rag_config import RAGConfig
from app.core.ai.embeddings.boundary import get_embedder
from app.core.ai.rag.chunking.strategies.advanced_semantic_chunker import get_semantic_chunker
from app.core.ai.rag.vector_store.qdrant.client import QdrantClientWrapper
from app.core.ai.rag.vector_store.qdrant.collection_manager import CollectionManager
from app.core.ai.rag.vector_store.operations.upsert import VectorUpsert
from app.core.ai.rag.retrieval.retrievers.llamaindex_vector_retriever import QdrantVectorRetriever
from app.core.ai.rag.reranking.llamaindex_reranker import CrossEncoderNodeReranker
from app.core.ai.rag.synapse_integration.learning_aware_reranker import LearningAwareReranker
from app.core.ai.rag.query_enhancement.query_analyzer import QueryAnalyzer
from app.core.ai.rag.query_enhancement.weak_area_expander import WeakAreaQueryExpander
from app.core.ai.rag.query_enhancement.llm_expander import get_llm_expander, EnhancementStrategy
from app.core.ai.rag.synapse_integration.real_context_engine import get_context_integration

logger = structlog.get_logger(__name__)


class RAGPipeline:
    """
    Main RAG pipeline orchestrator.

    Phase 0: Ingestion + Basic Retrieval
    Phase 1+: Will add reranking + hybrid retrieval

    Handles:
    - Document ingestion (chunking + embedding + indexing)
    - Query processing (retrieval only in Phase 0)
    """

    def __init__(
        self,
        config: Optional[RAGConfig] = None,
        embedding_manager=None,
        qdrant_client: Optional[QdrantClientWrapper] = None,
        collection_manager: Optional[CollectionManager] = None,
        enable_reranking: Optional[bool] = None,
        enable_learning_aware: Optional[bool] = None,
        enable_query_enhancement: Optional[bool] = None,
        enable_llm_enhancement: Optional[bool] = None,  # Phase 3
        enable_advanced_chunking: Optional[bool] = None,  # Phase 3
        enable_feedback_loops: Optional[bool] = None,  # Phase 3
        llm_provider: str = "openai",  # Phase 3: openai or anthropic
        llm_enhancement_strategy: str = "rewrite",  # Phase 3: rewrite, hyde, multi_query
    ):
        """
        Initialize RAG pipeline.

        Args:
            config: RAG configuration
            embedding_manager: Embedding manager
            qdrant_client: Qdrant client
            collection_manager: Collection manager
        """
        # Load config
        if config is None:
            from app.core.ai.rag.config.rag_config import get_rag_config

            config = get_rag_config()
        self.config = config

        # Initialize components
        # Initialize embedding manager
        if embedding_manager is None:
            self.embedder = get_embedder()
        else:
            self.embedder = embedding_manager

        if qdrant_client is None:
            from app.core.ai.rag.vector_store.qdrant.client import get_qdrant_client

            qdrant_client = get_qdrant_client()
        self.qdrant_client = qdrant_client

        if collection_manager is None:
            collection_manager = CollectionManager(client=qdrant_client.get_client())
        self.collection_manager = collection_manager

        # Initialize chunker (always advanced semantic — old SemanticChunker was removed)
        self.enable_advanced_chunking = True
        self.chunker = get_semantic_chunker(
            max_chunk_size=config.chunk_size, enable_safeguard=True
        )
        logger.info("advanced_semantic_chunker_enabled", max_size=config.chunk_size)

        # Initialize upserter
        self.upserter = VectorUpsert(qdrant_client.get_client())

        # Initialize retriever
        self.retriever = QdrantVectorRetriever(
            qdrant_client=qdrant_client,
            collection_manager=collection_manager,
            top_k=config.retrieval_top_k,
        )

        # Initialize reranker (Phase 1)
        self.enable_reranking = (
            enable_reranking if enable_reranking is not None else config.enable_cross_encoder
        )
        self.reranker = None
        if self.enable_reranking:
            self.reranker = CrossEncoderNodeReranker(top_k=config.reranking_top_k)
            logger.info("reranker_enabled", top_k=config.reranking_top_k)

        # Initialize learning-aware reranker (Phase 2)
        self.enable_learning_aware = (
            enable_learning_aware if enable_learning_aware is not None else False
        )
        self.learning_reranker = None
        if self.enable_learning_aware:
            self.learning_reranker = LearningAwareReranker(top_k=config.reranking_top_k)
            logger.info("learning_aware_reranker_enabled", top_k=config.reranking_top_k)

        # Initialize query enhancement (Phase 2)
        self.enable_query_enhancement = (
            enable_query_enhancement if enable_query_enhancement is not None else False
        )
        if self.enable_query_enhancement:
            self.query_analyzer = QueryAnalyzer()
            self.query_expander = WeakAreaQueryExpander()
            logger.info("query_enhancement_enabled")

        # Initialize LLM query enhancement (Phase 3)
        self.enable_llm_enhancement = (
            enable_llm_enhancement if enable_llm_enhancement is not None else False
        )
        self.llm_enhancement_strategy = llm_enhancement_strategy
        self.llm_expander = None
        if self.enable_llm_enhancement:
            try:
                self.llm_expander = get_llm_expander(llm_provider=llm_provider, enable_caching=True)
                logger.info(
                    "llm_query_enhancement_enabled",
                    provider=llm_provider,
                    strategy=llm_enhancement_strategy,
                )
            except Exception as e:
                logger.error("llm_enhancement_initialization_failed", error=str(e))
                self.enable_llm_enhancement = False

        # Initialize feedback loops (Phase 3)
        self.enable_feedback_loops = (
            enable_feedback_loops if enable_feedback_loops is not None else False
        )
        self.context_integration = None
        if self.enable_feedback_loops:
            self.context_integration = get_context_integration()  # Uses real ContextEngine now
            logger.info("feedback_loops_enabled")

        logger.info("rag_pipeline_initialized")

    async def ingest_document(
        self,
        user_id: int,
        document_text: str,
        document_id: str,
        document_title: str,
        source_type: str = "documents",
    ) -> Dict:
        """
        Ingest document into RAG system.

        Flow:
        1. Chunk document (semantic boundaries)
        2. Generate embeddings (batch)
        3. Store in Qdrant

        Args:
            user_id: User ID
            document_text: Document text content
            document_id: Unique document identifier
            document_title: Document title
            source_type: Source type (documents, notes, code)

        Returns:
            Ingestion summary
        """
        logger.info(
            "ingestion_start",
            user_id=user_id,
            document_id=document_id,
            text_length=len(document_text),
        )

        # 1. Chunk (Phase 3: Advanced Semantic or Simple)
        if self.enable_advanced_chunking:
            chunks = self.chunker.chunk_text(document_text, metadata={"source": source_type})
        else:
            chunks = self.chunker.chunk(document_text)
        logger.debug(
            "chunking_complete",
            chunk_count=len(chunks),
            method="advanced" if self.enable_advanced_chunking else "simple",
        )

        if not chunks:
            logger.warning("no_chunks_generated", document_id=document_id)
            return {
                "document_id": document_id,
                "chunks": 0,
                "status": "failed",
                "error": "No chunks generated",
            }

        # 2. Contextual Retrieval + Embedding
        # Prepend document context to each chunk for the EMBEDDER only.
        # This helps the embedder disambiguate chunks from different sources
        # about the same topic. Original text is stored in payload for display
        # and cross-encoder scoring.
        chunk_texts = [chunk["text"] for chunk in chunks]
        contextual_texts = [
            f"[Source: {document_title}]\n\n{text}" for text in chunk_texts
        ]

        # Dense embeddings (on contextual text for better disambiguation)
        embeddings = self.embedder.encode(contextual_texts, normalize=True).tolist()
        logger.debug("embedding_complete", embeddings=len(embeddings))

        # Sparse BM25 embeddings (on ORIGINAL text — title would inflate term freqs)
        from app.core.ai.rag.embeddings.sparse_embedder import get_sparse_embedder
        sparse_embedder = get_sparse_embedder()
        sparse_vectors = sparse_embedder.encode(chunk_texts)
        logger.debug("sparse_embedding_complete", vectors=len(sparse_vectors))

        # Prepare payloads with metadata (Phase 2)
        payloads = []
        for idx, chunk in enumerate(chunks):
            chunk_text = chunk["text"]

            payloads.append(
                {
                    "text": chunk_text,  # Original text (for cross-encoder & display)
                    "source_id": document_id,
                    "source_type": source_type,
                    "title": document_title,
                    "chunk_index": idx,
                    "user_id": user_id,
                    "sentence_count": chunk.get("sentence_count", 0),
                    "char_count": chunk.get("char_count", len(chunk_text)),
                }
            )

        # 4. Ensure collection exists
        collection_name = self.collection_manager.create_user_collection(user_id, source_type)

        # 5. Upsert to Qdrant (hybrid: named dense + bm25 vectors)
        # Generate UUIDs using UUID5 (deterministic from document_id and chunk_index)
        import uuid

        namespace = uuid.UUID(
            "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
        )  # DNS namespace for consistency
        ids = [
            str(uuid.uuid5(namespace, f"{user_id}_{document_id}_{idx}"))
            for idx in range(len(chunks))
        ]

        count = await self.upserter.upsert_hybrid_batch(
            collection_name=collection_name,
            dense_vectors=embeddings,
            sparse_vectors=sparse_vectors,
            payloads=payloads,
            ids=ids,
        )

        # 6. Invalidate query cache for this user
        # New content should appear immediately in search results.
        if self.config.enable_caching:
            try:
                from app.core.ai.rag.caching import get_rag_cache
                cache = get_rag_cache()
                user_keys = await cache._get_cache().keys(f"rag:query:{user_id}:*")
                if user_keys:
                    await cache._get_cache().delete(*user_keys)
                    logger.info("query_cache_invalidated", user_id=user_id, keys_cleared=len(user_keys))
            except Exception as e:
                logger.warning("cache_invalidation_failed", error=str(e))

        logger.info(
            "ingestion_complete",
            user_id=user_id,
            document_id=document_id,
            chunks=count,
            collection=collection_name,
        )

        return {
            "document_id": document_id,
            "chunks": count,
            "collection": collection_name,
            "status": "indexed",
        }

    async def query(
        self,
        user_id: int,
        query: str,
        top_k: Optional[int] = None,
        source_type: str = "documents",
        filters: Optional[Dict[str, Any]] = None,
        max_chunks_per_source: int = 3,
    ) -> Dict:
        """
        Query RAG system.

        Args:
            user_id: User ID
            query: Search query
            top_k: Number of results (uses config default if None)
            source_type: Source type to search
            filters: Optional filters (e.g. {"source_id": "34"} for document-specific queries)
            max_chunks_per_source: Max chunks per source document for diversity (0 = no limit)

        Returns:
            Query results with chunks and confidence metadata
        """
        if top_k is None:
            top_k = self.config.reranking_top_k  # Final result count

        logger.info("query_start", user_id=user_id, query=query[:50])

        # === CACHE CHECK ===
        # Check PostgreSQL-backed cache before running the full pipeline.
        # Cache key is user-scoped: different users have different collections.
        if self.config.enable_caching:
            try:
                from app.core.ai.rag.caching import get_rag_cache
                cache = get_rag_cache()
                cache_key = f"{user_id}:{source_type}:{query}"
                cached = await cache.get_query_result(cache_key)
                if cached:
                    logger.info("query_cache_hit", user_id=user_id, query=query[:50])
                    return cached
            except Exception as e:
                logger.warning("cache_check_failed", error=str(e))

        # === PRE-FETCH USER CONTEXT (async, done once) ===
        # This fixes the async context bug: we fetch here (in async context)
        # and pass the data down, instead of each component trying to fetch independently.
        original_query = query
        query_type = None  # Set by QueryAnalyzer if enhancement enabled
        user_context = None

        if self.enable_learning_aware or self.enable_query_enhancement:
            try:
                if self.context_integration:
                    user_context = await self.context_integration.get_user_context(user_id)
                elif self.enable_feedback_loops is False:
                    # Try to get context directly from bridge if feedback loops disabled
                    from app.core.ai.rag.synapse_integration.context_bridge import SynapseContextBridge
                    bridge = SynapseContextBridge()
                    user_context = await bridge.get_user_context(user_id)
            except Exception as e:
                logger.warning("user_context_fetch_failed", error=str(e), user_id=user_id)

        if self.enable_query_enhancement:
            # Analyze query
            analysis = self.query_analyzer.analyze(query)
            query_type = analysis["type"]  # Used for adaptive hybrid search
            logger.debug("query_analyzed", type=query_type, intent=analysis["intent"])

            # === Wire analyzer suggestions into retrieval ===
            suggestions = analysis.get("suggestions", {})

            # Adaptive retrieve_k: factual=20, conceptual=50, clarify=30
            suggested_k = suggestions.get("retrieval_top_k")
            if suggested_k and suggested_k != self.retriever.top_k:
                original_k = self.retriever.top_k
                self.retriever.top_k = min(suggested_k, 50)
                logger.debug(
                    "adaptive_retrieve_k",
                    query_type=analysis["type"],
                    original_k=original_k,
                    suggested_k=self.retriever.top_k,
                )

            # Expand with weak areas — pass pre-fetched context
            query = self.query_expander.expand_query(query, user_id, context=user_context)
            logger.debug(
                "query_expanded", original_len=len(original_query), expanded_len=len(query)
            )

        # Phase 3: LLM query enhancement (adaptive — skip for factual queries)
        if self.enable_llm_enhancement and self.llm_expander:
            # Adaptive gating: factual queries ("where does X...", "when was Y...")
            # don't benefit from LLM rewriting — keywords already match well.
            # Only rewrite conceptual, comparative, and procedural queries.
            skip_llm = query_type == "factual"

            if skip_llm:
                logger.debug(
                    "llm_enhancement_skipped",
                    reason="factual_query",
                    query_type=query_type,
                    saved_latency_ms="2000-4000",
                )
            else:
                try:
                    # Adaptive strategy selection based on query type:
                    # - conceptual → HyDE (bridges question→answer semantic gap)
                    # - comparative → multi_query (needs multiple angles)
                    # - procedural/example → rewrite (paraphrase is sufficient)
                    strategy_by_type = {
                        "conceptual": EnhancementStrategy.HYDE,
                        "comparative": EnhancementStrategy.MULTI_QUERY,
                        "procedural": EnhancementStrategy.REWRITE,
                        "example": EnhancementStrategy.REWRITE,
                    }
                    strategy = strategy_by_type.get(
                        query_type, EnhancementStrategy.REWRITE
                    )

                    logger.debug(
                        "llm_strategy_selected",
                        query_type=query_type,
                        strategy=strategy.value,
                    )

                    # Enhance query with LLM (user_context already fetched above)
                    enhanced = await self.llm_expander.enhance_query(
                        query=query, strategy=strategy, user_context=user_context
                    )

                    # Handle multi-query (list of queries)
                    if isinstance(enhanced, list):
                        query = enhanced[0]  # Use first for now, could retrieve with all
                        logger.debug("llm_multi_query_generated", queries=len(enhanced))
                    else:
                        query = enhanced

                    logger.debug(
                        "llm_enhancement_applied",
                        strategy=strategy.value,
                        original_len=len(original_query),
                        enhanced_len=len(query),
                    )
                except Exception as e:
                    logger.error("llm_enhancement_failed", error=str(e), fallback="original_query")
                    # Continue with original/expanded query

        # Create query bundles
        from llama_index.core.schema import QueryBundle

        # Set retrieval context on the retriever directly
        # (QueryBundle.custom_embedding_strs is List[str], not a dict)
        self.retriever._query_context = {
            "user_id": str(user_id),
            "source_type": source_type,
            "query_type": query_type,
        }

        # Retrieval uses the enhanced query (better recall via LLM rewriting)
        retrieval_bundle = QueryBundle(query_str=query)

        # Reranking uses the ORIGINAL user query — ms-marco cross-encoders are
        # trained on short, natural queries. Feeding them long LLM paraphrases
        # produces out-of-distribution negative scores.
        rerank_bundle = QueryBundle(query_str=original_query)

        # Retrieve (uses enhanced query)
        nodes = self.retriever.retrieve(retrieval_bundle)

        # Rerank if enabled (Phase 1) — uses ORIGINAL query
        if self.enable_reranking and self.reranker and nodes:
            logger.debug("applying_reranking", candidates=len(nodes))
            nodes = self.reranker.postprocess_nodes(nodes, rerank_bundle)
            logger.debug("reranking_applied", results=len(nodes))

        # Learning-aware reranking (Phase 2) — pass pre-fetched context
        if self.enable_learning_aware and self.learning_reranker and nodes:
            logger.debug("applying_learning_aware_reranking", candidates=len(nodes))
            # Inject pre-fetched context to avoid the async-in-sync problem
            if user_context:
                self.learning_reranker.set_prefetched_context(int(user_id) if isinstance(user_id, str) else user_id, user_context)
            nodes = self.learning_reranker.postprocess_nodes(nodes, rerank_bundle)
            logger.debug("learning_reranking_applied", results=len(nodes))

        # === SOURCE-LEVEL DEDUPLICATION ===
        # Prevents one source document from dominating all result slots
        if max_chunks_per_source > 0:
            deduped_nodes = []
            source_counts: Dict[str, int] = {}
            for node in nodes:
                source_id = node.node.metadata.get("source_id", "unknown")
                count = source_counts.get(source_id, 0)
                if count < max_chunks_per_source:
                    deduped_nodes.append(node)
                    source_counts[source_id] = count + 1
            if len(deduped_nodes) < len(nodes):
                logger.debug(
                    "source_dedup_applied",
                    before=len(nodes),
                    after=len(deduped_nodes),
                    max_per_source=max_chunks_per_source,
                )
            nodes = deduped_nodes

        # Format results
        chunks = [
            {"text": node.node.get_content(), "score": node.score, "metadata": node.node.metadata}
            for node in nodes[:top_k]
        ]

        # === CONFIDENCE METADATA ===
        top_score = chunks[0]["score"] if chunks else 0.0
        confidence = "high" if top_score > 5.0 else "medium" if top_score > 2.0 else "low" if top_score > 0 else "none"

        logger.info(
            "query_complete",
            user_id=user_id,
            results=len(chunks),
            top_score=round(top_score, 4),
            confidence=confidence,
            reranked=self.enable_reranking,
            learning_aware=self.enable_learning_aware,
            query_enhanced=self.enable_query_enhancement,
            llm_enhanced=self.enable_llm_enhancement,
        )

        result = {
            "query": query,
            "original_query": original_query,
            "chunks": chunks,
            "count": len(chunks),
            "top_score": top_score,
            "confidence": confidence,
            "reranked": self.enable_reranking,
            "learning_aware": self.enable_learning_aware,
            "query_enhanced": self.enable_query_enhancement,
            "llm_enhanced": self.enable_llm_enhancement,
        }

        # === CACHE STORE ===
        # Store result in PostgreSQL cache for repeat queries.
        # TTL: 30 min (default in PgRagCacheManager).
        if self.config.enable_caching:
            try:
                from app.core.ai.rag.caching import get_rag_cache
                cache = get_rag_cache()
                cache_key = f"{user_id}:{source_type}:{original_query}"
                await cache.set_query_result(cache_key, result)
                logger.debug("query_cached", cache_key=cache_key[:60])
            except Exception as e:
                logger.warning("cache_store_failed", error=str(e))

        return result

    async def process_feedback(
        self,
        user_id: int,
        query: str,
        results: List[Dict],
        clicked_indices: List[int],
        time_spent_ms: float,
        helpful_rating: Optional[int] = None,
    ):
        """
        Process user feedback from RAG interaction.

        Phase 3: Feedback loops to update mastery.

        Args:
            user_id: User ID
            query: Original query
            results: Retrieved results
            clicked_indices: Indices of clicked results
            time_spent_ms: Time spent (milliseconds)
            helpful_rating: Optional 1-5 rating
        """
        if not self.enable_feedback_loops or not self.context_integration:
            logger.debug("feedback_loops_disabled", skipping=True)
            return

        logger.info(
            "processing_feedback",
            user_id=user_id,
            clicks=len(clicked_indices),
            time_ms=time_spent_ms,
        )

        try:
            await self.context_integration.process_rag_interaction(
                user_id=user_id,
                query=query,
                results=results,
                clicked_indices=clicked_indices,
                time_spent_ms=time_spent_ms,
                helpful_rating=helpful_rating,
            )
            logger.debug("feedback_processed_successfully")
        except Exception as e:
            logger.error("feedback_processing_failed", error=str(e))
