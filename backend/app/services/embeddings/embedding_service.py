"""
General-purpose embedding service.

Provides embedding generation with caching for any text content.
Can be used across the application for notes, flashcards, documents, etc.
"""

import logging
from typing import List, Optional, Dict, Any

from app.core.ai.rag.embeddings.manager import EmbeddingManager
from app.core.ai.rag.embeddings.all_minilm import AllMiniLM
from app.core.ai.rag.embeddings.cache import EmbeddingCache

logger = logging.getLogger(__name__)


class EmbeddingService:
    """
    General-purpose embedding generation service.

    Features:
    - Generate embeddings with automatic caching
    - Batch processing for efficiency
    - Statistics tracking
    - Model: all-MiniLM-L6-v2 (384 dimensions)

    Usage:
        service = EmbeddingService()
        embedding = await service.generate_embedding("Sample text")
        embeddings = await service.generate_embeddings_batch(["Text 1", "Text 2"])
    """

    def __init__(
        self,
        redis_client=None,
        device: str = "cpu"
    ):
        """
        Initialize embedding service.

        Args:
            redis_client: Redis client for caching (optional)
            device: Device to run model on ("cpu", "cuda", "mps")
        """
        self.model = AllMiniLM(device=device)
        self.cache = EmbeddingCache(redis_client=redis_client)
        self.manager = EmbeddingManager(model=self.model, cache=self.cache)

        logger.info(
            f"EmbeddingService initialized: "
            f"model={self.model.MODEL_NAME}, "
            f"device={device}, "
            f"dimensions={self.model.DIMENSIONS}"
        )

    async def generate_embedding(self, text: str) -> List[float]:
        """
        Generate embedding for a single text.

        Uses caching to avoid recomputation of identical text.

        Args:
            text: Text to embed

        Returns:
            List[float]: Embedding vector (384 dimensions)

        Raises:
            ValueError: If text is empty
        """
        if not text or not text.strip():
            raise ValueError("Cannot generate embedding for empty text")

        try:
            embedding = await self.manager.generate_embedding(text)
            logger.debug(f"Generated embedding for text (length: {len(text)})")
            return embedding

        except Exception as e:
            logger.error(f"Failed to generate embedding: {str(e)}")
            raise

    async def generate_embeddings_batch(
        self,
        texts: List[str],
        batch_size: int = 32,
        skip_empty: bool = True
    ) -> List[Optional[List[float]]]:
        """
        Generate embeddings for multiple texts efficiently.

        Args:
            texts: List of texts to embed
            batch_size: Batch size for processing (default: 32)
            skip_empty: Skip empty texts instead of raising error

        Returns:
            List[Optional[List[float]]]: List of embeddings (None for empty texts if skip_empty=True)

        Raises:
            ValueError: If any text is empty and skip_empty=False
        """
        if not texts:
            return []

        # Filter empty texts if needed
        valid_texts = []
        valid_indices = []

        for i, text in enumerate(texts):
            if not text or not text.strip():
                if not skip_empty:
                    raise ValueError(f"Empty text at index {i}")
                valid_texts.append(None)
            else:
                valid_texts.append(text)
                valid_indices.append(i)

        # Generate embeddings for valid texts
        texts_to_process = [t for t in valid_texts if t is not None]

        if not texts_to_process:
            logger.warning("No valid texts to process in batch")
            return [None] * len(texts)

        try:
            embeddings = await self.manager.generate_batch(
                texts_to_process,
                batch_size=batch_size
            )

            # Map embeddings back to original indices
            result = []
            embedding_idx = 0

            for text in valid_texts:
                if text is None:
                    result.append(None)
                else:
                    result.append(embeddings[embedding_idx])
                    embedding_idx += 1

            logger.info(
                f"Generated {len(embeddings)} embeddings from {len(texts)} texts "
                f"({len(texts) - len(embeddings)} skipped)"
            )

            return result

        except Exception as e:
            logger.error(f"Failed to generate batch embeddings: {str(e)}")
            raise

    def calculate_similarity(
        self,
        embedding1: List[float],
        embedding2: List[float]
    ) -> float:
        """
        Calculate cosine similarity between two embeddings.

        Args:
            embedding1: First embedding vector
            embedding2: Second embedding vector

        Returns:
            float: Similarity score (0.0 to 1.0)
        """
        try:
            return self.model.similarity(embedding1, embedding2)
        except Exception as e:
            logger.error(f"Failed to calculate similarity: {str(e)}")
            raise

    def search_similar(
        self,
        query_embedding: List[float],
        corpus_embeddings: List[List[float]],
        top_k: int = 5
    ) -> List[tuple]:
        """
        Find most similar embeddings in corpus.

        Args:
            query_embedding: Query embedding vector
            corpus_embeddings: List of corpus embeddings
            top_k: Number of top results to return

        Returns:
            List[tuple]: List of (index, similarity_score) tuples sorted by similarity
        """
        try:
            return self.model.semantic_search(
                query_embedding,
                corpus_embeddings,
                top_k=top_k
            )
        except Exception as e:
            logger.error(f"Failed to search similar embeddings: {str(e)}")
            raise

    def get_dimension(self) -> int:
        """
        Get embedding dimension.

        Returns:
            int: Embedding dimension (384 for all-MiniLM-L6-v2)
        """
        return self.model.DIMENSIONS

    def get_model_info(self) -> Dict[str, Any]:
        """
        Get model information.

        Returns:
            Dict with model details
        """
        return self.model.get_model_info()

    def get_cache_stats(self) -> Dict[str, Any]:
        """
        Get cache statistics.

        Returns:
            Dict with cache statistics (hits, misses, hit_rate, etc.)
        """
        return self.cache.get_stats()

    async def clear_cache(self) -> int:
        """
        Clear embedding cache.

        Returns:
            int: Number of cache entries cleared
        """
        try:
            count = await self.cache.clear()
            logger.info(f"Cleared {count} cache entries")
            return count
        except Exception as e:
            logger.error(f"Failed to clear cache: {str(e)}")
            return 0
