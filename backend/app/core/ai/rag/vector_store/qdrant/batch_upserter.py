"""
Batch upserter for Qdrant vector store.

Provides async batch upsert operations for document chunks.
"""

from typing import List, Dict, Any, Optional
import structlog

from app.core.ai.rag.vector_store.qdrant.client import get_qdrant_client
from qdrant_client.http import models

logger = structlog.get_logger(__name__)


class BatchUpserter:
    """
    Async batch upserter for Qdrant.

    Used by document processing to efficiently upsert embeddings.
    """

    def __init__(self):
        """Initialize batch upserter with Qdrant client."""
        self._client = None

    @property
    def client(self):
        """Lazy-load Qdrant client."""
        if self._client is None:
            self._client = get_qdrant_client().get_client()
        return self._client

    async def upsert_batch(
        self,
        collection_name: str,
        vectors: List[List[float]],
        payloads: List[Dict[str, Any]],
        ids: Optional[List[str]] = None,
    ) -> int:
        """
        Batch upsert vectors with payloads to Qdrant.

        Args:
            collection_name: Target collection name
            vectors: List of embedding vectors (as lists of floats)
            payloads: List of payload dicts (metadata)
            ids: Optional list of point IDs (auto-generated if None)

        Returns:
            Number of points upserted
        """
        if len(vectors) != len(payloads):
            raise ValueError(
                f"Vectors ({len(vectors)}) and payloads ({len(payloads)}) must have same length"
            )

        if not vectors:
            return 0

        # Generate IDs if not provided
        if ids is None:
            import uuid

            ids = [str(uuid.uuid4()) for _ in range(len(vectors))]

        # Build points
        points = [
            models.PointStruct(
                id=id_,
                vector=vector,
                payload=payload,
            )
            for id_, vector, payload in zip(ids, vectors, payloads)
        ]

        # Upsert to Qdrant
        self.client.upsert(
            collection_name=collection_name,
            points=points,
            wait=True,  # Wait for indexing to complete
        )

        logger.info(
            "batch_upsert_completed",
            collection=collection_name,
            count=len(points),
        )

        return len(points)
