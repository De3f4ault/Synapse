"""
Share link and document permission REST API endpoints.

Sourced from Paperless-ngx:
  - ShareLink model (models.py L720-770)
  - set_permissions_for_object (permissions.py L64-129)

Endpoints:
  POST   /share-links              — Create share link (auth required)
  GET    /share-links/{slug}       — Access shared document (anonymous)
  DELETE /share-links/{slug}       — Revoke share link (auth required)
  GET    /documents/{doc_id}/permissions     — Get ACL (auth required)
  PUT    /documents/{doc_id}/permissions     — Set ACL replace (auth required)
  PATCH  /documents/{doc_id}/permissions     — Merge ACL (auth required)
  GET    /documents/{doc_id}/share-links     — List share links (auth required)
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.document import Document
from app.models.document_permission import ShareLink, PermissionLevel
from app.services.permissions.service import PermissionService
from app.schemas.permission import (
    ShareLinkCreate,
    ShareLinkResponse,
    DocumentPermissionResponse,
    SetPermissionsRequest,
    PermissionsSet,
    PermissionEntry,
)

logger = logging.getLogger(__name__)
router = APIRouter()


# ---------------------------------------------------------------------------
# Share Link endpoints
# ---------------------------------------------------------------------------

@router.post("/share-links", response_model=ShareLinkResponse, status_code=201)
async def create_share_link(
    request: ShareLinkCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a share link for a document.

    Requires ownership or 'change' permission on the document.
    The slug provides non-guessable anonymous access.
    Sourced from Paperless ShareLink model (models.py L720-770).
    """
    perm_service = PermissionService(db)
    if not await perm_service.has_permission(
        current_user.id, request.document_id, "change"
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot share this document — requires change permission",
        )

    link = ShareLink(
        document_id=request.document_id,
        created_by=current_user.id,
        file_version=request.file_version,
        expiration=datetime.now(timezone.utc)
        + timedelta(days=request.expires_in_days),
    )
    db.add(link)
    await db.commit()
    await db.refresh(link)

    logger.info(
        f"Share link created: slug={link.slug} doc={request.document_id} "
        f"by user={current_user.id} expires={link.expiration}"
    )

    return ShareLinkResponse(
        id=link.id,
        slug=link.slug,
        document_id=link.document_id,
        created_by=link.created_by,
        expiration=link.expiration,
        file_version=link.file_version,
        url=f"/api/v1/share-links/{link.slug}",
        created_at=link.created_at,
    )


@router.get("/share-links/{slug}")
async def access_share_link(
    slug: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Access a shared document via its slug.

    Anonymous endpoint — no authentication required.
    Returns document metadata for preview.
    Sourced from Paperless ShareLink model.
    """
    result = await db.execute(
        select(ShareLink).where(ShareLink.slug == slug)
    )
    link = result.scalar_one_or_none()
    if not link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Share link not found",
        )

    # Check expiration
    if link.expiration and link.expiration < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Share link has expired",
        )

    # Load document
    doc = await db.get(Document, link.document_id)
    if not doc or doc.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document no longer available",
        )

    return {
        "document_id": doc.id,
        "filename": doc.filename,
        "file_type": doc.file_type,
        "file_size": doc.file_size,
        "page_count": doc.page_count,
        "file_version": link.file_version,
        "slug": link.slug,
        "expires": link.expiration,
    }


@router.delete(
    "/share-links/{slug}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def revoke_share_link(
    slug: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Revoke a share link.

    Only the link creator or document owner can revoke.
    """
    result = await db.execute(
        select(ShareLink).where(ShareLink.slug == slug)
    )
    link = result.scalar_one_or_none()
    if not link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Share link not found",
        )

    # Check authorization: creator or document owner
    doc = await db.get(Document, link.document_id)
    if link.created_by != current_user.id and (
        doc and doc.user_id != current_user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the creator or document owner can revoke this link",
        )

    await db.delete(link)
    await db.commit()

    logger.info(f"Share link revoked: slug={slug} by user={current_user.id}")
    return None


# ---------------------------------------------------------------------------
# Document permission management endpoints
# ---------------------------------------------------------------------------

@router.get(
    "/documents/{document_id}/permissions",
    response_model=DocumentPermissionResponse,
)
async def get_document_permissions(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get current ACL for a document.

    Requires ownership or 'change' permission.
    """
    perm_service = PermissionService(db)
    if not await perm_service.has_permission(
        current_user.id, document_id, "change"
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot view permissions — requires change permission",
        )

    doc = await db.get(Document, document_id)
    perms = await perm_service.get_document_permissions(document_id)

    return DocumentPermissionResponse(
        document_id=document_id,
        owner_id=doc.user_id if doc else None,
        permissions=PermissionsSet(
            view=PermissionEntry(users=perms["view"]["users"]),
            change=PermissionEntry(users=perms["change"]["users"]),
        ),
    )


@router.put(
    "/documents/{document_id}/permissions",
    response_model=DocumentPermissionResponse,
)
async def set_document_permissions(
    document_id: int,
    request: SetPermissionsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Set permissions for a document (replace mode).

    Only the document owner can set permissions.
    Sourced from Paperless set_permissions_for_object (permissions.py L64-129).
    """
    doc = await db.get(Document, document_id)
    if not doc or doc.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the document owner can set permissions",
        )

    perm_service = PermissionService(db)
    await perm_service.set_permissions(
        document_id,
        {
            "view": {"users": request.view.users},
            "change": {"users": request.change.users},
        },
        merge=False,
    )
    await db.commit()

    perms = await perm_service.get_document_permissions(document_id)
    return DocumentPermissionResponse(
        document_id=document_id,
        owner_id=doc.user_id,
        permissions=PermissionsSet(
            view=PermissionEntry(users=perms["view"]["users"]),
            change=PermissionEntry(users=perms["change"]["users"]),
        ),
    )


@router.patch(
    "/documents/{document_id}/permissions",
    response_model=DocumentPermissionResponse,
)
async def merge_document_permissions(
    document_id: int,
    request: SetPermissionsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Merge permissions for a document (add without removing).

    Only the document owner can modify permissions.
    Sourced from Paperless set_permissions_for_object with merge=True.
    """
    doc = await db.get(Document, document_id)
    if not doc or doc.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the document owner can modify permissions",
        )

    perm_service = PermissionService(db)
    await perm_service.set_permissions(
        document_id,
        {
            "view": {"users": request.view.users},
            "change": {"users": request.change.users},
        },
        merge=True,
    )
    await db.commit()

    perms = await perm_service.get_document_permissions(document_id)
    return DocumentPermissionResponse(
        document_id=document_id,
        owner_id=doc.user_id,
        permissions=PermissionsSet(
            view=PermissionEntry(users=perms["view"]["users"]),
            change=PermissionEntry(users=perms["change"]["users"]),
        ),
    )


@router.get(
    "/documents/{document_id}/share-links",
    response_model=List[ShareLinkResponse],
)
async def list_document_share_links(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List all share links for a document.

    Only the document owner can see share links.
    """
    doc = await db.get(Document, document_id)
    if not doc or doc.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the document owner can list share links",
        )

    result = await db.execute(
        select(ShareLink)
        .where(ShareLink.document_id == document_id)
        .order_by(ShareLink.created_at.desc())
    )
    links = result.scalars().all()

    return [
        ShareLinkResponse(
            id=link.id,
            slug=link.slug,
            document_id=link.document_id,
            created_by=link.created_by,
            expiration=link.expiration,
            file_version=link.file_version,
            url=f"/api/v1/share-links/{link.slug}",
            created_at=link.created_at,
        )
        for link in links
    ]
