"""
Event Definitions

All event types and the Event dataclass.
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Dict, Any
from uuid import uuid4


class EventType(str, Enum):
    """
    All event types in SYNAPSE.

    Events follow the pattern: <module>.<resource>.<action>
    """

    # Flashcards events
    CARD_CREATED = "card.created"
    CARD_UPDATED = "card.updated"
    CARD_REVIEWED = "card.reviewed"
    CARD_DELETED = "card.deleted"
    DECK_CREATED = "deck.created"
    DECK_UPDATED = "deck.updated"
    DECK_DELETED = "deck.deleted"

    # Notes events
    NOTE_CREATED = "note.created"
    NOTE_UPDATED = "note.updated"
    NOTE_DELETED = "note.deleted"
    NOTE_VERSION_CREATED = "note.version.created"

    # Documents events
    DOCUMENT_UPLOADED = "document.uploaded"
    DOCUMENT_PROCESSING_STARTED = "document.processing.started"
    DOCUMENT_PROCESSED = "document.processed"
    DOCUMENT_PROCESSING_FAILED = "document.processing.failed"
    DOCUMENT_DELETED = "document.deleted"

    # Quizzes events
    QUIZ_CREATED = "quiz.created"
    QUIZ_STARTED = "quiz.started"
    QUIZ_COMPLETED = "quiz.completed"
    QUIZ_DELETED = "quiz.deleted"

    # Chat events
    CHAT_MESSAGE_SENT = "chat.message.sent"
    CHAT_SESSION_CREATED = "chat.session.created"
    CHAT_SESSION_ENDED = "chat.session.ended"

    # Study events
    STUDY_SESSION_STARTED = "study.session.started"
    STUDY_SESSION_COMPLETED = "study.session.completed"
    STUDY_ITEM_REVIEWED = "study.item.reviewed"

    # User events
    USER_REGISTERED = "user.registered"
    USER_LOGIN = "user.login"
    USER_LOGOUT = "user.logout"
    USER_UPDATED = "user.updated"

    # AI events
    AI_QUOTA_WARNING = "ai.quota.warning"
    AI_QUOTA_EXHAUSTED = "ai.quota.exhausted"
    AI_GENERATION_STARTED = "ai.generation.started"
    AI_GENERATION_COMPLETED = "ai.generation.completed"
    AI_GENERATION_FAILED = "ai.generation.failed"

    # Agent events
    AGENT_EXECUTION_STARTED = "agent.execution.started"
    AGENT_EXECUTION_COMPLETED = "agent.execution.completed"
    AGENT_EXECUTION_FAILED = "agent.execution.failed"
    AGENT_TOOL_CALLED = "agent.tool.called"

    # System events
    SYSTEM_ERROR = "system.error"
    CACHE_INVALIDATED = "cache.invalidated"
    ANALYTICS_UPDATED = "analytics.updated"


@dataclass
class Event:
    """
    Event object containing notification and state.

    Events are the fundamental unit of communication in SYNAPSE's
    event-driven architecture.
    """

    # Event identification
    type: EventType
    event_id: str = field(default_factory=lambda: str(uuid4()))
    timestamp: datetime = field(default_factory=datetime.utcnow)

    # Event context
    user_id: int = None  # User who triggered the event (if applicable)
    data: Dict[str, Any] = field(default_factory=dict)

    # Metadata
    source: str = None  # Source module/service that emitted event
    correlation_id: str = None  # For tracking related events

    def to_dict(self) -> Dict[str, Any]:
        """Convert event to dictionary for serialization"""
        return {
            "event_id": self.event_id,
            "type": self.type.value,
            "timestamp": self.timestamp.isoformat(),
            "user_id": self.user_id,
            "data": self.data,
            "source": self.source,
            "correlation_id": self.correlation_id,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Event":
        """Create event from dictionary"""
        return cls(
            type=EventType(data["type"]),
            event_id=data.get("event_id", str(uuid4())),
            timestamp=datetime.fromisoformat(data["timestamp"])
                if isinstance(data.get("timestamp"), str)
                else data.get("timestamp", datetime.utcnow()),
            user_id=data.get("user_id"),
            data=data.get("data", {}),
            source=data.get("source"),
            correlation_id=data.get("correlation_id"),
        )

    def __str__(self) -> str:
        return f"Event({self.type.value}, user={self.user_id}, id={self.event_id[:8]})"
