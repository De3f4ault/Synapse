"""Vector search operations."""

from typing import List, Optional, Dict, Any
import numpy as np
from qdrant_client import QdrantClient
from qdrant_client.http import models
import structlog

from app.core.ai.rag.vector_store.qdrant.schema import get_search_params

logger = structlog.get_logger(__name__)


class VectorSearch:
    """
    Vector similarity search operations for Qdrant.

    Provides:
    - search(): Dense-only on v2 collections (unnamed vector)
    - dense_search_named(): Dense-only on v3 collections (named "dense" vector)
    - hybrid_search(): Dense + sparse (BM25) with server-side RRF fusion
    """

    def __init__(self, client: QdrantClient):
        """
        Initialize vector search.

        Args:
            client: Qdrant client
        """
        self.client = client

    async def search(
        self,
        collection_name: str,
        query_vector: np.ndarray,
        limit: int = 50,
        score_threshold: Optional[float] = None,
        filters: Optional[Dict[str, Any]] = None,
    ) -> List[models.ScoredPoint]:
        """
        Dense-only search on v2 collections (unnamed vector).

        Args:
            collection_name: Collection to search
            query_vector: Query embedding
            limit: Maximum results
            score_threshold: Minimum similarity score
            filters: Metadata filters (e.g., {"source_type": "pdf"})

        Returns:
            List of scored points
        """
        # Get search parameters
        search_params = get_search_params()

        # Build filter if provided
        query_filter = None
        if filters:
            query_filter = self._build_filter(filters)

        # Convert query vector to list
        query_vector_list = (
            query_vector.tolist() if isinstance(query_vector, np.ndarray) else query_vector
        )

        # Search using query_points (newer API) with fallback to search (deprecated)
        try:
            # New API (qdrant-client >= 1.7)
            result = self.client.query_points(
                collection_name=collection_name,
                query=query_vector_list,
                limit=limit,
                query_filter=query_filter,
                search_params=search_params,
                score_threshold=score_threshold,
            )
            results = result.points
        except AttributeError:
            # Fallback to old API
            results = self.client.search(
                collection_name=collection_name,
                query_vector=query_vector_list,
                limit=limit,
                query_filter=query_filter,
                search_params=search_params,
                score_threshold=score_threshold,
            )

        logger.debug(
            "vector_search_complete", collection=collection_name, results=len(results), limit=limit
        )

        return results

    async def dense_search_named(
        self,
        collection_name: str,
        query_vector: List[float],
        limit: int = 20,
        filters: Optional[Dict[str, Any]] = None,
    ) -> List[models.ScoredPoint]:
        """
        Dense-only search on v3 collections (named "dense" vector).

        Uses query_points with explicit vector name.

        Args:
            collection_name: Collection to search
            query_vector: Dense query embedding (list of floats)
            limit: Maximum results
            filters: Metadata filters

        Returns:
            List of scored points
        """
        query_filter = self._build_filter(filters) if filters else None

        result = self.client.query_points(
            collection_name=collection_name,
            query=query_vector,
            using="dense",
            limit=limit,
            query_filter=query_filter,
            with_payload=True,
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
        limit: int = 20,
        filters: Optional[Dict[str, Any]] = None,
    ) -> List[models.ScoredPoint]:
        """
        Server-side hybrid search: dense + sparse (BM25) with RRF fusion.

        Uses Qdrant's Universal Query API with Prefetch to run two
        independent sub-queries (dense + sparse) and fuse results
        using Reciprocal Rank Fusion on the server (~5-10ms overhead).

        Args:
            collection_name: Collection with named 'dense' and 'bm25' vectors
            dense_vector: Dense query embedding
            sparse_vector: Sparse BM25 query vector (from fastembed)
            limit: Maximum fused results
            filters: Metadata filters

        Returns:
            List of scored points (RRF-fused)
        """
        query_filter = self._build_filter(filters) if filters else None

        result = self.client.query_points(
            collection_name=collection_name,
            prefetch=[
                models.Prefetch(
                    query=dense_vector,
                    using="dense",
                    limit=limit,
                    filter=query_filter,
                ),
                models.Prefetch(
                    query=sparse_vector,
                    using="bm25",
                    limit=limit,
                    filter=query_filter,
                ),
            ],
            query=models.FusionQuery(fusion=models.Fusion.RRF),
            limit=limit,
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
            filters: Filter dict (e.g., {"source_type": "pdf", "user_id": 123})

        Returns:
            Qdrant Filter object
        """
        conditions = []

        for key, value in filters.items():
            conditions.append(models.FieldCondition(key=key, match=models.MatchValue(value=value)))

        return models.Filter(must=conditions)

