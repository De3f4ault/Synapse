"""
Note Tools

AI tools for note manipulation and organization.
"""

from typing import Dict, Any, List
from .base import BaseTool, ToolPermission, ToolExecutionError
from app.core.module_system.registry import ModuleRegistry
import structlog

logger = structlog.get_logger()


class CreateNoteTool(BaseTool):
    """Create a new note."""

    @property
    def name(self) -> str:
        return "create_note"

    @property
    def description(self) -> str:
        return (
            "Create a new note for the user. "
            "Notes can be organized hierarchically with parent-child relationships. "
            "Use this to help users capture and organize information."
        )

    @property
    def parameters(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "title": {
                    "type": "string",
                    "description": "Note title"
                },
                "content": {
                    "type": "string",
                    "description": "Note content in markdown format"
                },
                "parent_id": {
                    "type": "integer",
                    "description": "Optional: ID of parent note for hierarchical organization"
                },
                "tags": {
                    "type": "array",
                    "description": "Optional tags for categorizing the note",
                    "items": {"type": "string"}
                }
            },
            "required": ["title", "content"]
        }

    @property
    def required_permissions(self) -> List[ToolPermission]:
        return [ToolPermission.WRITE]

    async def execute(self, user_id: int, **kwargs) -> Dict[str, Any]:
        """Execute note creation."""
        try:
            registry = ModuleRegistry()
            notes_module = registry.get_module("notes")

            if not notes_module:
                raise ToolExecutionError("Notes module not available")

            note = await notes_module.create_content(
                user_id=user_id,
                data={
                    "title": kwargs["title"],
                    "content": kwargs["content"],
                    "parent_id": kwargs.get("parent_id"),
                    "tags": kwargs.get("tags", []),
                    "format": "markdown"
                }
            )

            return {
                "success": True,
                "data": {
                    "note_id": note.id,
                    "title": note.title,
                    "parent_id": note.parent_id,
                    "created_at": note.created_at.isoformat()
                },
                "message": "Note created successfully"
            }

        except Exception as e:
            logger.error("note_creation_failed", user_id=user_id, error=str(e))
            return {
                "success": False,
                "data": {},
                "message": f"Failed to create note: {str(e)}"
            }


class SearchNotesTool(BaseTool):
    """Search notes using hybrid search (vector + full-text)."""

    @property
    def name(self) -> str:
        return "search_notes"

    @property
    def description(self) -> str:
        return (
            "Search through the user's notes using semantic and keyword search. "
            "Finds notes related to a query based on meaning and exact matches. "
            "Use this to find relevant information or check existing content."
        )

    @property
    def parameters(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Search query (topic, keyword, or question)"
                },
                "limit": {
                    "type": "integer",
                    "description": "Maximum number of results",
                    "default": 10
                }
            },
            "required": ["query"]
        }

    @property
    def required_permissions(self) -> List[ToolPermission]:
        return [ToolPermission.READ]

    async def execute(self, user_id: int, **kwargs) -> Dict[str, Any]:
        """Execute note search."""
        try:
            registry = ModuleRegistry()
            notes_module = registry.get_module("notes")

            if not notes_module:
                raise ToolExecutionError("Notes module not available")

            notes = await notes_module.search_content(
                user_id=user_id,
                query=kwargs["query"],
                filters={"limit": kwargs.get("limit", 10)}
            )

            results = [
                {
                    "note_id": note.id,
                    "title": note.title,
                    "content_preview": note.content[:200] + "..." if len(note.content) > 200 else note.content,
                    "tags": note.tags if hasattr(note, "tags") else [],
                    "updated_at": note.updated_at.isoformat()
                }
                for note in notes
            ]

            return {
                "success": True,
                "data": {"results": results, "count": len(results)},
                "message": f"Found {len(results)} matching notes"
            }

        except Exception as e:
            logger.error("note_search_failed", user_id=user_id, error=str(e))
            return {
                "success": False,
                "data": {"results": [], "count": 0},
                "message": f"Search failed: {str(e)}"
            }


class UpdateNoteTool(BaseTool):
    """Update an existing note."""

    @property
    def name(self) -> str:
        return "update_note"

    @property
    def description(self) -> str:
        return (
            "Update the content or title of an existing note. "
            "This creates a new version for version history. "
            "Use this to help users refine or expand their notes."
        )

    @property
    def parameters(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "note_id": {
                    "type": "integer",
                    "description": "ID of the note to update"
                },
                "title": {
                    "type": "string",
                    "description": "New title (optional)"
                },
                "content": {
                    "type": "string",
                    "description": "New content (optional)"
                }
            },
            "required": ["note_id"]
        }

    @property
    def required_permissions(self) -> List[ToolPermission]:
        return [ToolPermission.WRITE]

    async def execute(self, user_id: int, **kwargs) -> Dict[str, Any]:
        """Execute note update."""
        try:
            registry = ModuleRegistry()
            notes_module = registry.get_module("notes")

            if not notes_module:
                raise ToolExecutionError("Notes module not available")

            update_data = {}
            if "title" in kwargs:
                update_data["title"] = kwargs["title"]
            if "content" in kwargs:
                update_data["content"] = kwargs["content"]

            note = await notes_module.update_content(
                user_id=user_id,
                content_id=kwargs["note_id"],
                data=update_data
            )

            return {
                "success": True,
                "data": {
                    "note_id": note.id,
                    "title": note.title,
                    "updated_at": note.updated_at.isoformat()
                },
                "message": "Note updated successfully"
            }

        except Exception as e:
            logger.error("note_update_failed", user_id=user_id, error=str(e))
            return {
                "success": False,
                "data": {},
                "message": f"Failed to update note: {str(e)}"
            }


class GetNoteHierarchyTool(BaseTool):
    """Get the hierarchical structure of notes."""

    @property
    def name(self) -> str:
        return "get_note_hierarchy"

    @property
    def description(self) -> str:
        return (
            "Get the hierarchical tree structure of the user's notes. "
            "Shows parent-child relationships. "
            "Use this to understand note organization or navigate the structure."
        )

    @property
    def parameters(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "root_id": {
                    "type": "integer",
                    "description": "Optional: Start from specific note (default: all root notes)"
                }
            },
            "required": []
        }

    @property
    def required_permissions(self) -> List[ToolPermission]:
        return [ToolPermission.READ]

    async def execute(self, user_id: int, **kwargs) -> Dict[str, Any]:
        """Execute hierarchy retrieval."""
        try:
            registry = ModuleRegistry()
            notes_module = registry.get_module("notes")

            if not notes_module:
                raise ToolExecutionError("Notes module not available")

            # Get service from module
            from app.modules.notes.service import NoteService
            from app.db.session import get_db

            async with get_db() as db:
                service = NoteService(db)
                hierarchy = await service.get_note_tree(
                    user_id=user_id,
                    root_id=kwargs.get("root_id")
                )

            return {
                "success": True,
                "data": {"hierarchy": hierarchy},
                "message": "Note hierarchy retrieved"
            }

        except Exception as e:
            logger.error("get_hierarchy_failed", user_id=user_id, error=str(e))
            return {
                "success": False,
                "data": {"hierarchy": []},
                "message": f"Failed to get hierarchy: {str(e)}"
            }
