"""Semantic chunking strategy."""

from typing import List, Dict
import re
import struct log

logger = structlog.get_logger(__name__)


class SemanticChunker:
    """
    Semantic chunking strategy - splits text at topic boundaries.
    
    Phase 0: Simple sentence-based chunking with max size limit.
    Phase 1+: Will add embedding-based semantic boundary detection.
    
    Algorithm:
    1. Split text into sentences
    2. Group sentences into chunks (<= max_chunk_size)
    3. Add metadata (chunk index, sentence count)
    """
    
    def __init__(
        self,
        max_chunk_size: int = 512,
        min_chunk_size: int = 100,
        chunk_overlap: int = 128
    ):
        """
        Initialize semantic chunker.
        
        Args:
            max_chunk_size: Maximum characters per chunk
            min_chunk_size: Minimum characters per chunk
            chunk_overlap: Overlap between chunks (characters)
        """
        self.max_chunk_size = max_chunk_size
        self.min_chunk_size = min_chunk_size
        self.chunk_overlap = chunk_overlap
    
    def chunk(self, text: str) -> List[Dict]:
        """
        Chunk text at semantic boundaries.
        
        Args:
            text: Text to chunk
        
        Returns:
            List of chunk dicts with:
            - text: Chunk text
            - chunk_index: Chunk number
            - sentence_count: Sentences in chunk
        """
        if not text or not text.strip():
            logger.warning("empty_text_for_chunking")
            return []
        
        # 1. Split into sentences
        sentences = self._split_sentences(text)
        
        if len(sentences) == 0:
            return [self._create_chunk(text, 0, 1)]
        
        # 2. Group sentences into chunks
        chunks = self._group_sentences(sentences)
        
        logger.debug(
            " chunking_complete",
            original_len=len(text),
            num_chunks=len(chunks),
            avg_chunk_size=sum(len(c["text"]) for c in chunks) / len(chunks) if chunks else 0
        )
        
        return chunks
    
    def _split_sentences(self, text: str) -> List[str]:
        """
        Split text into sentences.
        
        Phase 0: Simple regex-based splitting
        
        Args:
            text: Input text
        
        Returns:
            List of sentences
        """
        # Split on sentence boundaries (., !, ?)
        sentence_pattern = r'(?<=[.!?])\s+'
        sentences = re.split(sentence_pattern, text)
        
        # Filter out empty sentences
        sentences = [s.strip() for s in sentences if s.strip()]
        
        return sentences
    
    def _group_sentences(self, sentences: List[str]) -> List[Dict]:
        """
        Group sentences into chunks respecting max size.
        
        Args:
            sentences: List of sentences
        
        Returns:
            List of chunk dicts
        """
        chunks = []
        current_chunk = []
        current_size = 0
        chunk_index = 0
        
        for sentence in sentences:
            sentence_size = len(sentence)
            
            # Check if adding sentence exceeds max size
            if current_size + sentence_size > self.max_chunk_size and current_chunk:
                # Save current chunk
                chunk_text = " ".join(current_chunk)
                chunks.append(
                    self._create_chunk(chunk_text, chunk_index, len(current_chunk))
                )
                chunk_index += 1
                
                # Start new chunk with overlap
                current_chunk = self._get_overlap_sentences(current_chunk)
                current_size = sum(len(s) for s in current_chunk)
            
            # Add sentence to current chunk
            current_chunk.append(sentence)
            current_size += sentence_size
        
        # Add final chunk
        if current_chunk:
            chunk_text = " ".join(current_chunk)
            chunks.append(
                self._create_chunk(chunk_text, chunk_index, len(current_chunk))
            )
        
        return chunks
    
    def _get_overlap_sentences(self, sentences: List[str]) -> List[str]:
        """
        Get sentences for overlap with next chunk.
        
        Args:
            sentences: Current chunk sentences
        
        Returns:
            Sentences to include in next chunk
        """
        overlap_sentences = []
        overlap_size = 0
        
        # Take sentences from end until overlap size reached
        for sentence in reversed(sentences):
            if overlap_size + len(sentence) <= self.chunk_overlap:
                overlap_sentences.insert(0, sentence)
                overlap_size += len(sentence)
            else:
                break
        
        return overlap_sentences
    
    def _create_chunk(
        self,
        text: str,
        index: int,
        sentence_count: int
    ) -> Dict:
        """
        Create chunk dict.
        
        Args:
            text: Chunk text
            index: Chunk index
            sentence_count: Number of sentences
        
        Returns:
            Chunk dict
        """
        return {
            "text": text,
            "chunk_index": index,
            "sentence_count": sentence_count,
            "char_count": len(text)
        }
