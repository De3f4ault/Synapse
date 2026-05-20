"""Model-specific configuration."""

import os

# ---------------------------------------------------------------------------
# GLOBAL HUGGINGFACE OFFLINE LOCK
# Must be set BEFORE any huggingface_hub / transformers import so nothing
# slips through — including LlamaIndex adapters and sentence-transformers.
# ---------------------------------------------------------------------------
os.environ.setdefault("HF_HUB_OFFLINE", "1")
os.environ.setdefault("TRANSFORMERS_OFFLINE", "1")
os.environ.setdefault("HF_DATASETS_OFFLINE", "1")

from pydantic_settings import BaseSettings
from typing import Optional


class ModelConfig(BaseSettings):
    """
    Configuration for embedding and reranking models.
    
    Optimized for CPU-only inference.
    """
    
    # Embedding Model
    # Provider selected via EMBEDDING_PROVIDER env var (see config.py)
    # "gemini" → gemini-embedding-001 (cloud API, 768d)
    # "local"  → nomic-ai/nomic-embed-text-v1.5 (on-device, 768d)
    embedding_model_name: str = "gemini-embedding-001"
    embedding_dim: int = 768
    embedding_batch_size: int = 32
    embedding_device: str = "cpu"
    embedding_normalize: bool = True
    
    # Reranking Model (ms-marco-MiniLM-L-6-v2)
    reranker_model_name: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"
    reranker_batch_size: int = 10
    reranker_device: str = "cpu"
    reranker_max_length: int = 512

    # ColBERT Late-Interaction Model (answerai-colbert-small-v1)
    # 33M params, 96D token vectors, CPU-friendly, no CUDA required.
    # Set SYNAPSE_MODEL_OFFLINE_MODE=false and run `make download-models`
    # once to populate .model_cache/ before enabling.
    colbert_model_name: str = "answerdotai/answerai-colbert-small-v1"
    colbert_device: str = "cpu"
    colbert_max_seq_length: int = 299   # 512 - 1 CLS - 1 SEP - 211 query tokens (safe truncation guard)
    colbert_dim: int = 96              # Official answerai output dim — NOT 128

    # Offline Mode
    # When True, model loaders will raise immediately on a cache miss instead
    # of attempting a network download. Flipped to False only for intentional
    # one-time model pre-caching (e.g. make download-models).
    offline_mode: bool = True

    # Model Cache
    model_cache_dir: str = ".model_cache"
    force_download: bool = False
    
    # Performance
    num_threads: int = 8  # For CPU inference (matches i5-8365U hyperthreading)
    
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
