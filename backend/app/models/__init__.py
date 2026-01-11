"""
Database Models Package

All SQLAlchemy ORM models are exported from here.

UPDATED: Added ActivityLog model.
UPDATED: Added SynapseTask for Celery task tracking.
"""

from .base import Base
from .user import User
from .deck import Deck
from .flashcard import Flashcard
from .review import Review
from .note import Note
from .note_version import NoteVersion
from .document import Document
from .document_chunk import DocumentChunk
from .quiz import Quiz
from .quiz_question import QuizQuestion
from .quiz_attempt import QuizAttempt
from .chat_session import ChatSession
from .chat_message import ChatMessage
from .study_session import StudySession
from .activity_log import ActivityLog, ActivityType, ModuleType
from .tag import Tag
from .ai_usage import AIUsage
from .agent_metric import AgentMetric
from .webhook_event import WebhookEvent, WebhookStatus
from .webhook import Webhook
from .link import Link, LinkType, EntityType
from .synapse_task import SynapseTask, TaskStatus, TaskType, TaskName

from .intelligence import IntelligenceAdaptationLog
from .ranking_weight import RankingWeight

__all__ = [
    "Base",
    "User",
    "Deck",
    "Flashcard",
    "Review",
    "Note",
    "NoteVersion",
    "Document",
    "DocumentChunk",
    "Quiz",
    "QuizQuestion",
    "QuizAttempt",
    "ChatSession",
    "ChatMessage",
    "StudySession",
    "ActivityLog",
    "ActivityType",
    "ModuleType",
    "Tag",
    "AIUsage",
    "AgentMetric",
    "WebhookEvent",
    "WebhookStatus",
    "Webhook",
    "Link",
    "LinkType",
    "EntityType",
    "SynapseTask",
    "TaskStatus",
    "TaskType",
    "TaskName",
    "IntelligenceAdaptationLog",
    "RankingWeight",
]
