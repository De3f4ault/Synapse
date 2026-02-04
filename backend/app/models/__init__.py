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
from .document_folder import DocumentFolder, DEFAULT_SYSTEM_FOLDERS
from .quiz import Quiz
from .quiz_question import QuizQuestion
from .quiz_attempt import QuizAttempt
from .question_learning_state import QuestionLearningState

# Chat models moved to app/modules/chat/internal/models.py
from .study_session import StudySession
from .activity_log import (
    ActivityLog,
    ActivityType,
    ModuleType,
    ACTIVITY_CONTRACTS,
    is_learning_activity_type,
)
from .tag import Tag
from .ai_usage import AIUsage
from .agent_metric import AgentMetric
from .webhook_event import WebhookEvent, WebhookStatus
from .webhook import Webhook
from .link import Link, LinkType, EntityType
from .synapse_task import SynapseTask, TaskStatus, TaskType, TaskName

from .intelligence import IntelligenceAdaptationLog
from .ranking_weight import RankingWeight
from .notification import Notification, NotificationType, NotificationCategory, NotificationStatus

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
    "QuestionLearningState",
    # ChatSession, ChatThread, ChatMessage removed - now in modules/chat/internal/models.py
    "StudySession",
    "ActivityLog",
    "ActivityType",
    "ModuleType",
    "ACTIVITY_CONTRACTS",
    "is_learning_activity_type",
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
    "Notification",
    "NotificationType",
    "NotificationCategory",
    "NotificationStatus",
    "DocumentFolder",
    "DEFAULT_SYSTEM_FOLDERS",
]
