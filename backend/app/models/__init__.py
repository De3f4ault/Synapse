"""
SQLAlchemy ORM models package.

This package contains all database models for the SYNAPSE application.
All models inherit from Base and use SQLAlchemy 2.0 patterns.

Import this module to access all models and the Base class for migrations:
    from app.models import Base, User, Deck, Flashcard, ...
"""

# Base and mixins
from .base import Base
from .mixins import TimestampMixin, SoftDeleteMixin, UserOwnedMixin

# User model
from .user import User

# Flashcard models
from .deck import Deck
from .flashcard import Flashcard, LearningState
from .review import Review

# Note models
from .note import Note, NoteFormat
from .note_version import NoteVersion
from .tag import Tag

# Document models
from .document import Document, ProcessingStatus
from .document_chunk import DocumentChunk

# Quiz models
from .quiz import Quiz, QuizSourceType, QuizDifficulty
from .quiz_question import QuizQuestion, QuestionType
from .quiz_attempt import QuizAttempt

# Chat models
from .chat_session import ChatSession
from .chat_message import ChatMessage, MessageRole

# Study session model
from .study_session import StudySession, StudySessionType

# AI tracking models
from .ai_usage import AIUsage
from .webhook_event import WebhookEvent, WebhookStatus

# Export all models and Base for Alembic migrations
__all__ = [
    # Base
    "Base",

    # Mixins
    "TimestampMixin",
    "SoftDeleteMixin",
    "UserOwnedMixin",

    # User
    "User",

    # Flashcards
    "Deck",
    "Flashcard",
    "LearningState",
    "Review",

    # Notes
    "Note",
    "NoteFormat",
    "NoteVersion",
    "Tag",

    # Documents
    "Document",
    "ProcessingStatus",
    "DocumentChunk",

    # Quizzes
    "Quiz",
    "QuizSourceType",
    "QuizDifficulty",
    "QuizQuestion",
    "QuestionType",
    "QuizAttempt",

    # Chat
    "ChatSession",
    "ChatMessage",
    "MessageRole",

    # Study
    "StudySession",
    "StudySessionType",

    # AI Tracking
    "AIUsage",
    "WebhookEvent",
    "WebhookStatus",
]
