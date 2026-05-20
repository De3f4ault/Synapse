"""
Pydantic schemas for permissions and sharing.

Schemas for:
  - Document permission management (ACL CRUD)
  - Share link creation and access
"""

from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Permission schemas
# ---------------------------------------------------------------------------

class PermissionEntry(BaseModel):
    """List of user IDs for a permission level."""
    users: List[int] = []


class PermissionsSet(BaseModel):
    """Full permission set for a document (view + change levels)."""
    view: PermissionEntry = Field(default_factory=PermissionEntry)
    change: PermissionEntry = Field(default_factory=PermissionEntry)


class DocumentPermissionResponse(BaseModel):
    """Response showing a document's current ACL."""
    document_id: int
    owner_id: Optional[int] = None
    permissions: PermissionsSet

    class Config:
        from_attributes = True


class SetPermissionsRequest(BaseModel):
    """Request to set (replace) or merge permissions on a document."""
    view: PermissionEntry = Field(default_factory=PermissionEntry)
    change: PermissionEntry = Field(default_factory=PermissionEntry)


# ---------------------------------------------------------------------------
# Share link schemas
# ---------------------------------------------------------------------------

class ShareLinkCreate(BaseModel):
    """Request to create a share link."""
    document_id: int
    expires_in_days: int = Field(7, ge=1, le=365)
    file_version: str = Field("archive", pattern=r"^(archive|original)$")


class ShareLinkResponse(BaseModel):
    """Share link details."""
    id: int
    slug: str
    document_id: int
    created_by: Optional[int] = None
    expiration: Optional[datetime] = None
    file_version: str
    url: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
