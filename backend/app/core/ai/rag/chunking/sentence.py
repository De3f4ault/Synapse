"""Sentence-based chunking strategy."""

import logging
from typing import List

logger = logging.getLogger(__name__)


class SentenceChunker:
    """
    Chunks text by grouping sentences.

    Strategy:
    1. Split text into sentences
    2. Group sentences until reaching target size
    3. Return chunks of ~512 tokens (moderate complexity)

    Advantages:
    - Fast (no embeddings required)
    - Preserves sentence boundaries
    - Good balance of speed and quality

    Typical result: 3-5 sentences per chunk
    """

    def __init__(
        self,
        chunk_size: int = 512,
        chunk_overlap: int = 50,
    ):
        """
        Initialize sentence chunker.

        Args:
            chunk_size: Target size in tokens (approximate)
            chunk_overlap: Overlap between chunks in tokens
        """
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.avg_token_per_char = 0.25  # Rough estimate
        logger.debug("SentenceChunker initialized")

    def chunk(self, text: str) -> List[str]:
        """
        Chunk text by sentences.

        Args:
            text: Text to chunk

        Returns:
            List[str]: Sentence-grouped chunks
        """
        logger.debug(f"Sentence chunking {len(text)} characters")

        # Split into sentences
        sentences = self._split_sentences(text)

        if len(sentences) <= 1:
            return [text]

        logger.debug(f"Split into {len(sentences)} sentences")

        # Calculate target character count from token count
        char_target = int(self.chunk_size / self.avg_token_per_char)
        overlap_chars = int(self.chunk_overlap / self.avg_token_per_char)

        # Group sentences into chunks
        chunks = []
        current_chunk = []
        current_len = 0
        overlap_buffer = []

        for sentence in sentences:
            sentence_len = len(sentence) + 1  # +1 for space

            # Add to overlap buffer
            overlap_buffer.append(sentence)
            if len(" ".join(overlap_buffer)) > overlap_chars:
                overlap_buffer.pop(0)

            # Check if adding sentence exceeds limit
            if current_len + sentence_len > char_target and current_chunk:
                # Save chunk
                chunks.append(" ".join(current_chunk))

                # Start new chunk with overlap
                current_chunk = overlap_buffer.copy()
                current_len = len(" ".join(current_chunk))
            else:
                current_chunk.append(sentence)
                current_len += sentence_len

        # Add final chunk
        if current_chunk:
            chunks.append(" ".join(current_chunk))

        logger.debug(f"✅ Created {len(chunks)} sentence chunks")
        return chunks

    def _split_sentences(self, text: str) -> List[str]:
        """
        Split text into sentences.

        Simple regex-based approach that handles:
        - Periods, question marks, exclamation marks
        - Common abbreviations (Dr., Mr., etc.)

        Args:
            text: Text to split

        Returns:
            List[str]: Sentences
        """
        import re

        # Replace abbreviations to avoid false splits
        text = text.replace("Dr.", "[DOCTOR]")
        text = text.replace("Mr.", "[MISTER]")
        text = text.replace("Mrs.", "[MISSUS]")
        text = text.replace("Ms.", "[MISS]")
        text = text.replace("etc.", "[ETC]")

        # Split on sentence boundaries
        sentences = re.split(r'(?<=[.!?])\s+', text)

        # Restore abbreviations and clean
        sentences = [
            s.replace("[DOCTOR]", "Dr.")
             .replace("[MISTER]", "Mr.")
             .replace("[MISSUS]", "Mrs.")
             .replace("[MISS]", "Ms.")
             .replace("[ETC]", "etc.")
             .strip()
            for s in sentences
            if s.strip()
        ]

        return sentences
