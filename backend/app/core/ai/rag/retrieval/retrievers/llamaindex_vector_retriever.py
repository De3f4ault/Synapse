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
        top_k: int = 20,
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
        """Synchronous fallback for LlamaIndex's BaseRetriever contract."""
        import asyncio
        from concurrent.futures import ThreadPoolExecutor

        try:
            asyncio.get_running_loop()
            with ThreadPoolExecutor(max_workers=1) as pool:
                return pool.submit(asyncio.run, self._aretrieve(query_bundle)).result()
        except RuntimeError:
            return asyncio.run(self._aretrieve(query_bundle))

    async def _aretrieve(self, query_bundle: QueryBundle) -> List[NodeWithScore]:
        """Async retrieve — dispatches to hybrid or dense-only path."""
        query = query_bundle.query_str

        # Read metadata from _query_context (set by pipeline before each call)
        ctx = getattr(self, "_query_context", {})
        user_id = ctx.get("user_id")
        source_type = ctx.get("source_type", "documents")
        query_type = ctx.get("query_type")

        if not user_id:
            logger.error("user_id_missing_in_query_context")
            return []

        # Resolve collection
        collection_name = self.collection_manager._get_collection_name(int(user_id), source_type)
        if not self.collection_manager.collection_exists(collection_name):
            logger.warning("collection_not_found", collection=collection_name, user_id=user_id)
            return []

        # Compute dense embedding with query prefix (Nomic uses "search_query:")
        embedder = get_embedder()
        if hasattr(embedder, 'encode_query'):
            dense_vector = embedder.encode_query(query).tolist()
        else:
            embedding = embedder.encode(query)
            dense_vector = embedding[0].tolist() if embedding.ndim > 1 else embedding.tolist()

        # Decide search mode
        use_hybrid = self._should_use_hybrid(query_type)

        if use_hybrid:
            results = await self._hybrid_retrieve(
                collection_name, query, dense_vector
            )
        else:
            results = await self._dense_retrieve(
                collection_name, dense_vector
            )

        # Convert Qdrant ScoredPoints → LlamaIndex NodeWithScore
        return self._to_nodes(results, use_hybrid)

    # ── Search dispatch ─────────────────────────────────────────

    async def _hybrid_retrieve(
        self,
        collection_name: str,
        query: str,
        dense_vector: List[float],
    ) -> list:
        """Hybrid search: dense + sparse BM25, server-side RRF fusion."""
        sparse_embedder = self._get_sparse_embedder()
        sparse_vector = sparse_embedder.encode_query(query)

        logger.info(
            "hybrid_retrieval_start",
            query=query[:50],
            top_k=self.top_k,
        )

        return await self.searcher.hybrid_search(
            collection_name=collection_name,
            dense_vector=dense_vector,
            sparse_vector=sparse_vector,
            limit=self.top_k,
        )

    async def _dense_retrieve(
        self,
        collection_name: str,
        dense_vector: List[float],
    ) -> list:
        """Dense-only search (fallback / v2 collections)."""
        logger.info(
            "dense_retrieval_start",
            top_k=self.top_k,
        )

        # Try named-vector search first (v3), fall back to unnamed (v2)
        try:
            return await self.searcher.dense_search_named(
                collection_name=collection_name,
                query_vector=dense_vector,
                limit=self.top_k,
            )
        except Exception:
            # v2 collection with unnamed vector
            return await self.searcher.search(
                collection_name=collection_name,
                query_vector=dense_vector,
                limit=self.top_k,
            )

    # ── Conversion ──────────────────────────────────────────────

    def _to_nodes(self, results: list, hybrid: bool = False) -> List[NodeWithScore]:
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
                    "retrieval_mode": "hybrid" if hybrid else "dense",
                },
                id_=str(result.id),
            )
            nodes_with_scores.append(NodeWithScore(node=node, score=result.score))

        logger.info(
            "retrieval_complete",
            results=len(nodes_with_scores),
            mode="hybrid" if hybrid else "dense",
            top_score=nodes_with_scores[0].score if nodes_with_scores else 0,
        )

        return nodes_with_scores

