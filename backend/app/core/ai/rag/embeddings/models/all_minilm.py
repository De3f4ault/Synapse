"""all-MiniLM-L6-v2 embedding model."""

from typing import List, Union, Optional
import numpy as np
import structlog

from app.core.ai.rag.embeddings.models.base_embedder import BaseEmbedder
from app.core.ai.rag.config.model_config import ModelConfig

logger = structlog.get_logger(__name__)


class AllMiniLMEmbedder(BaseEmbedder):
    """
    all-MiniLM-L6-v2 embedding model wrapper.
    
    Features:
    - 384 dimensions
    - 22M parameters
    - ~90MB model size
    - Optimized for CPU inference
    - Excellent semantic similarity performance
    
    Performance (CPU):
    - Single embedding: ~20ms
    - Batch (32): ~200ms (6ms per item)
    """
    
    def __init__(self, config: Optional[ModelConfig] = None):
        """
        Initialize all-MiniLM-L6-v2 model.
        
        Args:
            config: Model configuration (uses default if None)
        """
        if config is None:
            from app.core.ai.rag.config.model_config import get_model_config
            config = get_model_config()
        
        self.config = config
        
        # Load model
        logger.info(
            "loading_embedding_model",
            model=config.embedding_model_name,
            device=config.embedding_device
        )
        
        # Deferred import: sentence_transformers takes ~10s on first load.
        # Kept here to avoid silent cost at module import time.
        from sentence_transformers import SentenceTransformer

        self.model = SentenceTransformer(
            config.embedding_model_name,
            device=config.embedding_device,
            cache_folder=config.model_cache_dir
        )
        
        # Set number of threads for CPU inference
        if config.embedding_device == "cpu":
            import torch
            torch.set_num_threads(config.num_threads)
        
        logger.info(
            "embedding_model_loaded",
            model=config.embedding_model_name,
            dim=self.embedding_dim,
            device=config.embedding_device
        )
    
    def encode(
        self,
        texts: Union[str, List[str]],
        batch_size: Optional[int] = None,
        normalize: Optional[bool] = None,
        show_progress: bool = False
    ) -> np.ndarray:
        """
        Encode text(s) to embeddings.
        
        Args:
            texts: Single text or list of texts
            batch_size: Batch size (uses config default if None)
            normalize: L2 normalize embeddings (uses config default if None)
            show_progress: Show progress bar for large batches
        
        Returns:
            numpy array of embeddings
        """
        if isinstance(texts, str):
            texts = [texts]
        
        if batch_size is None:
            batch_size = self.config.embedding_batch_size
        
        if normalize is None:
            normalize = self.config.embedding_normalize
        
        # Encode with batching
        embeddings = self.model.encode(
            texts,
            batch_size=batch_size,
            show_progress_bar=show_progress,
            convert_to_numpy=True,
            normalize_embeddings=normalize
        )
        
        return embeddings
    
    @property
    def embedding_dim(self) -> int:
        """Get embedding dimensionality"""
        return self.config.embedding_dim
    
    @property
    def model_name(self) -> str:
        """Get model name"""
        return self.config.embedding_model_name
    
    def get_query_embedding(self, query: str) -> np.ndarray:
        """
        Get embedding for a single query.
        
        Optimized for single-query encoding (no batching overhead).
        
        Args:
            query: Query text
        
        Returns:
            Query embedding (384-dim)
        """
        return self.encode(query)[0]
