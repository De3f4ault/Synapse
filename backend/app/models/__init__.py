"""
Database Models Package

All SQLAlchemy ORM models are exported from here.

UPDATED: Added ActivityLog model.
UPDATED: Added SynapseTask for Celery task tracking.
UPDATED: Added DMS classification models (Phase 3) and saved views (Phase 4).
"""

from .base import Base
from .user import User
from .deck_collection import DeckCollection
from .deck import Deck
from .flashcard import Flashcard
from .review import Review
from .note import Note
from .note_version import NoteVersion
# DMS: document_tags MUST be imported before Document
# so the Table is registered in Base.metadata for relationship resolution.
from .document_tags import document_tags
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
from .link import Link, LinkType, LinkEntityType
from .synapse_task import SynapseTask, TaskStatus, TaskType, TaskName

from .intelligence import IntelligenceAdaptationLog
from .ranking_weight import RankingWeight
from .notification import Notification, NotificationType, NotificationCategory, NotificationStatus

# DMS Classification (Phase 3)
from .matching import MatchingAlgorithm
from .correspondent import Correspondent
from .document_type import DocumentType
from .storage_path import StoragePath

# DMS Search (Phase 4)
from .saved_view import SavedView, SavedViewFilterRule, FilterRuleType

# DMS Workflows (Phase 5)
from .workflow import (
    Workflow, WorkflowTrigger, WorkflowAction, WorkflowRun,
    WorkflowTriggerType, WorkflowActionType, DocumentSource,
    workflow_triggers_assoc, workflow_actions_assoc,
)

# DMS Permissions (Phase 6)
from .document_permission import DocumentPermission, ShareLink, PermissionLevel

# DMS Document Notes (Phase 8 — Sprint 8)
from .document_note import DocumentNote

# Agentic Learning Loop
from .concept_mastery import ConceptMastery

# Sprint 1/4/6 — Flashcard provenance + prerequisite graph
from .card_source import CardSource
from .card_prerequisite import CardPrerequisite

__all__ = [
    "Base",
    "User",
    "DeckCollection",
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
    "LinkEntityType",
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
    # DMS Classification (Phase 3)
    "document_tags",
    "MatchingAlgorithm",
    "Correspondent",
    "DocumentType",
    "StoragePath",
    # DMS Search (Phase 4)
    "SavedView",
    "SavedViewFilterRule",
    "FilterRuleType",
    # DMS Workflows (Phase 5)
    "Workflow",
    "WorkflowTrigger",
    "WorkflowAction",
    "WorkflowRun",
    "WorkflowTriggerType",
    "WorkflowActionType",
    "DocumentSource",
    "workflow_triggers_assoc",
    "workflow_actions_assoc",
    # DMS Permissions (Phase 6)
    "DocumentPermission",
    "ShareLink",
    "PermissionLevel",
    # DMS Document Notes (Phase 8)
    "DocumentNote",
    # Agentic Learning Loop
    "ConceptMastery",
    # Flashcard Provenance + Prerequisites (Sprint 4/6)
    "CardSource",
    "CardPrerequisite",
]
