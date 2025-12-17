"""ms-marco cross-encoder reranker."""

from typing import List, Tuple, Optional
from sentence_transformers import CrossEncoder
import numpy as np
import structlog

from app.core.ai.rag.config.model_config import ModelConfig

logger = structlog.get_logger(__name__)


class CrossEncoderReranker:
    """
    ms-marco-MiniLM-L-6-v2 cross-encoder for reranking.
    
    Cross-encoders are MORE accurate than bi-encoders but SLOWER:
    - Bi-encoder: Encodes query and document separately -> fast
    - Cross-encoder: Encodes query+document together -> accurate
    
    Use cross-encoder AFTER bi-encoder to rerank top candidates.
    
    Performance:
    - Precision improvement: 20-35% over bi-encoder alone
    - Speed: ~10ms per query-document pair (CPU)
    - Best use: Rerank top-50 → top-5
    """
    
    def __init__(self, config: Optional[ModelConfig] = None):
        """
        Initialize cross-encoder reranker.
        
        Args:
            config: Model configuration
        """
        if config is None:
            from app.core.ai.rag.config.model_config import get_model_config
            config = get_model_config()
        
        self.config = config
        
        logger.info(
            "loading_cross_encoder",
            model=config.reranker_model_name,
            device=config.reranker_device
        )
        
        # Load cross-encoder model
        self.model = CrossEncoder(
            config.reranker_model_name,
            device=config.reranker_device,
            max_length=config.reranker_max_length
        )
        
        # Set CPU threads
        if config.reranker_device == "cpu":
            import torch
            torch.set_num_threads(config.num_threads)
        
        logger.info("cross_encoder_loaded", model=config.reranker_model_name)
    
    def rerank(
        self,
        query: str,
        documents: List[str],
        top_k: Optional[int] = None,
        batch_size: Optional[int] = None
    ) -> List[Tuple[int, float]]:
        """
        Rerank documents by relevance to query.
        
        Args:
            query: Search query
            documents: List of document texts to rerank
            top_k: Return only top K results (None = all)
            batch_size: Batch size for scoring (uses config default if None)
        
        Returns:
            List of (original_index, score) tuples, sorted by score descending
        """
        if not documents:
            return []
        
        if batch_size is None:
            batch_size = self.config.reranker_batch_size
        
        # Create query-document pairs
        pairs = [[query, doc] for doc in documents]
        
        logger.debug("reranking_start", query_len=len(query), candidates=len(documents))
        
        # Score all pairs
        scores = self.model.predict(
            pairs,
            batch_size=batch_size,
            show_progress_bar=False
        )
        
        # Create (index, score) tuples
        indexed_scores = list(enumerate(scores))
        
        # Sort by score descending
        ranked = sorted(
            indexed_scores,
            key=lambda x: x[1],
            reverse=True
        )
        
        # Limit to top_k if specified
        if top_k is not None:
            ranked = ranked[:top_k]
        
        logger.debug(
            "reranking_complete",
            candidates=len(documents),
            returned=len(ranked),
            top_score=ranked[0][1] if ranked else 0
        )
        
        return ranked
    
    def score_pair(self, query: str, document: str) -> float:
        """
        Score a single query-document pair.
        
        Args:
            query: Search query
            document: Document text
        
        Returns:
            Relevance score
        """
        score = self.model.predict([[query, document]])[0]
        return float(score)


# Global reranker instance
_reranker: Optional[CrossEncoderReranker] = None


def get_cross_encoder_reranker(
    config: Optional[ModelConfig] = None
) -> CrossEncoderReranker:
    """Get global cross-encoder reranker instance"""
    global _reranker
    
    if _reranker is None:
        _reranker = CrossEncoderReranker(config=config)
    
    return _reranker
