"""
Document permission service.

Sourced from Paperless-ngx permissions.py:
  - get_objects_for_user_owner_aware() L151-160  → get_accessible_query()
  - has_perms_owner_aware() L163-165             → has_permission()
  - set_permissions_for_object() L64-129         → set_permissions()

Three-tier document visibility:
  1. Documents owned by user (user_id match)
  2. Documents with no owner (user_id IS NULL — public)
  3. Documents with explicit ACL grant (DocumentPermission row)
"""

import logging
from typing import Optional

from sqlalchemy import select, and_, or_, delete, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document
from app.models.document_permission import (
    DocumentPermission,
    PermissionLevel,
)

logger = logging.getLogger(__name__)


class PermissionService:
    """
    Document permission management.

    Provides the 3-tier access model from Paperless-ngx:
      - Owner access (user_id match)
      - Public access (user_id IS NULL)
      - ACL access (DocumentPermission grants)
    """

    def __init__(self, session: AsyncSession):
        self.session = session

    # ------------------------------------------------------------------
    # Query builder — returns a Select for composability
    # ------------------------------------------------------------------

    def get_accessible_query(self, user_id: int):
        """
        Return a SELECT statement for all documents accessible by user.

        Sourced from Paperless permissions.py L151-160
        get_objects_for_user_owner_aware().

        Returns a Select (NOT results) so callers can chain
        .where(), .order_by(), .offset(), .limit() on top.
        """
        acl_subquery = (
            select(DocumentPermission.document_id)
            .where(
                DocumentPermission.user_id == user_id,
                DocumentPermission.permission.in_(
                    [PermissionLevel.VIEW.value, PermissionLevel.CHANGE.value]
                ),
            )
        )

        return select(Document).where(
            and_(
                Document.deleted_at.is_(None),
                or_(
                    Document.user_id == user_id,        # Tier 1: Owner
                    Document.user_id.is_(None),          # Tier 2: Public
                    Document.id.in_(acl_subquery),       # Tier 3: ACL
                ),
            )
        )

    # ------------------------------------------------------------------
    # Single-object permission check
    # ------------------------------------------------------------------

    async def has_permission(
        self,
        user_id: int,
        document_id: int,
        permission: str = "view",
    ) -> bool:
        """
        Check if user has specific permission on a document.

        Sourced from Paperless permissions.py L163-165
        has_perms_owner_aware().

        Args:
            user_id: The user requesting access.
            document_id: Target document ID.
            permission: 'view' or 'change'.

        Returns:
            True if user has the requested permission.
        """
        # Load document
        result = await self.session.execute(
            select(Document).where(
                and_(Document.id == document_id, Document.deleted_at.is_(None))
            )
        )
        doc = result.scalar_one_or_none()
        if not doc:
            return False

        # Tier 1: Owner has full access
        if doc.user_id == user_id:
            return True

        # Tier 2: Unowned documents are public
        if doc.user_id is None:
            return True

        # Tier 3: Check ACL
        # "change" permission implies "view" (Paperless L97-103)
        perm_values = [PermissionLevel.CHANGE.value]
        if permission == "view":
            perm_values.append(PermissionLevel.VIEW.value)

        acl = await self.session.execute(
            select(DocumentPermission).where(
                and_(
                    DocumentPermission.document_id == document_id,
                    DocumentPermission.user_id == user_id,
                    DocumentPermission.permission.in_(perm_values),
                )
            )
        )
        return acl.scalar_one_or_none() is not None

    # ------------------------------------------------------------------
    # Permission management
    # ------------------------------------------------------------------

    async def set_permissions(
        self,
        document_id: int,
        permissions: dict,
        *,
        merge: bool = False,
    ):
        """
        Set permissions for a document.

        Sourced from Paperless permissions.py L64-129
        set_permissions_for_object().

        Args:
            document_id: Target document.
            permissions: {"view": {"users": [1,3]}, "change": {"users": [2]}}
            merge: If True, add to existing. If False, replace all.
        """
        if not merge:
            # Delete existing permissions for this document
            await self.session.execute(
                delete(DocumentPermission).where(
                    DocumentPermission.document_id == document_id
                )
            )
            await self.session.flush()

        for action, entry in permissions.items():
            user_ids = entry.get("users", [])
            for uid in user_ids:
                # Add the specified permission
                perm = DocumentPermission(
                    document_id=document_id,
                    user_id=uid,
                    permission=action,
                )
                self.session.add(perm)

                # "change" automatically grants "view" (Paperless L97-103)
                if action == PermissionLevel.CHANGE.value:
                    view_perm = DocumentPermission(
                        document_id=document_id,
                        user_id=uid,
                        permission=PermissionLevel.VIEW.value,
                    )
                    self.session.add(view_perm)

        await self.session.flush()

    async def get_document_permissions(self, document_id: int) -> dict:
        """
        Get current permissions for a document.

        Returns:
            {"view": {"users": [1, 3]}, "change": {"users": [2]}}
        """
        result = await self.session.execute(
            select(DocumentPermission).where(
                DocumentPermission.document_id == document_id
            )
        )
        perms = result.scalars().all()

        output = {
            "view": {"users": []},
            "change": {"users": []},
        }
        for perm in perms:
            if perm.user_id and perm.permission in output:
                output[perm.permission]["users"].append(perm.user_id)

        return output

    async def remove_all_permissions(self, document_id: int):
        """Remove all ACL entries for a document."""
        await self.session.execute(
            delete(DocumentPermission).where(
                DocumentPermission.document_id == document_id
            )
        )
        await self.session.flush()
