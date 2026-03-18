"""
Permission & Sharing models.

Sourced from Paperless-ngx:
  - permissions.py L64-129 (set_permissions_for_object pattern)
  - models.py L720-770 (ShareLink)

Two models:
  - DocumentPermission: Object-level ACL grants (view/change per user)
  - ShareLink: Public share links with slug-based anonymous access
"""

import enum
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    String, Integer, ForeignKey, DateTime, UniqueConstraint, func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class PermissionLevel(str, enum.Enum):
    """
    Permission levels for document access.

    'change' implies 'view' (Paperless permissions.py L97-103).
    """
    VIEW = "view"
    CHANGE = "change"


# ---------------------------------------------------------------------------
# DocumentPermission — Object-level ACL
# ---------------------------------------------------------------------------

class DocumentPermission(Base):
    """
    Object-level permission grant for a specific document.

    Replaces django-guardian's generic object permissions with a
    simple join table scoped to documents.  We only need per-document
    ACLs for now — no generic permission framework required.

    Logic (from Paperless permissions.py L64-129):
      - "change" automatically grants "view"
      - merge=False replaces all existing permissions
      - merge=True adds without removing
    """
    __tablename__ = "document_permissions"

    id: Mapped[int] = mapped_column(
        primary_key=True, autoincrement=True,
    )
    document_id: Mapped[int] = mapped_column(
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    user_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True, index=True,
    )
    group_id: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True, index=True,
        doc="Group-level permission (schema-ready for future groups)",
    )
    permission: Mapped[str] = mapped_column(
        String(20), nullable=False,
        doc="'view' or 'change'. 'change' implies 'view'.",
    )
    created_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=True,
    )

    __table_args__ = (
        UniqueConstraint(
            "document_id", "user_id", "permission",
            name="uq_doc_user_perm",
        ),
    )

    # Relationships
    document = relationship("Document", backref="permissions")
    user = relationship("User", foreign_keys=[user_id])


# ---------------------------------------------------------------------------
# ShareLink — Anonymous access via slug
# ---------------------------------------------------------------------------

class ShareLink(Base):
    """
    Public share link for external/anonymous access to a document.

    Sourced from Paperless models.py L720-770:
      - slug: unique, non-guessable, auto-generated
      - expiration: optional, checked on access
      - file_version: 'archive' (PDF/A) or 'original'
    """
    __tablename__ = "share_links"

    id: Mapped[int] = mapped_column(
        primary_key=True, autoincrement=True,
    )
    document_id: Mapped[int] = mapped_column(
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    slug: Mapped[str] = mapped_column(
        String(64), unique=True, index=True,
        default=lambda: uuid.uuid4().hex[:16],
        doc="Non-guessable URL slug for anonymous access",
    )
    created_by: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    expiration: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True,
        doc="If set, link expires after this time",
    )
    file_version: Mapped[str] = mapped_column(
        String(10), default="archive",
        doc="'archive' (PDF/A) or 'original'",
    )
    created_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=True,
    )

    # Relationships
    document = relationship("Document", backref="share_links")
    creator = relationship("User", foreign_keys=[created_by])
