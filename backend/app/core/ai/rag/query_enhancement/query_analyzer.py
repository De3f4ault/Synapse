"""Query analyzer - Classifies query type and intent."""

from typing import Dict, List
from enum import Enum
import structlog

logger = structlog.get_logger(__name__)


class QueryType(Enum):
    """Query type classification"""
    CONCEPTUAL = "conceptual"  # "What is photosynthesis?"
    PROCEDURAL = "procedural"  # "How does photosynthesis work?"
    FACTUAL = "factual"  # "Where does photosynthesis occur?"
    COMPARATIVE = "comparative"  # "What's the difference between..."
    EXAMPLE = "example"  # "Give me an example of..."


class QueryIntent(Enum):
    """Learning intent classification"""
    LEARN_NEW = "learn_new"  # First time learning
    REINFORCE = "reinforce"  # Review/practice
    CLARIFY = "clarify"  # Understand better
    APPLY = "apply"  # Use knowledge


class QueryAnalyzer:
    """
    Analyzes query type and learning intent.
    
    Helps personalize retrieval strategy:
    - Conceptual → Broader retrieval, more context
    - Factual → Precise retrieval, specific facts
    - Reinforce → Recent topics, spaced repetition
    """
    
    def __init__(self):
        """Initialize query analyzer"""
        # Keyword patterns for classification
        self.conceptual_keywords = {"what is", "define", "concept", "meaning"}
        self.procedural_keywords = {"how does", "how to", "process", "steps", "mechanism"}
        self.factual_keywords = {"where", "when", "who", "which", "name"}
        self.comparative_keywords = {"difference", "compare", "versus", "vs", "unlike"}
        self.example_keywords = {"example", "instance", "case", "illustration"}
        
        logger.info("query_analyzer_initialized")
    
    def analyze(self, query: str) -> Dict:
        """
        Analyze query.
        
        Args:
            query: User query
        
        Returns:
            Dict with {type, intent, keywords, suggestions}
        """
        query_lower = query.lower()
        
       # Classify type
        query_type = self._classify_type(query_lower)
        
        # Classify intent (simple heuristic for now)
        query_intent = self._classify_intent(query_lower)
        
        # Extract key terms
        keywords = self._extract_keywords(query)
        
        # Retrieval suggestions
        suggestions = self._get_suggestions(query_type, query_intent)
        
        result = {
            "type": query_type.value,
            "intent": query_intent.value,
            "keywords": keywords,
            "suggestions": suggestions
        }
        
        logger.debug("query_analyzed", type=query_type.value, intent=query_intent.value)
        
        return result
    
    def _classify_type(self, query: str) -> QueryType:
        """Classify query type"""
        if any(kw in query for kw in self.conceptual_keywords):
            return QueryType.CONCEPTUAL
        elif any(kw in query for kw in self.procedural_keywords):
            return QueryType.PROCEDURAL
        elif any(kw in query for kw in self.factual_keywords):
            return QueryType.FACTUAL
        elif any(kw in query for kw in self.comparative_keywords):
            return QueryType.COMPARATIVE
        elif any(kw in query for kw in self.example_keywords):
            return QueryType.EXAMPLE
        else:
            return QueryType.CONCEPTUAL  # Default
    
    def _classify_intent(self, query: str) -> QueryIntent:
        """Classify learning intent"""
        if any(kw in query for kw in {"again", "review", "practice"}):
            return QueryIntent.REINFORCE
        elif any(kw in query for kw in {"clarify", "explain better", "don't understand"}):
            return QueryIntent.CLARIFY
        elif any(kw in query for kw in {"apply", "use", "solve", "problem"}):
            return QueryIntent.APPLY
        else:
            return QueryIntent.LEARN_NEW  # Default
    
    def _extract_keywords(self, query: str) -> List[str]:
        """Extract key terms (simple tokenization)"""
        # Remove common words
        stop_words = {
            "what", "is", "the", "a", "an", "how", "does", "do",
            "where", "when", "why", "can", "you", "me", "about"
        }
        
        words = query.lower().split()
        keywords = [w for w in words if w not in stop_words and len(w) > 2]
        
        return keywords[:5]  # Top 5 keywords
    
    def _get_suggestions(self, query_type: QueryType, intent: QueryIntent) -> Dict:
        """Get retrieval strategy suggestions"""
        suggestions = {
            "retrieval_top_k": 50,  # Default
            "context_window": "normal",
            "expand_query": False
        }
        
        # Adjust based on type
        if query_type == QueryType.CONCEPTUAL:
            suggestions["retrieval_top_k"] = 50  # Broader retrieval
            suggestions["context_window"] = "large"
            suggestions["expand_query"] = True
        elif query_type == QueryType.FACTUAL:
            suggestions["retrieval_top_k"] = 20  # Precise retrieval
            suggestions["context_window"] = "small"
        
        # Adjust based on intent
        if intent == QueryIntent.REINFORCE:
            suggestions["prioritize_recent"] = True
        elif intent == QueryIntent.CLARIFY:
            suggestions["expand_query"] = True
            suggestions["retrieval_top_k"] = 30
        
        return suggestions
