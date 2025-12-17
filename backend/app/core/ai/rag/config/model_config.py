"""Model-specific configuration."""

from pydantic_settings import BaseSettings
from typing import Optional


class ModelConfig(BaseSettings):
    """
    Configuration for embedding and reranking models.
    
    Optimized for CPU-only inference.
    """
    
    # Embedding Model (all-MiniLM-L6-v2)
    embedding_model_name: str = "sentence-transformers/all-MiniLM-L6-v2"
    embedding_dim: int = 384
    embedding_batch_size: int = 32
    embedding_device: str = "cpu"
    embedding_normalize: bool = True
    
    # Reranking Model (ms-marco-MiniLM-L-6-v2)
    reranker_model_name: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"
    reranker_batch_size: int = 10
    reranker_device: str = "cpu"
    reranker_max_length: int = 512
    
    # Model Cache
    model_cache_dir: str = ".model_cache"
    force_download: bool = False
    
    # Performance
    num_threads: int = 4  # For CPU inference
    
    class Config:
        env_prefix = "SYNAPSE_MODEL_"
        case_sensitive = False


# Global config instance
_config: Optional[ModelConfig] = None


def get_model_config() -> ModelConfig:
    """Get global model configuration instance"""
    global _config
    if _config is None:
        _config = ModelConfig()
    return _config
