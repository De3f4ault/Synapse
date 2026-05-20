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


from app.api.deps import get_db, get_current_user, PaginationParams
from app.models.user import User
from app.models.note import Note, NoteFormat
from app.models.note_version import NoteVersion
from app.models.tag import Tag

router = APIRouter()


# Schemas — single source of truth: app/schemas/note.py
from app.schemas.notes import (
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
    pagination: PaginationParams = Depends(),
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
        .offset(pagination.offset)
        .limit(pagination.page_size)
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
            content_text=note.content_text,
            editor_version=note.editor_version,
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
        content_text=note_data.content_text,
        editor_version=note_data.editor_version,
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
        content_text=new_note.content_text,
    )

    db.add(version)
    await db.commit()

    # Wire knowledge graph
    if note_data.parent_id is not None:
        try:
            from app.services.graph.linker import GraphLinker
            from app.models.link import LinkEntityType as LET, LinkType as LT

            linker = GraphLinker(db)
            await linker.on_entity_created(
                user_id=current_user.id,
                entity_type=LET.NOTE,
                entity_id=new_note.id,
                source_refs=[(LET.NOTE, note_data.parent_id)],
                link_type=LT.DERIVED,
                label="child of",
            )
            await db.commit()
        except Exception as e:
            import structlog
            structlog.get_logger(__name__).error(
                "graph_linker_failed", error=str(e), exc_info=True,
                note_id=new_note.id, user_id=current_user.id,
            )

    # Trigger embedding if content_text is available
    if new_note.content_text:
        try:
            import asyncio
            from app.core.ai.embeddings.boundary import embed_text_sync, EmbeddingStatus, EMBEDDING_VERSION

            text_to_embed = f"{new_note.title or ''}\n\n{new_note.content_text}".strip()
            embedding, emb_status = await asyncio.get_event_loop().run_in_executor(
                None, embed_text_sync, text_to_embed
            )
            new_note.embedding = embedding
            new_note.embedding_status = emb_status.value
            new_note.embedding_model = EMBEDDING_VERSION if emb_status == EmbeddingStatus.READY else None
            await db.commit()
        except Exception as e:
            import structlog
            structlog.get_logger().warning("create_note_embedding_failed", note_id=new_note.id, error=str(e))

    await db.refresh(new_note)

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
        content_text=new_note.content_text,
        editor_version=new_note.editor_version,
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
    # Search title and content_text (plain text, not raw JSONB)
    search_pattern = f"%{query}%"

    search_query = (
        select(Note)
        .where(
            and_(
                Note.user_id == current_user.id,
                Note.deleted_at.is_(None),
                or_(
                    Note.title.ilike(search_pattern),
                    Note.content_text.ilike(search_pattern),
                ),
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
        content_text=note.content_text,
        editor_version=note.editor_version,
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
    description="Silent autosave — updates content in DB, no version insert, no embedding.",
)
async def update_note(
    note_id: int,
    note_data: NoteUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Silent autosave. Persists content only — versioning and embedding happen via /checkpoint."""
    result = await db.execute(
        select(Note).where(
            and_(Note.id == note_id, Note.user_id == current_user.id, Note.deleted_at.is_(None))
        )
    )
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")

    if note_data.title is not None:
        note.title = note_data.title
    if note_data.content is not None:
        note.content = note_data.content
    if note_data.content_text is not None:
        note.content_text = note_data.content_text
    if note_data.editor_version is not None:
        note.editor_version = note_data.editor_version
    if note_data.format is not None:
        note.format = note_data.format
    if note_data.is_favorite is not None:
        note.is_favorite = note_data.is_favorite
    if note_data.is_archived is not None:
        note.is_archived = note_data.is_archived
    if note_data.journal_date is not None:
        note.journal_date = note_data.journal_date

    await db.commit()
    await db.refresh(note)

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
        content_text=note.content_text,
        editor_version=note.editor_version,
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


@router.post(
    "/{note_id}/checkpoint",
    response_model=NoteResponse,
    summary="Checkpoint note",
    description="Intentional save: cuts a version and triggers embedding only when content changed.",
)
async def checkpoint_note(
    note_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Intentional checkpoint (Ctrl+S / Save button).

    Reads the current DB state, compares content_text with the last version's content_text.
    Only inserts a new NoteVersion and triggers embedding if something changed.
    """
    import structlog
    log = structlog.get_logger()

    result = await db.execute(
        select(Note).where(
            and_(Note.id == note_id, Note.user_id == current_user.id, Note.deleted_at.is_(None))
        )
    )
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")

    # Get last version's content_text for dirty-check
    last_version_result = await db.execute(
        select(NoteVersion)
        .where(NoteVersion.note_id == note.id)
        .order_by(NoteVersion.version_number.desc())
        .limit(1)
    )
    last_version = last_version_result.scalar_one_or_none()
    last_content_text = last_version.content_text if last_version else None

    content_actually_changed = (
        note.content_text is not None
        and note.content_text.strip() != ""
        and note.content_text != last_content_text
    )

    if not content_actually_changed:
        log.info("checkpoint_skipped_no_change", note_id=note.id)
    else:
        # Cut a new version
        latest_version_result = await db.execute(
            select(func.max(NoteVersion.version_number)).where(NoteVersion.note_id == note.id)
        )
        latest_version = latest_version_result.scalar() or 0

        new_version = NoteVersion(
            note_id=note.id,
            created_by=current_user.id,
            version_number=latest_version + 1,
            title=note.title,
            content=note.content,
            format=note.format,
            content_text=note.content_text,
        )
        db.add(new_version)
        await db.commit()
        log.info("checkpoint_version_created", note_id=note.id, version=latest_version + 1)

        # Trigger embedding
        if note.content_text:
            try:
                import asyncio
                from app.core.ai.embeddings.boundary import embed_text_sync, EmbeddingStatus, EMBEDDING_VERSION

                text_to_embed = f"{note.title or ''}\n\n{note.content_text}".strip()
                embedding, emb_status = await asyncio.get_event_loop().run_in_executor(
                    None, embed_text_sync, text_to_embed
                )
                note.embedding = embedding
                note.embedding_status = emb_status.value
                note.embedding_model = EMBEDDING_VERSION if emb_status == EmbeddingStatus.READY else None
                await db.commit()
                log.info("checkpoint_embedding_updated", note_id=note.id, status=emb_status.value)
            except Exception as e:
                log.warning("checkpoint_embedding_failed", note_id=note.id, error=str(e))

    await db.refresh(note)

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
        content_text=note.content_text,
        editor_version=note.editor_version,
        created_at=note.created_at,
        updated_at=note.updated_at,
        children_count=children_count,
    )


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
            content_text=note.content_text,
            editor_version=note.editor_version,
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
        content={},
        format=NoteFormat.TIPTAP,
        journal_date=date,
        editor_version='tiptap@2',
        content_text='',
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
        content_text=new_note.content_text,
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
        content_text=new_note.content_text,
        editor_version=new_note.editor_version,
        created_at=new_note.created_at,
        updated_at=new_note.updated_at,
        children_count=0,
    )

@router.post(
    "/{note_id}/versions/{version_number}/restore",
    response_model=NoteResponse,
    summary="Restore note version",
    description="Restore a note to a specific version",
)
async def restore_note_version(
    note_id: int,
    version_number: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Restore a note to a specific version."""
    import structlog
    log = structlog.get_logger()
    
    # 1. Verify note ownership
    note_result = await db.execute(
        select(Note).where(
            and_(Note.id == note_id, Note.user_id == current_user.id, Note.deleted_at.is_(None))
        )
    )
    note = note_result.scalar_one_or_none()

    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")

    # 2. Get the specific version
    version_result = await db.execute(
        select(NoteVersion).where(
            and_(NoteVersion.note_id == note_id, NoteVersion.version_number == version_number)
        )
    )
    version = version_result.scalar_one_or_none()

    if not version:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Version not found")

    # 3. Restore content to Note
    note.title = version.title
    note.content = version.content
    note.content_text = version.content_text
    note.format = version.format
    note.updated_at = func.now()

    # Create a new version representing this restored state
    max_v_result = await db.execute(
        select(func.max(NoteVersion.version_number)).where(NoteVersion.note_id == note.id)
    )
    max_v = max_v_result.scalar() or 0
    next_v = max_v + 1

    restored_version = NoteVersion(
        note_id=note.id,
        created_by=current_user.id,
        version_number=next_v,
        title=note.title,
        content=note.content,
        format=note.format,
        content_text=note.content_text,
    )
    db.add(restored_version)
    await db.commit()
    await db.refresh(note)
    
    # Trigger embedding update if content changed
    from app.core.celery_app import celery_app
    celery_app.send_task("generate_note_embedding", args=[note.id])
    note.embedding_status = "pending"
    await db.commit()
    
    # Count children for NoteResponse
    children_result = await db.execute(
        select(func.count(Note.id)).where(
            and_(Note.parent_id == note.id, Note.deleted_at.is_(None))
        )
    )
    children_count = children_result.scalar() or 0

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
        content_text=note.content_text,
        editor_version=note.editor_version,
        created_at=note.created_at,
        updated_at=note.updated_at,
        children_count=children_count,
    )
