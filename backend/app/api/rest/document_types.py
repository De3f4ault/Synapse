"""
DocumentType CRUD API endpoints.

Manages document types (invoice, receipt, letter, contract, etc.)
with matching rules for auto-classification.
"""

import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.exc import IntegrityError

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.document_type import DocumentType
from app.models.document import Document
from app.schemas.document_type import (
    DocumentTypeCreate,
    DocumentTypeUpdate,
    DocumentTypeResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _doc_type_response(dt: DocumentType, doc_count: int = 0) -> DocumentTypeResponse:
    return DocumentTypeResponse(
        id=dt.id,
        name=dt.name,
        match=dt.match or "",
        matching_algorithm=dt.matching_algorithm.value if dt.matching_algorithm else 0,
        is_insensitive=dt.is_insensitive if dt.is_insensitive is not None else True,
        document_count=doc_count,
        created_at=dt.created_at,
        updated_at=dt.updated_at,
    )


async def _get_doc_type_or_404(
    doc_type_id: int, user: User, db: AsyncSession,
) -> DocumentType:
    result = await db.execute(
        select(DocumentType).where(
            and_(DocumentType.id == doc_type_id, DocumentType.user_id == user.id)
        )
    )
    dt = result.scalar_one_or_none()
    if not dt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document type not found")
    return dt


# ---------------------------------------------------------------------------
# CRUD Endpoints
# ---------------------------------------------------------------------------

@router.get("", response_model=List[DocumentTypeResponse])
async def list_document_types(
    sort_by: Optional[str] = Query("name", description="Sort field: name, created_at"),
    sort_order: Optional[str] = Query("asc", description="asc or desc"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all document types for the current user with document counts."""
    stmt = (
        select(DocumentType, func.count(Document.id).label("document_count"))
        .outerjoin(Document, and_(
            Document.document_type_id == DocumentType.id,
            Document.deleted_at.is_(None),
        ))
        .where(DocumentType.user_id == current_user.id)
        .group_by(DocumentType.id)
    )

    sort_col = getattr(DocumentType, sort_by, DocumentType.name)
    stmt = stmt.order_by(sort_col.desc() if sort_order == "desc" else sort_col.asc())

    result = await db.execute(stmt)
    return [_doc_type_response(row[0], row[1]) for row in result.all()]


@router.post("", response_model=DocumentTypeResponse, status_code=status.HTTP_201_CREATED)
async def create_document_type(
    data: DocumentTypeCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new document type."""
    dt = DocumentType(
        name=data.name,
        match=data.match or "",
        matching_algorithm=data.matching_algorithm,
        is_insensitive=data.is_insensitive,
        user_id=current_user.id,
    )
    db.add(dt)
    try:
        await db.commit()
        await db.refresh(dt)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Document type '{data.name}' already exists",
        )

    logger.info("Created document type '%s' (id=%d) for user %d", dt.name, dt.id, current_user.id)
    return _doc_type_response(dt, 0)


@router.get("/{doc_type_id}", response_model=DocumentTypeResponse)
async def get_document_type(
    doc_type_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific document type with document count."""
    stmt = (
        select(DocumentType, func.count(Document.id).label("document_count"))
        .outerjoin(Document, and_(
            Document.document_type_id == DocumentType.id,
            Document.deleted_at.is_(None),
        ))
        .where(and_(DocumentType.id == doc_type_id, DocumentType.user_id == current_user.id))
        .group_by(DocumentType.id)
    )
    result = await db.execute(stmt)
    row = result.one_or_none()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document type not found")
    return _doc_type_response(row[0], row[1])


@router.put("/{doc_type_id}", response_model=DocumentTypeResponse)
async def update_document_type(
    doc_type_id: int,
    data: DocumentTypeUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a document type (partial update)."""
    dt = await _get_doc_type_or_404(doc_type_id, current_user, db)

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(dt, field, value)

    try:
        await db.commit()
        await db.refresh(dt)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Document type name '{data.name}' already exists",
        )

    return _doc_type_response(dt)


@router.delete("/{doc_type_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document_type(
    doc_type_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a document type. Documents keep their data but lose the FK reference."""
    dt = await _get_doc_type_or_404(doc_type_id, current_user, db)
    await db.delete(dt)
    await db.commit()
    logger.info("Deleted document type '%s' (id=%d)", dt.name, dt.id)
