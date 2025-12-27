"""SYNAPSE Context Bridge - Real ContextEngine integration (not mocks).

This module bridges the RAG pipeline with the real SYNAPSE ContextEngine,
providing actual user learning data for personalization.
"""

from typing import Dict, List, Optional, Any
import structlog
from sqlalchemy.ext.asyncio import AsyncSession

logger = structlog.get_logger(__name__)


class SynapseContextBridge:
    """
    Bridge to SYNAPSE Context Engine.

    Provides REAL user learning data:
    - Weak areas (topics needing reinforcement)
    - Mastery scores (proficiency per topic)
    - Recent activity (what user studied recently)
    - Learning preferences (study style, pace)

    This context personalizes RAG retrieval and reranking.
    """

    def __init__(self, db_session: Optional[AsyncSession] = None):
        """
        Initialize SYNAPSE bridge with real database connection.

        Args:
            db_session: AsyncSession for database access. If None, creates new session per call.
        """
        self._db_session = db_session
        self._owns_session = db_session is None

        logger.info("synapse_context_bridge_initialized", real_mode=True)

    async def get_user_context(self, user_id: int, focus: Optional[str] = None) -> Dict[str, Any]:
        """
        Get REAL user learning context from database.

        Args:
            user_id: User ID
            focus: Optional focus area for context relevance

        Returns:
            Dict with:
                - weak_areas: List[Dict] - Topics needing reinforcement
                - mastery_scores: Dict[str, float] - Topic proficiency (0.0-1.0)
                - recent_topics: List[str] - Recently studied topics
                - preferences: Dict - Learning preferences
        """
        from app.core.context.engine import ContextEngine
        from app.db.session import AsyncSessionLocal

        db = self._db_session
        should_close = False

        try:
            # Create session if not provided
            if db is None:
                db = AsyncSessionLocal()
                should_close = True

            # Use real ContextEngine
            engine = ContextEngine(db)
            raw_context = await engine.get_user_context(user_id=user_id, focus=focus)

            # Transform to RAG-expected format
            context = self._transform_to_rag_format(raw_context, user_id, focus)

            logger.debug(
                "real_context_fetched",
                user_id=user_id,
                focus=focus,
                weak_count=len(context.get("weak_areas", [])),
                deck_count=len(raw_context.get("flashcards", {}).get("decks", [])),
            )

            return context

        except Exception as e:
            logger.error("context_fetch_failed", user_id=user_id, error=str(e), exc_info=True)
            # Return empty context on error, don't break RAG
            return self._get_empty_context(user_id, focus)
        finally:
            if should_close and db:
                await db.close()

    def _transform_to_rag_format(
        self, raw_context: Dict[str, Any], user_id: int, focus: Optional[str]
    ) -> Dict[str, Any]:
        """
        Transform ContextEngine output to RAG-expected format.

        ContextEngine returns:
        {
            "user": {...},
            "flashcards": {"decks": [...], "stats": {...}},
            "analytics": {"weak_areas": [...], "mastery_by_deck": [...], ...},
            "notes": {...}
        }

        RAG expects:
        {
            "user_id": int,
            "weak_areas": [{"topic": str, "mastery_score": float, ...}],
            "mastery_scores": {"topic": float, ...},
            "recent_topics": [str, ...],
            "preferences": {...}
        }
        """
        analytics = raw_context.get("analytics", {})
        flashcards = raw_context.get("flashcards", {})
        user_data = raw_context.get("user", {})

        # Extract weak areas
        weak_areas = []
        for wa in analytics.get("weak_areas", []):
            weak_areas.append(
                {
                    "topic": wa.get("topic", wa.get("deck_name", "unknown")),
                    "subtopics": wa.get("subtopics", []),
                    "mastery_score": wa.get("mastery_score", 0.0),
                    "attempts": wa.get("attempts", 0),
                    "last_studied": wa.get("last_studied"),
                }
            )

        # Build mastery scores from deck mastery
        mastery_scores = {}
        for deck in analytics.get("mastery_by_deck", []):
            deck_name = deck.get("deck_name", "")
            # Normalize mastery score (some sources give 0-100, we need 0-1)
            score = deck.get("mastery_score", 0.0)
            if score > 1:
                score = score / 100.0
            mastery_scores[deck_name] = min(score, 1.0)

        # Extract recent topics from activity
        recent_topics = []
        recent_activity = analytics.get("recent_activity", {})
        if recent_activity.get("last_study_date"):
            # Add recently studied decks
            for deck in flashcards.get("decks", []):
                if deck.get("due_count", 0) > 0:
                    recent_topics.append(deck.get("name", ""))

        # Get user preferences
        preferences = user_data.get("preferences", {})
        if not preferences:
            preferences = {
                "difficulty_preference": "adaptive",
                "learning_style": "mixed",
                "pace": "moderate",
                "reinforcement_mode": "spaced_repetition",
            }

        return {
            "user_id": user_id,
            "weak_areas": weak_areas,
            "mastery_scores": mastery_scores,
            "recent_topics": recent_topics[:10],  # Limit to 10 most recent
            "preferences": preferences,
            "focus": focus,
            # Include raw data for advanced use
            "_raw_analytics": analytics,
            "_raw_flashcards": flashcards,
        }

    def _get_empty_context(self, user_id: int, focus: Optional[str]) -> Dict[str, Any]:
        """Return empty context structure (fallback on errors)."""
        return {
            "user_id": user_id,
            "weak_areas": [],
            "mastery_scores": {},
            "recent_topics": [],
            "preferences": {
                "difficulty_preference": "adaptive",
                "learning_style": "mixed",
                "pace": "moderate",
                "reinforcement_mode": "spaced_repetition",
            },
            "focus": focus,
        }

    async def get_weak_area_topics(self, user_id: int, threshold: float = 0.5) -> List[str]:
        """
        Get list of weak area topics.

        Args:
            user_id: User ID
            threshold: Mastery score threshold (topics below this are weak)

        Returns:
            List of weak topic names
        """
        context = await self.get_user_context(user_id)

        weak_topics = [
            topic for topic, score in context["mastery_scores"].items() if score < threshold
        ]

        logger.debug(
            "weak_areas_identified", user_id=user_id, threshold=threshold, count=len(weak_topics)
        )

        return weak_topics

    def get_mastery_boost_factor(self, topic: str, mastery_scores: Dict[str, float]) -> float:
        """
        Get boost factor for a topic based on mastery.

        Lower mastery → Higher boost (to prioritize learning needs).

        Args:
            topic: Topic name
            mastery_scores: Dictionary of topic → mastery score

        Returns:
            Boost factor (1.0 = neutral, >1.0 = boost, <1.0 = demote)
        """
        mastery_score = mastery_scores.get(topic, 0.5)

        # Inverse relationship: low mastery = high boost
        # Mastery 0.0 → boost 2.0x
        # Mastery 0.5 → boost 1.0x (neutral)
        # Mastery 1.0 → boost 0.5x (demote)
        boost = 1.0 + (1.0 - mastery_score)

        return boost


# Global bridge instance (now using real context)
_bridge: Optional[SynapseContextBridge] = None


async def get_synapse_bridge(db_session: Optional[AsyncSession] = None) -> SynapseContextBridge:
    """
    Get SYNAPSE bridge instance.

    Note: Now returns real context, not mocks.
    """
    global _bridge

    if _bridge is None:
        _bridge = SynapseContextBridge(db_session=db_session)

    return _bridge


def get_synapse_bridge_sync() -> SynapseContextBridge:
    """Synchronous getter for backwards compatibility."""
    global _bridge

    if _bridge is None:
        _bridge = SynapseContextBridge()

    return _bridge
