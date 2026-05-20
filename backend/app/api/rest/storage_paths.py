"""
StoragePath CRUD API endpoints.

Manages storage path templates for document organization.
"""

import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.exc import IntegrityError

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.storage_path import StoragePath
from app.models.document import Document
from app.schemas.documents import (
    StoragePathCreate,
    StoragePathUpdate,
    StoragePathResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _storage_path_response(sp: StoragePath, doc_count: int = 0) -> StoragePathResponse:
    return StoragePathResponse(
        id=sp.id,
        name=sp.name,
        path_template=sp.path_template,
        match=sp.match or "",
        matching_algorithm=sp.matching_algorithm.value if sp.matching_algorithm else 0,
        is_insensitive=sp.is_insensitive if sp.is_insensitive is not None else True,
        document_count=doc_count,
        created_at=sp.created_at,
        updated_at=sp.updated_at,
    )


async def _get_storage_path_or_404(
    storage_path_id: int, user: User, db: AsyncSession,
) -> StoragePath:
    result = await db.execute(
        select(StoragePath).where(
            and_(StoragePath.id == storage_path_id, StoragePath.user_id == user.id)
        )
    )
    sp = result.scalar_one_or_none()
    if not sp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Storage path not found")
    return sp


# ---------------------------------------------------------------------------
# CRUD Endpoints
# ---------------------------------------------------------------------------

@router.get("", response_model=List[StoragePathResponse])
async def list_storage_paths(
    sort_by: Optional[str] = Query("name", description="Sort field: name, created_at"),
    sort_order: Optional[str] = Query("asc", description="asc or desc"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all storage paths for the current user with document counts."""
    stmt = (
        select(StoragePath, func.count(Document.id).label("document_count"))
        .outerjoin(Document, and_(
            Document.storage_path_id == StoragePath.id,
            Document.deleted_at.is_(None),
        ))
        .where(StoragePath.user_id == current_user.id)
        .group_by(StoragePath.id)
    )

    sort_col = getattr(StoragePath, sort_by, StoragePath.name)
    stmt = stmt.order_by(sort_col.desc() if sort_order == "desc" else sort_col.asc())

    result = await db.execute(stmt)
    return [_storage_path_response(row[0], row[1]) for row in result.all()]


@router.post("", response_model=StoragePathResponse, status_code=status.HTTP_201_CREATED)
async def create_storage_path(
    data: StoragePathCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new storage path template."""
    sp = StoragePath(
        name=data.name,
        path_template=data.path_template,
        match=data.match or "",
        matching_algorithm=data.matching_algorithm,
        is_insensitive=data.is_insensitive,
        user_id=current_user.id,
    )
    db.add(sp)
    try:
        await db.commit()
        await db.refresh(sp)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Storage path '{data.name}' already exists",
        )

    logger.info("Created storage path '%s' (id=%d) for user %d", sp.name, sp.id, current_user.id)
    return _storage_path_response(sp, 0)


@router.get("/{storage_path_id}", response_model=StoragePathResponse)
async def get_storage_path(
    storage_path_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific storage path with document count."""
    stmt = (
        select(StoragePath, func.count(Document.id).label("document_count"))
        .outerjoin(Document, and_(
            Document.storage_path_id == StoragePath.id,
            Document.deleted_at.is_(None),
        ))
        .where(and_(StoragePath.id == storage_path_id, StoragePath.user_id == current_user.id))
        .group_by(StoragePath.id)
    )
    result = await db.execute(stmt)
    row = result.one_or_none()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Storage path not found")
    return _storage_path_response(row[0], row[1])


@router.put("/{storage_path_id}", response_model=StoragePathResponse)
async def update_storage_path(
    storage_path_id: int,
    data: StoragePathUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a storage path (partial update)."""
    sp = await _get_storage_path_or_404(storage_path_id, current_user, db)

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(sp, field, value)

    try:
        await db.commit()
        await db.refresh(sp)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Storage path name '{data.name}' already exists",
        )

    return _storage_path_response(sp)


@router.delete("/{storage_path_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_storage_path(
    storage_path_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a storage path. Documents keep their data but lose the FK reference."""
    sp = await _get_storage_path_or_404(storage_path_id, current_user, db)
    await db.delete(sp)
    await db.commit()
    logger.info("Deleted storage path '%s' (id=%d)", sp.name, sp.id)
