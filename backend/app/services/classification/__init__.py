"""
Classification services package.

Provides document auto-classification through:
- Rule-based matching engine (7 algorithms)
- AI classifier (Gemini zero-shot)
- Auto-assignment chain (post-consumption)
"""

from app.services.classification.matching import matches
from app.services.classification.ai_classifier import AIDocumentClassifier
from app.services.classification.auto_assign import auto_classify_document

__all__ = [
    "matches",
    "AIDocumentClassifier",
    "auto_classify_document",
]
