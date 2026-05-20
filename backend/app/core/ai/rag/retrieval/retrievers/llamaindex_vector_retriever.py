"""LlamaIndex Qdrant vector retriever with hybrid search support."""

from typing import List, Optional
from llama_index.core.retrievers import BaseRetriever
from llama_index.core.schema import NodeWithScore, QueryBundle, TextNode
import structlog

from app.core.ai.rag.vector_store.qdrant.client import QdrantClientWrapper
from app.core.ai.rag.vector_store.qdrant.collection_manager import CollectionManager
from app.core.ai.rag.vector_store.operations.search import VectorSearch
from app.core.ai.embeddings.boundary import get_embedder, get_llama_embedder
from app.core.ai.rag.config.rag_config import get_rag_config

logger = structlog.get_logger(__name__)


class QdrantVectorRetriever(BaseRetriever):
    """
    Custom LlamaIndex retriever backed by Qdrant.

    Supports two modes:
    - Dense-only: cosine similarity search (v2 collections)
    - Hybrid: dense + sparse BM25 with server-side RRF fusion (v3 collections)

    Mode is controlled by RAGConfig.use_hybrid and .hybrid_adaptive.
    """

    def __init__(
        self,
        qdrant_client: QdrantClientWrapper,
        collection_manager: CollectionManager,
        top_k: int = get_rag_config().retrieval_top_k,  # default from config, not a magic number
        **kwargs,
    ):
        """
        Initialize Qdrant retriever.

        Args:
            qdrant_client: Qdrant client wrapper
            collection_manager: Collection manager
            top_k: Number of results to retrieve
            **kwargs: Additional BaseRetriever arguments
        """
        super().__init__(**kwargs)

        # Configure LlamaIndex to use boundary's shared embedding adapter
        from llama_index.core import Settings

        Settings.embed_model = get_llama_embedder()

        self.qdrant_client = qdrant_client.get_client()
        self.collection_manager = collection_manager
        self.searcher = VectorSearch(self.qdrant_client)
        self.top_k = top_k
        self._config = get_rag_config()

        # Lazy-loaded sparse embedder (only initialized if hybrid is used)
        self._sparse_embedder = None

        # ColBERT availability — checked once at init, cached for lifetime of retriever.
        # Never checked per-query to avoid per-request Qdrant metadata calls.
        self._colbert_ready: Optional[bool] = None

        # Query context set by pipeline before each retrieve() call
        self._query_context = {}

    def _get_sparse_embedder(self):
        """Lazy-load sparse embedder on first hybrid search."""
        if self._sparse_embedder is None:
            from app.core.ai.rag.embeddings.sparse_embedder import get_sparse_embedder
            self._sparse_embedder = get_sparse_embedder(self._config.sparse_model)
        return self._sparse_embedder

    def _should_use_hybrid(self, query_type: Optional[str] = None) -> bool:
        """Determine whether to use hybrid search for this query.

        Logic:
        1. use_hybrid=False → always dense-only (master switch)
        2. hybrid_adaptive=False → always hybrid (default)
        3. hybrid_adaptive=True → hybrid only for query types in hybrid_query_types
        """
        if not self._config.use_hybrid:
            return False
        if not self._config.hybrid_adaptive:
            return True
        if query_type is None:
            return True  # Default to hybrid when type is unknown
        return query_type in self._config.hybrid_query_types

    # ── LlamaIndex interface ────────────────────────────────────

    def _retrieve(self, query_bundle: QueryBundle) -> List[NodeWithScore]:
        """Sync fallback for LlamaIndex's BaseRetriever contract.

        The primary call path is aretrieve() via rag_pipeline.query() (async).
        This fallback exists for any LlamaIndex-internal sync callers.

        Uses run_coroutine_threadsafe when a loop is already running (FastAPI/uvicorn),
        which is the correct pattern — unlike asyncio.run() which crashes inside a
        running event loop.
        """
        import asyncio

        try:
            loop = asyncio.get_running_loop()
            # Submit to the RUNNING loop from the current thread and block for result.
            future = asyncio.run_coroutine_threadsafe(
                self._aretrieve(query_bundle), loop
            )
            return future.result(timeout=30)
        except RuntimeError:
            # No running loop — safe to call asyncio.run() directly.
            return asyncio.run(self._aretrieve(query_bundle))

    async def _aretrieve(self, query_bundle: QueryBundle) -> List[NodeWithScore]:
        """Async retrieve — dispatches to hybrid or dense-only path."""
        # ── Maintenance gate ─────────────────────────────────────────────────────
        # Set SYNAPSE_RAG_MAINTENANCE=true in .env during reindexing.
        # Returns immediately so the context engine can surface a clean message
        # instead of attempting to query a partially-built or empty collection.
        if self._config.rag_maintenance:
            logger.warning(
                "rag_maintenance_mode_active",
                msg="RAG is temporarily unavailable during reindexing.",
            )
            raise RuntimeError(
                "RAG is temporarily unavailable while the knowledge base is being rebuilt. "
                "Please try again shortly."
            )

        query = query_bundle.query_str

        # Read metadata from _query_context (set by pipeline before each call)
        ctx = getattr(self, "_query_context", {})
        user_id = ctx.get("user_id")
        source_type = ctx.get("source_type", "documents")
        query_type = ctx.get("query_type")

        if not user_id:
            logger.error("user_id_missing_in_query_context")
            return []

        # === SHARED COLLECTION: synapse_dense ===
        # Sprint 2 migration complete — all text + image vectors are in synapse_dense.
        # Tenant isolation is enforced via user_id payload filter (KEYWORD index, set in Sprint 1).
        # Old per-user collection name: self.collection_manager._get_collection_name(int(user_id), source_type)
        collection_name = "synapse_dense"

        # Ensure synapse_dense exists (idempotent — safe to call every time)
        if not self.collection_manager.collection_exists(collection_name):
            logger.warning("synapse_dense_missing_recreating", collection=collection_name)
            try:
                self.collection_manager.create_shared_collection()
            except Exception as create_err:
                logger.error("synapse_dense_creation_failed", error=str(create_err))
                return []

        # Store user_id filter on context so search methods can apply it
        ctx["user_id_filter"] = str(user_id)

        # Compute dense embedding with query prefix (Nomic uses "search_query:")
        embedder = get_embedder()
        if hasattr(embedder, 'encode_query'):
            dense_vector = embedder.encode_query(query).tolist()
        else:
            embedding = embedder.encode(query)
            dense_vector = embedding[0].tolist() if embedding.ndim > 1 else embedding.tolist()

        # Decide search mode — priority: ColBERT > hybrid > dense
        use_colbert = self._config.colbert_enable and self._is_colbert_ready()
        use_hybrid = self._should_use_hybrid(query_type)

        # Build the user_id payload filter for multi-tenant isolation in synapse_dense.
        # This is a KEYWORD index match — fast pre-filter before ANN.
        user_id_filter = ctx.get("user_id_filter", str(user_id))
        _tenant_filter = {"user_id": user_id_filter}

        if use_colbert:
            results = await self._colbert_retrieve(
                collection_name, query, dense_vector, filters=_tenant_filter
            )
        elif use_hybrid:
            results = await self._hybrid_retrieve(
                collection_name, query, dense_vector, filters=_tenant_filter
            )
        else:
            results = await self._dense_retrieve(
                collection_name, dense_vector, filters=_tenant_filter
            )

        # Convert Qdrant ScoredPoints → LlamaIndex NodeWithScore
        mode = "colbert" if use_colbert else ("hybrid" if use_hybrid else "dense")
        return self._to_nodes(results, mode=mode)

    # ── Search dispatch ─────────────────────────────────────────

    def _is_colbert_ready(self) -> bool:
        """Check whether synapse_dense has a 'colbert' vector schema AND populated data.

        ColBERT vectors now live inside synapse_dense alongside dense+bm25.
        Ready condition: the 'colbert' named vector exists in the schema AND
        at least one point has been backfilled (points_count > 0 is a proxy —
        the real check is that the colbert slot is populated for at least some points,
        but Qdrant doesn't expose per-vector fill counts without a scroll).

        Only caches True — False is never stored permanently so the check auto-detects
        when the backfill finishes without requiring an API restart.
        """
        if not self._colbert_ready:
            try:
                from app.core.ai.rag.vector_store.qdrant.collection_manager import SHARED_DENSE_COLLECTION
                info = self.collection_manager.client.get_collection(SHARED_DENSE_COLLECTION)
                vectors = info.config.params.vectors or {}
                if "colbert" in vectors and info.points_count and info.points_count > 0:
                    self._colbert_ready = True   # cache only on confirmed-ready
                # Otherwise: leave False → recheck next call
            except Exception:
                pass   # collection doesn't exist yet — don't cache False
        return bool(self._colbert_ready)

    async def _colbert_retrieve(
        self,
        collection_name: str,
        query: str,
        dense_vector: List[float],
        filters: Optional[dict] = None,
    ) -> list:
        """3-stage ColBERT retrieval: Dense+BM25 prefetch → RRF → MaxSim rerank."""
        from app.core.ai.rag.embeddings.models.colbert_embedder import get_colbert_embedder

        sparse_embedder = self._get_sparse_embedder()
        sparse_vector = sparse_embedder.encode_query(query)

        colbert_embedder = get_colbert_embedder()
        query_colbert_matrix = colbert_embedder.encode_query(query)

        cfg = self._config
        logger.info(
            "colbert_retrieval_start",
            query=query[:50],
            top_k=self.top_k,
            candidate_limit=cfg.colbert_candidate_limit,
        )

        return await self.searcher.hybrid_colbert_search(
            collection_name=collection_name,
            dense_vector=dense_vector,
            sparse_vector=sparse_vector,
            query_colbert_matrix=query_colbert_matrix,
            # colbert_collection removed — colbert lives in synapse_dense (unified)
            limit=self.top_k,
            candidate_limit=cfg.colbert_candidate_limit,
            prefetch_limit=cfg.colbert_prefetch_limit,
            filters=filters,
        )

    async def _hybrid_retrieve(
        self,
        collection_name: str,
        query: str,
        dense_vector: List[float],
        filters: Optional[dict] = None,
    ) -> list:
        """Hybrid search: dense + sparse BM25, server-side RRF fusion."""
        sparse_embedder = self._get_sparse_embedder()
        sparse_vector = sparse_embedder.encode_query(query)

        logger.info(
            "hybrid_retrieval_start",
            query=query[:50],
            top_k=self.top_k,
            collection=collection_name,
        )

        return await self.searcher.hybrid_search(
            collection_name=collection_name,
            dense_vector=dense_vector,
            sparse_vector=sparse_vector,
            limit=self.top_k,
            prefetch_limit=self._config.hybrid_prefetch_limit,
            filters=filters,
        )

    async def _dense_retrieve(
        self,
        collection_name: str,
        dense_vector: List[float],
        filters: Optional[dict] = None,
    ) -> list:
        """Dense-only search using the named 'dense' vector."""
        logger.info("dense_retrieval_start", top_k=self.top_k, collection=collection_name)
        return await self.searcher.dense_search_named(
            collection_name=collection_name,
            query_vector=dense_vector,
            limit=self.top_k,
            filters=filters,
        )

    # ── Conversion ──────────────────────────────────────────────

    def _to_nodes(self, results: list, mode: str = "dense") -> List[NodeWithScore]:
        """Convert Qdrant ScoredPoints to LlamaIndex NodeWithScore."""
        nodes_with_scores = []
        for result in results:
            node = TextNode(
                text=result.payload.get("text", ""),
                metadata={
                    "source_id": result.payload.get("source_id"),
                    "source_type": result.payload.get("source_type"),
                    "title": result.payload.get("title", "Untitled"),
                    "chunk_index": result.payload.get("chunk_index", 0),
                    "user_id": result.payload.get("user_id"),
                    "retrieval_mode": mode,
                    # pg_chunk_id: Postgres DocumentChunk.id — used by rag_pipeline.py
                    # parent-child swap to widen 512-token child → 2048-token parent.
                    "pg_chunk_id": result.payload.get("pg_chunk_id"),
                    # content_type + storage_path: image routing in grounding middleware.
                    "content_type": result.payload.get("content_type", "text"),
                    "storage_path": result.payload.get("storage_path"),
                },
                id_=str(result.id),
            )
            nodes_with_scores.append(NodeWithScore(node=node, score=result.score))

        logger.info(
            "retrieval_complete",
            results=len(nodes_with_scores),
            mode=mode,
            top_score=nodes_with_scores[0].score if nodes_with_scores else 0,
        )

        return nodes_with_scores

