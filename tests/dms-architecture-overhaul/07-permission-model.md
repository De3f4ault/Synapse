# 07 — Permission Model

> **Goal**: Replace `user_id` scoping with ownership + object-level ACLs + sharing.

---

## Source of Truth: Paperless Implementation

### Key Paperless Files

| File | Lines | What We're Sourcing |
|---|---|---|
| [permissions.py](file:///home/de3f4ault/Desktop/Projects/synapse/tests/paperless-ngx/src/documents/permissions.py) | 223 | `PaperlessObjectPermissions`, `set_permissions_for_object()`, `get_objects_for_user_owner_aware()`, `has_perms_owner_aware()` |
| [index.py](file:///home/de3f4ault/Desktop/Projects/synapse/tests/paperless-ngx/src/documents/index.py) L521-531 | 10 | `get_permissions_criterias()` — search index permission filtering |
| [models.py](file:///home/de3f4ault/Desktop/Projects/synapse/tests/paperless-ngx/src/documents/models.py) L800-870 | 70 | `OwnedObjectModel` base, `ShareLink` model |
| [views.py](file:///home/de3f4ault/Desktop/Projects/synapse/tests/paperless-ngx/src/documents/views.py) L1-80 | 80 | `get_queryset()` — per-view permission filtering with django-guardian |

### Paperless Permission Architecture

Paperless uses **django-guardian** for object-level permissions. The core pattern is a 3-tier access check:

```python
# From permissions.py:19-42
class PaperlessObjectPermissions(DjangoObjectPermissions):
    """Check for object-level permissions or ownership."""

    perms_map = {
        "GET": ["%(app_label)s.view_%(model_name)s"],
        "POST": ["%(app_label)s.add_%(model_name)s"],
        "PUT": ["%(app_label)s.change_%(model_name)s"],
        "PATCH": ["%(app_label)s.change_%(model_name)s"],
        "DELETE": ["%(app_label)s.delete_%(model_name)s"],
    }

    def has_object_permission(self, request, view, obj):
        if hasattr(obj, "owner") and obj.owner is not None:
            if request.user == obj.owner:
                return True              # Owner → always allowed
            else:
                return super().has_object_permission(...)  # Check guardian ACL
        else:
            return True                  # No owner → public
```

### Paperless Document Visibility Query

From [permissions.py:151-160](file:///home/de3f4ault/Desktop/Projects/synapse/tests/paperless-ngx/src/documents/permissions.py#L151-L160):

```python
def get_objects_for_user_owner_aware(user, perms, Model) -> QuerySet:
    """
    Three-tier document visibility:
    1. Documents owned by user
    2. Documents with no owner (public)
    3. Documents where user has explicit guardian permission
    """
    objects_owned = Model.objects.filter(owner=user)
    objects_unowned = Model.objects.filter(owner__isnull=True)
    objects_with_perms = get_objects_for_user(
        user=user, perms=perms, klass=Model, accept_global_perms=False,
    )
    return objects_owned | objects_unowned | objects_with_perms
```

### Paperless Permission Setting

From [permissions.py:64-129](file:///home/de3f4ault/Desktop/Projects/synapse/tests/paperless-ngx/src/documents/permissions.py#L64-L129):

```python
def set_permissions_for_object(permissions: dict, object, *, merge: bool = False):
    """
    Set permissions for an object.
    Input: {"view": {"users": [1,3], "groups": [2]}, "change": {"users": [], "groups": []}}

    Key behavior:
    - "change" automatically grants "view" too
    - merge=False → replaces all existing permissions
    - merge=True → adds to existing without removing
    """
    for action, entry in permissions.items():
        permission = f"{action}_{object.__class__.__name__.lower()}"
        if "users" in entry:
            users_to_add = User.objects.filter(id__in=entry["users"])
            if not merge:
                users_to_remove = get_users_with_perms(object, only_with_perms_in=[permission])
                for user in users_to_remove.exclude(id__in=users_to_add):
                    remove_perm(permission, user, object)
            for user in users_to_add:
                assign_perm(permission, user, object)
                if action == "change":
                    assign_perm(f"view_{object.__class__.__name__.lower()}", user, object)
        # Same pattern for groups...
```

### Paperless Share Links

From `models.py`:

```python
class ShareLink(models.Model):
    created = DateTimeField(auto_now_add=True)
    expiration = DateTimeField(blank=True, null=True)
    slug = CharField(max_length=64, unique=True, default=uuid_random_slug)
    document = ForeignKey(Document, on_delete=CASCADE, related_name="share_links")
    owner = ForeignKey(User, on_delete=CASCADE)
    file_version = CharField(max_length=10, choices=[("archive", "Archive"), ("original", "Original")])
```

---

## Synapse Files Being Modified

| File | Current State | Change |
|---|---|---|
| [documents.py API](file:///home/de3f4ault/Desktop/Projects/synapse/backend/app/api/rest/documents.py) | `user_id` filter hardcoded in every query — zero permission keywords | **Add**: Permission middleware, shared document access |
| [repository.py](file:///home/de3f4ault/Desktop/Projects/synapse/backend/app/modules/documents/repository.py) | `get_documents()` filters by `user_id = current_user.id` | **Replace**: `get_accessible_documents()` with 3-tier visibility |
| [document.py model](file:///home/de3f4ault/Desktop/Projects/synapse/backend/app/models/document.py) | `user_id` FK only | **Add**: `owner_id` alias, relationship to `DocumentPermission` |
| **New file**: `models/document_permission.py` | Does not exist | **Create**: `DocumentPermission`, `ShareLink` |
| **New file**: `services/permissions/service.py` | Does not exist | **Create**: `PermissionService` |
| **New file**: `api/rest/shares.py` | Does not exist | **Create**: Share link endpoints |
| **New file**: `api/middleware/permissions.py` | Does not exist | **Create**: Permission checking middleware |

---

## Current `user_id` Filtering — Migration Map

> [!WARNING]
> The following files currently hardcode `user_id == current_user.id` filtering. Each must be updated to use `PermissionService.get_accessible_documents()` or the `require_document_permission` middleware. This is the complete list from `grep -r "user_id ==" backend/app/`.

### API Layer (endpoints that filter by user_id)

| File | Lines | Pattern | Migration |
|---|---|---|---|
| `api/rest/documents.py` | 17KB | `Document.user_id == current_user.id` in list/get/update/delete | Replace with `PermissionService.get_accessible_documents()` + middleware |
| `api/rest/notes.py` | 20KB | `Note.user_id == current_user.id` in all CRUD endpoints | Add `require_document_permission` dependency |
| `api/rest/flashcards.py` | 14KB | `Flashcard` access via `Deck.user_id == current_user.id` | Keep for now — flashcards are personal until shared study is implemented |
| `api/rest/decks.py` | 14KB | `Deck.user_id == current_user.id` | Keep for now — personal ownership |
| `api/rest/quizzes.py` | 22KB | `Quiz.user_id == current_user.id` in all endpoints | Keep for now — personal ownership |
| `api/rest/folders.py` | 17KB | `DocumentFolder.user_id == current_user.id` | Replace with permission-aware folder access |
| `api/rest/links.py` | 9KB | `Link.user_id == current_user.id` | Keep — links are personal knowledge graph edges |
| `modules/artifacts/api.py` | 14KB | `Artifact.user_id == current_user.id` (lines 283, 322, 357) | Keep — artifacts are personal |

### Service Layer (business logic with user_id filtering)

| File | Lines | Pattern | Migration |
|---|---|---|---|
| `services/document/service.py` | 343 | `Document.user_id == user_id` (lines 230, 240) in conflict checks | Replace with `PermissionService.has_permission()` |
| `services/notification/service.py` | ~400 | `Notification.user_id == user_id` (7 locations) | Keep — notifications are personal |
| `services/user/stats.py` | ~150 | `*.user_id == user_id` (11 locations) for stats aggregation | Keep — stats are personal; add optional workspace scope later |
| `services/graph/link_service.py` | ~550 | `Link.user_id == user_id` (7 locations) | Keep — knowledge graph is personal |
| `services/quiz/sm2.py` | ~170 | `QuestionLearningState.user_id == user_id` | Keep — spaced repetition is personal |
| `services/analytics/service.py` | ~200 | `ActivityLog.user_id == user_id` (3 locations) | Keep — analytics are personal |
| `services/deck/generation.py` | ~320 | `Document.user_id == user_id`, `Deck.user_id == user_id` | Replace document check with `has_permission()` |
| `services/deck/import_export.py` | ~330 | `Deck.user_id == user_id` | Keep — deck ownership |

### Platform Modules (graph/link dispatch)

| File | Lines | Pattern | Migration |
|---|---|---|---|
| `platform/modules/documents.py` | ~140 | `Document.user_id == user_id` (lines 54, 84, 129) | Replace with `has_permission("view")` |
| `platform/modules/notes.py` | ~130 | `Note.user_id == user_id` (lines 52, 80, 122) | Replace with `has_permission("view")` |
| `platform/modules/flashcards.py` | ~110 | `Deck.user_id == user_id` (line 52) | Keep — personal |
| `platform/modules/quizzes.py` | ~130 | `Quiz.user_id == user_id` (lines 48, 76, 119) | Keep — personal |

### Migration Priority

**Phase 3A (Documents only):**

1. `api/rest/documents.py` — the primary target
2. `services/document/service.py` — conflict checks
3. `platform/modules/documents.py` — graph integration
4. `api/rest/folders.py` — folder access

**Phase 3B (Notes — if sharing notes is desired):**
5. `api/rest/notes.py`
6. `platform/modules/notes.py`

**Deferred (keep `user_id` filtering):**

- All flashcard, deck, quiz, notification, analytics, link, and stats code remains single-user until collaborative features are scoped.

---

## Synapse Implementation

### Data Models

```python
# backend/app/models/document_permission.py

import enum
import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import (
    String, Integer, Boolean, ForeignKey, DateTime, UniqueConstraint
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base import Base
from .mixins import TimestampMixin


class PermissionLevel(str, enum.Enum):
    VIEW = "view"
    CHANGE = "change"


class DocumentPermission(Base, TimestampMixin):
    """
    Object-level permission grant for a specific document.

    Sourced from Paperless's django-guardian integration.
    We implement this as a simple join table instead of
    using a generic permissions framework, since we only
    need document-level perms for now.

    Logic: "change" grants "view" implicitly (Paperless pattern
    from permissions.py:97-103).
    """
    __tablename__ = "document_permissions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    document_id: Mapped[int] = mapped_column(
        ForeignKey("documents.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )
    group_id: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True, index=True,
        doc="Group-level permission (when groups are implemented)"
    )
    permission: Mapped[str] = mapped_column(
        String(20), nullable=False,
        doc="'view' or 'change'. 'change' implies 'view'."
    )

    __table_args__ = (
        UniqueConstraint("document_id", "user_id", "permission",
                         name="uq_doc_user_perm"),
    )

    # Relationships
    document = relationship("Document", backref="permissions")


class ShareLink(Base, TimestampMixin):
    """
    Public share link for external access to a document.

    Sourced from Paperless models.py ShareLink model.
    The slug provides a non-guessable URL for anonymous access.
    Optionally expires.
    """
    __tablename__ = "share_links"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    document_id: Mapped[int] = mapped_column(
        ForeignKey("documents.id", ondelete="CASCADE"), index=True
    )
    slug: Mapped[str] = mapped_column(
        String(64), unique=True, index=True,
        default=lambda: uuid.uuid4().hex[:16]
    )
    created_by: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE")
    )
    expiration: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True,
        doc="If set, link expires after this time"
    )
    file_version: Mapped[str] = mapped_column(
        String(10), default="archive",
        doc="'archive' (PDF/A) or 'original'"
    )

    # Relationships
    document = relationship("Document", backref="share_links")
    creator = relationship("User")
```

### Permission Service

```python
# backend/app/services/permissions/service.py

import logging
from typing import Optional
from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document
from app.models.document_permission import DocumentPermission, PermissionLevel

logger = logging.getLogger(__name__)


class PermissionService:
    """
    Document permission management.

    Sourced from Paperless permissions.py:
    - get_objects_for_user_owner_aware() → get_accessible_documents()
    - has_perms_owner_aware() → has_permission()
    - set_permissions_for_object() → set_permissions()
    """

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_accessible_documents(self, user_id: int):
        """
        Return query for all documents accessible by user.

        Sourced from Paperless permissions.py:151-160
        get_objects_for_user_owner_aware().

        Three-tier visibility:
        1. Documents owned by user (user_id match)
        2. Documents with no owner (user_id IS NULL → public)
        3. Documents with explicit permission grant (ACL)
        """
        acl_subquery = (
            select(DocumentPermission.document_id)
            .where(
                DocumentPermission.user_id == user_id,
                DocumentPermission.permission.in_(["view", "change"]),
            )
        )

        query = select(Document).where(
            and_(
                Document.deleted_at.is_(None),
                or_(
                    Document.user_id == user_id,       # Tier 1: Owner
                    Document.user_id.is_(None),        # Tier 2: Public
                    Document.id.in_(acl_subquery),     # Tier 3: ACL
                ),
            )
        )

        result = await self.session.execute(query)
        return result.scalars().all()

    async def has_permission(
        self,
        user_id: int,
        document_id: int,
        permission: str = "view",
    ) -> bool:
        """
        Check if user has specific permission on a document.

        Sourced from Paperless permissions.py:163-165
        has_perms_owner_aware().
        """
        doc = await self.session.get(Document, document_id)
        if not doc:
            return False

        # Tier 1: Owner always has full access
        if doc.user_id == user_id:
            return True

        # Tier 2: Unowned documents are public
        if doc.user_id is None:
            return True

        # Tier 3: Check ACL
        # "change" permission implies "view"
        perm_conditions = [PermissionLevel.CHANGE]
        if permission == "view":
            perm_conditions.append(PermissionLevel.VIEW)

        acl = await self.session.execute(
            select(DocumentPermission).where(
                and_(
                    DocumentPermission.document_id == document_id,
                    DocumentPermission.user_id == user_id,
                    DocumentPermission.permission.in_([p.value for p in perm_conditions]),
                )
            )
        )
        return acl.scalar_one_or_none() is not None

    async def set_permissions(
        self,
        document_id: int,
        permissions: dict,
        *,
        merge: bool = False,
    ):
        """
        Set permissions for a document.

        Sourced from Paperless permissions.py:64-129
        set_permissions_for_object().

        Args:
            permissions: {"view": {"users": [1,3]}, "change": {"users": [2]}}
            merge: If True, add to existing. If False, replace.
        """
        if not merge:
            # Delete existing permissions for this document
            await self.session.execute(
                DocumentPermission.__table__.delete().where(
                    DocumentPermission.document_id == document_id
                )
            )

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

                # "change" automatically grants "view" (Paperless pattern)
                if action == "change":
                    view_perm = DocumentPermission(
                        document_id=document_id,
                        user_id=uid,
                        permission="view",
                    )
                    self.session.add(view_perm)

        await self.session.commit()

    async def get_document_permissions(self, document_id: int) -> dict:
        """
        Get current permissions for a document.

        Returns: {
            "view": {"users": [1, 3]},
            "change": {"users": [2]}
        }
        """
        result = await self.session.execute(
            select(DocumentPermission).where(
                DocumentPermission.document_id == document_id
            )
        )
        perms = result.scalars().all()

        output = {"view": {"users": []}, "change": {"users": []}}
        for perm in perms:
            if perm.user_id:
                output[perm.permission]["users"].append(perm.user_id)
        return output
```

### Permission Middleware

```python
# backend/app/api/middleware/permissions.py

from functools import wraps
from fastapi import HTTPException, status

from app.services.permissions.service import PermissionService


def require_document_permission(permission: str = "view"):
    """
    FastAPI dependency that checks document-level permissions.

    Usage:
        @router.get("/{doc_id}")
        async def get_document(
            doc_id: int,
            _check = Depends(require_document_permission("view")),
        ):
            ...
    """
    async def check(document_id: int, current_user=Depends(get_current_user), db=Depends(get_db)):
        perm_service = PermissionService(db)
        if not await perm_service.has_permission(current_user.id, document_id, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"You do not have {permission} permission on this document",
            )
    return check
```

### Share Link Endpoints

```python
# backend/app/api/rest/shares.py

from fastapi import APIRouter, Query, Depends, HTTPException
from datetime import datetime, timedelta

from app.models.document_permission import ShareLink

router = APIRouter(prefix="/share-links", tags=["sharing"])


@router.post("/")
async def create_share_link(
    document_id: int,
    expires_in_days: int = Query(7, ge=1, le=365),
    file_version: str = Query("archive", regex="^(archive|original)$"),
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """
    Create a share link for a document.

    The link provides anonymous read access via the slug.
    Sourced from Paperless ShareLink model.
    """
    # Verify ownership or change permission
    perm_service = PermissionService(db)
    if not await perm_service.has_permission(current_user.id, document_id, "change"):
        raise HTTPException(status_code=403, detail="Cannot share this document")

    link = ShareLink(
        document_id=document_id,
        created_by=current_user.id,
        file_version=file_version,
        expiration=datetime.utcnow() + timedelta(days=expires_in_days),
    )
    db.add(link)
    await db.commit()
    return {"slug": link.slug, "url": f"/api/v1/share/{link.slug}"}


@router.get("/{slug}")
async def access_share_link(slug: str, db=Depends(get_db)):
    """Anonymous access to a shared document via slug."""
    link = await db.execute(
        select(ShareLink).where(ShareLink.slug == slug)
    )
    link = link.scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=404, detail="Share link not found")
    if link.expiration and link.expiration < datetime.utcnow():
        raise HTTPException(status_code=410, detail="Share link expired")

    # Return document file
    document = link.document
    if link.file_version == "archive" and document.archive_path:
        return FileResponse(document.archive_path)
    return FileResponse(document.file_path)


@router.delete("/{slug}")
async def revoke_share_link(
    slug: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Revoke a share link. Only the creator or document owner can revoke."""
    link = await db.execute(
        select(ShareLink).where(ShareLink.slug == slug)
    )
    link = link.scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=404)
    if link.created_by != current_user.id:
        raise HTTPException(status_code=403)

    await db.delete(link)
    await db.commit()
```

---

## Module Structure

```
backend/app/services/permissions/
├── __init__.py
├── service.py                 # PermissionService: 3-tier access, ACL management

backend/app/models/
├── document_permission.py     # DocumentPermission, ShareLink

backend/app/api/rest/
├── shares.py                  # Share link endpoints
├── middleware/
│   └── permissions.py         # require_document_permission dependency
```

---

## Engineering Tasks

1. **Create `DocumentPermission` model** — user/group grants with view/change levels
2. **Create `ShareLink` model** — slug, expiration, file version
3. **Implement `PermissionService.get_accessible_documents()`** — 3-tier visibility query
4. **Implement `PermissionService.has_permission()`** — object-level permission check
5. **Implement `PermissionService.set_permissions()`** — permission assignment (merge/replace)
6. **Create `require_document_permission` middleware** — FastAPI dependency
7. **Update `repository.py` `get_documents()`** — use 3-tier visibility instead of user_id filter
8. **Update search service** — filter by accessible documents
9. **Create share link endpoints** — create, access, revoke
10. **Add cleanup task** — Celery periodic task to remove expired share links
11. **Write tests** — permission checks (owner, ACL, public), share link access, expiration
