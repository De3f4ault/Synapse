"""Embedding models package initialization."""

from app.core.ai.rag.embeddings.models.base_embedder import BaseEmbedder
from app.core.ai.rag.embeddings.models.all_minilm import AllMiniLMEmbedder

__all__ = [
    "BaseEmbedder",
    "AllMiniLMEmbedder",
]
