"""Sparse BM25 embedder using fastembed's Qdrant/bm25 model.

Generates sparse vectors (term frequencies) for Qdrant's server-side BM25.
Qdrant handles IDF computation via Modifier.IDF — we only provide TF.

Singleton pattern: one model instance, shared across the entire application.
"""

from typing import List, Optional

import structlog
from fastembed import SparseTextEmbedding
from qdrant_client.http.models import SparseVector

logger = structlog.get_logger(__name__)

# Module-level singleton
_sparse_embedder: Optional["SparseEmbedder"] = None


class SparseEmbedder:
    """BM25 sparse embedder using fastembed.

    Produces SparseVector objects (indices + values) compatible with
    Qdrant's sparse vector storage. The model tokenizes text and
    computes term frequencies; Qdrant handles IDF server-side when
    the collection is configured with Modifier.IDF.

    Typical encoding time: <1ms per query, ~5ms per chunk batch.
    """

    def __init__(self, model_name: str = "Qdrant/bm25"):
        logger.info("loading_sparse_embedder", model=model_name)
        self._model = SparseTextEmbedding(model_name=model_name)
        self._model_name = model_name
        logger.info("sparse_embedder_loaded", model=model_name)

    def encode(self, texts: List[str]) -> List[SparseVector]:
        """Encode a batch of texts to sparse vectors.

        Args:
            texts: List of text strings to encode.

        Returns:
            List of SparseVector, one per input text.
        """
        embeddings = list(self._model.embed(texts))
        return [
            SparseVector(
                indices=emb.indices.tolist(),
                values=emb.values.tolist(),
            )
            for emb in embeddings
        ]

    def encode_query(self, text: str) -> SparseVector:
        """Encode a single query string to a sparse vector."""
        embeddings = list(self._model.query_embed(text))
        return SparseVector(
            indices=embeddings[0].indices.tolist(),
            values=embeddings[0].values.tolist(),
        )


def get_sparse_embedder(model_name: str = "Qdrant/bm25") -> SparseEmbedder:
    """Get or create the singleton sparse embedder."""
    global _sparse_embedder
    if _sparse_embedder is None:
        _sparse_embedder = SparseEmbedder(model_name=model_name)
    return _sparse_embedder
