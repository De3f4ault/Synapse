"""
Correspondent CRUD API endpoints.

Manages document correspondents (senders/receivers) with matching rules.
"""

import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.exc import IntegrityError

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.correspondent import Correspondent
from app.models.document import Document
from app.schemas.documents import (
    CorrespondentCreate,
    CorrespondentUpdate,
    CorrespondentResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _correspondent_response(corr: Correspondent, doc_count: int = 0) -> CorrespondentResponse:
    return CorrespondentResponse(
        id=corr.id,
        name=corr.name,
        match=corr.match or "",
        matching_algorithm=corr.matching_algorithm.value if corr.matching_algorithm else 0,
        is_insensitive=corr.is_insensitive if corr.is_insensitive is not None else True,
        document_count=doc_count,
        created_at=corr.created_at,
        updated_at=corr.updated_at,
    )


async def _get_correspondent_or_404(
    correspondent_id: int, user: User, db: AsyncSession,
) -> Correspondent:
    result = await db.execute(
        select(Correspondent).where(
            and_(Correspondent.id == correspondent_id, Correspondent.user_id == user.id)
        )
    )
    corr = result.scalar_one_or_none()
    if not corr:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Correspondent not found")
    return corr


# ---------------------------------------------------------------------------
# CRUD Endpoints
# ---------------------------------------------------------------------------

@router.get("", response_model=List[CorrespondentResponse])
async def list_correspondents(
    sort_by: Optional[str] = Query("name", description="Sort field: name, created_at"),
    sort_order: Optional[str] = Query("asc", description="asc or desc"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all correspondents for the current user with document counts."""
    stmt = (
        select(Correspondent, func.count(Document.id).label("document_count"))
        .outerjoin(Document, and_(
            Document.correspondent_id == Correspondent.id,
            Document.deleted_at.is_(None),
        ))
        .where(Correspondent.user_id == current_user.id)
        .group_by(Correspondent.id)
    )

    sort_col = getattr(Correspondent, sort_by, Correspondent.name)
    stmt = stmt.order_by(sort_col.desc() if sort_order == "desc" else sort_col.asc())

    result = await db.execute(stmt)
    return [
        _correspondent_response(row[0], row[1])
        for row in result.all()
    ]


@router.post("", response_model=CorrespondentResponse, status_code=status.HTTP_201_CREATED)
async def create_correspondent(
    data: CorrespondentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new correspondent."""
    corr = Correspondent(
        name=data.name,
        match=data.match or "",
        matching_algorithm=data.matching_algorithm,
        is_insensitive=data.is_insensitive,
        user_id=current_user.id,
    )
    db.add(corr)
    try:
        await db.commit()
        await db.refresh(corr)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Correspondent '{data.name}' already exists",
        )

    logger.info("Created correspondent '%s' (id=%d) for user %d", corr.name, corr.id, current_user.id)
    return _correspondent_response(corr, 0)


@router.get("/{correspondent_id}", response_model=CorrespondentResponse)
async def get_correspondent(
    correspondent_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific correspondent with document count."""
    stmt = (
        select(Correspondent, func.count(Document.id).label("document_count"))
        .outerjoin(Document, and_(
            Document.correspondent_id == Correspondent.id,
            Document.deleted_at.is_(None),
        ))
        .where(and_(Correspondent.id == correspondent_id, Correspondent.user_id == current_user.id))
        .group_by(Correspondent.id)
    )
    result = await db.execute(stmt)
    row = result.one_or_none()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Correspondent not found")
    return _correspondent_response(row[0], row[1])


@router.put("/{correspondent_id}", response_model=CorrespondentResponse)
async def update_correspondent(
    correspondent_id: int,
    data: CorrespondentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a correspondent (partial update)."""
    corr = await _get_correspondent_or_404(correspondent_id, current_user, db)

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(corr, field, value)

    try:
        await db.commit()
        await db.refresh(corr)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Correspondent name '{data.name}' already exists",
        )

    return _correspondent_response(corr)


@router.delete("/{correspondent_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_correspondent(
    correspondent_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a correspondent. Documents keep their data but lose the FK reference."""
    corr = await _get_correspondent_or_404(correspondent_id, current_user, db)
    await db.delete(corr)
    await db.commit()
    logger.info("Deleted correspondent '%s' (id=%d)", corr.name, corr.id)
