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
    
    def upsert_batch(
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
        
        logger.debug(
            "vectors_upserted",
            collection=collection_name,
            count=len(points)
        )
        
        return len(points)

    def upsert_hybrid_batch(
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

        logger.debug(
            "hybrid_vectors_upserted",
            collection=collection_name,
            count=total,
        )

        return total

    def upsert_unified_batch(
        self,
        collection_name: str,
        dense_vectors: List[List[float]],
        sparse_vectors: List[models.SparseVector],
        colbert_multivectors: List[List[List[float]]],
        payloads: List[Dict[str, Any]],
        ids: List[str],
        batch_size: int = 20,
    ) -> int:
        """
        Unified upsert: dense + BM25 sparse + ColBERT multivector in one PUT.

        Replaces the old two-step pattern (upsert_hybrid_batch → upsert_colbert_batch).
        One HTTP request per batch instead of two. Points are atomic — no state
        where dense exists but colbert is missing.

        ColBERT matrices are large (~115KB/chunk at 300 tokens × 96D × float32).
        Default batch_size=20 keeps each request under Qdrant's 64MB gRPC limit.

        Args:
            collection_name: Target collection (synapse_dense with unified schema).
            dense_vectors: List of 768D dense embeddings.
            sparse_vectors: List of SparseVector objects (from fastembed BM25).
            colbert_multivectors: Per-chunk token matrices — List[num_tokens × 96].
            payloads: Metadata dicts (user_id, source_id, chunk_index, etc.).
            ids: Deterministic UUIDs — must be consistent across re-ingestion.
            batch_size: Points per upsert call (smaller than dense — colbert adds ~115KB/point).

        Returns:
            Total number of points upserted.
        """
        n = len(ids)
        if not (n == len(dense_vectors) == len(sparse_vectors) == len(colbert_multivectors) == len(payloads)):
            raise ValueError(
                f"Length mismatch: ids={n}, dense={len(dense_vectors)}, "
                f"sparse={len(sparse_vectors)}, colbert={len(colbert_multivectors)}, "
                f"payloads={len(payloads)}"
            )

        total = 0
        for start in range(0, n, batch_size):
            end = min(start + batch_size, n)
            points = [
                models.PointStruct(
                    id=ids[i],
                    vector={
                        "dense":   dense_vectors[i].tolist() if isinstance(dense_vectors[i], __import__("numpy").ndarray) else dense_vectors[i],
                        "bm25":    sparse_vectors[i],
                        "colbert": colbert_multivectors[i],
                    },
                    payload=payloads[i],
                )
                for i in range(start, end)
            ]

            self.client.upsert(
                collection_name=collection_name,
                points=points,
                wait=True,
            )
            total += len(points)

        logger.debug(
            "unified_vectors_upserted",
            collection=collection_name,
            count=total,
        )

        return total

