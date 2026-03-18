"""
DMS Search Service — document-level full-text search with metadata filtering.

Combines PostgreSQL GIN index (websearch_to_tsquery) with metadata filters
for correspondents, document types, tags, dates, and more.

Sourced from Paperless-ngx: index.py (618 lines)
  - get_schema(): 35-field Whoosh schema
  - DelayedFullTextQuery: MultifieldParser + spell correction
  - MappedDocIdSet: permission-aware result filtering

Synapse replaces Whoosh with PostgreSQL built-in GIN + tsvector.
"""

import logging
from typing import Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger("synapse.search.dms")


class DMSSearchService:
    """
    Document-level full-text search with metadata filtering.

    Uses PostgreSQL GIN index on documents.search_vector for FTS,
    combined with metadata filters for correspondents, types, tags, dates.
    """

    def __init__(self, session: AsyncSession):
        self.session = session

    async def search(
        self,
        user_id: int,
        query: str = "",
        # Classification FK filters
        correspondent_id: Optional[int] = None,
        document_type_id: Optional[int] = None,
        storage_path_id: Optional[int] = None,
        # Tag filters
        tag_ids: Optional[list[int]] = None,
        tag_ids_exclude: Optional[list[int]] = None,
        has_any_tag: Optional[bool] = None,
        # Classification existence filters
        has_correspondent: Optional[bool] = None,
        has_document_type: Optional[bool] = None,
        # Date range filters
        created_date_from: Optional[str] = None,
        created_date_to: Optional[str] = None,
        added_date_from: Optional[str] = None,
        added_date_to: Optional[str] = None,
        # Sorting
        sort_by: str = "rank",
        sort_reverse: bool = True,
        # Pagination
        page: int = 1,
        page_size: int = 25,
    ) -> dict:
        """
        Full-text search across documents with metadata filtering.

        Equivalent to Paperless's DelayedFullTextQuery but using
        PostgreSQL's websearch_to_tsquery instead of Whoosh's MultifieldParser.
        """
        conditions = ["d.user_id = :user_id", "d.deleted_at IS NULL"]
        params: dict = {"user_id": user_id}

        # -----------------------------------------------------------
        # Full-text search using GIN index
        # Paperless equivalent: MultifieldParser(["content", "title", ...])
        # -----------------------------------------------------------
        if query:
            conditions.append(
                "d.search_vector @@ websearch_to_tsquery('english', :query)"
            )
            params["query"] = query

        # -----------------------------------------------------------
        # Metadata filters
        # Paperless equivalent: SavedViewFilterRule types
        # -----------------------------------------------------------

        if correspondent_id is not None:
            conditions.append("d.correspondent_id = :correspondent_id")
            params["correspondent_id"] = correspondent_id

        if document_type_id is not None:
            conditions.append("d.document_type_id = :document_type_id")
            params["document_type_id"] = document_type_id

        if storage_path_id is not None:
            conditions.append("d.storage_path_id = :storage_path_id")
            params["storage_path_id"] = storage_path_id

        # Tag inclusion: HAS any of these tags
        if tag_ids:
            conditions.append(
                "EXISTS (SELECT 1 FROM document_tags dt "
                "WHERE dt.document_id = d.id AND dt.tag_id = ANY(:tag_ids))"
            )
            params["tag_ids"] = tag_ids

        # Tag exclusion: DOES NOT HAVE any of these tags
        if tag_ids_exclude:
            conditions.append(
                "NOT EXISTS (SELECT 1 FROM document_tags dt "
                "WHERE dt.document_id = d.id AND dt.tag_id = ANY(:tag_ids_exclude))"
            )
            params["tag_ids_exclude"] = tag_ids_exclude

        # Has any tag at all
        if has_any_tag is not None:
            if has_any_tag:
                conditions.append(
                    "EXISTS (SELECT 1 FROM document_tags dt WHERE dt.document_id = d.id)"
                )
            else:
                conditions.append(
                    "NOT EXISTS (SELECT 1 FROM document_tags dt WHERE dt.document_id = d.id)"
                )

        # Classification existence
        if has_correspondent is not None:
            if has_correspondent:
                conditions.append("d.correspondent_id IS NOT NULL")
            else:
                conditions.append("d.correspondent_id IS NULL")

        if has_document_type is not None:
            if has_document_type:
                conditions.append("d.document_type_id IS NOT NULL")
            else:
                conditions.append("d.document_type_id IS NULL")

        # Date range filters
        if created_date_from:
            conditions.append("d.created_date >= :created_date_from")
            params["created_date_from"] = created_date_from
        if created_date_to:
            conditions.append("d.created_date <= :created_date_to")
            params["created_date_to"] = created_date_to
        if added_date_from:
            conditions.append("d.created_at >= :added_date_from")
            params["added_date_from"] = added_date_from
        if added_date_to:
            conditions.append("d.created_at <= :added_date_to")
            params["added_date_to"] = added_date_to

        # -----------------------------------------------------------
        # Build WHERE clause
        # -----------------------------------------------------------
        where = " AND ".join(conditions)

        # -----------------------------------------------------------
        # Ranking expression
        # Paperless equivalent: TF-IDF scoring via Whoosh
        # We use ts_rank_cd (cover density — considers term proximity)
        # -----------------------------------------------------------
        rank_expr = (
            "ts_rank_cd(d.search_vector, websearch_to_tsquery('english', :query), 32)"
            if query else "0"
        )

        # -----------------------------------------------------------
        # Sorting
        # Paperless equivalent: sort_fields_map in DelayedQuery
        # -----------------------------------------------------------
        direction = "DESC" if sort_reverse else "ASC"
        sort_map = {
            "rank": f"{rank_expr} DESC",
            "created_date": f"d.created_date {direction}",
            "created_at": f"d.created_at {direction}",
            "filename": f"d.filename {direction}",
            "page_count": f"d.page_count {direction}",
        }
        order = sort_map.get(sort_by, f"{rank_expr} DESC")

        # -----------------------------------------------------------
        # Highlight snippets
        # Paperless equivalent: ContextFragmenter(surround=50) + HtmlFormatter
        # -----------------------------------------------------------
        highlight_expr = ""
        if query:
            highlight_expr = (
                ", ts_headline('english', COALESCE(d.content_text, ''), "
                "websearch_to_tsquery('english', :query), "
                "'StartSel=<mark>, StopSel=</mark>, MaxWords=50, MinWords=20') as highlight"
            )

        # -----------------------------------------------------------
        # Count total results
        # -----------------------------------------------------------
        count_sql = text(f"SELECT COUNT(*) FROM documents d WHERE {where}")
        count_result = await self.session.execute(count_sql, params)
        total = count_result.scalar()

        # -----------------------------------------------------------
        # Get results page
        # -----------------------------------------------------------
        sql = text(f"""
            SELECT d.id, d.filename, d.file_type, d.file_size,
                   d.page_count, d.word_count, d.created_date, d.created_at,
                   d.correspondent_id, d.document_type_id, d.storage_path_id,
                   d.archive_serial_number, d.processing_status,
                   d.mime_type, d.content_hash,
                   {rank_expr} as rank
                   {highlight_expr}
            FROM documents d
            WHERE {where}
            ORDER BY {order}
            LIMIT :limit OFFSET :offset
        """)
        params["limit"] = page_size
        params["offset"] = (page - 1) * page_size

        result = await self.session.execute(sql, params)
        rows = [dict(row._mapping) for row in result.fetchall()]

        # -----------------------------------------------------------
        # Attach tags for each result (batch, not N+1)
        # -----------------------------------------------------------
        if rows:
            doc_ids = [r["id"] for r in rows]
            tags_sql = text("""
                SELECT dt.document_id, t.id, t.name, t.color
                FROM document_tags dt
                JOIN tags t ON dt.tag_id = t.id
                WHERE dt.document_id = ANY(:doc_ids)
            """)
            tags_result = await self.session.execute(tags_sql, {"doc_ids": doc_ids})
            tags_by_doc: dict = {}
            for row in tags_result.fetchall():
                doc_id = row[0]
                if doc_id not in tags_by_doc:
                    tags_by_doc[doc_id] = []
                tags_by_doc[doc_id].append(
                    {"id": row[1], "name": row[2], "color": row[3]}
                )

            for r in rows:
                r["tags"] = tags_by_doc.get(r["id"], [])
        else:
            for r in rows:
                r["tags"] = []

        logger.info(
            "DMS search: query='%s', user=%d, total=%d, page=%d",
            query, user_id, total, page,
        )

        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "results": rows,
        }
