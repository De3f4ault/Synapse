"""
Chat thread schemas.

Pydantic schemas for thread (topic isolation) operations.
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


# ============================================================================
# Thread Schemas
# ============================================================================


class ThreadCreate(BaseModel):
    """Create a new thread from a message."""

    session_id: int = Field(description="Session to create thread in")
    root_message_id: Optional[int] = Field(
        default=None, description="Message that spawned this thread (for context)"
    )
    title: Optional[str] = Field(
        default=None, max_length=500, description="Thread title (auto-generated if not provided)"
    )

    class Config:
        json_schema_extra = {
            "example": {"session_id": 1, "root_message_id": 42, "title": "Deep dive into B-trees"}
        }


class ThreadUpdate(BaseModel):
    """Update thread metadata."""

    title: Optional[str] = Field(default=None, max_length=500, description="New thread title")
    summary: Optional[str] = Field(default=None, description="Thread summary")


class ThreadResponse(BaseModel):
    """Thread response schema."""

    id: int = Field(description="Thread ID")
    session_id: int = Field(description="Parent session ID")
    created_from_message_id: Optional[int] = Field(default=None, description="Origin message ID")
    title: str = Field(description="Thread title")
    summary: Optional[str] = Field(default=None, description="Thread summary")
    message_count: int = Field(description="Number of messages in thread")
    created_at: datetime = Field(description="Creation timestamp")
    updated_at: datetime = Field(description="Last update timestamp")

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "session_id": 1,
                "created_from_message_id": 42,
                "title": "Deep dive into B-trees",
                "summary": "Discussion about B-tree data structures...",
                "message_count": 5,
                "created_at": "2026-01-20T10:00:00Z",
                "updated_at": "2026-01-20T10:30:00Z",
            }
        }


class ThreadMessageCreate(BaseModel):
    """Create a message in a thread."""

    content: str = Field(min_length=1, description="Message content")

    class Config:
        json_schema_extra = {"example": {"content": "Can you explain the insertion algorithm?"}}


class ThreadListResponse(BaseModel):
    """List of threads in a session."""

    threads: List[ThreadResponse] = Field(description="List of threads")
    total: int = Field(description="Total number of threads")

    class Config:
        json_schema_extra = {
            "example": {
                "threads": [
                    {
                        "id": 1,
                        "session_id": 1,
                        "title": "Deep dive into B-trees",
                        "message_count": 5,
                        "created_at": "2026-01-20T10:00:00Z",
                        "updated_at": "2026-01-20T10:30:00Z",
                    }
                ],
                "total": 1,
            }
        }
