"""Fusion package initialization."""

from app.core.ai.rag.retrieval.fusion.rrf import reciprocal_rank_fusion, weighted_reciprocal_rank_fusion

__all__ = [
    "reciprocal_rank_fusion",
    "weighted_reciprocal_rank_fusion",
]
