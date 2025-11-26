"""
Notes Service

Business logic for note operations including:
- Note CRUD with hierarchy support
- Version control
- Full-text and vector search
- Tag management

UPDATED: Now broadcasts WebSocket events when notes are created/updated.
"""

from typing import Dict, List, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload

from .repository import NoteRepository
from .constants import NoteFormat, MAX_HIERARCHY_DEPTH
from app.api.websockets.events import broadcast_note_created, broadcast_note_updated


class NoteService:
    """
    Service layer for note business logic.

    Handles note operations including hierarchical management,
    versioning, search, and tag operations.
    """

    def __init__(self, session: AsyncSession):
        """
        Initialize service with database session.

        Args:
            session: AsyncSession for database operations
        """
        self.session = session
        self.repository = NoteRepository(session)

    # ==================== NOTE CRUD ====================

    async def create_note(self, user_id: int, data: Dict) -> Dict:
        """
        Create a new note.

        UPDATED: Now broadcasts WebSocket event.

        Args:
            user_id: User creating the note
            data: Note data (title, content, format, parent_id, tags)

        Returns:
            Created note as dict
        """
        from app.models.note import Note  # Local import to avoid circular dependency
        from app.models.note_version import NoteVersion

        # Verify parent exists and belongs to user if parent_id provided
        if data.get("parent_id"):
            parent_query = select(Note).where(
                and_(
                    Note.id == data["parent_id"],
                    Note.user_id == user_id,
                    Note.deleted_at.is_(None)
                )
            )

            parent_result = await self.session.execute(parent_query)
            parent = parent_result.scalar_one_or_none()

            if not parent:
                raise Exception(f"Parent note {data['parent_id']} not found or access denied")

        # Create note
        note = Note(
            user_id=user_id,
            title=data["title"],
            content=data["content"],
            format=data.get("format", NoteFormat.MARKDOWN),
            parent_id=data.get("parent_id")
        )

        self.session.add(note)
        await self.session.flush()  # Get note ID

        # Create initial version
        version = NoteVersion(
            note_id=note.id,
            version_number=1,
            title=note.title,
            content=note.content,
            format=note.format,
            created_by=user_id
        )

        self.session.add(version)
        await self.session.commit()
        await self.session.refresh(note)

        # ✅ NEW: Broadcast WebSocket event
        await broadcast_note_created(
            user_id=user_id,
            note_id=note.id,
            title=note.title
        )

        return self._note_to_dict(note)

    async def get_note(self, note_id: int, user_id: int) -> Dict:
        """
        Get a note by ID.

        Args:
            note_id: Note ID
            user_id: User requesting the note

        Returns:
            Note as dict
        """
        from app.models.note import Note

        query = select(Note).where(
            and_(
                Note.id == note_id,
                Note.user_id == user_id,
                Note.deleted_at.is_(None)
            )
        )

        result = await self.session.execute(query)
        note = result.scalar_one_or_none()

        if not note:
            raise Exception(f"Note {note_id} not found or access denied")

        # Get tags
        tags = await self.repository.get_note_tags(note_id)

        # Get children count
        children_count = await self.repository.count_children(note_id)

        note_dict = self._note_to_dict(note)
        note_dict["tags"] = tags
        note_dict["children_count"] = children_count

        return note_dict

    async def list_notes(
        self,
        user_id: int,
        filters: Optional[Dict] = None
    ) -> List[Dict]:
        """
        List user's notes with optional filters.

        Args:
            user_id: User ID
            filters: Optional filters (tags, parent_id)

        Returns:
            List of notes
        """
        from app.models.note import Note

        filters = filters or {}

        query = select(Note).where(
            and_(
                Note.user_id == user_id,
                Note.deleted_at.is_(None)
            )
        ).order_by(Note.updated_at.desc())

        # Apply filters
        if "parent_id" in filters:
            if filters["parent_id"] is None:
                # Root notes only
                query = query.where(Note.parent_id.is_(None))
            else:
                query = query.where(Note.parent_id == filters["parent_id"])

        result = await self.session.execute(query)
        notes = result.scalars().all()

        return [self._note_to_dict(note) for note in notes]

    async def update_note(
        self,
        note_id: int,
        user_id: int,
        data: Dict
    ) -> Dict:
        """
        Update a note and create new version.

        UPDATED: Now broadcasts WebSocket event.

        Args:
            note_id: Note ID
            user_id: User updating the note
            data: Updated fields

        Returns:
            Updated note as dict
        """
        from app.models.note import Note
        from app.models.note_version import NoteVersion

        query = select(Note).where(
            and_(
                Note.id == note_id,
                Note.user_id == user_id,
                Note.deleted_at.is_(None)
            )
        )

        result = await self.session.execute(query)
        note = result.scalar_one_or_none()

        if not note:
            raise Exception(f"Note {note_id} not found or access denied")

        # Get latest version number
        version_query = select(NoteVersion).where(
            NoteVersion.note_id == note_id
        ).order_by(NoteVersion.version_number.desc()).limit(1)

        version_result = await self.session.execute(version_query)
        latest_version = version_result.scalar_one_or_none()

        next_version = (latest_version.version_number + 1) if latest_version else 1

        # Update note fields
        for key, value in data.items():
            if hasattr(note, key) and value is not None:
                setattr(note, key, value)

        # Create new version
        new_version = NoteVersion(
            note_id=note.id,
            version_number=next_version,
            title=note.title,
            content=note.content,
            format=note.format,
            created_by=user_id
        )

        self.session.add(new_version)
        await self.session.commit()
        await self.session.refresh(note)

        # ✅ NEW: Broadcast WebSocket event
        await broadcast_note_updated(
            user_id=user_id,
            note_id=note.id,
            title=note.title
        )

        return self._note_to_dict(note)

    async def delete_note(self, note_id: int, user_id: int) -> bool:
        """
        Soft delete a note and all its children.

        Args:
            note_id: Note ID
            user_id: User deleting the note

        Returns:
            True if deleted successfully
        """
        from app.models.note import Note

        query = select(Note).where(
            and_(
                Note.id == note_id,
                Note.user_id == user_id,
                Note.deleted_at.is_(None)
            )
        )

        result = await self.session.execute(query)
        note = result.scalar_one_or_none()

        if not note:
            raise Exception(f"Note {note_id} not found or access denied")

        # Recursively soft delete children
        await self._delete_children(note_id, user_id)

        # Soft delete the note
        note.deleted_at = datetime.utcnow()

        await self.session.commit()

        return True

    async def _delete_children(self, parent_id: int, user_id: int):
        """Recursively soft delete all children of a note"""
        from app.models.note import Note

        children_query = select(Note).where(
            and_(
                Note.parent_id == parent_id,
                Note.user_id == user_id,
                Note.deleted_at.is_(None)
            )
        )

        result = await self.session.execute(children_query)
        children = result.scalars().all()

        for child in children:
            # Recursively delete child's children
            await self._delete_children(child.id, user_id)

            # Soft delete child
            child.deleted_at = datetime.utcnow()

    # ==================== HIERARCHY OPERATIONS ====================

    async def get_note_tree(
        self,
        user_id: int,
        root_id: Optional[int] = None
    ) -> List[Dict]:
        """
        Get hierarchical note tree.

        Args:
            user_id: User ID
            root_id: Optional root note ID (None = all roots)

        Returns:
            Nested note tree structure
        """
        notes = await self.repository.get_note_hierarchy(user_id, root_id)

        # Build nested structure
        return self._build_tree(notes)

    def _build_tree(self, notes: List[Dict]) -> List[Dict]:
        """Build nested tree from flat list with path information"""
        # Simple tree building - in production would be more sophisticated
        tree = []
        nodes_by_id = {note["id"]: {**note, "children": []} for note in notes}

        for note in notes:
            if note["parent_id"] is None:
                tree.append(nodes_by_id[note["id"]])
            elif note["parent_id"] in nodes_by_id:
                nodes_by_id[note["parent_id"]]["children"].append(
                    nodes_by_id[note["id"]]
                )

        return tree

    # ==================== SEARCH OPERATIONS ====================

    async def search_notes(self, user_id: int, query: str) -> List[Dict]:
        """
        Hybrid search: full-text + vector search.

        Args:
            user_id: User ID
            query: Search query

        Returns:
            Ranked search results
        """
        # Full-text search
        fts_results = await self.repository.search_notes_fts(user_id, query, limit=20)

        # Vector search (placeholder - would use LanceDB)
        # vector_results = await vector_search(user_id, query)

        # Merge and rerank results (hybrid)
        # For now, just return FTS results
        return fts_results

    # ==================== VERSION OPERATIONS ====================

    async def get_versions(self, note_id: int, user_id: int) -> List[Dict]:
        """
        Get version history for a note.

        Args:
            note_id: Note ID
            user_id: User requesting versions

        Returns:
            List of versions
        """
        # Verify ownership
        from app.models.note import Note

        query = select(Note).where(
            and_(
                Note.id == note_id,
                Note.user_id == user_id,
                Note.deleted_at.is_(None)
            )
        )

        result = await self.session.execute(query)
        note = result.scalar_one_or_none()

        if not note:
            raise Exception(f"Note {note_id} not found or access denied")

        return await self.repository.get_note_versions(note_id)

    # ==================== HELPER METHODS ====================

    def _note_to_dict(self, note) -> Dict:
        """Convert Note model to dict"""
        return {
            "id": note.id,
            "user_id": note.user_id,
            "title": note.title,
            "content": note.content,
            "format": note.format,
            "parent_id": note.parent_id,
            "created_at": note.created_at,
            "updated_at": note.updated_at
        }
