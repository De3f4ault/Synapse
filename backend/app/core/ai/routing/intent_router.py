"""Intent Router - Classify user messages to route to appropriate agents."""

from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum
import structlog
import json
import re

logger = structlog.get_logger(__name__)


class IntentType(str, Enum):
    """Types of intents that can be classified."""
    LEARNING = "tutor"      # General learning, questions, explanations
    DOCUMENT = "document"   # Document analysis, PDF content extraction
    QUIZ = "quiz"           # Quiz generation, flashcard creation
    WORKFLOW = "workflow"   # Multi-step tasks requiring multiple agents


class IntentClassification(BaseModel):
    """Result of intent classification."""
    intent: IntentType
    confidence: float = Field(ge=0.0, le=1.0)
    reasoning: str
    
    class Config:
        use_enum_values = True


class IntentRouter:
    """
    Routes user messages to appropriate agents based on intent.
    
    Uses a combination of:
    1. Keyword matching for fast, obvious cases
    2. LLM classification for ambiguous cases
    
    Usage:
        router = IntentRouter()
        classification = await router.classify("Help me understand photosynthesis")
        # IntentClassification(intent="tutor", confidence=0.95, reasoning="...")
    """
    
    # Keywords that strongly indicate specific intents
    INTENT_KEYWORDS = {
        IntentType.QUIZ: [
            "quiz", "test", "flashcard", "question", "multiple choice",
            "create questions", "generate quiz", "make flashcards"
        ],
        IntentType.DOCUMENT: [
            "document", "pdf", "file", "upload", "analyze this",
            "read this", "summarize document", "extract from"
        ],
        IntentType.WORKFLOW: [
            "study plan", "prepare for exam", "create a plan",
            "analyze and create", "full review", "comprehensive"
        ]
    }
    
    def __init__(self, use_llm_fallback: bool = True):
        """
        Initialize router.
        
        Args:
            use_llm_fallback: Whether to use LLM for ambiguous cases
        """
        self.use_llm_fallback = use_llm_fallback
        self.logger = logger.bind(component="intent_router")
    
    async def classify(
        self,
        message: str,
        context: Optional[Dict[str, Any]] = None
    ) -> IntentClassification:
        """
        Classify user message intent.
        
        Args:
            message: User message to classify
            context: Optional context (recent topics, document_id, etc.)
            
        Returns:
            IntentClassification with intent, confidence, and reasoning
        """
        context = context or {}
        message_lower = message.lower()
        
        # 1. Fast path: Check for explicit keywords
        keyword_result = self._check_keywords(message_lower)
        if keyword_result and keyword_result.confidence >= 0.8:
            self.logger.info(
                "intent_classified_by_keywords",
                intent=keyword_result.intent,
                confidence=keyword_result.confidence
            )
            return keyword_result
        
        # 2. Check if document context exists
        if context.get("document_id"):
            # If user has a document open, bias toward document-related intents
            if any(word in message_lower for word in ["this", "it", "the document"]):
                return IntentClassification(
                    intent=IntentType.DOCUMENT,
                    confidence=0.75,
                    reasoning="User has active document and references it"
                )
        
        # 3. LLM classification for ambiguous cases
        if self.use_llm_fallback:
            try:
                llm_result = await self._classify_with_llm(message, context)
                self.logger.info(
                    "intent_classified_by_llm",
                    intent=llm_result.intent,
                    confidence=llm_result.confidence
                )
                return llm_result
            except Exception as e:
                self.logger.warning(
                    "llm_classification_failed",
                    error=str(e)
                )
        
        # 4. Default to tutor (learning) intent
        return IntentClassification(
            intent=IntentType.LEARNING,
            confidence=0.6,
            reasoning="Default to tutor for general learning assistance"
        )
    
    def _check_keywords(self, message_lower: str) -> Optional[IntentClassification]:
        """Check for keyword matches."""
        for intent, keywords in self.INTENT_KEYWORDS.items():
            matches = sum(1 for kw in keywords if kw in message_lower)
            if matches >= 2:
                return IntentClassification(
                    intent=intent,
                    confidence=0.9,
                    reasoning=f"Multiple keyword matches for {intent.value}"
                )
            elif matches == 1:
                return IntentClassification(
                    intent=intent,
                    confidence=0.75,
                    reasoning=f"Keyword match for {intent.value}"
                )
        return None
    
    async def _classify_with_llm(
        self,
        message: str,
        context: Dict[str, Any]
    ) -> IntentClassification:
        """Use LLM for intent classification."""
        from app.core.ai.providers.gemini import GeminiProvider
        
        llm = GeminiProvider()
        
        recent_topics = context.get("recent_topics", [])
        has_document = context.get("document_id") is not None
        
        prompt = f"""Classify the user's intent into exactly one category.

User Message: "{message}"
Context:
- Has active document: {has_document}
- Recent topics: {recent_topics[:3] if recent_topics else "None"}

Categories:
1. tutor - General learning questions, explanations, Socratic teaching, homework help
2. document - Analyze uploaded files, extract information from PDFs, summarize documents
3. quiz - Create quizzes, generate flashcards, make test questions, practice problems
4. workflow - Complex multi-step tasks like "analyze this document and create a study plan"

Respond with ONLY valid JSON (no markdown):
{{"intent": "tutor|document|quiz|workflow", "confidence": 0.0-1.0, "reasoning": "brief explanation"}}"""

        response = await llm.generate(
            prompt=prompt,
            model="gemini-1.5-flash",
            temperature=0.0
        )
        
        # Parse JSON response - handle ProviderResponse object
        try:
            # Get text content from response object
            response_text = response.content if hasattr(response, 'content') else str(response)
            
            # Clean response - remove markdown code blocks if present
            cleaned = response_text.strip()
            if cleaned.startswith("```"):
                cleaned = re.sub(r"```(?:json)?\n?", "", cleaned)
                cleaned = cleaned.strip()
            
            data = json.loads(cleaned)
            return IntentClassification(
                intent=IntentType(data["intent"]),
                confidence=float(data.get("confidence", 0.7)),
                reasoning=data.get("reasoning", "LLM classification")
            )
        except (json.JSONDecodeError, KeyError, ValueError) as e:
            self.logger.warning("failed_to_parse_llm_response", error=str(e), response=str(response))
            # Fallback
            return IntentClassification(
                intent=IntentType.LEARNING,
                confidence=0.5,
                reasoning="Failed to parse LLM response, defaulting to tutor"
            )


# Convenience function
async def classify_intent(
    message: str,
    context: Optional[Dict[str, Any]] = None
) -> IntentClassification:
    """Convenience function for intent classification."""
    router = IntentRouter()
    return await router.classify(message, context)
