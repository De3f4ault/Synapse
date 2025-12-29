"""
Chat schemas.

"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ChatSessionCreate(BaseModel):
    """Chat session creation schema."""

    title: Optional[str] = Field(
        default=None, max_length=500, description="Session title (auto-generated if not provided)"
    )
    document_id: Optional[int] = Field(default=None, description="Document ID to chat about")
    context_modules: List[str] = Field(
        default_factory=list, description="Modules to include in context"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "title": "Biology Study Session",
                "document_id": None,
                "context_modules": ["flashcards", "notes"],
            }
        }


class ChatSessionResponse(BaseModel):
    """Chat session response schema."""

    id: int = Field(description="Session ID")
    user_id: int = Field(description="Owner user ID")
    title: str = Field(description="Session title")
    document_id: Optional[int] = Field(default=None, description="Associated document ID")
    context_modules: List[str] = Field(description="Modules in context")
    message_count: int = Field(description="Number of messages")
    total_tokens_used: int = Field(description="Total tokens used")
    total_cost: float = Field(description="Total cost (estimated)")
    created_at: datetime = Field(description="Creation time")
    updated_at: datetime = Field(description="Last message time")

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "user_id": 1,
                "title": "Biology Study Session",
                "document_id": None,
                "context_modules": ["flashcards", "notes"],
                "message_count": 12,
                "total_tokens_used": 15000,
                "total_cost": 0.015,
                "created_at": "2025-11-06T10:00:00Z",
                "updated_at": "2025-11-06T12:00:00Z",
            }
        }


class ChatMessageCreate(BaseModel):
    """Chat message creation schema."""

    session_id: int = Field(description="Session ID")
    content: str = Field(min_length=1, max_length=50000, description="Message content")

    class Config:
        json_schema_extra = {
            "example": {"session_id": 1, "content": "Can you explain photosynthesis?"}
        }


# Added function_calls and grounding_sources
class ChatMessageResponse(BaseModel):
    """Chat message response schema."""

    id: int = Field(description="Message ID")
    session_id: int = Field(description="Session ID")
    role: str = Field(description="Message role (user, assistant, system)")
    content: str = Field(description="Message content")
    tokens: int = Field(description="Tokens in message")
    model_used: Optional[str] = Field(
        default=None, description="AI model used (for assistant messages)"
    )
    function_calls: Optional[Dict[str, Any]] = Field(
        default=None, description="Function calls made"
    )
    grounding_sources: Optional[Dict[str, Any]] = Field(
        default=None, description="Grounding sources"
    )
    created_at: datetime = Field(description="Message time")

    # Branching fields
    parent_message_id: Optional[int] = Field(
        default=None, description="Parent message ID (for branched messages)"
    )
    version: int = Field(default=1, description="Message version (increments on edit/regenerate)")
    is_active: bool = Field(default=True, description="Whether message is on active branch")
    has_children: bool = Field(default=False, description="Whether message has child messages")

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "session_id": 1,
                "role": "assistant",
                "content": "Photosynthesis is the process by which plants convert light energy...",
                "tokens": 150,
                "model_used": "gemini-1.5-flash",
                "function_calls": {"search_notes": {"query": "photosynthesis", "results": 3}},
                "grounding_sources": {
                    "sources": [
                        {
                            "type": "note",
                            "id": 5,
                            "title": "Plant Biology Basics",
                            "snippet": "Photosynthesis converts light...",
                        }
                    ]
                },
                "created_at": "2025-11-06T12:00:00Z",
            }
        }


class ChatHistoryResponse(BaseModel):
    """Chat history response schema."""

    session: ChatSessionResponse = Field(description="Session metadata")
    messages: List[ChatMessageResponse] = Field(description="Chat messages")

    class Config:
        json_schema_extra = {
            "example": {
                "session": {
                    "id": 1,
                    "user_id": 1,
                    "title": "Biology Study Session",
                    "message_count": 12,
                    "total_tokens_used": 15000,
                },
                "messages": [
                    {
                        "id": 1,
                        "role": "user",
                        "content": "Can you explain photosynthesis?",
                        "tokens": 8,
                    },
                    {
                        "id": 2,
                        "role": "assistant",
                        "content": "Photosynthesis is...",
                        "tokens": 150,
                        "model_used": "gemini-1.5-flash",
                    },
                ],
            }
        }


# ============================================================================
#  File Upload Schemas
# ============================================================================


class FileUploadResponse(BaseModel):
    """File upload response for chat."""

    id: str = Field(description="File ID")
    filename: str = Field(description="Original filename")
    file_type: str = Field(description="MIME type")
    file_size: int = Field(description="File size in bytes")
    url: str = Field(description="File access URL")
    preview_url: Optional[str] = Field(default=None, description="Preview/thumbnail URL")
    uploaded_at: datetime = Field(description="Upload timestamp")

    class Config:
        json_schema_extra = {
            "example": {
                "id": "123",
                "filename": "study_notes.pdf",
                "file_type": "application/pdf",
                "file_size": 1024000,
                "url": "/api/v1/documents/123",
                "preview_url": "/api/v1/documents/123/preview",
                "uploaded_at": "2025-11-06T12:00:00Z",
            }
        }


# ============================================================================
# Model Selection Schemas
# ============================================================================


class AIModelResponse(BaseModel):
    """AI model information."""

    id: str = Field(description="Model ID")
    name: str = Field(description="Display name")
    description: str = Field(description="Model description")
    capabilities: List[str] = Field(description="Model capabilities")
    max_tokens: int = Field(description="Maximum context tokens")
    supports_vision: bool = Field(description="Supports image input")
    supports_search: bool = Field(description="Supports web search")

    class Config:
        json_schema_extra = {
            "example": {
                "id": "gemini-2.5-flash",
                "name": "Gemini 2.5 Flash",
                "description": "Fast and efficient model",
                "capabilities": ["text", "code", "reasoning"],
                "max_tokens": 8192,
                "supports_vision": False,
                "supports_search": False,
            }
        }


# ============================================================================
# WebSocket Message Schemas
# ============================================================================


class WSChatMessage(BaseModel):
    """WebSocket chat message schema (client -> server)."""

    type: str = Field(
        default="message", pattern="^(message|ping|stop)$", description="Message type"
    )
    content: str = Field(min_length=1, max_length=50000, description="Message content")
    context: Optional[Dict[str, Any]] = Field(default=None, description="Context configuration")

    class Config:
        json_schema_extra = {
            "example": {
                "type": "message",
                "content": "Explain mitochondria",
                "context": {"modules": ["flashcards", "notes"], "focus": "weak_areas"},
            }
        }


#  Added streaming field
class WSChatToken(BaseModel):
    """WebSocket token message schema (server -> client)."""

    type: str = Field(default="token", description="Message type")
    text: str = Field(description="Token text")
    model: str = Field(description="Model used")
    streaming: bool = Field(default=True, description="Is streaming")

    class Config:
        json_schema_extra = {
            "example": {
                "type": "token",
                "text": "Mitochondria",
                "model": "gemini-1.5-flash",
                "streaming": True,
            }
        }


# Thinking process message
class WSChatThinking(BaseModel):
    """WebSocket thinking process message schema (server -> client)."""

    type: str = Field(default="thinking", description="Message type")
    text: str = Field(description="Thinking text")
    model: str = Field(description="Model used")
    streaming: bool = Field(default=True, description="Is streaming")

    class Config:
        json_schema_extra = {
            "example": {
                "type": "thinking",
                "text": "Let me analyze the key concepts...",
                "model": "gemini-2.0-flash-thinking",
                "streaming": True,
            }
        }


# Sources message
class WSChatSources(BaseModel):
    """WebSocket sources message schema (server -> client)."""

    type: str = Field(default="sources", description="Message type")
    sources: List[Dict[str, Any]] = Field(description="Grounding sources")

    class Config:
        json_schema_extra = {
            "example": {
                "type": "sources",
                "sources": [
                    {
                        "type": "note",
                        "id": 5,
                        "title": "Biology Notes",
                        "snippet": "Mitochondria are...",
                    }
                ],
            }
        }


class WSChatToolCall(BaseModel):
    """WebSocket tool call message schema (server -> client)."""

    type: str = Field(default="tool_call", description="Message type")
    tool: str = Field(description="Tool name")
    args: Dict[str, Any] = Field(description="Tool arguments")

    class Config:
        json_schema_extra = {
            "example": {
                "type": "tool_call",
                "tool": "search_flashcards",
                "args": {"query": "mitochondria", "limit": 5},
            }
        }


# Added success, function_calls, grounding_sources
class WSChatComplete(BaseModel):
    """WebSocket complete message schema (server -> client)."""

    type: str = Field(default="complete", description="Message type")
    total_tokens: int = Field(description="Total tokens used")
    model_used: str = Field(description="Model used")
    success: bool = Field(default=True, description="Generation succeeded")
    function_calls: Optional[Dict[str, Any]] = Field(
        default=None, description="Function calls made"
    )
    grounding_sources: Optional[Dict[str, Any]] = Field(
        default=None, description="Grounding sources used"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "type": "complete",
                "total_tokens": 250,
                "model_used": "gemini-1.5-flash",
                "success": True,
                "function_calls": {"search_notes": {"results": 3}},
                "grounding_sources": {"sources": [{"type": "note", "id": 5}]},
            }
        }


class WSChatError(BaseModel):
    """WebSocket error message schema (server -> client)."""

    type: str = Field(default="error", description="Message type")
    code: str = Field(description="Error code")
    message: str = Field(description="Error message")
    details: Optional[Dict[str, Any]] = Field(default=None, description="Error details")

    class Config:
        json_schema_extra = {
            "example": {
                "type": "error",
                "code": "QUOTA_EXCEEDED",
                "message": "Gemini quota exceeded",
                "details": {"retry_after": "2025-11-07T00:00:00Z"},
            }
        }


class WSChatConnected(BaseModel):
    """WebSocket connected message schema (server -> client)."""

    type: str = Field(default="connected", description="Message type")
    session_id: int = Field(description="Session ID")
    user_id: int = Field(description="User ID")

    class Config:
        json_schema_extra = {"example": {"type": "connected", "session_id": 1, "user_id": 42}}


class WSChatPong(BaseModel):
    """WebSocket pong message schema (server -> client)."""

    type: str = Field(default="pong", description="Message type")

    class Config:
        json_schema_extra = {"example": {"type": "pong"}}
