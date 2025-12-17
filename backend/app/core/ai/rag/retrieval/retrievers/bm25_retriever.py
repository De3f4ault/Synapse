"""BM25 sparse retriever using rank-bm25."""

from typing import List, Dict, Optional
from rank_bm25 import BM25Okapi
import numpy as np
import structlog

logger = structlog.get_logger(__name__)


class BM25Retriever:
    """
    BM25 keyword-based sparse retriever.
    
    Complements dense retrieval with exact keyword matching.
    Excellent for queries with specific terms, acronyms, or entity names.
    
    Uses BM25Okapi algorithm (original BM25 formulation).
    """
    
    def __init__(
        self,
        corpus_texts: List[str],
        corpus_metadata: Optional[List[Dict]] = None,
        tokenizer: Optional[callable] = None
    ):
        """
        Initialize BM25 index.
        
        Args:
            corpus_texts: All document texts to index
            corpus_metadata: Optional metadata for each document
            tokenizer: Custom tokenizer function (default: simple split + lowercase)
        """
        if not corpus_texts:
            raise ValueError("Cannot create BM25 index with empty corpus")
        
        self.corpus_texts = corpus_texts
        self.corpus_metadata = corpus_metadata or [{} for _ in corpus_texts]
        
        # Default tokenizer: lowercase + split
        self.tokenizer = tokenizer or self._default_tokenizer
        
        logger.info("building_bm25_index", corpus_size=len(corpus_texts))
        
        # Tokenize corpus
        self.tokenized_corpus = [self.tokenizer(text) for text in corpus_texts]
        
        # Build BM25 index
        self.bm25 = BM25Okapi(self.tokenized_corpus)
        
        logger.info("bm25_index_built", corpus_size=len(corpus_texts))
    
    def search(
        self,
        query: str,
        top_k: int = 50
    ) -> List[Dict]:
        """
        Search using BM25.
        
        Args:
            query: Search query
            top_k: Number of results to return
        
        Returns:
            List of dicts with {text, score, index, metadata}
        """
        # Tokenize query
        tokenized_query = self.tokenizer(query)
        
        logger.debug("bm25_search_start", query_tokens=len(tokenized_query))
        
        # Get BM25 scores for all documents
        scores = self.bm25.get_scores(tokenized_query)
        
        # Get top-k indices
        top_indices = np.argsort(scores)[::-1][:top_k]
        
        # Build results
        results = []
        for idx in top_indices:
            idx = int(idx)  # Convert numpy int to Python int
            score = float(scores[idx])
            
            # Skip zero-score results
            if score == 0:
                continue
            
            results.append({
                "text": self.corpus_texts[idx],
                "score": score,
                "index": idx,
                "metadata": self.corpus_metadata[idx],
                "retriever": "bm25"
            })
        
        logger.debug("bm25_search_complete", results=len(results), top_score=results[0]["score"] if results else 0)
        
        return results
    
    def _default_tokenizer(self, text: str) -> List[str]:
        """
        Default tokenizer: lowercase + split on whitespace.
        
        For production, consider:
        - Stop word removal
        - Stemming/lemmatization
        - Punctuation handling
        """
        return text.lower().split()
    
    def add_documents(
        self,
        texts: List[str],
        metadata: Optional[List[Dict]] = None
    ):
        """
        Add new documents to existing index.
        
        Note: This rebuilds the  entire index (BM25Okapi limitation).
        For frequent updates, consider batching.
        
        Args:
            texts: New document texts
            metadata: Optional metadata for new documents
        """
        if metadata is None:
            metadata = [{} for _ in texts]
        
        # Append to corpus
        self.corpus_texts.extend(texts)
        self.corpus_metadata.extend(metadata)
        
        # Rebuild index
        self.tokenized_corpus = [self.tokenizer(text) for text in self.corpus_texts]
        self.bm25 = BM25Okapi(self.tokenized_corpus)
        
        logger.info(
            "bm25_documents_added",
            new_docs=len(texts),
            total_corpus=len(self.corpus_texts)
        )
