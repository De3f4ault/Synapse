"""
Notes Module Implementation

Implements the LearningModule interface for the notes module.
Provides hierarchical note-taking with version control, full-text search,
and integration with the AI context system.
"""

from typing import Dict, List, Optional, Any
from sqlalchemy.ext.asyncio import AsyncSession

from .service import NoteService
from .repository import NoteRepository
from .constants import MODULE_NAME, MODULE_DISPLAY_NAME, MODULE_DESCRIPTION


class NoteModule:
    """
    Notes module implementation for SYNAPSE.

    Provides hierarchical note-taking with versioning, search,
    and AI context integration.
    """

    def __init__(self, session: AsyncSession):
        """
        Initialize notes module.

        Args:
            session: AsyncSession injected by module loader
        """
        self.session = session
        self.service = NoteService(session)
        self.repository = NoteRepository(session)

    # ==================== MODULE INTERFACE ====================

    def get_name(self) -> str:
        """Return module identifier"""
        return MODULE_NAME

    def get_display_name(self) -> str:
        """Return human-readable module name"""
        return MODULE_DISPLAY_NAME

    def get_description(self) -> str:
        """Return module description"""
        return MODULE_DESCRIPTION

    def get_capabilities(self) -> List[str]:
        """
        Return list of module capabilities.

        Returns:
            List of capability flags
        """
        return [
            "CREATE",
            "READ",
            "UPDATE",
            "DELETE",
            "SEARCH"
        ]

    # ==================== CONTENT OPERATIONS ====================

    async def create_content(self, user_id: int, data: Dict) -> Any:
        """
        Create a note.

        Args:
            user_id: User creating note
            data: Note data (title, content, format, parent_id, tags)

        Returns:
            Created note as dict
        """
        return await self.service.create_note(user_id, data)

    async def get_content(
        self,
        user_id: int,
        filters: Optional[Dict] = None
    ) -> List[Any]:
        """
        Get user's notes.

        Args:
            user_id: User ID
            filters: Optional filters (tags, parent_id)

        Returns:
            List of notes
        """
        return await self.service.list_notes(user_id, filters)

    async def update_content(
        self,
        user_id: int,
        content_id: int,
        data: Dict
    ) -> Any:
        """
        Update a note.

        Args:
            user_id: User updating note
            content_id: Note ID
            data: Updated fields

        Returns:
            Updated note
        """
        return await self.service.update_note(content_id, user_id, data)

    async def delete_content(self, user_id: int, content_id: int) -> bool:
        """
        Delete a note.

        Args:
            user_id: User deleting note
            content_id: Note ID

        Returns:
            True if deleted successfully
        """
        return await self.service.delete_note(content_id, user_id)

    async def search_content(
        self,
        user_id: int,
        query: str,
        filters: Optional[Dict] = None
    ) -> List[Any]:
        """
        Search notes using hybrid search (FTS + vector).

        Args:
            user_id: User ID
            query: Search query
            filters: Optional filters

        Returns:
            List of matching notes with scores
        """
        return await self.service.search_notes(user_id, query)

    # ==================== AI INTEGRATION ====================

    async def contribute_context(
        self,
        user_id: int,
        query: str
    ) -> Dict:
        """
        Contribute notes context to AI agents.

        Provides:
        - Recent notes
        - Notes related to weak areas
        - Note count and activity

        Args:
            user_id: User ID
            query: Current query

        Returns:
            Dict containing notes context for AI injection
        """
        # Get recent notes
        recent_notes = await self.service.list_notes(user_id)
        recent_notes = recent_notes[:5]  # Top 5 most recent

        # Search notes related to query
        related_notes = await self.service.search_notes(user_id, query)
        related_notes = related_notes[:3]

        context = {
            "module": MODULE_NAME,
            "relevant_content": related_notes,
            "recent_notes": recent_notes,
            "statistics": {
                "total_notes": len(recent_notes),
                "recent_activity": [
                    note["title"] for note in recent_notes
                ]
            }
        }

        return context

    async def analyze_performance(self, user_id: int) -> Dict:
        """
        Analyze user's note-taking patterns.

        Args:
            user_id: User ID

        Returns:
            Performance analytics dict
        """
        notes = await self.service.list_notes(user_id)

        return {
            "module": MODULE_NAME,
            "analytics": {
                "total_notes": len(notes),
                "has_hierarchy": any(note.get("parent_id") for note in notes)
            }
        }
