"""Qdrant vector store configuration."""

from pydantic_settings import BaseSettings
from typing import Optional


class VectorStoreConfig(BaseSettings):
    """
    Configuration for Qdrant vector store.
    
    Optimized for local deployment with HNSW indexing.
    """
    
    # Connection
    host: str = "localhost"
    port: int = 6333
    api_key: Optional[str] = None
    timeout: int = 30
    prefer_grpc: bool = False
    
    # Collection Settings
    collection_prefix: str = "synapse_v4"  # v4: nomic 768d dense + sparse (BM25) + contextual retrieval
    vector_size: int = 768  # Must match embedding_dim (nomic-embed-text-v1.5)
    distance_metric: str = "Cosine"  # Cosine, Euclid, Dot
    
    # HNSW Index Configuration
    # See: https://qdrant.tech/documentation/guides/configuration/#hnswconfig
    hnsw_m: int = 16              # Edges per node (16 is good balance)
    hnsw_ef_construct: int = 100  # Build quality
    hnsw_ef_search: int = 128     # Query quality (higher = better recall)
    hnsw_full_scan_threshold: int = 10000
    
    # Performance
    shard_number: int = 1
    replication_factor: int = 1
    write_consistency_factor: int = 1
    on_disk: bool = False  # Store vectors in RAM for speed
    
    # Payload Indexing
    index_payload: bool = True  # Index metadata for filtering
    
    class Config:
        env_prefix = "SYNAPSE_QDRANT_"
        case_sensitive = False


# Global config instance
_config: Optional[VectorStoreConfig] = None


def get_vector_store_config() -> VectorStoreConfig:
    """Get global vector store configuration instance"""
    global _config
    if _config is None:
        _config = VectorStoreConfig()
    return _config
