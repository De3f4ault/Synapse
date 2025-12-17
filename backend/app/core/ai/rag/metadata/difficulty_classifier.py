"""Difficulty classifier - Estimates content difficulty level."""

from typing import Dict
from enum import Enum
import structlog

logger = structlog.get_logger(__name__)


class DifficultyLevel(Enum):
    """Content difficulty levels"""
    BEGINNER = "beginner"  # 1-3
    INTERMEDIATE = "intermediate"  # 4-6
    ADVANCED = "advanced"  # 7-9
    EXPERT = "expert"  # 10


class DifficultyClassifier:
    """
    Classifies content difficulty using heuristics.
    
    Phase 2: Rule-based (sentence length, vocabulary complexity)
    Phase 3+: ML-based readability scoring
    
    Difficulty enables:
    - Matching content to user level
    - Adaptive learning paths
    - Progressive difficulty
    """
    
    def __init__(self):
        """Initialize difficulty classifier"""
        
        # Complex words indicating higher difficulty
        self.advanced_terms = {
            "hypothesis", "methodology", "synthesis", "analysis",
            "mechanism", "regulation", "substrate", "enzyme kinetics",
            "thermodynamics", "stoichiometry", "equilibrium",
            "oxidation", "reduction", "biochemical", "molecular"
        }
        
        logger.info("difficulty_classifier_initialized")
    
    def classify(self, text: str) -> Dict:
        """
        Classify content difficulty.
        
        Args:
            text: Content text
        
        Returns:
            Dict with {level, score, details}
        """
        # Calculate difficulty indicators
        avg_sentence_length = self._avg_sentence_length(text)
        complex_word_ratio = self._complex_word_ratio(text)
        advanced_term_count = self._count_advanced_terms(text)
        
        # Calculate difficulty score (1-10)
        # Weighted combination of factors
        score = (
            min(avg_sentence_length / 5, 3.0) * 0.3 +  # Sentence length (max 3)
            complex_word_ratio * 10 * 0.4 +  # Complex words (max 4)
            min(advanced_term_count / 3, 3.0) * 0.3  # Advanced terms (max 3)
        )
        
        # Clamp to 1-10
        score = max(1.0, min(10.0, score))
        
        # Determine level
        if score < 4:
            level = DifficultyLevel.BEGINNER
        elif score < 7:
            level = DifficultyLevel.INTERMEDIATE
        elif score < 9:
            level = DifficultyLevel.ADVANCED
        else:
            level = DifficultyLevel.EXPERT
        
        result = {
            "level": level.value,
            "score": round(score, 1),
            "details": {
                "avg_sentence_length": round(avg_sentence_length, 1),
                "complex_word_ratio": round(complex_word_ratio, 2),
                "advanced_term_count": advanced_term_count
            }
        }
        
        logger.debug("difficulty_classified", level=level.value, score=result["score"])
        
        return result
    
    def _avg_sentence_length(self, text: str) -> float:
        """Calculate average sentence length"""
        sentences = text.split('.')
        sentences = [s.strip() for s in sentences if s.strip()]
        
        if not sentences:
            return 0.0
        
        total_words = sum(len(s.split()) for s in sentences)
        return total_words / len(sentences)
    
    def _complex_word_ratio(self, text: str) -> float:
        """Calculate ratio of complex words (>3 syllables approximation)"""
        words = text.split()
        if not words:
            return 0.0
        
        # Simple heuristic: words >10 chars are likely complex
        complex_words = sum(1 for w in words if len(w) > 10)
        
        return complex_words / len(words)
    
    def _count_advanced_terms(self, text: str) -> int:
        """Count advanced terminology"""
        text_lower = text.lower()
        return sum(1 for term in self.advanced_terms if term in text_lower)


# Global classifier instance
_classifier = None


def get_difficulty_classifier() -> DifficultyClassifier:
    """Get global difficulty classifier instance"""
    global _classifier
    
    if _classifier is None:
        _classifier = DifficultyClassifier()
    
    return _classifier
