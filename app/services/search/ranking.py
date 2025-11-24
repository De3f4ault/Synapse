"""
Hybrid Search Ranking Service.

Combines FTS and semantic search results with weighted ranking.
"""

import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)


class HybridRankingService:
    """
    Combines full-text search and semantic search results.

    Uses weighted scoring to merge:
    - FTS results (keyword relevance)
    - Semantic results (meaning similarity)

    Default weights: 40% FTS, 60% Semantic
    """

    DEFAULT_WEIGHTS = {
        "fts": 0.4,
        "semantic": 0.6,
    }

    @staticmethod
    def hybrid_rank(
        fts_results: List[Dict[str, Any]],
        semantic_results: List[Dict[str, Any]],
        weights: Optional[Dict[str, float]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Combine FTS and semantic results with weighted ranking.

        Args:
            fts_results: Results from full-text search
            semantic_results: Results from vector search
            weights: Custom weights {"fts": float, "semantic": float}

        Returns:
            List of combined results sorted by hybrid score
        """
        weights = weights or HybridRankingService.DEFAULT_WEIGHTS

        logger.debug(
            f"Hybrid ranking: {len(fts_results)} FTS + "
            f"{len(semantic_results)} semantic results"
        )

        # Normalize and combine scores
        scores = {}

        # Process FTS results
        fts_max_score = max(
            [r.get("relevance_score", 0) for r in fts_results],
            default=1.0
        )

        for i, result in enumerate(fts_results):
            key = f"{result['type']}:{result['id']}"

            # Normalize score (0-1)
            normalized_fts = result.get("relevance_score", 0) / fts_max_score

            # Position-based bonus (earlier = better)
            position_bonus = 1.0 - (i / len(fts_results)) if fts_results else 0

            # Combine
            fts_score = (normalized_fts * 0.7) + (position_bonus * 0.3)

            scores[key] = {
                "fts_score": fts_score,
                "semantic_score": 0,
                "result": result,
            }

        # Process semantic results
        semantic_max_score = max(
            [r.get("similarity_score", 0) for r in semantic_results],
            default=1.0
        )

        for i, result in enumerate(semantic_results):
            key = f"{result['type']}:{result['id']}"

            # Normalize score (0-1)
            normalized_semantic = result.get("similarity_score", 0) / semantic_max_score

            # Position-based bonus
            position_bonus = 1.0 - (i / len(semantic_results)) if semantic_results else 0

            # Combine
            semantic_score = (normalized_semantic * 0.7) + (position_bonus * 0.3)

            if key in scores:
                # Update existing entry
                scores[key]["semantic_score"] = semantic_score
            else:
                # New entry (only in semantic results)
                scores[key] = {
                    "fts_score": 0,
                    "semantic_score": semantic_score,
                    "result": result,
                }

        # Calculate hybrid scores
        ranked_results = []

        for key, data in scores.items():
            # Weighted combination
            hybrid_score = (
                data["fts_score"] * weights["fts"] +
                data["semantic_score"] * weights["semantic"]
            )

            # Add metadata to result
            result = data["result"].copy()
            result["hybrid_score"] = hybrid_score
            result["fts_score"] = data["fts_score"]
            result["semantic_score"] = data["semantic_score"]

            ranked_results.append(result)

        # Sort by hybrid score (descending)
        ranked_results.sort(
            key=lambda x: x["hybrid_score"],
            reverse=True
        )

        logger.info(
            f"Hybrid ranking complete: {len(ranked_results)} total results"
        )

        return ranked_results

    @staticmethod
    def rerank_by_recency(
        results: List[Dict[str, Any]],
        recency_weight: float = 0.2,
    ) -> List[Dict[str, Any]]:
        """
        Boost recent items in search results.

        Args:
            results: Search results
            recency_weight: Weight for recency factor (0-1)

        Returns:
            Reranked results
        """
        from datetime import datetime, timezone

        logger.debug(f"Reranking {len(results)} results by recency")

        now = datetime.now(timezone.utc)

        for result in results:
            # Get creation/update timestamp
            created_at = result.get("created_at")
            updated_at = result.get("updated_at")

            if not created_at and not updated_at:
                # No timestamp data
                result["final_score"] = result.get("hybrid_score", 0)
                continue

            # Use most recent timestamp
            timestamp = updated_at or created_at

            # Calculate age in days
            age_days = (now - timestamp).days

            # Recency factor (exponential decay)
            # 1.0 for today, 0.5 for 30 days old, 0.1 for 90 days old
            recency_factor = max(0.1, 1.0 / (1 + age_days / 30))

            # Combine with existing score
            base_score = result.get("hybrid_score", 0)
            final_score = (
                base_score * (1 - recency_weight) +
                recency_factor * recency_weight
            )

            result["final_score"] = final_score
            result["recency_factor"] = recency_factor
            result["age_days"] = age_days

        # Resort by final score
        results.sort(
            key=lambda x: x.get("final_score", 0),
            reverse=True
        )

        return results

    @staticmethod
    def deduplicate_results(
        results: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Remove duplicate results (same type and ID).

        Keeps highest-scored duplicate.

        Args:
            results: Search results

        Returns:
            Deduplicated results
        """
        seen = set()
        unique_results = []

        for result in results:
            key = f"{result['type']}:{result['id']}"

            if key not in seen:
                seen.add(key)
                unique_results.append(result)

        logger.debug(
            f"Deduplication: {len(results)} → {len(unique_results)} results"
        )

        return unique_results
