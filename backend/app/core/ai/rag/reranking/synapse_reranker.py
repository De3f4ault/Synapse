"""SYNAPSE-specific reranking for learning-optimized retrieval."""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)


class SynapseReranker:
    """
    Rerank results based on SYNAPSE learning context.

    Multi-factor reranking:
    1. Weak area relevance (3x boost)
    2. Recency (recent content more relevant)
    3. Interaction history (content user engaged with)
    4. Learning state (content matching current level)

    Result: Personalized learning-optimized ranking

    Example:
        reranker = SynapseReranker()
        reranked = await reranker.rerank(
            query="photosynthesis",
            results=raw_results,
            weak_areas=["photosynthesis", "chloroplast"],
            user_history=[...]
        )
    """

    def __init__(self):
        """Initialize SYNAPSE reranker."""
        logger.debug("SynapseReranker initialized")

    async def rerank(
        self,
        query: str,
        results: List[Dict],
        user_context: Dict,
        weak_areas: Optional[List[str]] = None,
    ) -> List[Dict]:
        """
        Rerank results using SYNAPSE learning context.

        Args:
            query: Original query
            results: Results from Llama Index (with scores)
            user_context: User's learning context
            weak_areas: Topics where user struggles (optional)

        Returns:
            List[Dict]: Reranked results with adjusted scores
        """
        logger.debug(f"Reranking {len(results)} results")

        if not results:
            return results

        # Calculate reranking scores
        for result in results:
            base_score = float(result.get("score", 0.5))

            # Apply reranking factors
            weak_area_boost = self._calculate_weak_area_boost(
                result, weak_areas or []
            )
            recency_boost = self._calculate_recency_boost(result)
            interaction_boost = self._calculate_interaction_boost(
                result, user_context
            )
            learning_state_boost = self._calculate_learning_state_boost(
                result, user_context
            )

            # Combine scores
            final_score = (
                base_score * 0.4 +  # Base vector similarity
                weak_area_boost * 0.3 +  # 30% weight on weak areas
                recency_boost * 0.15 +  # 15% weight on recency
                interaction_boost * 0.1 +  # 10% weight on history
                learning_state_boost * 0.05  # 5% weight on level
            )

            result["score"] = final_score
            result["reranking_factors"] = {
                "base": base_score,
                "weak_area": weak_area_boost,
                "recency": recency_boost,
                "interaction": interaction_boost,
                "learning_state": learning_state_boost,
            }

        # Re-sort by final score
        results.sort(key=lambda x: x["score"], reverse=True)

        logger.debug(f"✅ Reranked results")
        return results

    def _calculate_weak_area_boost(
        self,
        result: Dict,
        weak_areas: List[str],
    ) -> float:
        """
        Calculate boost for content related to weak areas.

        Weak areas should be prioritized in learning.

        Args:
            result: Result item
            weak_areas: List of weak topics

        Returns:
            float: Score 0.0-1.0
        """
        if not weak_areas:
            return 0.5  # Neutral

        text = result.get("text", "").lower()

        matching_areas = sum(
            1 for area in weak_areas
            if area.lower() in text
        )

        if matching_areas > 0:
            # Boost for each weak area found
            boost = min(0.9, 0.5 + (matching_areas * 0.2))
            logger.debug(f"Weak area boost: {boost} ({matching_areas} matches)")
            return boost

        return 0.5

    def _calculate_recency_boost(self, result: Dict) -> float:
        """
        Calculate boost for recent content.

        Recent content is typically more relevant.

        Args:
            result: Result item with metadata

        Returns:
            float: Score 0.0-1.0
        """
        metadata = result.get("metadata", {})
        created_at = metadata.get("created_at")

        if not created_at:
            return 0.5  # Neutral if no date

        try:
            # Parse date (assuming ISO format)
            if isinstance(created_at, str):
                from datetime import datetime
                created = datetime.fromisoformat(created_at)
            else:
                created = created_at

            # Calculate age in days
            age_days = (datetime.utcnow() - created).days

            # Exponential decay: 0 days = 1.0, 30 days = 0.5, 60+ days = 0.3
            if age_days <= 7:
                boost = 0.9
            elif age_days <= 30:
                boost = 0.7 - (age_days - 7) * 0.01
            else:
                boost = 0.4

            return max(0.3, min(0.9, boost))

        except Exception as e:
            logger.warning(f"Recency calculation failed: {str(e)}")
            return 0.5

    def _calculate_interaction_boost(
        self,
        result: Dict,
        user_context: Dict,
    ) -> float:
        """
        Calculate boost based on user interaction history.

        Content user has engaged with (viewed, reviewed) is valuable.

        Args:
            result: Result item
            user_context: User's learning context

        Returns:
            float: Score 0.0-1.0
        """
        metadata = result.get("metadata", {})
        source_id = metadata.get("source_id")

        if not source_id:
            return 0.5

        # Check if in user's recent activity
        recent_activity = user_context.get("analytics", {}).get("recent_activity", [])

        if any(item.get("id") == source_id for item in recent_activity):
            logger.debug(f"Interaction boost for recently accessed content")
            return 0.8  # High boost for recent interaction

        return 0.5

    def _calculate_learning_state_boost(
        self,
        result: Dict,
        user_context: Dict,
    ) -> float:
        """
        Calculate boost based on user's learning state.

        Content difficulty should match user's level.

        Args:
            result: Result item with difficulty metadata
            user_context: User's learning context

        Returns:
            float: Score 0.0-1.0
        """
        metadata = result.get("metadata", {})
        difficulty = metadata.get("difficulty", "medium")

        # Get user's estimated level (0.0 = beginner, 1.0 = expert)
        avg_ease_factor = user_context.get("analytics", {}).get("avg_ease_factor", 2.5)
        user_level = (avg_ease_factor - 1.3) / (5.0 - 1.3)  # Normalize SM-2 to 0-1

        # Match difficulty to level
        difficulty_scores = {
            "beginner": 0.3,
            "easy": 0.3,
            "intermediate": 0.5,
            "medium": 0.5,
            "advanced": 0.7,
            "hard": 0.7,
            "expert": 0.9,
        }

        content_difficulty = difficulty_scores.get(difficulty.lower(), 0.5)

        # Boost if content matches user level (within 0.2)
        if abs(content_difficulty - user_level) < 0.2:
            return 0.8
        elif abs(content_difficulty - user_level) < 0.4:
            return 0.6
        else:
            return 0.4

    def calculate_weak_area_coverage(
        self,
        results: List[Dict],
        weak_areas: List[str],
    ) -> Dict[str, float]:
        """
        Calculate what percentage of weak areas are covered by results.

        Args:
            results: Retrieved results
            weak_areas: List of weak topics

        Returns:
            Dict: {weak_area: coverage_percentage}
        """
        coverage = {}

        for weak_area in weak_areas:
            # Count how many results mention this weak area
            mentions = sum(
                1 for result in results
                if weak_area.lower() in result.get("text", "").lower()
            )

            coverage[weak_area] = min(1.0, mentions / max(1, len(results)))

        return coverage
