"""Vector upsert operations."""

from typing import List, Dict, Any, Optional, Union
import numpy as np
from qdrant_client import QdrantClient
from qdrant_client.http import models
import structlog

logger = structlog.get_logger(__name__)


class VectorUpsert:
    """
    Vector upsert operations for Qdrant.
    
    Handles batch insertion of vectors with payloads.
    Supports both unnamed (v2) and named (v3) vector formats.
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
        Batch upsert vectors with payloads (v2 — unnamed vector).
        
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

    async def upsert_hybrid_batch(
        self,
        collection_name: str,
        dense_vectors: List[List[float]],
        sparse_vectors: List[models.SparseVector],
        payloads: List[Dict[str, Any]],
        ids: Optional[List[str]] = None,
        batch_size: int = 100,
    ) -> int:
        """
        Batch upsert with named dense + sparse vectors (v3 collections).

        Args:
            collection_name: Collection with named 'dense' and 'bm25' vectors
            dense_vectors: List of dense embeddings (list of floats)
            sparse_vectors: List of SparseVector objects (from fastembed)
            payloads: List of payload dicts (metadata)
            ids: Optional list of IDs (auto-generated if None)
            batch_size: Points per upsert call (avoids gRPC message limits)

        Returns:
            Total number of vectors upserted
        """
        n = len(dense_vectors)
        if n != len(sparse_vectors) or n != len(payloads):
            raise ValueError(
                f"Length mismatch: dense={n}, sparse={len(sparse_vectors)}, payloads={len(payloads)}"
            )

        if ids is None:
            import uuid
            ids = [str(uuid.uuid4()) for _ in range(n)]

        total = 0
        for start in range(0, n, batch_size):
            end = min(start + batch_size, n)
            points = []
            for i in range(start, end):
                dense = dense_vectors[i]
                if isinstance(dense, np.ndarray):
                    dense = dense.tolist()

                points.append(
                    models.PointStruct(
                        id=ids[i],
                        vector={
                            "dense": dense,
                            "bm25": sparse_vectors[i],
                        },
                        payload=payloads[i],
                    )
                )

            self.client.upsert(
                collection_name=collection_name,
                points=points,
                wait=True,
            )
            total += len(points)

        logger.info(
            "hybrid_vectors_upserted",
            collection=collection_name,
            count=total,
        )

        return total

