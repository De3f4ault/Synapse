"""Qdrant collection schema definitions."""

from qdrant_client.http import models
from typing import Optional

from app.core.ai.rag.config.vector_store_config import VectorStoreConfig


def get_collection_schema(
    config: Optional[VectorStoreConfig] = None
) -> dict:
    """
    Get collection schema for Qdrant (v2 — unnamed dense vector only).
    
    Returns collection configuration with:
    - Vector configuration (size, distance metric)
    - HNSW index parameters
    - Optional on-disk storage
    
    Args:
        config: Vector store configuration
    
    Returns:
        Dict with collection schema
    """
    if config is None:
        from app.core.ai.rag.config.vector_store_config import get_vector_store_config
        config = get_vector_store_config()
    
    # Distance metric mapping
    distance_map = {
        "Cosine": models.Distance.COSINE,
        "Euclid": models.Distance.EUCLID,
        "Dot": models.Distance.DOT
    }
    
    schema = {
        "vectors_config": models.VectorParams(
            size=config.vector_size,
            distance=distance_map.get(config.distance_metric, models.Distance.COSINE),
            hnsw_config=models.HnswConfigDiff(
                m=config.hnsw_m,
                ef_construct=config.hnsw_ef_construct,
                full_scan_threshold=config.hnsw_full_scan_threshold,
                on_disk=config.on_disk
            )
        ),
        "shard_number": config.shard_number,
        "replication_factor": config.replication_factor,
        "write_consistency_factor": config.write_consistency_factor
    }
    
    return schema


def get_hybrid_collection_schema(
    config: Optional[VectorStoreConfig] = None
) -> dict:
    """
    Get collection schema with named dense + sparse (BM25) vectors.

    Used for v3/v4 collections that support hybrid search.

    Named vectors:
      - "dense": 768-dim cosine (nomic-embed-text-v1.5)
      - "bm25": sparse vector with server-side IDF (Modifier.IDF)

    Args:
        config: Vector store configuration

    Returns:
        Dict suitable for client.create_collection(**schema)
    """
    if config is None:
        from app.core.ai.rag.config.vector_store_config import get_vector_store_config
        config = get_vector_store_config()

    distance_map = {
        "Cosine": models.Distance.COSINE,
        "Euclid": models.Distance.EUCLID,
        "Dot": models.Distance.DOT,
    }

    return {
        "vectors_config": {
            "dense": models.VectorParams(
                size=config.vector_size,
                distance=distance_map.get(config.distance_metric, models.Distance.COSINE),
                hnsw_config=models.HnswConfigDiff(
                    m=config.hnsw_m,
                    ef_construct=config.hnsw_ef_construct,
                    full_scan_threshold=config.hnsw_full_scan_threshold,
                    on_disk=config.on_disk,
                ),
            ),
        },
        "sparse_vectors_config": {
            "bm25": models.SparseVectorParams(
                modifier=models.Modifier.IDF,
            ),
        },
        "shard_number": config.shard_number,
        "replication_factor": config.replication_factor,
        "write_consistency_factor": config.write_consistency_factor,
    }


def get_search_params(
    config: Optional[VectorStoreConfig] = None
) -> models.SearchParams:
    """
    Get search parameters for Qdrant queries.
    
    Args:
        config: Vector store configuration
    
    Returns:
        SearchParams with HNSW ef parameter
    """
    if config is None:
        from app.core.ai.rag.config.vector_store_config import get_vector_store_config
        config = get_vector_store_config()
    
    return models.SearchParams(
        hnsw_ef=config.hnsw_ef_search,
        exact=False  # Use HNSW index (not brute force)
    )

