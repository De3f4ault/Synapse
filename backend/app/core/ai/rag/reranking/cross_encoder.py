"""Cross-encoder reranking for improved relevance scoring."""

import logging
from typing import Dict, List, Optional

import numpy as np

logger = logging.getLogger(__name__)


class CrossEncoderReranker:
    """
    Rerank results using cross-encoder model.

    Cross-encoders are more accurate than bi-encoders but slower:
    - Bi-encoder: Embed query and docs separately, then compare
    - Cross-encoder: Feed (query, doc) pair to model for direct relevance score

    More accurate but requires more computation.

    Uses: cross-encoder/ms-marco-MiniLM-L-6-v2
    - Trained on MS MARCO dataset (ranking task)
    - Optimized for relevance scoring
    - Much smaller than full models

    Note: Lazy-loads model only when needed
    """

    def __init__(self):
        """Initialize cross-encoder reranker (lazy loading)."""
        self._model = None
        logger.debug("CrossEncoderReranker initialized (lazy loading)")

    def _get_model(self):
        """Lazy load cross-encoder model."""
        if self._model is not None:
            return self._model

        logger.info("Loading cross-encoder model (first use)...")

        try:
            from sentence_transformers import CrossEncoder

            self._model = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')
            logger.info("Cross-encoder model loaded")
            return self._model

        except ImportError:
            logger.error("sentence-transformers not installed")
            raise
        except Exception as e:
            logger.error(f"Failed to load cross-encoder: {str(e)}")
            raise

    async def rerank(
        self,
        query: str,
        results: List[Dict],
        top_k: Optional[int] = None,
    ) -> List[Dict]:
        """
        Rerank results using cross-encoder.

        Args:
            query: Search query
            results: Results to rerank
            top_k: Return only top k results

        Returns:
            List[Dict]: Reranked results with cross-encoder scores
        """
        if not results:
            return results

        logger.info(f"Cross-encoder reranking {len(results)} results")

        try:
            model = self._get_model()

            # Prepare pairs: (query, doc)
            pairs = [
                [query, result.get("text", "")]
                for result in results
            ]

            # Get cross-encoder scores
            logger.debug("Computing cross-encoder scores...")
            scores = model.predict(pairs, batch_size=32)

            # Normalize scores to 0-1 range
            scores = self._normalize_scores(scores)

            # Update results with cross-encoder scores
            for result, score in zip(results, scores):
                result["cross_encoder_score"] = float(score)
                # Could blend with original score
                result["score"] = 0.3 * result.get("score", 0.5) + 0.7 * float(score)

            # Re-sort by cross-encoder score
            results.sort(key=lambda x: x["cross_encoder_score"], reverse=True)

            if top_k:
                results = results[:top_k]

            logger.info("Reranked with cross-encoder")
            return results

        except Exception as e:
            logger.error(f"Cross-encoder reranking failed: {str(e)}")
            # Fall back to original scores
            return results

    def _normalize_scores(self, scores: np.ndarray) -> np.ndarray:
        """
        Normalize cross-encoder scores to 0-1 range.

        Cross-encoder scores are typically in -1 to 1 range.
        Map to 0-1 for consistency with other scores.

        Args:
            scores: Raw cross-encoder scores

        Returns:
            np.ndarray: Normalized scores
        """
        # Map from [-1, 1] or similar to [0, 1]
        min_score = np.min(scores)
        max_score = np.max(scores)

        if max_score - min_score == 0:
            return np.ones_like(scores) * 0.5

        normalized = (scores - min_score) / (max_score - min_score)
        return normalized
