"""all-MiniLM-L6-v2 embedding model wrapper."""

import logging
from typing import List, Union

import numpy as np
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)


class AllMiniLM:
    """
    Wrapper for all-MiniLM-L6-v2 embedding model.

    Model Details:
    - Name: sentence-transformers/all-MiniLM-L6-v2
    - Dimensions: 384 (smaller than 768-dim alternatives)
    - Speed: ~50ms for 512 tokens
    - Quality: Good semantic understanding, trade-off speed
    - Training: Trained on diverse sentence pairs
    - Use: General-purpose sentence embeddings

    Trade-offs:
    - 384D vs 768D: 2x faster, 97% quality
    - Suitable for: Most educational content
    - Not suitable: Highly specialized domain (use domain-specific model)

    Example:
        model = AllMiniLM()
        embedding = model.encode("Photosynthesis is the process...")
        print(f"Dimensions: {len(embedding)}")  # 384
    """

    MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
    DIMENSIONS = 384

    def __init__(self, device: str = "cpu"):
        """
        Initialize all-MiniLM model.

        Args:
            device: Device to run on ("cpu", "cuda", "mps")
        """
        logger.info(f"Loading {self.MODEL_NAME} on {device}...")

        try:
            self.model = SentenceTransformer(self.MODEL_NAME, device=device)
            self.device = device
            logger.info(f"✅ Model loaded successfully (device: {device})")

        except Exception as e:
            logger.error(f"Failed to load model: {str(e)}")
            raise

    def encode(
        self,
        sentences: Union[str, List[str]],
        batch_size: int = 32,
        show_progress_bar: bool = False,
    ) -> Union[List[float], List[List[float]]]:
        """
        Encode text(s) to embedding vector(s).

        Args:
            sentences: Single string or list of strings
            batch_size: Batch size for processing
            show_progress_bar: Show progress for large batches

        Returns:
            For single string: List[float] (384-dim vector)
            For list: List[List[float]] (list of 384-dim vectors)

        Example:
            # Single text
            embedding = model.encode("Hello world")
            print(len(embedding))  # 384

            # Batch
            embeddings = model.encode(["Text 1", "Text 2", "Text 3"])
            print(len(embeddings))  # 3
            print(len(embeddings[0]))  # 384
        """
        is_single = isinstance(sentences, str)

        logger.debug(f"Encoding {'1 text' if is_single else f'{len(sentences)} texts'}")

        try:
            # Encode to numpy arrays
            embeddings = self.model.encode(
                sentences,
                batch_size=batch_size,
                show_progress_bar=show_progress_bar,
                convert_to_numpy=True,
            )

            # Convert to lists for JSON serialization
            if is_single:
                return embeddings.tolist()
            else:
                return [emb.tolist() for emb in embeddings]

        except Exception as e:
            logger.error(f"Encoding failed: {str(e)}")
            raise

    def encode_batch(
        self,
        sentences: List[str],
        batch_size: int = 32,
    ) -> List[List[float]]:
        """
        Encode multiple sentences efficiently.

        Optimized for large batches with progress tracking.

        Args:
            sentences: List of texts to encode
            batch_size: Process in batches (larger = faster but more memory)

        Returns:
            List of embeddings
        """
        logger.info(f"Encoding batch of {len(sentences)} texts (batch_size={batch_size})")

        embeddings = self.encode(
            sentences,
            batch_size=batch_size,
            show_progress_bar=True,
        )

        logger.info(f"✅ Batch encoding complete: {len(embeddings)} embeddings")
        return embeddings

    def similarity(
        self,
        embedding1: List[float],
        embedding2: List[float],
    ) -> float:
        """
        Calculate cosine similarity between two embeddings.

        Args:
            embedding1: First embedding (384-dim)
            embedding2: Second embedding (384-dim)

        Returns:
            float: Similarity score (0.0 to 1.0)

        Example:
            emb1 = model.encode("photosynthesis")
            emb2 = model.encode("energy production")
            sim = model.similarity(emb1, emb2)
            print(f"Similarity: {sim:.3f}")  # ~0.7
        """
        # Convert to numpy if needed
        e1 = np.array(embedding1) if not isinstance(embedding1, np.ndarray) else embedding1
        e2 = np.array(embedding2) if not isinstance(embedding2, np.ndarray) else embedding2

        # Cosine similarity: dot product of normalized vectors
        norm1 = np.linalg.norm(e1)
        norm2 = np.linalg.norm(e2)

        if norm1 == 0 or norm2 == 0:
            return 0.0

        return float(np.dot(e1, e2) / (norm1 * norm2))

    def semantic_search(
        self,
        query_embedding: List[float],
        corpus_embeddings: List[List[float]],
        top_k: int = 5,
    ) -> List[tuple]:
        """
        Find most similar embeddings in corpus.

        Args:
            query_embedding: Query embedding (384-dim)
            corpus_embeddings: List of corpus embeddings
            top_k: Return top k results

        Returns:
            List of (index, similarity) tuples, sorted by similarity desc

        Example:
            query_emb = model.encode("photosynthesis")
            corpus = [
                model.encode("plants make food"),
                model.encode("energy production"),
                model.encode("DNA structure"),
            ]

            results = model.semantic_search(query_emb, corpus, top_k=2)
            # Returns: [(0, 0.85), (1, 0.72)]
        """
        query_emb = np.array(query_embedding)
        corpus_embs = np.array(corpus_embeddings)

        # Calculate similarities with all corpus embeddings
        similarities = corpus_embs @ query_emb / (
            np.linalg.norm(corpus_embs, axis=1) * np.linalg.norm(query_emb)
        )

        # Get top-k indices
        top_k_indices = np.argsort(similarities)[-top_k:][::-1]

        # Return (index, similarity) pairs
        return [
            (int(idx), float(similarities[idx]))
            for idx in top_k_indices
        ]

    def get_model_info(self) -> dict:
        """
        Get model information.

        Returns:
            Dict with model details
        """
        return {
            "name": self.MODEL_NAME,
            "dimensions": self.DIMENSIONS,
            "device": self.device,
            "max_seq_length": self.model.max_seq_length,
        }

    @property
    def max_seq_length(self) -> int:
        """Get maximum sequence length for model."""
        return self.model.max_seq_length

    @property
    def dimension(self) -> int:
        """Get embedding dimension (always 384 for this model)."""
        return self.DIMENSIONS
