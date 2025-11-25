"""Fixed-size chunking strategy."""

import logging
from typing import List

logger = logging.getLogger(__name__)


class FixedChunker:
    """
    Chunks text into fixed-size pieces.

    Strategy:
    1. Split into fixed character/token chunks
    2. Add overlap to maintain context
    3. Return uniform-sized chunks

    Advantages:
    - Fastest (no processing)
    - Predictable chunk sizes
    - Good for preprocessing

    Disadvantages:
    - May split mid-sentence or mid-topic
    - Lower quality than semantic chunking

    Use for: Quick prototyping, simple documents
    """

    def __init__(
        self,
        chunk_size: int = 512,
        chunk_overlap: int = 50,
    ):
        """
        Initialize fixed chunker.

        Args:
            chunk_size: Size in tokens (approximate via char count)
            chunk_overlap: Overlap in tokens
        """
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.avg_token_per_char = 0.25  # Rough estimate
        logger.debug(f"FixedChunker initialized (size={chunk_size}, overlap={chunk_overlap})")

    def chunk(self, text: str) -> List[str]:
        """
        Chunk text into fixed-size pieces.

        Args:
            text: Text to chunk

        Returns:
            List[str]: Fixed-size chunks
        """
        logger.debug(f"Fixed chunking {len(text)} characters")

        # Convert token sizes to character sizes
        char_size = int(self.chunk_size / self.avg_token_per_char)
        char_overlap = int(self.chunk_overlap / self.avg_token_per_char)

        chunks = []
        start = 0

        while start < len(text):
            # Calculate end position
            end = start + char_size

            # Try to end at word boundary
            if end < len(text):
                # Find last space
                last_space = text.rfind(' ', start, end)
                if last_space > start:
                    end = last_space

            # Extract chunk
            chunk = text[start:end].strip()
            if chunk:
                chunks.append(chunk)

            # Move start for next chunk (with overlap)
            start = end - char_overlap

        logger.debug(f"✅ Created {len(chunks)} fixed chunks")
        return chunks
