"""
Chat Module — Public Interface

This is the PUBLIC CONTRACT for the Chat module.
Other modules may ONLY import from this file.

Rules:
- NO implementation logic
- NO FastAPI router definitions
- ONLY: DTOs, Events, Protocols, Lifecycle hooks
"""

from datetime import datetime
from typing import List, Optional, Protocol

# -----------------------------------------------------------------------------
# PUBLIC DTOs (re-exported from schemas)
# -----------------------------------------------------------------------------
# We reference existing schemas — no duplication
from app.schemas.chat import (
    ChatSessionCreate,
    ChatSessionResponse,
    ChatMessageCreate,
    ChatMessageResponse,
    NotesMessageCreate,
)

# -----------------------------------------------------------------------------
# MODELS (TEMPORARY MIGRATION EXPORTS)
# -----------------------------------------------------------------------------
# These exports exist ONLY for the migration period.
# External code that needs Chat models should import from HERE, not from
# internal/models.py directly. This tracks boundary violations explicitly.
#
# TODO: Remove these exports once all routes are migrated to api.py
from .internal.models import (
    ChatSession,
    ChatMessage,
    ChatThread,
    MessageRole,
)


# -----------------------------------------------------------------------------
# EVENTS (Cross-module communication)
# -----------------------------------------------------------------------------
from pydantic import BaseModel, Field


class ChatSessionCreatedEvent(BaseModel):
    """Emitted when a new chat session is created."""

    user_id: int
    session_id: int
    title: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class MessageSentEvent(BaseModel):
    """Emitted when a message is sent (user or assistant)."""

    user_id: int
    session_id: int
    message_id: int
    role: str  # "user" | "assistant"
    tokens: int
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ConversationBranchedEvent(BaseModel):
    """Emitted when a conversation branches (edit/regenerate)."""

    user_id: int
    session_id: int
    parent_message_id: int
    new_message_id: int
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# -----------------------------------------------------------------------------
# SERVICE PROTOCOL (What other modules can depend on)
# -----------------------------------------------------------------------------


class IChatService(Protocol):
    """
    Public contract for the Chat service.

    Other modules should depend on this Protocol, not the concrete implementation.
    """

    async def create_session(self, user_id: int, data: ChatSessionCreate) -> ChatSessionResponse:
        """Create a new chat session."""
        ...

    async def get_session(self, session_id: int, user_id: int) -> Optional[ChatSessionResponse]:
        """Get a chat session by ID."""
        ...

    async def list_sessions(
        self, user_id: int, page: int = 1, page_size: int = 20
    ) -> List[ChatSessionResponse]:
        """List user's chat sessions with pagination."""
        ...

    async def send_message(
        self, session_id: int, user_id: int, content: str
    ) -> ChatMessageResponse:
        """Send a message and receive AI response."""
        ...

    async def delete_session(self, session_id: int, user_id: int) -> bool:
        """Soft delete a chat session."""
        ...


# -----------------------------------------------------------------------------
# LIFECYCLE HOOKS (Module bootstrap)
# -----------------------------------------------------------------------------


def register(app, event_bus=None) -> None:
    """
    Register this module's routes and event subscriptions.

    Called during application bootstrap.
    """
    from .api import router

    app.include_router(router, prefix="/api/v1/chat", tags=["chat"])

    # Event subscriptions would be registered here
    # if event_bus:
    #     event_bus.subscribe(SomeEvent, handler)


async def startup() -> None:
    """Called when the application starts."""
    pass


async def shutdown() -> None:
    """Called when the application shuts down."""
    pass


# -----------------------------------------------------------------------------
# MODULE EXPORTS
# -----------------------------------------------------------------------------
__all__ = [
    # DTOs
    "ChatSessionCreate",
    "ChatSessionResponse",
    "ChatMessageCreate",
    "ChatMessageResponse",
    "NotesMessageCreate",
    # Models (TEMPORARY - for migration)
    "ChatSession",
    "ChatMessage",
    "ChatThread",
    "MessageRole",
    # Events
    "ChatSessionCreatedEvent",
    "MessageSentEvent",
    "ConversationBranchedEvent",
    # Protocol
    "IChatService",
    # Lifecycle
    "register",
    "startup",
    "shutdown",
]
