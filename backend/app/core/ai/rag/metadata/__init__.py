"""Metadata package initialization."""

from app.core.ai.rag.metadata.topic_tagger import TopicTagger
from app.core.ai.rag.metadata.difficulty_classifier import DifficultyClassifier

__all__ = [
    "TopicTagger",
    "DifficultyClassifier",
]
