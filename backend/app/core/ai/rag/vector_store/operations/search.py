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

    Provides efficient HNSW-based search with filtering.
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
        Perform vector similarity search.

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
