"""
Upload / Asset schemas.

Extracted from rest/uploads.py.
"""

from pydantic import BaseModel, Field


class UploadResponse(BaseModel):
    """Asset upload response."""
    url: str = Field(..., description="URL to access the uploaded asset")
    filename: str = Field(..., description="Original filename")
    size: int = Field(..., description="File size in bytes")
