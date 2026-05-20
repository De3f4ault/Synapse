"""Main RAG configuration."""

from pydantic_settings import BaseSettings
from typing import List, Optional


class RAGConfig(BaseSettings):
    """
    Main configuration for SYNAPSE RAG system.
    
    Controls retrieval, reranking, chunking, and performance settings.
    """
    
    # Retrieval Settings
    retrieval_top_k: int = 12  # Candidates for reranking (balanced: +~15% reranker vs 10, recovers ~4-6% recall@5)
    reranking_top_k: int = 5   # Final results after reranking
    use_hybrid: bool = True     # Enable hybrid retrieval (dense + sparse BM25)
    
    # Hybrid Search Settings
    hybrid_adaptive: bool = False    # Per-query-type toggle (False = always hybrid)
    hybrid_query_types: List[str] = ["comparative"]  # Types that trigger hybrid when adaptive=True
    sparse_model: str = "Qdrant/bm25"  # fastembed sparse model name
    
    # Chunking Settings
    chunk_size: int = 512
    chunk_overlap: int = 128
    chunking_strategy: str = "semantic"  # semantic, markdown, code
    
    # Reranking Settings
    enable_cross_encoder: bool = False  # Phase 1
    enable_learning_aware: bool = False  # Phase 2
    weak_area_boost_factor: float = 1.3

    # Maintenance gate — set SYNAPSE_RAG_MAINTENANCE=true during reindexing.
    # The retriever checks this before any search and raises a structured error
    # that the context engine surfaces as "RAG temporarily unavailable".
    from pydantic import Field
    rag_maintenance: bool = Field(default=False, env="SYNAPSE_RAG_MAINTENANCE", alias="SYNAPSE_RAG_MAINTENANCE")

    # ColBERT Late-Interaction Settings (Phase 3)
    # Gate: set SYNAPSE_RAG_COLBERT_ENABLE=true ONLY after re-ingestion completes.
    colbert_enable: bool = False
    colbert_collection: str = "synapse_dense"  # unified — colbert lives in synapse_dense

    # ─── Retrieval funnel (single source of truth for all limit numbers) ────────
    #
    #   Hybrid path (no ColBERT):
    #       hybrid_prefetch_limit (per leg: dense + BM25)
    #       └→ RRF → retrieval_top_k (final from retriever)
    #
    #   ColBERT path:
    #       colbert_prefetch_limit (per leg: dense + BM25)
    #       └→ RRF → colbert_candidate_limit
    #                └→ MaxSim → retrieval_top_k (final from retriever)
    #
    #   Output:
    #       retrieval_top_k → [cross-encoder reranker] → reranking_top_k
    #
    # Invariant: prefetch >> candidate >> retrieval_top_k >> reranking_top_k
    # ─────────────────────────────────────────────────────────────────────────────
    hybrid_prefetch_limit: int = 40      # per leg (dense + BM25) for non-ColBERT hybrid
    colbert_prefetch_limit: int = 100    # per leg (dense + BM25) before RRF in ColBERT path
    colbert_candidate_limit: int = 50    # RRF winners passed to MaxSim reranker
    
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
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        extra = "ignore"


# Global config instance
_config: Optional[RAGConfig] = None


def get_rag_config() -> RAGConfig:
    """Get global RAG configuration instance"""
    global _config
    if _config is None:
        _config = RAGConfig()
    return _config
