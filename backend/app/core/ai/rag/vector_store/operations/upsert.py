"""Vector upsert operations."""

from typing import List, Dict, Any, Optional
import numpy as np
from qdrant_client import QdrantClient
from qdrant_client.http import models
import structlog

logger = structlog.get_logger(__name__)


class VectorUpsert:
    """
    Vector upsert operations for Qdrant.
    
    Handles batch insertion of vectors with payloads.
    """
    
    def __init__(self, client: QdrantClient):
        """
        Initialize vector upsert.
        
        Args:
            client: Qdrant client
        """
        self.client = client
    
    async def upsert_batch(
        self,
        collection_name: str,
        vectors: List[np.ndarray],
        payloads: List[Dict[str, Any]],
        ids: Optional[List[str]] = None
    ) -> int:
        """
        Batch upsert vectors with payloads.
        
        Args:
            collection_name: Collection name
            vectors: List of embedding vectors
            payloads: List of payload dicts (metadata)
            ids: Optional list of IDs (auto-generated if None)
        
        Returns:
            Number of vectors upserted
        """
        if len(vectors) != len(payloads):
            raise ValueError(
                f"Vectors ({len(vectors)}) and payloads ({len(payloads)}) must have same length"
            )
        
        # Generate IDs if not provided
        if ids is None:
            import uuid
            ids = [str(uuid.uuid4()) for _ in range(len(vectors))]
        
        # Build points
        points = []
        for id_, vector, payload in zip(ids, vectors, payloads):
            points.append(
                models.PointStruct(
                    id=id_,
                    vector=vector.tolist() if isinstance(vector, np.ndarray) else vector,
                    payload=payload
                )
            )
        
        # Upsert
        self.client.upsert(
            collection_name=collection_name,
            points=points,
            wait=True  # Wait for indexing
        )
        
        logger.info(
            "vectors_upserted",
            collection=collection_name,
            count=len(points)
        )
        
        return len(points)
