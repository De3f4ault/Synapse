"""Vector search operations — v4 hybrid-only.

All collections are v4 (named 'dense' + 'bm25' sparse vectors).
The legacy v2 unnamed-vector search() method has been removed.
"""

from typing import List, Optional, Dict, Any
from qdrant_client import QdrantClient
from qdrant_client.http import models
from app.core.ai.rag.vector_store.qdrant.schema import get_quantization_search_params
import structlog

logger = structlog.get_logger(__name__)


class VectorSearch:
    """
    Vector similarity search operations for Qdrant v4 collections.

    All collections use named vectors:
    - "dense": high-dimensional cosine embedding (nomic-embed-text-v1.5)
    - "bm25": sparse BM25 for server-side IDF

    Provides:
    - dense_search_named(): Pure dense search on the "dense" named vector.
    - hybrid_search(): Dense + sparse BM25 with server-side RRF fusion.
    """

    def __init__(self, client: QdrantClient):
        self.client = client

    async def dense_search_named(
        self,
        collection_name: str,
        query_vector: List[float],
        limit: int = 12,   # matches retrieval_top_k
        filters: Optional[Dict[str, Any]] = None,
    ) -> List[models.ScoredPoint]:
        """
        Dense-only search using the named "dense" vector.

        Args:
            collection_name: Collection to search.
            query_vector: Dense query embedding (list of floats).
            limit: Maximum results.
            filters: Metadata filters (e.g. {"user_id": 1}).

        Returns:
            List of scored points.
        """
        query_filter = self._build_filter(filters) if filters else None

        result = self.client.query_points(
            collection_name=collection_name,
            query=query_vector,
            using="dense",
            limit=limit,
            query_filter=query_filter,
            with_payload=True,
            search_params=get_quantization_search_params(),  # rescore float32 after int8 ANN
        )

        logger.debug(
            "dense_named_search_complete",
            collection=collection_name,
            results=len(result.points),
        )

        return result.points

    async def hybrid_search(
        self,
        collection_name: str,
        dense_vector: List[float],
        sparse_vector: models.SparseVector,
        limit: int = 12,            # final RRF results — matches retrieval_top_k
        prefetch_limit: int = 40,   # per-leg candidate count (default: ~3× final limit)
        filters: Optional[Dict[str, Any]] = None,
    ) -> List[models.ScoredPoint]:
        """
        Server-side hybrid search: dense + sparse (BM25) with RRF fusion.

        Uses Qdrant's Universal Query API with Prefetch to run two
        independent sub-queries and fuse with Reciprocal Rank Fusion.

        Args:
            collection_name: Collection with named 'dense' and 'bm25' vectors.
            dense_vector: Dense query embedding.
            sparse_vector: Sparse BM25 query vector (from fastembed).
            limit: Maximum fused results.
            filters: Metadata filters.

        Returns:
            List of scored points (RRF-fused).
        """
        query_filter = self._build_filter(filters) if filters else None

        result = self.client.query_points(
            collection_name=collection_name,
            prefetch=[
                models.Prefetch(
                    query=dense_vector,
                    using="dense",
                    limit=prefetch_limit,  # fetch more per leg so RRF has candidates to fuse
                    filter=query_filter,
                    params=get_quantization_search_params(),  # rescore float32 after int8 ANN
                ),
                models.Prefetch(
                    query=sparse_vector,
                    using="bm25",
                    limit=prefetch_limit,  # fetch more per leg so RRF has candidates to fuse
                    filter=query_filter,
                ),
            ],
            query=models.FusionQuery(fusion=models.Fusion.RRF),
            limit=limit,          # RRF picks top `limit` from fused candidates
            with_payload=True,
        )

        logger.info(
            "hybrid_search_complete",
            collection=collection_name,
            fused_results=len(result.points),
            limit=limit,
        )

        return result.points

    def _build_filter(self, filters: Dict[str, Any]) -> models.Filter:
        """
        Build Qdrant filter from dict.

        Args:
            filters: Filter dict (e.g., {"source_type": "pdf", "user_id": 123}).

        Returns:
            Qdrant Filter object.
        """
        conditions = [
            models.FieldCondition(key=k, match=models.MatchValue(value=v))
            for k, v in filters.items()
        ]
        return models.Filter(must=conditions)

    async def hybrid_colbert_search(
        self,
        collection_name: str,
        dense_vector: List[float],
        sparse_vector: models.SparseVector,
        query_colbert_matrix: List[List[float]],
        limit: int = 12,
        candidate_limit: int = 50,
        prefetch_limit: int = 100,
        filters: Optional[Dict[str, Any]] = None,
    ) -> List[models.ScoredPoint]:
        """
        3-stage ColBERT retrieval pipeline — single unified collection.

        All three stages operate on collection_name (synapse_dense), which now
        stores dense, bm25, and colbert vectors as named vectors on the same points.

        Stage 1+2 — Hybrid RRF:
            Dense ANN + BM25 → server-side RRF → candidate_limit top candidates.
            Uses quantization rescore for density accuracy.

        Stage 3 — Server-side MaxSim:
            query_points(collection_name, using='colbert', HasId=candidate_ids)
            Scores ONLY the RRF candidate set using ColBERT MaxSim.
            No cross-collection ID lookup needed — same points, same collection.
            Payloads re-attached from Stage 1+2 results.

        Args:
            collection_name:      Unified collection (synapse_dense).
            dense_vector:         768D dense query embedding.
            sparse_vector:        BM25 sparse query vector.
            query_colbert_matrix: (num_tokens, 96) ColBERT query token matrix.
            limit:                Final result count after MaxSim reranking.
            candidate_limit:      RRF-fused candidates passed to MaxSim.
            prefetch_limit:       Per-leg prefetch candidate count.
            filters:              Metadata filters for tenant isolation.
        """
        # ── Stage 1+2: Hybrid RRF → candidate_limit results with full payloads ──
        candidates = await self.hybrid_search(
            collection_name=collection_name,
            dense_vector=dense_vector,
            sparse_vector=sparse_vector,
            limit=candidate_limit,
            prefetch_limit=prefetch_limit,
            filters=filters,
        )

        if not candidates:
            return []

        candidate_ids = [p.id for p in candidates]
        payload_map = {p.id: p.payload for p in candidates}

        # ── Stage 3: Server-side MaxSim on the SAME collection ─────────────────
        # HasId filter restricts scoring to the RRF candidate set only.
        # colbert is a named vector on the same points — no cross-collection lookup.
        colbert_result = self.client.query_points(
            collection_name=collection_name,   # unified — colbert lives here too
            query=query_colbert_matrix,
            using="colbert",
            query_filter=models.Filter(
                must=[models.HasIdCondition(has_id=candidate_ids)]
            ),
            limit=limit,
            with_payload=False,   # payloads come from payload_map (Stage 1+2)
            with_vectors=False,
        )

        # Re-attach full payloads from Stage 1+2 candidates
        for point in colbert_result.points:
            point.payload = payload_map.get(point.id, {})

        logger.info(
            "hybrid_colbert_search_complete",
            collection=collection_name,
            rrf_candidates=len(candidates),
            colbert_scored=len(colbert_result.points),
            limit=limit,
        )

        return colbert_result.points






