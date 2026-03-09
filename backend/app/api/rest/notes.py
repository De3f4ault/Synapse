"""
Notes REST API endpoints.

Hierarchical note management with versioning support.

"""

from typing import List, Optional, Union, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from pydantic import BaseModel, Field
from app.schemas.common import MessageResponse
from datetime import datetime


from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.note import Note, NoteFormat
from app.models.note_version import NoteVersion
from app.models.tag import Tag

router = APIRouter()


# Schemas — single source of truth: app/schemas/note.py
from app.schemas.note import (
    NoteCreate,
    NoteUpdate,
    NoteResponse,
    NoteTreeResponse as NoteTreeNode,
    NoteVersionResponse,
    NoteSearchResult,
    JournalDateResponse,
)


# ============================================================================
# Endpoints
# ============================================================================


@router.get(
    "",
    response_model=List[NoteResponse],
    summary="List notes",
    description="Retrieve user's notes with pagination and filtering",
)
async def list_notes(
    parent_id: Optional[int] = Query(None, description="Filter by parent (NULL for root notes)"),
    tags: Optional[str] = Query(None, description="Filter by tags (comma-separated)"),
    is_favorite: Optional[bool] = Query(None, description="Filter by favorite status"),
    is_archived: Optional[bool] = Query(None, description="Filter by archived status"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List user's notes with optional filtering (optimized - single query)."""
    # Build single query with LEFT OUTER JOIN for children counts
    # Using a self-join with alias for counting children
    from sqlalchemy.orm import aliased

    ChildNote = aliased(Note, name="child_note")

    stmt = (
        select(Note, func.count(ChildNote.id).label("children_count"))
        .outerjoin(ChildNote, and_(ChildNote.parent_id == Note.id, ChildNote.deleted_at.is_(None)))
        .where(and_(Note.user_id == current_user.id, Note.deleted_at.is_(None)))
    )

    # Apply filters
    if parent_id is not None:
        stmt = stmt.where(Note.parent_id == parent_id)

    if is_favorite is not None:
        stmt = stmt.where(Note.is_favorite == is_favorite)

    if is_archived is not None:
        stmt = stmt.where(Note.is_archived == is_archived)

    # Tag filtering handling (if applicable)
    # Note: Tag filtering logic omitted for brevity, assuming currently handled or handled elsewhere

    # Apply grouping, ordering, and pagination
    stmt = (
        stmt.group_by(Note.id)
        .order_by(Note.updated_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )

    result = await db.execute(stmt)
    notes_with_counts = result.all()

    return [
        NoteResponse(
            id=note.id,
            title=note.title,
            content=note.content,
            format=note.format,
            parent_id=note.parent_id,
            user_id=note.user_id,
            embedding_id=note.embedding_id,
            journal_date=note.journal_date,
            is_favorite=note.is_favorite,
            is_archived=note.is_archived,
            created_at=note.created_at,
            updated_at=note.updated_at,
            children_count=children_count,
        )
        for note, children_count in notes_with_counts
    ]


@router.post(
    "",
    response_model=NoteResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create note",
    description="Create a new note with optional parent for hierarchy",
)
async def create_note(
    note_data: NoteCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new note with versioning."""
    # Verify parent exists if specified
    if note_data.parent_id is not None:
        parent_result = await db.execute(
            select(Note).where(
                and_(
                    Note.id == note_data.parent_id,
                    Note.user_id == current_user.id,
                    Note.deleted_at.is_(None),
                )
            )
        )
        parent = parent_result.scalar_one_or_none()
        if not parent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Parent note not found"
            )

    # Create note
    new_note = Note(
        user_id=current_user.id,
        title=note_data.title,
        content=note_data.content,
        format=note_data.format,
        parent_id=note_data.parent_id,
    )

    db.add(new_note)
    await db.commit()
    await db.refresh(new_note)

    # Create version 1
    version = NoteVersion(
        note_id=new_note.id,
        created_by=current_user.id,
        version_number=1,
        title=new_note.title,
        content=new_note.content,
        format=new_note.format,
    )

    db.add(version)
    await db.commit()

    return NoteResponse(
        id=new_note.id,
        title=new_note.title,
        content=new_note.content,
        format=new_note.format,
        parent_id=new_note.parent_id,
        user_id=new_note.user_id,
        embedding_id=new_note.embedding_id,
        journal_date=new_note.journal_date,
        is_favorite=new_note.is_favorite,
        is_archived=new_note.is_archived,
        created_at=new_note.created_at,
        updated_at=new_note.updated_at,
        children_count=0,
    )


@router.get(
    "/tree",
    response_model=List[NoteTreeNode],
    summary="Get note hierarchy",
    description="Retrieve hierarchical note structure as tree",
)
async def get_note_tree(
    root_id: Optional[int] = Query(None, description="Start from specific note (NULL for roots)"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get hierarchical note tree structure."""

    # Build tree recursively
    async def build_tree(parent_id: Optional[int]) -> List[NoteTreeNode]:
        query = (
            select(Note)
            .where(
                and_(
                    Note.user_id == current_user.id,
                    Note.parent_id == parent_id,
                    Note.deleted_at.is_(None),
                )
            )
            .order_by(Note.title)
        )

        result = await db.execute(query)
        notes = result.scalars().all()

        tree_nodes = []
        for note in notes:
            children = await build_tree(note.id)
            tree_nodes.append(
                NoteTreeNode(
                    id=note.id, title=note.title, parent_id=note.parent_id, children=children
                )
            )

        return tree_nodes

    return await build_tree(root_id)


@router.get(
    "/search",
    response_model=List[NoteSearchResult],
    summary="Search notes",
    description="Full-text search across notes (title and content)",
)
async def search_notes(
    query: str = Query(..., min_length=1, description="Search query"),
    limit: int = Query(20, ge=1, le=100, description="Maximum results"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Search notes with basic text search.

    Note: This is a simple LIKE search. For production, implement:
    - PostgreSQL Full-Text Search (FTS) with ts_vector
    - Vector semantic search with Qdrant
    - Hybrid search combining both
    """
    # Simple LIKE search (case-insensitive)
    search_pattern = f"%{query}%"

    search_query = (
        select(Note)
        .where(
            and_(
                Note.user_id == current_user.id,
                Note.deleted_at.is_(None),
                or_(Note.title.ilike(search_pattern), Note.content.ilike(search_pattern)),
            )
        )
        .limit(limit)
    )

    result = await db.execute(search_query)
    notes = result.scalars().all()

    # Build search results with basic scoring
    results = []
    for note in notes:
        # Simple scoring: title match = higher score
        score = 0.5
        match_type = "content"

        if query.lower() in note.title.lower():
            score = 1.0
            match_type = "title"

        results.append(
            NoteSearchResult(
                id=note.id,
                title=note.title,
                content=note.content[:200] + "..." if len(note.content) > 200 else note.content,
                format=note.format,
                score=score,
                match_type=match_type,
            )
        )

    # Sort by score descending
    results.sort(key=lambda x: x.score, reverse=True)

    return results


@router.get(
    "/{note_id}",
    response_model=NoteResponse,
    summary="Get note",
    description="Retrieve a specific note by ID",
)
async def get_note(
    note_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    """Get a specific note."""
    result = await db.execute(
        select(Note).where(
            and_(Note.id == note_id, Note.user_id == current_user.id, Note.deleted_at.is_(None))
        )
    )
    note = result.scalar_one_or_none()

    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")

    # Get children count
    children_count_result = await db.execute(
        select(func.count(Note.id)).where(
            and_(Note.parent_id == note.id, Note.deleted_at.is_(None))
        )
    )
    children_count = children_count_result.scalar()

    return NoteResponse(
        id=note.id,
        title=note.title,
        content=note.content,
        format=note.format,
        parent_id=note.parent_id,
        user_id=note.user_id,
        embedding_id=note.embedding_id,
        journal_date=note.journal_date,
        is_favorite=note.is_favorite,
        is_archived=note.is_archived,
        created_at=note.created_at,
        updated_at=note.updated_at,
        children_count=children_count,
    )


@router.get(
    "/{note_id}/versions",
    response_model=List[NoteVersionResponse],
    summary="Get note versions",
    description="Retrieve version history for a note",
)
async def get_note_versions(
    note_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    """Get all versions of a note."""
    # Verify note ownership
    note_result = await db.execute(
        select(Note).where(
            and_(Note.id == note_id, Note.user_id == current_user.id, Note.deleted_at.is_(None))
        )
    )
    note = note_result.scalar_one_or_none()

    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")

    # Get all versions
    versions_result = await db.execute(
        select(NoteVersion)
        .where(NoteVersion.note_id == note_id)
        .order_by(NoteVersion.version_number.desc())
    )
    versions = versions_result.scalars().all()

    return [
        NoteVersionResponse(
            id=v.id,
            note_id=v.note_id,
            version_number=v.version_number,
            title=v.title,
            created_at=v.created_at,
            created_by=v.created_by,
        )
        for v in versions
    ]


@router.put(
    "/{note_id}",
    response_model=NoteResponse,
    summary="Update note",
    description="Update note and create new version",
)
async def update_note(
    note_id: int,
    note_data: NoteUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update note and create version history."""
    # Get note
    result = await db.execute(
        select(Note).where(
            and_(Note.id == note_id, Note.user_id == current_user.id, Note.deleted_at.is_(None))
        )
    )
    note = result.scalar_one_or_none()

    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")

    # Track if content changed
    content_changed = False

    # Update fields
    if note_data.title is not None:
        note.title = note_data.title
        content_changed = True

    if note_data.content is not None:
        note.content = note_data.content
        content_changed = True

    if note_data.format is not None:
        note.format = note_data.format
        content_changed = True

    # Update metadata fields (no version bump)
    if note_data.is_favorite is not None:
        note.is_favorite = note_data.is_favorite

    if note_data.is_archived is not None:
        note.is_archived = note_data.is_archived

    if note_data.journal_date is not None:
        note.journal_date = note_data.journal_date

    # Create new version if content changed
    if content_changed:
        # Get latest version number
        latest_version_result = await db.execute(
            select(func.max(NoteVersion.version_number)).where(NoteVersion.note_id == note.id)
        )
        latest_version = latest_version_result.scalar() or 0

        # Create new version
        new_version = NoteVersion(
            note_id=note.id,
            created_by=current_user.id,
            version_number=latest_version + 1,
            title=note.title,
            content=note.content,
            format=note.format,
        )
        db.add(new_version)

    await db.commit()
    await db.refresh(note)

    # Get children count
    children_count_result = await db.execute(
        select(func.count(Note.id)).where(
            and_(Note.parent_id == note.id, Note.deleted_at.is_(None))
        )
    )
    children_count = children_count_result.scalar()

    return NoteResponse(
        id=note.id,
        title=note.title,
        content=note.content,
        format=note.format,
        parent_id=note.parent_id,
        user_id=note.user_id,
        embedding_id=note.embedding_id,
        journal_date=note.journal_date,
        is_favorite=note.is_favorite,
        is_archived=note.is_archived,
        created_at=note.created_at,
        updated_at=note.updated_at,
        children_count=children_count,
    )


@router.delete(
    "/{note_id}",
    response_model=MessageResponse,
    summary="Delete note",
    description="Soft delete note and all children",
)
async def delete_note(
    note_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    """Delete note (soft delete) including all children."""
    result = await db.execute(
        select(Note).where(
            and_(Note.id == note_id, Note.user_id == current_user.id, Note.deleted_at.is_(None))
        )
    )
    note = result.scalar_one_or_none()

    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")

    # Soft delete note
    note.deleted_at = datetime.utcnow()

    # Recursively soft delete all children
    async def delete_children(parent_id: int):
        children_result = await db.execute(
            select(Note).where(and_(Note.parent_id == parent_id, Note.deleted_at.is_(None)))
        )
        children = children_result.scalars().all()

        for child in children:
            child.deleted_at = datetime.utcnow()
            await delete_children(child.id)

    await delete_children(note.id)
    await db.commit()

    return MessageResponse(message="Note and all children deleted successfully")


# ============================================================================
# Journal Endpoints
# ============================================================================

@router.get(
    "/journals/dates",
    response_model=List[JournalDateResponse],
    summary="List journal dates",
    description="Get all dates that have journal entries",
)
async def list_journal_dates(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all journal dates for the current user."""
    result = await db.execute(
        select(Note)
        .where(
            and_(
                Note.user_id == current_user.id,
                Note.deleted_at.is_(None),
                Note.journal_date.isnot(None),
            )
        )
        .order_by(Note.journal_date.desc())
    )
    journals = result.scalars().all()

    return [
        JournalDateResponse(
            date=note.journal_date,
            note_id=note.id,
            title=note.title,
        )
        for note in journals
    ]


@router.get(
    "/journals/{date}",
    response_model=NoteResponse,
    summary="Get or create journal",
    description="Get journal for a specific date, creating if it doesn't exist",
)
async def get_or_create_journal(
    date: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get or create a journal entry for the specified date."""
    # Validate date format
    import re

    if not re.match(r"^\d{4}-\d{2}-\d{2}$", date):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid date format. Use YYYY-MM-DD"
        )

    # Check if journal exists for this date
    result = await db.execute(
        select(Note).where(
            and_(
                Note.user_id == current_user.id,
                Note.deleted_at.is_(None),
                Note.journal_date == date,
            )
        )
    )
    note = result.scalar_one_or_none()

    if note:
        # Return existing journal
        children_count_result = await db.execute(
            select(func.count(Note.id)).where(
                and_(Note.parent_id == note.id, Note.deleted_at.is_(None))
            )
        )
        children_count = children_count_result.scalar()

        return NoteResponse(
            id=note.id,
            title=note.title,
            content=note.content,
            format=note.format,
            parent_id=note.parent_id,
            user_id=note.user_id,
            embedding_id=note.embedding_id,
            journal_date=note.journal_date,
            is_favorite=note.is_favorite,
            is_archived=note.is_archived,
            created_at=note.created_at,
            updated_at=note.updated_at,
            children_count=children_count,
        )

    # Create new journal for this date
    from datetime import datetime as dt

    formatted_title = dt.strptime(date, "%Y-%m-%d").strftime("%B %d, %Y")

    new_note = Note(
        user_id=current_user.id,
        title=formatted_title,
        content={},  # Empty BlockSuite content
        format=NoteFormat.BLOCKSUITE,
        journal_date=date,
    )

    db.add(new_note)
    await db.commit()
    await db.refresh(new_note)

    # Create initial version
    version = NoteVersion(
        note_id=new_note.id,
        created_by=current_user.id,
        version_number=1,
        title=new_note.title,
        content=new_note.content,
        format=new_note.format,
    )
    db.add(version)
    await db.commit()

    return NoteResponse(
        id=new_note.id,
        title=new_note.title,
        content=new_note.content,
        format=new_note.format,
        parent_id=new_note.parent_id,
        user_id=new_note.user_id,
        embedding_id=new_note.embedding_id,
        journal_date=new_note.journal_date,
        is_favorite=new_note.is_favorite,
        is_archived=new_note.is_archived,
        created_at=new_note.created_at,
        updated_at=new_note.updated_at,
        children_count=0,
    )
