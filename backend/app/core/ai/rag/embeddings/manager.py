"""Embedding generation and caching manager."""

import logging
from typing import List, Optional

from app.core.ai.rag.embeddings.all_minilm import AllMiniLM
from app.core.ai.rag.embeddings.cache import EmbeddingCache

logger = logging.getLogger(__name__)


class EmbeddingManager:
    """
    Manages embeddings generation with caching.

    Features:
    - Uses all-MiniLM-L6-v2 (384 dimensions)
    - Redis caching to avoid recomputation
    - Batch processing for efficiency
    - TTL: 24 hours
    """

    def __init__(
        self,
        model: Optional[AllMiniLM] = None,
        cache: Optional[EmbeddingCache] = None,
    ):
        """
        Initialize embedding manager.

        Args:
            model: AllMiniLM model instance (lazy loaded if None)
            cache: EmbeddingCache instance for caching
        """
        self.model = model or AllMiniLM()
        self.cache = cache or EmbeddingCache()
        self.embedding_dim = self.model.dimension
        logger.info(f"✅ Embedding manager initialized with {self.embedding_dim}D model")

    async def generate_embedding(self, text: str) -> List[float]:
        """
        Generate embedding for a single text with caching.

        Args:
            text: Text to embed

        Returns:
            List[float]: Embedding vector (384 dimensions)
        """
        # Check cache first
        cached = await self.cache.get(text)
        if cached:
            logger.debug(f"Cache hit for embedding")
            return cached

        # Generate embedding
        logger.debug(f"Generating embedding for text: {text[:50]}...")
        embedding = self.model.encode(text)

        # Cache result
        await self.cache.set(text, embedding)

        return embedding

    async def generate_batch(
        self,
        texts: List[str],
        batch_size: int = 32,
    ) -> List[List[float]]:
        """
        Generate embeddings for multiple texts efficiently.

        Args:
            texts: List of texts to embed
            batch_size: Batch size for processing

        Returns:
            List[List[float]]: List of embedding vectors
        """
        logger.info(f"Generating batch embeddings for {len(texts)} texts")

        # Check cache for each text
        cached_results = await self.cache.get_batch(texts)
        texts_to_process = []
        indices_to_process = []

        for i, text in enumerate(texts):
            if cached_results[text] is not None:
                continue
            texts_to_process.append(text)
            indices_to_process.append(i)

        cached_count = len(texts) - len(texts_to_process)
        logger.debug(f"Cache hit: {cached_count}/{len(texts)}")

        # Generate embeddings for uncached texts
        embeddings_dict = {}
        if texts_to_process:
            logger.debug(f"Processing {len(texts_to_process)} uncached texts")
            embeddings = self.model.encode_batch(texts_to_process, batch_size)
            embeddings_dict = dict(zip(texts_to_process, embeddings))

            # Cache results
            await self.cache.set_batch(embeddings_dict)

        # Build final result in original order
        final_results = []
        embeddings_dict.update({t: cached_results[t] for t in texts if cached_results[t]})

        for text in texts:
            final_results.append(embeddings_dict[text])

        logger.info(f"✅ Generated {len(texts)} embeddings")
        return final_results

    def _get_cache_key(self, text: str) -> str:
        """
        Generate cache key from text hash.

        Args:
            text: Text to hash

        Returns:
            str: Cache key
        """
        import hashlib
        text_hash = hashlib.md5(text.encode()).hexdigest()
        return f"embedding:{text_hash}"

    def get_embedding_dimension(self) -> int:
        """
        Get embedding dimension.

        Returns:
            int: Dimension (384 for all-MiniLM-L6-v2)
        """
        return self.embedding_dim
