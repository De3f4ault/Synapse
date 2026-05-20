"""
Tag CRUD API endpoints.

Evolved tag management with matching rules, hierarchy, inbox, and color.
Uses document_tags join table for doc count (unlike FK-based models).
"""

import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.exc import IntegrityError

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.tag import Tag
from app.models.document_tags import document_tags
from app.schemas.documents import TagCreate, TagUpdate, TagResponse

logger = logging.getLogger(__name__)
router = APIRouter()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _tag_response(tag: Tag, doc_count: int = 0) -> TagResponse:
    return TagResponse(
        id=tag.id,
        name=tag.name,
        color=getattr(tag, "color", "#a6cee3") or "#a6cee3",
        is_inbox_tag=tag.is_inbox_tag if tag.is_inbox_tag is not None else False,
        parent_id=tag.parent_id,
        match=tag.match or "",
        matching_algorithm=tag.matching_algorithm.value if tag.matching_algorithm else 0,
        is_insensitive=tag.is_insensitive if tag.is_insensitive is not None else True,
        document_count=doc_count,
        created_at=tag.created_at,
        updated_at=tag.updated_at,
    )


async def _get_tag_or_404(tag_id: int, user: User, db: AsyncSession) -> Tag:
    result = await db.execute(
        select(Tag).where(and_(Tag.id == tag_id, Tag.user_id == user.id))
    )
    tag = result.scalar_one_or_none()
    if not tag:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tag not found")
    return tag


async def _validate_parent(parent_id: int, user: User, db: AsyncSession) -> None:
    """Validate that parent_id references an existing tag owned by the same user."""
    result = await db.execute(
        select(Tag.id).where(and_(Tag.id == parent_id, Tag.user_id == user.id))
    )
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Parent tag {parent_id} not found",
        )


# ---------------------------------------------------------------------------
# CRUD Endpoints
# ---------------------------------------------------------------------------

@router.get("", response_model=List[TagResponse])
async def list_tags(
    sort_by: Optional[str] = Query("name", description="Sort field: name, created_at"),
    sort_order: Optional[str] = Query("asc", description="asc or desc"),
    is_inbox_tag: Optional[bool] = Query(None, description="Filter by inbox tag"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all tags for the current user with document counts."""
    stmt = (
        select(Tag, func.count(document_tags.c.document_id).label("document_count"))
        .outerjoin(document_tags, document_tags.c.tag_id == Tag.id)
        .where(Tag.user_id == current_user.id)
        .group_by(Tag.id)
    )

    if is_inbox_tag is not None:
        stmt = stmt.where(Tag.is_inbox_tag == is_inbox_tag)

    sort_col = getattr(Tag, sort_by, Tag.name)
    stmt = stmt.order_by(sort_col.desc() if sort_order == "desc" else sort_col.asc())

    result = await db.execute(stmt)
    return [_tag_response(row[0], row[1]) for row in result.all()]


@router.post("", response_model=TagResponse, status_code=status.HTTP_201_CREATED)
async def create_tag(
    data: TagCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new tag."""
    if data.parent_id:
        await _validate_parent(data.parent_id, current_user, db)

    tag = Tag(
        name=data.name,
        color=data.color,
        is_inbox_tag=data.is_inbox_tag,
        parent_id=data.parent_id,
        match=data.match or "",
        matching_algorithm=data.matching_algorithm,
        is_insensitive=data.is_insensitive,
        user_id=current_user.id,
    )
    db.add(tag)
    try:
        await db.commit()
        await db.refresh(tag)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Tag '{data.name}' already exists",
        )

    logger.info("Created tag '%s' (id=%d) for user %d", tag.name, tag.id, current_user.id)
    return _tag_response(tag, 0)


@router.get("/{tag_id}", response_model=TagResponse)
async def get_tag(
    tag_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific tag with document count."""
    stmt = (
        select(Tag, func.count(document_tags.c.document_id).label("document_count"))
        .outerjoin(document_tags, document_tags.c.tag_id == Tag.id)
        .where(and_(Tag.id == tag_id, Tag.user_id == current_user.id))
        .group_by(Tag.id)
    )
    result = await db.execute(stmt)
    row = result.one_or_none()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tag not found")
    return _tag_response(row[0], row[1])


@router.put("/{tag_id}", response_model=TagResponse)
async def update_tag(
    tag_id: int,
    data: TagUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a tag (partial update)."""
    tag = await _get_tag_or_404(tag_id, current_user, db)

    update_data = data.model_dump(exclude_unset=True)

    # Validate parent_id if being changed
    if "parent_id" in update_data and update_data["parent_id"] is not None:
        if update_data["parent_id"] == tag_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A tag cannot be its own parent",
            )
        await _validate_parent(update_data["parent_id"], current_user, db)

    for field, value in update_data.items():
        setattr(tag, field, value)

    try:
        await db.commit()
        await db.refresh(tag)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Tag name '{data.name}' already exists",
        )

    return _tag_response(tag)


@router.delete("/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tag(
    tag_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a tag. Document associations in document_tags are cascaded."""
    tag = await _get_tag_or_404(tag_id, current_user, db)
    await db.delete(tag)
    await db.commit()
    logger.info("Deleted tag '%s' (id=%d)", tag.name, tag.id)
