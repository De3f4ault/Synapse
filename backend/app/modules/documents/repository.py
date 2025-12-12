"""
Documents Repository

SQL query repository for document operations.
Handles document metadata queries and chunk retrieval.
"""

from typing import Dict, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text


class DocumentRepository:
    """
    Repository for document-related SQL operations.

    Handles document and chunk queries, but not file I/O.
    File operations are in the service layer.
    """

    def __init__(self, session: AsyncSession):
        """
        Initialize repository with database session.

        Args:
            session: AsyncSession instance for database operations
        """
        self.session = session

    async def get_document_chunks(
        self,
        document_id: int,
        page: Optional[int] = None
    ) -> List[Dict]:
        """
        Get all chunks for a document, optionally filtered by page.

        Args:
            document_id: Document ID
            page: Optional page number filter

        Returns:
            List of document chunks
        """
        if page is not None:
            query = text("""
                SELECT
                    id,
                    document_id,
                    content,
                    chunk_index,
                    page,
                    start_char,
                    end_char,
                    embedding_id,
                    metadata
                FROM developer_schema.document_chunks
                WHERE document_id = :document_id
                  AND page = :page
                ORDER BY chunk_index ASC
            """)

            params = {"document_id": document_id, "page": page}
        else:
            query = text("""
                SELECT
                    id,
                    document_id,
                    content,
                    chunk_index,
                    page,
                    start_char,
                    end_char,
                    embedding_id,
                    metadata
                FROM developer_schema.document_chunks
                WHERE document_id = :document_id
                ORDER BY chunk_index ASC
            """)

            params = {"document_id": document_id}

        result = await self.session.execute(query, params)
        rows = result.fetchall()

        chunks = []
        for row in rows:
            chunks.append({
                "id": row.id,
                "document_id": row.document_id,
                "content": row.content,
                "chunk_index": row.chunk_index,
                "page": row.page,
                "start_char": row.start_char,
                "end_char": row.end_char,
                "embedding_id": row.embedding_id,
                "metadata": row.metadata
            })

        return chunks

    async def get_document_statistics(self, document_id: int) -> Dict:
        """
        Get statistics for a document.

        Args:
            document_id: Document ID

        Returns:
            Dict with chunk_count and other stats
        """
        query = text("""
            SELECT
                COUNT(*) as chunk_count,
                MAX(page) as max_page
            FROM developer_schema.document_chunks
            WHERE document_id = :document_id
        """)

        result = await self.session.execute(query, {"document_id": document_id})
        row = result.fetchone()

        if not row:
            return {
                "chunk_count": 0,
                "max_page": 0
            }

        return {
            "chunk_count": row.chunk_count,
            "max_page": row.max_page or 0
        }

    async def search_chunks(
        self,
        user_id: int,
        query_text: str,
        document_ids: Optional[List[int]] = None,
        limit: int = 20
    ) -> List[Dict]:
        """
        Search document chunks using full-text search.

        Args:
            user_id: User ID
            query_text: Search query
            document_ids: Optional document ID filter
            limit: Maximum results

        Returns:
            List of matching chunks with scores
        """
        if document_ids:
            query = text("""
                SELECT
                    dc.id,
                    dc.document_id,
                    dc.content,
                    dc.chunk_index,
                    dc.page,
                    ts_rank(
                        to_tsvector('english', dc.content),
                        plainto_tsquery('english', :query_text)
                    ) as rank
                FROM developer_schema.document_chunks dc
                JOIN developer_schema.documents d ON dc.document_id = d.id
                WHERE d.user_id = :user_id
                  AND d.id = ANY(:document_ids)
                  AND d.deleted_at IS NULL
                  AND to_tsvector('english', dc.content) @@ plainto_tsquery('english', :query_text)
                ORDER BY rank DESC
                LIMIT :limit
            """)

            params = {
                "user_id": user_id,
                "query_text": query_text,
                "document_ids": document_ids,
                "limit": limit
            }
        else:
            query = text("""
                SELECT
                    dc.id,
                    dc.document_id,
                    dc.content,
                    dc.chunk_index,
                    dc.page,
                    ts_rank(
                        to_tsvector('english', dc.content),
                        plainto_tsquery('english', :query_text)
                    ) as rank
                FROM developer_schema.document_chunks dc
                JOIN developer_schema.documents d ON dc.document_id = d.id
                WHERE d.user_id = :user_id
                  AND d.deleted_at IS NULL
                  AND to_tsvector('english', dc.content) @@ plainto_tsquery('english', :query_text)
                ORDER BY rank DESC
                LIMIT :limit
            """)

            params = {
                "user_id": user_id,
                "query_text": query_text,
                "limit": limit
            }

        result = await self.session.execute(query, params)
        rows = result.fetchall()

        chunks = []
        for row in rows:
            chunks.append({
                "id": row.id,
                "document_id": row.document_id,
                "content": row.content,
                "chunk_index": row.chunk_index,
                "page": row.page,
                "rank": float(row.rank)
            })

        return chunks

    async def delete_document_chunks(self, document_id: int):
        """
        Delete all chunks for a document.

        Args:
            document_id: Document ID
        """
        query = text("""
            DELETE FROM developer_schema.document_chunks
            WHERE document_id = :document_id
        """)

        await self.session.execute(query, {"document_id": document_id})
