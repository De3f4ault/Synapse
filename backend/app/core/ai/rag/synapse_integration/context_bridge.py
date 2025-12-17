"""SYNAPSE Context Bridge - Fetches user learning context."""

from typing import Dict, List, Optional
import structlog

logger = structlog.get_logger(__name__)


class SynapseContextBridge:
    """
    Bridge to SYNAPSE Context Engine.
    
    Fetches user learning data:
    - Weak areas (topics needing reinforcement)
    - Mastery scores (proficiency per topic)
    - Recent activity (what user studied recently)
    - Learning preferences (study style, pace)
    
    This context personalizes RAG retrieval and reranking.
    
    Phase 2: Basic integration with mock data
    Phase 3+: Full ContextEngine integration
    """
    
    def __init__(self, use_mock: bool = True):
        """
        Initialize SYNAPSE bridge.
        
        Args:
            use_mock: Use mock data (True) or real ContextEngine (False)
        """
        self.use_mock = use_mock
        
        if not use_mock:
            # TODO: Import real ContextEngine in Phase 3
            # from app.core.context_engine import ContextEngine
            # self.context_engine = ContextEngine()
            logger.warning("real_context_engine_not_implemented_yet")
            self.use_mock = True
        
        logger.info("synapse_bridge_initialized", mock=self.use_mock)
    
    def get_user_context(self, user_id: int, focus: Optional[str] = None) -> Dict:
        """
        Get user learning context.
        
        Args:
            user_id: User ID
            focus: Optional focus area (e.g., "mathematics", "biology")
        
        Returns:
            Dict with:
                - weak_areas: List[Dict] - Topics needing reinforcement
                - mastery_scores: Dict[str, float] - Topic proficiency (0.0-1.0)
                - recent_topics: List[str] - Recently studied topics
                - preferences: Dict - Learning preferences
        """
        if self.use_mock:
            return self._get_mock_context(user_id, focus)
        
        # TODO: Real implementation in Phase 3
        # return self.context_engine.get_user_context(user_id, focus)
        return self._get_mock_context(user_id, focus)
    
    def _get_mock_context(self, user_id: int, focus: Optional[str] = None) -> Dict:
        """
        Generate mock user context for development/testing.
        
        Simulates realistic learning data.
        """
        logger.debug("generating_mock_context", user_id=user_id, focus=focus)
        
        # Simulate weak areas
        weak_areas = [
            {
                "topic": "photosynthesis",
                "subtopics": ["light reactions", "Calvin cycle"],
                "mastery_score": 0.35,  # Low mastery = weak area
                "attempts": 5,
                "last_studied": "2025-12-10"
            },
            {
                "topic": "cellular respiration",
                "subtopics": ["glycolysis", "Krebs cycle"],
                "mastery_score": 0.42,
                "attempts": 3,
                "last_studied": "2025-12-12"
            },
            {
                "topic": "mitosis",
                "subtopics": ["prophase", "metaphase"],
                "mastery_score": 0.28,  # Very weak
                "attempts": 7,
                "last_studied": "2025-12-14"
            }
        ]
        
        # Simulate mastery scores for all topics
        mastery_scores = {
            "photosynthesis": 0.35,
            "cellular respiration": 0.42,
            "mitosis": 0.28,
            "DNA replication": 0.78,  # Strong area
            "protein synthesis": 0.65,
            "cell structure": 0.82,  # Mastered
            "enzymes": 0.55
        }
        
        # Recent topics (what user studied recently)
        recent_topics = [
            "mitosis",  # Most recent
            "cellular respiration",
            "photosynthesis",
            "DNA replication"
        ]
        
        # Learning preferences
        preferences = {
            "difficulty_preference": "adaptive",  # adaptive, easy, challenging
            "learning_style": "visual",  # visual, textual, mixed
            "pace": "moderate",  # slow, moderate, fast
            "reinforcement_mode": "spaced_repetition"  # spaced_repetition, massed_practice
        }
        
        context = {
            "user_id": user_id,
            "weak_areas": weak_areas,
            "mastery_scores": mastery_scores,
            "recent_topics": recent_topics,
            "preferences": preferences,
            "focus": focus
        }
        
        logger.debug(
            "mock_context_generated",
            user_id=user_id,
            weak_count=len(weak_areas),
            recent_count=len(recent_topics)
        )
        
        return context
    
    def get_weak_area_topics(self, user_id: int, threshold: float = 0.5) -> List[str]:
        """
        Get list of weak area topics.
        
        Args:
            user_id: User ID
            threshold: Mastery score threshold (topics below this are weak)
        
        Returns:
            List of weak topic names
        """
        context = self.get_user_context(user_id)
        
        weak_topics = [
            topic
            for topic, score in context["mastery_scores"].items()
            if score < threshold
        ]
        
        logger.debug(
            "weak_areas_identified",
            user_id=user_id,
            threshold=threshold,
            count=len(weak_topics)
        )
        
        return weak_topics
    
    def get_mastery_boost_factor(self, topic: str, user_id: int) -> float:
        """
        Get boost factor for a topic based on mastery.
        
        Lower mastery → Higher boost (to prioritize learning needs).
        
        Args:
            topic: Topic name
            user_id: User ID
        
        Returns:
            Boost factor (1.0 = neutral, >1.0 = boost, <1.0 = demote)
        """
        context = self.get_user_context(user_id)
        mastery_score = context["mastery_scores"].get(topic, 0.5)
        
        # Inverse relationship: low mastery = high boost
        # Mastery 0.0 → boost 2.0x
        # Mastery 0.5 → boost 1.0x (neutral)
        # Mastery 1.0 → boost 0.5x (demote)
        boost = 1.0 + (1.0 - mastery_score)
        
        return boost


# Global bridge instance
_bridge: Optional[SynapseContextBridge] = None


def get_synapse_bridge(use_mock: bool = True) -> SynapseContextBridge:
    """Get global SYNAPSE bridge instance"""
    global _bridge
    
    if _bridge is None:
        _bridge = SynapseContextBridge(use_mock=use_mock)
    
    return _bridge
