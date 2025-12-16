"""Main RAG configuration."""

from pydantic_settings import BaseSettings
from typing import Optional


class RAGConfig(BaseSettings):
    """
    Main configuration for SYNAPSE RAG system.
    
    Controls retrieval, reranking, chunking, and performance settings.
    """
    
    # Retrieval Settings
    retrieval_top_k: int = 50  # Candidates for reranking
    reranking_top_k: int = 5   # Final results after reranking
    use_hybrid: bool = False    # Enable hybrid retrieval (Phase 1)
    
    # Chunking Settings
    chunk_size: int = 512
    chunk_overlap: int = 128
    chunking_strategy: str = "semantic"  # semantic, markdown, code
    
    # Reranking Settings
    enable_cross_encoder: bool = False  # Phase 1
    enable_learning_aware: bool = False  # Phase 2
    weak_area_boost_factor: float = 1.3
    
    # Performance
    max_concurrent_retrievals: int = 5
    query_timeout_seconds: int = 30
    enable_batch_processing: bool = True
    
    # Caching
    enable_caching: bool = True
    
    # Logging
    log_level: str = "INFO"
    enable_query_logging: bool = True
    
    class Config:
        env_prefix = "SYNAPSE_RAG_"
        case_sensitive = False


# Global config instance
_config: Optional[RAGConfig] = None


def get_rag_config() -> RAGConfig:
    """Get global RAG configuration instance"""
    global _config
    if _config is None:
        _config = RAGConfig()
    return _config
