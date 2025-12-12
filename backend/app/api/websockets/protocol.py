"""
WebSocket protocol definitions.

Message types and protocol structures for WebSocket communication.
"""

from enum import Enum
from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, Field


class MessageType(str, Enum):
    """WebSocket message types."""
    # Client → Server
    MESSAGE = "message"
    PING = "ping"
    SUBSCRIBE = "subscribe"
    UNSUBSCRIBE = "unsubscribe"

    # Server → Client
    TOKEN = "token"
    TOOL_CALL = "tool_call"
    TOOL_RESULT = "tool_result"
    METADATA = "metadata"
    DONE = "done"
    ERROR = "error"
    PONG = "pong"


class WebSocketMessage(BaseModel):
    """Base WebSocket message."""
    type: MessageType
    data: Any
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    request_id: Optional[str] = None


class TokenMessage(BaseModel):
    """Streaming token message."""
    text: str
    model: str


class ToolCallMessage(BaseModel):
    """Tool call message."""
    tool: str
    args: dict


class ToolResultMessage(BaseModel):
    """Tool result message."""
    tool: str
    result: Any
    success: bool


class MetadataMessage(BaseModel):
    """Metadata message."""
    tokens_used: Optional[int] = None
    model_used: Optional[str] = None
    duration_ms: Optional[int] = None


class ErrorMessage(BaseModel):
    """Error message."""
    code: str
    message: str
    details: Optional[dict] = None


class DoneMessage(BaseModel):
    """Completion message."""
    total_tokens: int
    model_used: str
    success: bool
