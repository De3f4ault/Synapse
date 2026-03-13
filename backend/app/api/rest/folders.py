"""
Document Folders REST API endpoints.

CRUD operations for folder management with lexorank-based ordering.
Backend owns rank generation - frontend only sends position/sibling hints.
"""

from typing import Optional, List, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user
from app.models import User, DocumentFolder, DEFAULT_SYSTEM_FOLDERS
from app.schemas.folder import (
    FolderSettingsSchema,
    FolderResponse,
    FolderTreeNode,
    CreateFolderRequest,
    UpdateFolderRequest,
    MoveFolderRequest,
    DeleteStrategy,
)


router = APIRouter(prefix="/folders", tags=["Document Folders"])


# -----------------------------------------------------------------------------
# Lexorank Utilities
# -----------------------------------------------------------------------------


def generate_rank_between(before: Optional[str], after: Optional[str]) -> str:
    """
    Generate a lexorank string between two ranks.
    If before is None, generate rank before 'after'.
    If after is None, generate rank after 'before'.
    If both are None, return 'a0'.
    """
    if before is None and after is None:
        return "a0"

    if before is None:
        # Insert before 'after' - prepend with earlier character
        return chr(ord(after[0]) - 1) + after[1:] if after else "a0"

    if after is None:
        # Insert after 'before' - append character
        return before + "a"

    # Insert between - find midpoint
    # Simple implementation: append to shorter one
    if len(before) < len(after):
        return before + "m"
    elif len(after) < len(before):
        return after[: len(before)] + "m"
    else:
        # Same length - find first differing char and midpoint
        for i in range(len(before)):
            if before[i] != after[i]:
                mid_char = chr((ord(before[i]) + ord(after[i])) // 2)
                if mid_char != before[i] and mid_char != after[i]:
                    return before[:i] + mid_char + before[i + 1 :]
                break
        # Fallback: append
        return before + "m"


async def get_next_rank(
    db: AsyncSession,
    user_id: int,
    parent_id: Optional[int],
    position: str = "last",
    sibling_id: Optional[int] = None,
) -> str:
    """Calculate the next rank for a folder based on position."""
    if position == "first":
        # Get first sibling
        result = await db.execute(
            select(DocumentFolder.rank)
            .where(
                and_(
                    DocumentFolder.user_id == user_id,
                    DocumentFolder.parent_id == parent_id
                    if parent_id
                    else DocumentFolder.parent_id.is_(None),
                )
            )
            .order_by(DocumentFolder.rank)
            .limit(1)
        )
        first_rank = result.scalar()
        return generate_rank_between(None, first_rank)

    elif position == "last":
        # Get last sibling
        result = await db.execute(
            select(DocumentFolder.rank)
            .where(
                and_(
                    DocumentFolder.user_id == user_id,
                    DocumentFolder.parent_id == parent_id
                    if parent_id
                    else DocumentFolder.parent_id.is_(None),
                )
            )
            .order_by(DocumentFolder.rank.desc())
            .limit(1)
        )
        last_rank = result.scalar()
        return generate_rank_between(last_rank, None)

    elif position in ("before", "after") and sibling_id:
        # Get sibling and adjacent folder
        sibling = await db.get(DocumentFolder, sibling_id)
        if not sibling or sibling.user_id != user_id:
            raise HTTPException(status_code=404, detail="Sibling folder not found")

        if position == "before":
            # Get folder before sibling
            result = await db.execute(
                select(DocumentFolder.rank)
                .where(
                    and_(
                        DocumentFolder.user_id == user_id,
                        DocumentFolder.parent_id == parent_id
                        if parent_id
                        else DocumentFolder.parent_id.is_(None),
                        DocumentFolder.rank < sibling.rank,
                    )
                )
                .order_by(DocumentFolder.rank.desc())
                .limit(1)
            )
            before_rank = result.scalar()
            return generate_rank_between(before_rank, sibling.rank)
        else:  # after
            # Get folder after sibling
            result = await db.execute(
                select(DocumentFolder.rank)
                .where(
                    and_(
                        DocumentFolder.user_id == user_id,
                        DocumentFolder.parent_id == parent_id
                        if parent_id
                        else DocumentFolder.parent_id.is_(None),
                        DocumentFolder.rank > sibling.rank,
                    )
                )
                .order_by(DocumentFolder.rank)
                .limit(1)
            )
            after_rank = result.scalar()
            return generate_rank_between(sibling.rank, after_rank)

    # Default fallback
    return generate_rank_between(None, None)


# -----------------------------------------------------------------------------
# Endpoints
# -----------------------------------------------------------------------------


@router.get("", response_model=List[FolderTreeNode])
async def list_folders(
    flat: bool = Query(False, description="Return flat list instead of tree"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List all folders for the current user.

    Returns a tree structure by default, or flat list if flat=true.
    """
    from sqlalchemy import func
    from app.models import Document
    import logging

    logger = logging.getLogger(__name__)

    try:
        # Get all folders
        result = await db.execute(
            select(DocumentFolder)
            .where(DocumentFolder.user_id == current_user.id)
            .order_by(DocumentFolder.rank)
        )
        folders = result.scalars().all()
        logger.info(f"Found {len(folders)} folders for user {current_user.id}")

        if flat:
            return [FolderResponse.model_validate(f) for f in folders]

        # Get document counts per folder
        doc_counts_result = await db.execute(
            select(Document.folder_id, func.count(Document.id).label("count"))
            .where(
                and_(
                    Document.user_id == current_user.id,
                    Document.deleted_at.is_(None),
                    Document.folder_id.isnot(None),
                )
            )
            .group_by(Document.folder_id)
        )
        doc_counts = {row[0]: row[1] for row in doc_counts_result.all()}
        logger.info(f"Document counts: {doc_counts}")

        # Build tree with document counts
        folder_map = {}
        for f in folders:
            node_data = FolderResponse.model_validate(f).model_dump()
            node_data["children"] = []
            node_data["document_count"] = doc_counts.get(f.id, 0)
            folder_map[f.id] = FolderTreeNode(**node_data)

        roots = []
        for folder in folders:
            node = folder_map[folder.id]
            if folder.parent_id and folder.parent_id in folder_map:
                folder_map[folder.parent_id].children.append(node)
            else:
                roots.append(node)

        logger.info(f"Returning {len(roots)} root folders")
        return roots
    except Exception as e:
        logger.error(f"Error in list_folders: {type(e).__name__}: {str(e)}", exc_info=True)
        raise


@router.post("", response_model=FolderResponse, status_code=status.HTTP_201_CREATED)
async def create_folder(
    request: CreateFolderRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new folder."""
    # Validate parent exists if specified
    if request.parent_id:
        parent = await db.get(DocumentFolder, request.parent_id)
        if not parent or parent.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Parent folder not found")

    # Check for duplicate name under same parent
    existing = await db.execute(
        select(DocumentFolder).where(
            and_(
                DocumentFolder.user_id == current_user.id,
                DocumentFolder.parent_id == request.parent_id
                if request.parent_id
                else DocumentFolder.parent_id.is_(None),
                DocumentFolder.name == request.name,
            )
        )
    )
    if existing.scalar():
        raise HTTPException(status_code=409, detail="Folder with this name already exists")

    # Generate rank (append to end)
    rank = await get_next_rank(db, current_user.id, request.parent_id, position="last")

    folder = DocumentFolder(
        user_id=current_user.id,
        name=request.name,
        parent_id=request.parent_id,
        rank=rank,
        settings=request.settings.model_dump() if request.settings else None,
    )

    db.add(folder)
    await db.commit()
    await db.refresh(folder)

    return FolderResponse.model_validate(folder)


@router.get("/{folder_id}", response_model=FolderResponse)
async def get_folder(
    folder_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific folder."""
    folder = await db.get(DocumentFolder, folder_id)
    if not folder or folder.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Folder not found")

    return FolderResponse.model_validate(folder)


@router.patch("/{folder_id}", response_model=FolderResponse)
async def update_folder(
    folder_id: int,
    request: UpdateFolderRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update folder metadata (name, settings, pinned)."""
    folder = await db.get(DocumentFolder, folder_id)
    if not folder or folder.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Folder not found")

    # System folders cannot be renamed
    if folder.is_system and request.name and request.name != folder.name:
        raise HTTPException(status_code=403, detail="Cannot rename system folder")

    # Check for duplicate name if renaming
    if request.name and request.name != folder.name:
        existing = await db.execute(
            select(DocumentFolder).where(
                and_(
                    DocumentFolder.user_id == current_user.id,
                    DocumentFolder.parent_id == folder.parent_id
                    if folder.parent_id
                    else DocumentFolder.parent_id.is_(None),
                    DocumentFolder.name == request.name,
                    DocumentFolder.id != folder_id,
                )
            )
        )
        if existing.scalar():
            raise HTTPException(status_code=409, detail="Folder with this name already exists")
        folder.name = request.name

    if request.settings is not None:
        folder.settings = request.settings.model_dump()

    if request.is_pinned is not None:
        folder.is_pinned = request.is_pinned

    await db.commit()
    await db.refresh(folder)

    return FolderResponse.model_validate(folder)


@router.post("/{folder_id}/move", response_model=FolderResponse)
async def move_folder(
    folder_id: int,
    request: MoveFolderRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Move folder to a new location.

    Position can be: first, last, before, after.
    If before/after, sibling_id is required.
    """
    folder = await db.get(DocumentFolder, folder_id)
    if not folder or folder.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Folder not found")

    # System folders cannot be moved
    if folder.is_system:
        raise HTTPException(status_code=403, detail="Cannot move system folder")

    # Validate new parent
    if request.new_parent_id:
        new_parent = await db.get(DocumentFolder, request.new_parent_id)
        if not new_parent or new_parent.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Target folder not found")

        # Check for circular reference (cannot move into descendant)
        current = new_parent
        while current:
            if current.id == folder_id:
                raise HTTPException(
                    status_code=400, detail="Cannot move folder into its descendant"
                )
            if current.parent_id:
                current = await db.get(DocumentFolder, current.parent_id)
            else:
                break

    # Calculate new rank
    new_rank = await get_next_rank(
        db,
        current_user.id,
        request.new_parent_id,
        position=request.position,
        sibling_id=request.sibling_id,
    )

    folder.parent_id = request.new_parent_id
    folder.rank = new_rank

    await db.commit()
    await db.refresh(folder)

    return FolderResponse.model_validate(folder)


@router.delete("/{folder_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_folder(
    folder_id: int,
    strategy: str = Query("promote", pattern="^(promote|inbox)$"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete a folder.

    Strategy:
    - promote: Move children up to parent folder
    - inbox: Move children to Inbox
    """
    folder = await db.get(DocumentFolder, folder_id)
    if not folder or folder.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Folder not found")

    # System folders cannot be deleted
    if folder.is_system:
        raise HTTPException(status_code=403, detail="Cannot delete system folder")

    # Get children
    children_result = await db.execute(
        select(DocumentFolder).where(DocumentFolder.parent_id == folder_id)
    )
    children = children_result.scalars().all()

    # Get Inbox folder for inbox strategy
    inbox_id = None
    if strategy == "inbox":
        inbox_result = await db.execute(
            select(DocumentFolder.id).where(
                and_(
                    DocumentFolder.user_id == current_user.id,
                    DocumentFolder.name == "Inbox",
                    DocumentFolder.is_system.is_(True),
                )
            )
        )
        inbox_id = inbox_result.scalar()

    # Move children
    new_parent_id = folder.parent_id if strategy == "promote" else inbox_id
    for child in children:
        child.parent_id = new_parent_id

    # Move documents in this folder
    from app.models import Document

    docs_result = await db.execute(select(Document).where(Document.folder_id == folder_id))
    docs = docs_result.scalars().all()
    for doc in docs:
        doc.folder_id = new_parent_id

    # Delete folder
    await db.delete(folder)
    await db.commit()

    return None


@router.post("/seed-defaults", response_model=List[FolderResponse])
async def seed_default_folders(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Seed default system folders for user.

    Idempotent - will not create duplicates.
    """
    created = []

    for folder_def in DEFAULT_SYSTEM_FOLDERS:
        # Check if already exists
        existing = await db.execute(
            select(DocumentFolder).where(
                and_(
                    DocumentFolder.user_id == current_user.id,
                    DocumentFolder.name == folder_def["name"],
                    DocumentFolder.is_system.is_(True),
                )
            )
        )
        if existing.scalar():
            continue

        folder = DocumentFolder(
            user_id=current_user.id,
            name=folder_def["name"],
            rank=folder_def["rank"],
            is_system=True,
            settings=folder_def.get("settings"),
        )
        db.add(folder)
        created.append(folder)

    if created:
        await db.commit()
        for f in created:
            await db.refresh(f)

    return [FolderResponse.model_validate(f) for f in created]
