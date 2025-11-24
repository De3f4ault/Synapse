"""
WebSocket message types.
Added all new message types
Thinking, sources, complete message types
"""

from typing import Dict, Any, List, Optional, Union
from enum import Enum


class WebSocketState(str, Enum):
    """WebSocket connection states."""
    CONNECTING = "connecting"
    CONNECTED = "connected"
    DISCONNECTED = "disconnected"
    ERROR = "error"


class MessageType(str, Enum):
    """WebSocket message types."""
    # Connection
    CONNECTED = "connected"
    PONG = "pong"

    # Chat messages
    MESSAGE = "message"
    TOKEN = "token"
    THINKING = "thinking"
    SOURCES = "sources"
    TOOL_CALL = "tool_call"
    COMPLETE = "complete"
    STOPPED = "stopped"

    # Control
    PING = "ping"
    STOP = "stop"
    ERROR = "error"
    DONE = "done"  # Alias for COMPLETE


# ============================================================================
# Chat WebSocket Messages (Server -> Client)
# ============================================================================

class WSConnectedMessage:
    """WebSocket connected message."""
    type: str = "connected"
    session_id: int
    user_id: int


class WSTokenMessage:
    """WebSocket token message (streaming response)."""
    type: str = "token"
    text: str
    model: str
    streaming: bool = True


class WSThinkingMessage:
    """WebSocket thinking process message."""
    type: str = "thinking"
    text: str
    model: str
    streaming: bool = True


class WSSourcesMessage:
    """WebSocket sources message (grounding sources)."""
    type: str = "sources"
    sources: List[Dict[str, Any]]


class WSToolCallMessage:
    """WebSocket tool call message."""
    type: str = "tool_call"
    tool: str
    args: Dict[str, Any]


class WSCompleteMessage:
    """WebSocket completion message."""
    type: str = "complete"
    total_tokens: int
    model_used: str
    success: bool = True
    function_calls: Optional[Dict[str, Any]] = None
    grounding_sources: Optional[Dict[str, Any]] = None


class WSStoppedMessage:
    """WebSocket stopped message (generation stopped by user)."""
    type: str = "stopped"
    message: str


class WSErrorMessage:
    """WebSocket error message."""
    type: str = "error"
    code: str
    message: str
    details: Optional[Dict[str, Any]] = None


class WSPongMessage:
    """WebSocket pong message (response to ping)."""
    type: str = "pong"


# Union type for all server messages
ChatWSMessage = Union[
    WSConnectedMessage,
    WSTokenMessage,
    WSThinkingMessage,
    WSSourcesMessage,
    WSToolCallMessage,
    WSCompleteMessage,
    WSStoppedMessage,
    WSErrorMessage,
    WSPongMessage
]


# ============================================================================
# Chat Client Messages (Client -> Server)
# ============================================================================

class WSClientMessage:
    """WebSocket client message (user sending message)."""
    type: str = "message"
    content: str
    context: Optional[Dict[str, Any]] = None


class WSClientPing:
    """WebSocket client ping."""
    type: str = "ping"


class WSClientStop:
    """WebSocket client stop (stop generation)."""
    type: str = "stop"


# Union type for all client messages
ChatClientMessage = Union[
    WSClientMessage,
    WSClientPing,
    WSClientStop
]


# ============================================================================
# Study WebSocket Messages (for future implementation)
# ============================================================================

class StudyWSConnectedMessage:
    """Study WebSocket connected message."""
    type: str = "connected"
    session_id: int


class StudyWSItemUpdateMessage:
    """Study item update message."""
    type: str = "item_update"
    item_id: int
    item_type: str
    data: Dict[str, Any]


class StudyWSSessionUpdateMessage:
    """Study session update message."""
    type: str = "session_update"
    session_id: int
    items_completed: int
    items_correct: int


class StudyWSErrorMessage:
    """Study WebSocket error message."""
    type: str = "error"
    message: str


# Union type for study server messages
StudyWSMessage = Union[
    StudyWSConnectedMessage,
    StudyWSItemUpdateMessage,
    StudyWSSessionUpdateMessage,
    StudyWSErrorMessage
]


# ============================================================================
# Study Client Messages
# ============================================================================

class StudyClientItemCompleted:
    """Study client item completed message."""
    type: str = "item_completed"
    item_id: int
    correct: bool
    time_taken_ms: int


class StudyClientSessionPause:
    """Study client session pause message."""
    type: str = "session_pause"


class StudyClientSessionResume:
    """Study client session resume message."""
    type: str = "session_resume"


# Union type for study client messages
StudyClientMessage = Union[
    StudyClientItemCompleted,
    StudyClientSessionPause,
    StudyClientSessionResume
]


# ============================================================================
# WebSocket Options
# ============================================================================

class WebSocketOptions:
    """WebSocket connection options."""

    def __init__(
        self,
        auto_reconnect: bool = True,
        reconnect_delay: int = 3000,
        max_reconnect_attempts: int = 5,
        connection_timeout: int = 10000
    ):
        self.auto_reconnect = auto_reconnect
        self.reconnect_delay = reconnect_delay
        self.max_reconnect_attempts = max_reconnect_attempts
        self.connection_timeout = connection_timeout
