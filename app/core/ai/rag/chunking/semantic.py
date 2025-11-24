"""Semantic-aware chunking strategy."""

import logging
from typing import List

from sentence_transformers import SentenceTransformer
import numpy as np

logger = logging.getLogger(__name__)


class SemanticChunker:
    """
    Chunks text based on semantic similarity (topic shifts).

    Instead of fixed-size chunks, this strategy:
    1. Splits text into sentences
    2. Generates embeddings for each sentence
    3. Calculates similarity between consecutive sentences
    4. Splits where similarity drops below threshold (topic shift)
    5. Merges small chunks for better quality

    Advantages:
    - Preserves coherent topics within chunks
    - Better for Q&A systems
    - More expensive (requires embeddings) but higher quality
    """

    def __init__(
        self,
        similarity_threshold: float = 0.5,
        min_chunk_size: int = 50,
        max_chunk_size: int = 1000,
    ):
        """
        Initialize semantic chunker.

        Args:
            similarity_threshold: Below this, split chunk (0-1)
            min_chunk_size: Minimum characters per chunk
            max_chunk_size: Maximum characters per chunk
        """
        self.model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
        self.similarity_threshold = similarity_threshold
        self.min_chunk_size = min_chunk_size
        self.max_chunk_size = max_chunk_size
        logger.debug("SemanticChunker initialized")

    def chunk(self, text: str) -> List[str]:
        """
        Chunk text based on semantic similarity.

        Args:
            text: Text to chunk

        Returns:
            List[str]: Semantic chunks
        """
        logger.debug(f"Semantic chunking {len(text)} characters")

        # Split into sentences
        sentences = self._split_sentences(text)
        if len(sentences) <= 1:
            return [text]

        logger.debug(f"Split into {len(sentences)} sentences")

        # Generate embeddings
        embeddings = self.model.encode(sentences)

        # Calculate similarities
        chunks = []
        current_chunk = [sentences[0]]

        for i in range(1, len(sentences)):
            # Cosine similarity
            similarity = np.dot(embeddings[i], embeddings[i-1]) / (
                np.linalg.norm(embeddings[i]) * np.linalg.norm(embeddings[i-1])
            )

            current_text = " ".join(current_chunk)
            next_text = " ".join(current_chunk + [sentences[i]])

            # Check if adding next sentence would exceed max or if similarity too low
            if (
                len(next_text) > self.max_chunk_size or
                (similarity < self.similarity_threshold and len(current_text) > self.min_chunk_size)
            ):
                chunks.append(current_text)
                current_chunk = [sentences[i]]
            else:
                current_chunk.append(sentences[i])

        # Add final chunk
        if current_chunk:
            chunks.append(" ".join(current_chunk))

        # Merge small chunks
        chunks = self._merge_small_chunks(chunks)

        logger.debug(f"✅ Created {len(chunks)} semantic chunks")
        return chunks

    def _split_sentences(self, text: str) -> List[str]:
        """
        Split text into sentences (simple heuristic).

        Args:
            text: Text to split

        Returns:
            List[str]: Sentences
        """
        # Simple sentence splitter (can be improved with NLTK)
        sentences = []
        current = []

        for char in text:
            current.append(char)
            if char in '.!?':
                sentence = ''.join(current).strip()
                if sentence:
                    sentences.append(sentence)
                current = []

        if current:
            sentence = ''.join(current).strip()
            if sentence:
                sentences.append(sentence)

        return sentences

    def _merge_small_chunks(self, chunks: List[str], min_size: int = 100) -> List[str]:
        """
        Merge chunks that are too small.

        Args:
            chunks: List of chunks
            min_size: Minimum chunk size

        Returns:
            List[str]: Merged chunks
        """
        merged = []

        for chunk in chunks:
            if merged and len(chunk) < min_size:
                # Merge with previous chunk
                merged[-1] += " " + chunk
            else:
                merged.append(chunk)

        return merged
