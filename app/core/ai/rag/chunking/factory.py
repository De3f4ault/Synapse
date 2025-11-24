"""Factory for creating chunkers based on strategy selection."""

import logging
from typing import Union

from app.core.ai.rag.chunking.semantic import SemanticChunker
from app.core.ai.rag.chunking.sentence import SentenceChunker
from app.core.ai.rag.chunking.fixed import FixedChunker

logger = logging.getLogger(__name__)


class ChunkerFactory:
    """
    Factory for creating chunker instances.

    Supports three strategies:
    - "semantic": Topic-aware chunking (best quality, slower)
    - "sentence": Sentence-based chunking (balanced, default)
    - "fixed": Fixed-size chunking (fastest)

    Example:
        chunker = ChunkerFactory.create("sentence", chunk_size=512)
        chunks = chunker.chunk(document_text)
    """

    STRATEGIES = {
        "semantic": SemanticChunker,
        "sentence": SentenceChunker,
        "fixed": FixedChunker,
    }

    @staticmethod
    def create(
        strategy: str = "sentence",
        chunk_size: int = 512,
        chunk_overlap: int = 50,
        **kwargs
    ) -> Union[SemanticChunker, SentenceChunker, FixedChunker]:
        """
        Create a chunker instance based on strategy.

        Args:
            strategy: Chunking strategy ("semantic", "sentence", or "fixed")
            chunk_size: Target chunk size in tokens
            chunk_overlap: Overlap between chunks in tokens
            **kwargs: Additional arguments for specific chunkers

        Returns:
            Chunker instance

        Raises:
            ValueError: If strategy not recognized

        Example:
            # Default sentence chunker
            chunker = ChunkerFactory.create()

            # Semantic chunker with custom threshold
            chunker = ChunkerFactory.create(
                "semantic",
                similarity_threshold=0.6
            )

            # Fixed chunker
            chunker = ChunkerFactory.create("fixed", chunk_size=256)
        """
        strategy = strategy.lower()

        if strategy not in ChunkerFactory.STRATEGIES:
            raise ValueError(
                f"Unknown strategy: {strategy}. "
                f"Available: {', '.join(ChunkerFactory.STRATEGIES.keys())}"
            )

        logger.info(f"Creating {strategy} chunker")

        chunker_class = ChunkerFactory.STRATEGIES[strategy]

        # Create with appropriate arguments based on strategy
        if strategy == "semantic":
            chunker = chunker_class(
                similarity_threshold=kwargs.get("similarity_threshold", 0.5),
                min_chunk_size=kwargs.get("min_chunk_size", 50),
                max_chunk_size=kwargs.get("max_chunk_size", 1000),
            )
        else:
            # Both sentence and fixed use same parameters
            chunker = chunker_class(
                chunk_size=chunk_size,
                chunk_overlap=chunk_overlap,
            )

        logger.debug(f"✅ {strategy} chunker created")
        return chunker

    @staticmethod
    def get_available_strategies() -> list:
        """
        Get list of available chunking strategies.

        Returns:
            List of strategy names
        """
        return list(ChunkerFactory.STRATEGIES.keys())

    @staticmethod
    def get_strategy_info(strategy: str) -> dict:
        """
        Get information about a chunking strategy.

        Args:
            strategy: Strategy name

        Returns:
            Dict with strategy info
        """
        info = {
            "semantic": {
                "name": "Semantic Chunker",
                "quality": "Highest",
                "speed": "Slow",
                "use_case": "Important documents, high-quality results",
                "description": "Chunks by topic shifts using embeddings",
            },
            "sentence": {
                "name": "Sentence Chunker",
                "quality": "High",
                "speed": "Medium",
                "use_case": "Most use cases (DEFAULT)",
                "description": "Groups sentences until size limit",
            },
            "fixed": {
                "name": "Fixed Chunker",
                "quality": "Medium",
                "speed": "Fast",
                "use_case": "Rapid prototyping, simple documents",
                "description": "Fixed-size chunks with overlap",
            },
        }

        return info.get(strategy.lower(), {})


# For quick access
def create_chunker(
    strategy: str = "sentence",
    chunk_size: int = 512,
    chunk_overlap: int = 50,
    **kwargs
) -> Union[SemanticChunker, SentenceChunker, FixedChunker]:
    """
    Convenience function for creating chunkers.

    Same as ChunkerFactory.create() but shorter to call.

    Args:
        strategy: Chunking strategy
        chunk_size: Target size
        chunk_overlap: Overlap
        **kwargs: Additional arguments

    Returns:
        Chunker instance
    """
    return ChunkerFactory.create(strategy, chunk_size, chunk_overlap, **kwargs)
