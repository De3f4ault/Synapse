"""Base embedder interface."""

from abc import ABC, abstractmethod
from typing import List, Union
import numpy as np


class BaseEmbedder(ABC):
    """
    Abstract base class for embedding models.
    
    All embedding models should inherit from this and implement
    the encode method.
    """
    
    @abstractmethod
    def encode(
        self,
        texts: Union[str, List[str]],
        batch_size: int = 32
    ) -> np.ndarray:
        """
        Encode text(s) into embeddings.
        
        Args:
            texts: Single text or list of texts to encode
            batch_size: Batch size for processing
        
        Returns:
            numpy array of embeddings
            - Shape: (embedding_dim,) for single text
            - Shape: (n, embedding_dim) for list of texts
        """
        pass
    
    @property
    @abstractmethod
    def embedding_dim(self) -> int:
        """Get embedding dimensionality"""
        pass
    
    @property
    @abstractmethod
    def model_name(self) -> str:
        """Get model name"""
        pass
