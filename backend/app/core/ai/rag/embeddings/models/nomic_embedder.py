"""Nomic Embed Text v1.5 embedding model.

Upgrade from all-MiniLM-L6-v2 (384d, MTEB ~63) to nomic-embed-text-v1.5
(768d, MTEB ~65). Supports Matryoshka dimensionality but we use full 768d.

Key differences from MiniLM:
  - Requires trust_remote_code=True (custom NomicBERT architecture)
  - Task prefixing: "search_document:" for ingestion, "search_query:" for retrieval
  - 768 dimensions (2x MiniLM), ~29ms/sentence on CPU
  - 2K token context window (vs 256 for MiniLM)
"""

from typing import List, Union, Optional
import numpy as np
from sentence_transformers import SentenceTransformer
import structlog

from app.core.ai.rag.embeddings.models.base_embedder import BaseEmbedder
from app.core.ai.rag.config.model_config import ModelConfig

logger = structlog.get_logger(__name__)

# Task prefixes as documented by Nomic:
# https://huggingface.co/nomic-ai/nomic-embed-text-v1.5
_DOCUMENT_PREFIX = "search_document: "
_QUERY_PREFIX = "search_query: "


class NomicEmbedder(BaseEmbedder):
    """
    nomic-embed-text-v1.5 embedding model wrapper.

    Features:
    - 768 dimensions (Matryoshka: supports 128/256/512/768)
    - 137M parameters
    - ~547MB model size
    - 2048 token context window
    - Task-prefixed encoding for optimal performance

    Performance (CPU):
    - Single embedding: ~29ms
    - Batch (32): ~500ms (~16ms per item)
    """

    # Nomic model constants (independent of ModelConfig)
    _MODEL_NAME = "nomic-ai/nomic-embed-text-v1.5"
    _EMBEDDING_DIM = 768

    def __init__(self, config: Optional[ModelConfig] = None):
        """
        Initialize nomic-embed-text-v1.5 model.

        Args:
            config: Model configuration for device/threads settings (uses default if None)
        """
        if config is None:
            from app.core.ai.rag.config.model_config import get_model_config
            config = get_model_config()

        self.config = config

        # Load model — always use the Nomic model name, not config
        logger.info(
            "loading_embedding_model",
            model=self._MODEL_NAME,
            device=config.embedding_device,
        )

        self.model = SentenceTransformer(
            self._MODEL_NAME,
            device=config.embedding_device,
            cache_folder=config.model_cache_dir,
            trust_remote_code=True,  # Required for NomicBERT architecture
        )

        # Set number of threads for CPU inference
        if config.embedding_device == "cpu":
            import torch
            torch.set_num_threads(config.num_threads)

        logger.info(
            "embedding_model_loaded",
            model=self._MODEL_NAME,
            dim=self._EMBEDDING_DIM,
            device=config.embedding_device,
        )

    def encode(
        self,
        texts: Union[str, List[str]],
        batch_size: Optional[int] = None,
        normalize: Optional[bool] = None,
        show_progress: bool = False,
        prefix: Optional[str] = None,
    ) -> np.ndarray:
        """
        Encode text(s) to embeddings with task prefix.

        By default, uses "search_document:" prefix (optimized for indexing).
        Use encode_query() for search-time encoding.

        Args:
            texts: Single text or list of texts
            batch_size: Batch size (uses config default if None)
            normalize: L2 normalize embeddings (uses config default if None)
            show_progress: Show progress bar for large batches
            prefix: Override task prefix (default: "search_document: ")

        Returns:
            numpy array of embeddings (768-dim)
        """
        if isinstance(texts, str):
            texts = [texts]

        if batch_size is None:
            batch_size = self.config.embedding_batch_size

        if normalize is None:
            normalize = self.config.embedding_normalize

        # Apply task prefix for optimal Nomic performance
        task_prefix = prefix if prefix is not None else _DOCUMENT_PREFIX
        prefixed_texts = [f"{task_prefix}{t}" for t in texts]

        # Encode with batching
        embeddings = self.model.encode(
            prefixed_texts,
            batch_size=batch_size,
            show_progress_bar=show_progress,
            convert_to_numpy=True,
            normalize_embeddings=normalize,
        )

        return embeddings

    def encode_query(
        self,
        query: str,
        normalize: bool = True,
    ) -> np.ndarray:
        """
        Encode a search query with "search_query:" prefix.

        Optimized for retrieval — uses different task prefix than
        document encoding for best cross-domain matching.

        Args:
            query: Search query text

        Returns:
            Query embedding (768-dim numpy array)
        """
        return self.encode(
            [query],
            normalize=normalize,
            prefix=_QUERY_PREFIX,
        )[0]

    def get_query_embedding(self, query: str) -> np.ndarray:
        """
        Get embedding for a single query (backward-compatible alias).

        Args:
            query: Query text

        Returns:
            Query embedding (768-dim)
        """
        return self.encode_query(query)

    @property
    def embedding_dim(self) -> int:
        """Get embedding dimensionality."""
        return self._EMBEDDING_DIM

    @property
    def model_name(self) -> str:
        """Get model name."""
        return self._MODEL_NAME
