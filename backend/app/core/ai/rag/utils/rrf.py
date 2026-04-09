"""RRF (Reciprocal Rank Fusion) implementation."""

from typing import List, Dict, Any
from collections import defaultdict
import structlog

logger = structlog.get_logger(__name__)


def reciprocal_rank_fusion(
    results_lists: List[List[Dict[str, Any]]],
    k: int = 60,
    id_key: str = "id"
) -> List[Dict[str, Any]]:
    """
    Fuse multiple ranked lists using Reciprocal Rank Fusion (RRF).
    
    RRF is score-agnostic - works with rankings, not raw scores.
    This makes it robust across different retrieval systems.
    
    Formula: RRF_score = sum(1 / (k + rank)) for each retriever
    
    Args:
        results_lists: List of result lists from different retrievers
        k: RRF constant (default 60 from literature)
        id_key: Key to use for document identification
    
    Returns:
        Fused results sorted by RRF score descending
    
    References:
        - Original paper: "Reciprocal Rank Fusion outperforms Condorcet and 
          individual Rank Learning Methods" (Cormack et al., 2009)
        - k=60 shown to be near-optimal in practice
    """
    if not results_lists:
        return []
    
    # Track RRF scores per document
    doc_scores = defaultdict(float)
    doc_data = {}  # Store full document data
    
    logger.debug(
        "rrf_fusion_start",
        num_retrievers=len(results_lists),
        total_docs=sum(len(r) for r in results_lists)
    )
    
    # Process each retriever's results
    for retriever_idx, results in enumerate(results_lists):
        for rank, result in enumerate(results):
            # Generate document ID
            # Priority: explicit ID > text hash > index
            if id_key in result:
                doc_id = result[id_key]
            elif "text" in result:
                # Hash  first 100 chars for ID
                doc_id = hash(result["text"][:100])
            else:
                doc_id = f"retriever_{retriever_idx}_rank_{rank}"
            
            # Calculate RRF score: 1 / (k + rank)
            # rank is 0-indexed, so add 1 for 1-indexed ranking
            rrf_score = 1.0 / (k + rank + 1)
            doc_scores[doc_id] += rrf_score
            
            # Store document data (from first occurrence)
            if doc_id not in doc_data:
                doc_data[doc_id] = result.copy()
    
    # Sort by fused score descending
    fused = [
        {
            **doc_data[doc_id],
            "rrf_score": score,
            "fused": True
        }
        for doc_id, score in sorted(
            doc_scores.items(),
            key=lambda x: x[1],
            reverse=True
        )
    ]
    
    logger.debug(
        "rrf_fusion_complete",
        input_docs=sum(len(r) for r in results_lists),
        fused_docs=len(fused),
        top_score=fused[0]["rrf_score"] if fused else 0
    )
    
    return fused


def weighted_reciprocal_rank_fusion(
    results_lists: List[List[Dict[str, Any]]],
    weights: List[float],
    k: int = 60,
    id_key: str = "id"
) -> List[Dict[str, Any]]:
    """
    Weighted RRF for cases where retrievers have different importance.
    
    Formula: WRRF_score = sum(weight_i * (1 / (k + rank_i)))
    
    Args:
        results_lists: List of result lists from different retrievers
        weights: Weight for each retriever (must sum to 1.0)
        k: RRF constant
        id_key: Key for document identification
    
    Returns:
        Fused results sorted by weighted RRF score
    """
    if len(results_lists) != len(weights):
        raise ValueError(
            f"Number of result lists ({len(results_lists)}) must match "
            f"number of weights ({len(weights)})"
        )
    
    if abs(sum(weights) - 1.0) > 0.01:
        raise ValueError(f"Weights must sum to 1.0, got {sum(weights)}")
    
    doc_scores = defaultdict(float)
    doc_data = {}
    
    # Process each retriever with its weight
    for retriever_idx, (results, weight) in enumerate(zip(results_lists, weights)):
        for rank, result in enumerate(results):
            if id_key in result:
                doc_id = result[id_key]
            elif "text" in result:
                doc_id = hash(result["text"][:100])
            else:
                doc_id = f"retriever_{retriever_idx}_rank_{rank}"
            
            # Weighted RRF score
            rrf_score = weight * (1.0 / (k + rank + 1))
            doc_scores[doc_id] += rrf_score
            
            if doc_id not in doc_data:
                doc_data[doc_id] = result.copy()
    
    # Sort by weighted score
    fused = [
        {
            **doc_data[doc_id],
            "wrrf_score": score,
            "fused": True
        }
        for doc_id, score in sorted(
            doc_scores.items(),
            key=lambda x: x[1],
            reverse=True
        )
    ]
    
    logger.debug(
        "weighted_rrf_complete",
        fused_docs=len(fused),
        weights=weights
    )
    
    return fused
