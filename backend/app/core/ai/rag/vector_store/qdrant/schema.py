"""Qdrant collection schema definitions.

V4 schema (hybrid dense + sparse) is the ONLY schema in this system.
The legacy v2 unnamed-vector schema has been removed.
"""

from qdrant_client.http import models
from typing import Optional

from app.core.ai.rag.config.vector_store_config import VectorStoreConfig


def get_collection_schema(
    config: Optional[VectorStoreConfig] = None,
    include_colbert: bool = True,
) -> dict:
    """
    Get the v4 hybrid collection schema for Qdrant.

    Collections created by this function support:
    - Named dense vector ("dense"): cosine similarity with HNSW index + int8 quantization
    - Named sparse vector ("bm25"): server-side IDF via Modifier.IDF
    - Named multivector ("colbert"): 96D token matrices, MAX_SIM, binary quantization

    Storage math:
      dense:   768D float32 = 3,072 bytes/vector → int8 = 768 bytes (always_ram)
      colbert: 96D × ~300 tokens ≈ 115KB/point → binary = ~3.6KB (always_ram)

    IMPORTANT: rescore=True must be set on every dense query path (search.py).
    The colbert vector uses BinaryQuantization per-vector, overriding the
    collection-level ScalarQuantization which only applies to "dense".

    Args:
        config: Vector store configuration (loaded from env if None).
        include_colbert: Include the colbert multivector. Set False for
                         per-user collections (notes, flashcards) that don't
                         need late-interaction reranking.

    Returns:
        Dict suitable for client.create_collection(**schema).
    """
    if config is None:
        from app.core.ai.rag.config.vector_store_config import get_vector_store_config
        config = get_vector_store_config()

    distance_map = {
        "Cosine": models.Distance.COSINE,
        "Euclid": models.Distance.EUCLID,
        "Dot": models.Distance.DOT,
    }

    vectors_config = {
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
    }

    if include_colbert:
        from app.core.ai.rag.config.model_config import get_model_config
        colbert_dim = get_model_config().colbert_dim  # 96

        vectors_config["colbert"] = models.VectorParams(
            size=colbert_dim,
            distance=models.Distance.COSINE,
            multivector_config=models.MultiVectorConfig(
                comparator=models.MultiVectorComparator.MAX_SIM
            ),
            # m=0: no ANN HNSW graph for colbert — it is NEVER searched by ANN.
            # MaxSim reranking uses HasId filter → brute-force over candidate set only.
            # Building an HNSW graph would waste ~40MB RAM and slow inserts.
            hnsw_config=models.HnswConfigDiff(m=0),
            # Binary quantization: 32× compression vs float32.
            # ColBERT MaxSim is robust to binary quantization (token-level dot products
            # with many comparisons average out quantization noise).
            quantization_config=models.BinaryQuantization(
                binary=models.BinaryQuantizationConfig(always_ram=True)
            ),
        )

    return {
        "vectors_config": vectors_config,
        "sparse_vectors_config": {
            "bm25": models.SparseVectorParams(
                modifier=models.Modifier.IDF,
            ),
        },
        # Int8 scalar quantization applies to "dense" vector (collection-level default).
        # "colbert" overrides this with BinaryQuantization per-vector above.
        # always_ram=True: compressed index in RAM (~72MB @ 100K chunks) for fast ANN.
        # Float32 originals stay on disk; rescore pass (search.py) recovers accuracy.
        "quantization_config": models.ScalarQuantization(
            scalar=models.ScalarQuantizationConfig(
                type=models.ScalarType.INT8,
                always_ram=True,
            )
        ),
        "shard_number": config.shard_number,
        "replication_factor": config.replication_factor,
        "write_consistency_factor": config.write_consistency_factor,
    }



def get_search_params(
    config: Optional[VectorStoreConfig] = None,
) -> models.SearchParams:
    """
    Get HNSW search parameters for Qdrant queries.

    Args:
        config: Vector store configuration.

    Returns:
        SearchParams with HNSW ef parameter.
    """
    if config is None:
        from app.core.ai.rag.config.vector_store_config import get_vector_store_config
        config = get_vector_store_config()

    return models.SearchParams(
        hnsw_ef=config.hnsw_ef_search,
        exact=False,  # Use HNSW index (not brute force)
    )


def get_quantization_search_params(
    config: Optional[VectorStoreConfig] = None,
) -> models.SearchParams:
    """
    Get search params that trigger the float32 rescore pass after int8 ANN.

    This MUST be used on every query path against quantized collections.
    Without rescore=True, queries run on int8 only and the 1-3% accuracy
    degradation from quantization is permanent rather than recovered.

    oversampling=2.0: Qdrant fetches 2x candidates on the int8 pass before
    rescoring with float32, recovering most of the accuracy loss.

    Args:
        config: Vector store configuration.

    Returns:
        SearchParams with HNSW ef + quantization rescore config.
    """
    if config is None:
        from app.core.ai.rag.config.vector_store_config import get_vector_store_config
        config = get_vector_store_config()

    return models.SearchParams(
        hnsw_ef=config.hnsw_ef_search,
        exact=False,
        quantization=models.QuantizationSearchParams(
            ignore=False,
            rescore=True,       # Required: use float32 vectors from disk to rescore
            oversampling=2.0,   # Fetch 2x candidates before rescoring
        ),
    )
