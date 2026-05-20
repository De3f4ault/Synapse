"""
Common base schemas used across the application.
"""

from typing import Any, Dict, Generic, Optional, TypeVar
from pydantic import BaseModel, Field


T = TypeVar("T")


class APIResponse(BaseModel, Generic[T]):
    """Standard API response wrapper."""

    success: bool = Field(description="Whether the request was successful")
    data: Optional[T] = Field(default=None, description="Response data")
    error: Optional[str] = Field(default=None, description="Error message if failed")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Additional metadata")

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "data": {"id": 1, "name": "Example"},
                "error": None,
                "metadata": {"total": 100, "page": 1}
            }
        }


class MessageResponse(BaseModel):
    """Simple message response."""

    message: str = Field(description="Response message")

    class Config:
        json_schema_extra = {
            "example": {
                "message": "Operation completed successfully"
            }
        }
