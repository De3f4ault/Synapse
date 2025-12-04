"""
Notes Repository

SQL query repository for note operations. Handles:
- Hierarchical note queries (recursive CTEs)
- Full-text search (PostgreSQL tsvector/tsquery)
- Version history
- Note tree operations
"""

from typing import Dict, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text


class NoteRepository:
    """
    Repository for note-related SQL operations.

    Encapsulates SQL queries including:
    - Recursive CTEs for hierarchical notes
    - Full-text search with ranking
    - Version history queries
    """

    def __init__(self, session: AsyncSession):
        """
        Initialize repository with database session.

        Args:
            session: AsyncSession instance for database operations
        """
        self.session = session

    async def get_note_hierarchy(
        self,
        user_id: int,
        root_id: Optional[int] = None
    ) -> List[Dict]:
        """
        Get note hierarchy using recursive CTE.

        Calls PostgreSQL function `get_note_hierarchy` which:
        - Uses recursive CTE to traverse note tree
        - Prevents cycles with path tracking
        - Limits depth to prevent infinite recursion
        - Returns notes with depth and path information

        Args:
            user_id: User ID
            root_id: Optional root note ID (None = all root notes)

        Returns:
            List of notes with hierarchy information
        """
        query = text("""
            SELECT * FROM developer_schema.get_note_hierarchy(
                :user_id, :root_id
            )
        """)

        result = await self.session.execute(
            query,
            {"user_id": user_id, "root_id": root_id}
        )

        rows = result.fetchall()

        notes = []
        for row in rows:
            notes.append({
                "id": row.id,
                "parent_id": row.parent_id,
                "title": row.title,
                "content": row.content,
                "depth": row.depth,
                "path": row.path  # Array of IDs from root to this note
            })

        return notes

    async def search_notes_fts(
        self,
        user_id: int,
        query_text: str,
        limit: int = 20
    ) -> List[Dict]:
        """
        Full-text search using PostgreSQL tsvector/tsquery.

        Calls PostgreSQL function `search_notes_fts` which:
        - Uses tsvector/tsquery for full-text search
        - Searches both title and content
        - Ranks results by relevance (ts_rank)
        - Returns highlighted excerpts

        Args:
            user_id: User ID
            query_text: Search query
            limit: Maximum results

        Returns:
            List of matching notes with rank and excerpts
        """
        query = text("""
            SELECT * FROM developer_schema.search_notes_fts(
                :user_id, :query_text, :limit
            )
        """)

        result = await self.session.execute(
            query,
            {
                "user_id": user_id,
                "query_text": query_text,
                "limit": limit
            }
        )

        rows = result.fetchall()

        notes = []
        for row in rows:
            notes.append({
                "id": row.id,
                "title": row.title,
                "content": row.content,
                "rank": float(row.rank),
                "excerpt": row.content[:200] + "..." if len(row.content) > 200 else row.content
            })

        return notes

    async def get_note_versions(
        self,
        note_id: int,
        limit: int = 50
    ) -> List[Dict]:
        """
        Get version history for a note.

        Args:
            note_id: Note ID
            limit: Maximum versions to return

        Returns:
            List of note versions ordered by version_number DESC
        """
        query = text("""
            SELECT
                id,
                note_id,
                version_number,
                title,
                content,
                format,
                created_at,
                created_by
            FROM developer_schema.note_versions
            WHERE note_id = :note_id
            ORDER BY version_number DESC
            LIMIT :limit
        """)

        result = await self.session.execute(
            query,
            {"note_id": note_id, "limit": limit}
        )

        rows = result.fetchall()

        versions = []
        for row in rows:
            versions.append({
                "id": row.id,
                "note_id": row.note_id,
                "version_number": row.version_number,
                "title": row.title,
                "content": row.content,
                "format": row.format,
                "created_at": row.created_at,
                "created_by": row.created_by
            })

        return versions

    async def get_child_notes(
        self,
        parent_id: int
    ) -> List[Dict]:
        """
        Get direct children of a note.

        Args:
            parent_id: Parent note ID

        Returns:
            List of child notes
        """
        query = text("""
            SELECT
                id,
                parent_id,
                title,
                created_at,
                updated_at
            FROM developer_schema.notes
            WHERE parent_id = :parent_id
              AND deleted_at IS NULL
            ORDER BY updated_at DESC
        """)

        result = await self.session.execute(
            query,
            {"parent_id": parent_id}
        )

        rows = result.fetchall()

        children = []
        for row in rows:
            children.append({
                "id": row.id,
                "parent_id": row.parent_id,
                "title": row.title,
                "created_at": row.created_at,
                "updated_at": row.updated_at
            })

        return children

    async def count_children(self, note_id: int) -> int:
        """
        Count direct children of a note.

        Args:
            note_id: Note ID

        Returns:
            Number of child notes
        """
        query = text("""
            SELECT COUNT(*)
            FROM developer_schema.notes
            WHERE parent_id = :note_id
              AND deleted_at IS NULL
        """)

        result = await self.session.execute(
            query,
            {"note_id": note_id}
        )

        count = result.scalar()

        return count or 0

    async def get_note_tags(self, note_id: int) -> List[Dict]:
        """
        Get tags for a note.

        Args:
            note_id: Note ID

        Returns:
            List of tags with names and colors
        """
        query = text("""
            SELECT
                t.id,
                t.name,
                t.color
            FROM developer_schema.tags t
            JOIN developer_schema.note_tags nt ON t.id = nt.tag_id
            WHERE nt.note_id = :note_id
        """)

        result = await self.session.execute(
            query,
            {"note_id": note_id}
        )

        rows = result.fetchall()

        tags = []
        for row in rows:
            tags.append({
                "id": row.id,
                "name": row.name,
                "color": row.color
            })

        return tags
