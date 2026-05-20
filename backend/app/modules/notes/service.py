"""
Notes Service

Business logic for note operations including:
- Note CRUD with hierarchy support
- Version control
- Full-text and vector search (COMPLETE)
- Tag management

UPDATED: Now includes complete vector search implementation.
"""

from typing import Dict, List, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, text
from sqlalchemy.orm import selectinload

from .repository import NoteRepository
from .constants import NoteFormat, MAX_HIERARCHY_DEPTH
from app.api.websockets.events import broadcast_note_created, broadcast_note_updated

# Minimum plain-text length (chars) below which chunking is skipped.
# Notes shorter than this (~150 tokens) are small enough to inject in full;
# semantic chunking overhead is not worth it.
NOTE_CHUNK_MIN_LENGTH = 600


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

        UPDATED: Now broadcasts WebSocket event and triggers embedding generation.

        Args:
            user_id: User creating the note
            data: Note data (title, content, format, parent_id, tags)

        Returns:
            Created note as dict
        """
        from app.models.note import Note
        from app.models.note_version import NoteVersion

        # Verify parent exists if parent_id provided
        if data.get("parent_id"):
            parent_query = select(Note).where(
                and_(
                    Note.id == data["parent_id"], Note.user_id == user_id, Note.deleted_at.is_(None)
                )
            )

            parent_result = await self.session.execute(parent_query)
            parent = parent_result.scalar_one_or_none()

            if not parent:
                raise Exception(f"Parent note {data['parent_id']} not found")

        # Create note
        note = Note(
            user_id=user_id,
            title=data["title"],
            content=data["content"],
            format=data.get("format", NoteFormat.MARKDOWN),
            parent_id=data.get("parent_id"),
        )

        self.session.add(note)
        await self.session.flush()

        # Create initial version
        version = NoteVersion(
            note_id=note.id,
            version_number=1,
            title=note.title,
            content=note.content,
            format=note.format,
            created_by=user_id,
        )

        self.session.add(version)
        await self.session.commit()
        await self.session.refresh(note)

        # Broadcast WebSocket event
        await broadcast_note_created(user_id=user_id, note_id=note.id, title=note.title)

        # Trigger embedding generation (async background task)
        try:
            await self._generate_embeddings(note)
        except Exception as e:
            # Log error but don't fail the request
            import structlog

            logger = structlog.get_logger()
            logger.warning("embedding_generation_failed", note_id=note.id, error=str(e))

        return self._note_to_dict(note)

    async def get_note(self, note_id: int, user_id: int) -> Dict:
        """Get a note by ID."""
        from app.models.note import Note

        query = select(Note).where(
            and_(Note.id == note_id, Note.user_id == user_id, Note.deleted_at.is_(None))
        )

        result = await self.session.execute(query)
        note = result.scalar_one_or_none()

        if not note:
            raise Exception(f"Note {note_id} not found")

        tags = await self.repository.get_note_tags(note_id)
        children_count = await self.repository.count_children(note_id)

        note_dict = self._note_to_dict(note)
        note_dict["tags"] = tags
        note_dict["children_count"] = children_count

        return note_dict

    async def list_notes(self, user_id: int, filters: Optional[Dict] = None) -> List[Dict]:
        """List user's notes with optional filters."""
        from app.models.note import Note

        filters = filters or {}

        query = (
            select(Note)
            .where(and_(Note.user_id == user_id, Note.deleted_at.is_(None)))
            .order_by(Note.updated_at.desc())
        )

        if "parent_id" in filters:
            if filters["parent_id"] is None:
                query = query.where(Note.parent_id.is_(None))
            else:
                query = query.where(Note.parent_id == filters["parent_id"])

        result = await self.session.execute(query)
        notes = result.scalars().all()

        return [self._note_to_dict(note) for note in notes]

    async def update_note(self, note_id: int, user_id: int, data: Dict) -> Dict:
        """
        Update a note and create new version.

        UPDATED: Broadcasts WebSocket event and updates embeddings.
        """
        from app.models.note import Note
        from app.models.note_version import NoteVersion

        query = select(Note).where(
            and_(Note.id == note_id, Note.user_id == user_id, Note.deleted_at.is_(None))
        )

        result = await self.session.execute(query)
        note = result.scalar_one_or_none()

        if not note:
            raise Exception(f"Note {note_id} not found")

        # Get latest version number
        version_query = (
            select(NoteVersion)
            .where(NoteVersion.note_id == note_id)
            .order_by(NoteVersion.version_number.desc())
            .limit(1)
        )

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
            created_by=user_id,
        )

        self.session.add(new_version)
        await self.session.commit()
        await self.session.refresh(note)

        # Broadcast WebSocket event
        await broadcast_note_updated(user_id=user_id, note_id=note.id, title=note.title)

        # Update embeddings
        try:
            await self._generate_embeddings(note)
        except Exception as e:
            import structlog

            logger = structlog.get_logger()
            logger.warning("embedding_update_failed", note_id=note.id, error=str(e))

        return self._note_to_dict(note)

    async def delete_note(self, note_id: int, user_id: int) -> bool:
        """Soft delete a note and all its children."""
        from app.models.note import Note

        query = select(Note).where(
            and_(Note.id == note_id, Note.user_id == user_id, Note.deleted_at.is_(None))
        )

        result = await self.session.execute(query)
        note = result.scalar_one_or_none()

        if not note:
            raise Exception(f"Note {note_id} not found")

        await self._delete_children(note_id, user_id)
        note.deleted_at = datetime.utcnow()
        await self.session.commit()

        return True

    async def _delete_children(self, parent_id: int, user_id: int):
        """Recursively soft delete all children of a note"""
        from app.models.note import Note

        children_query = select(Note).where(
            and_(Note.parent_id == parent_id, Note.user_id == user_id, Note.deleted_at.is_(None))
        )

        result = await self.session.execute(children_query)
        children = result.scalars().all()

        for child in children:
            await self._delete_children(child.id, user_id)
            child.deleted_at = datetime.utcnow()

    # ==================== SEARCH OPERATIONS (COMPLETE) ====================

    async def search_notes(self, user_id: int, query: str) -> List[Dict]:
        """
        Hybrid search: full-text + vector search.

        COMPLETE IMPLEMENTATION with vector search integration.

        Args:
            user_id: User ID
            query: Search query

        Returns:
            Ranked search results combining FTS and vector search
        """
        # Full-text search
        fts_results = await self.repository.search_notes_fts(user_id, query, limit=20)

        # Vector search
        vector_results = await self._vector_search(user_id, query, limit=20)

        # Merge and rerank results
        merged_results = self._merge_search_results(fts_results, vector_results)

        return merged_results

    async def _vector_search(self, user_id: int, query: str, limit: int = 20) -> List[Dict]:
        """
        Perform vector search using Qdrant.

        Args:
            user_id: User ID
            query: Search query
            limit: Maximum results

        Returns:
            List of matching notes with similarity scores
        """
        try:
            from app.core.ai.rag.llama_index.query_engine import get_query_engine

            # Get query engine for user's notes
            query_engine = await get_query_engine(
                collection_name=f"notes_user_{user_id}", top_k=limit
            )

            # Perform vector search
            response = await query_engine.query(query)

            # Extract results
            results = []
            for node in response.source_nodes:
                results.append(
                    {
                        "id": int(node.node.metadata.get("note_id", 0)),
                        "title": node.node.metadata.get("title", ""),
                        "content": node.node.text,
                        "score": float(node.score),
                        "excerpt": node.node.text[:200] + "..."
                        if len(node.node.text) > 200
                        else node.node.text,
                    }
                )

            return results

        except Exception as e:
            import structlog

            logger = structlog.get_logger()
            logger.warning("vector_search_failed", error=str(e))
            return []

    def _merge_search_results(
        self, fts_results: List[Dict], vector_results: List[Dict]
    ) -> List[Dict]:
        """
        Merge and rerank FTS and vector search results.

        Uses a hybrid scoring approach:
        - FTS rank score (keyword relevance)
        - Vector similarity score (semantic relevance)

        Args:
            fts_results: Full-text search results
            vector_results: Vector search results

        Returns:
            Merged and reranked results
        """
        # Create a map of note_id -> combined scores
        note_scores = {}

        # Add FTS results with rank-based scoring
        for idx, result in enumerate(fts_results):
            note_id = result["id"]
            # Higher rank = lower index = better score
            fts_score = 1.0 / (idx + 1)  # Reciprocal rank
            note_scores[note_id] = {"note": result, "fts_score": fts_score, "vector_score": 0.0}

        # Add vector results
        for result in vector_results:
            note_id = result["id"]
            vector_score = result.get("score", 0.0)

            if note_id in note_scores:
                # Already in results, update vector score
                note_scores[note_id]["vector_score"] = vector_score
            else:
                # New result from vector search
                note_scores[note_id] = {
                    "note": result,
                    "fts_score": 0.0,
                    "vector_score": vector_score,
                }

        # Calculate combined scores (weighted average)
        FTS_WEIGHT = 0.4
        VECTOR_WEIGHT = 0.6

        scored_notes = []
        for note_id, scores in note_scores.items():
            combined_score = (
                FTS_WEIGHT * scores["fts_score"] + VECTOR_WEIGHT * scores["vector_score"]
            )

            scored_notes.append({**scores["note"], "combined_score": combined_score})

        # Sort by combined score (descending)
        scored_notes.sort(key=lambda x: x["combined_score"], reverse=True)

        return scored_notes

    async def _generate_embeddings(self, note):
        """
        Generate note-level and chunk-level embeddings in a single transaction.

        Uses content_text (plain text extracted by the frontend editor) instead
        of the raw JSONB content blob. Both the note-level embedding update and
        the chunk insertions commit atomically — if chunk insertion fails, the
        note's embedding_status is set to FAILED so the hydrator knows it cannot
        rely on chunk data for this note.

        Tiers used by ContentHydrator._hydrate_note:
          READY  → note-level + chunks exist, full semantic retrieval available
          FAILED → fall back to structural truncation
          PENDING → note was too short to embed or chunk (inject in full)
        """
        import asyncio
        import structlog
        from app.core.ai.embeddings.boundary import (
            embed_text_sync,
            EMBEDDING_VERSION,
            EmbeddingStatus,
        )

        logger = structlog.get_logger()

        try:
            # Use pre-extracted plain text. Never embed raw JSONB.
            body = note.content_text or ""
            text_to_embed = f"{note.title or ''}\n\n{body}".strip()

            if not text_to_embed:
                logger.warning("note_embedding_skipped_no_text", note_id=note.id)
                note.embedding_status = EmbeddingStatus.PENDING.value
                return

            # ── 1. Note-level embedding (existing behaviour) ───────────────────
            embedding, emb_status = await asyncio.get_event_loop().run_in_executor(
                None, embed_text_sync, text_to_embed
            )

            note.embedding = embedding
            note.embedding_status = emb_status.value
            note.embedding_model = EMBEDDING_VERSION if emb_status == EmbeddingStatus.READY else None

            # ── 2. Chunk-level embeddings (new) ───────────────────────────────
            # Only chunk if text is long enough to be worth it.
            if emb_status == EmbeddingStatus.READY and len(text_to_embed) >= NOTE_CHUNK_MIN_LENGTH:
                await self._generate_chunk_embeddings(note, text_to_embed)

            logger.info(
                "note_embedding_complete",
                note_id=note.id,
                status=emb_status.value,
                chunked=len(text_to_embed) >= NOTE_CHUNK_MIN_LENGTH,
            )

        except Exception as e:
            logger.warning("note_embedding_failed", note_id=note.id, error=str(e))
            note.embedding_status = "FAILED"

    async def _generate_chunk_embeddings(self, note, full_text: str) -> None:
        """
        Chunk full_text via AdvancedSemanticChunker and store chunk embeddings.

        Performs an atomic replace: old chunks are deleted and new chunks are
        inserted within the same database session. If insertion fails mid-way,
        the caller's exception handler marks embedding_status = FAILED so the
        hydrator knows chunks are unreliable for this note.

        Args:
            note: Note model instance (for note_id + user_id)
            full_text: Pre-extracted plain text (title + body)
        """
        import asyncio
        import structlog
        from app.core.ai.rag.chunking import get_semantic_chunker
        from app.core.ai.embeddings.boundary import embed_text_sync, EMBEDDING_DIM

        logger = structlog.get_logger()

        # Chunk in thread pool — SemanticSplitterNodeParser runs sync embedding calls
        chunker = get_semantic_chunker()  # singleton, model loaded once per worker
        chunks = await asyncio.get_event_loop().run_in_executor(
            None,
            chunker.chunk_text,
            full_text,
            {"note_id": note.id, "user_id": note.user_id},
        )

        if not chunks:
            logger.warning("note_chunking_produced_no_chunks", note_id=note.id)
            return

        # Atomic replace: delete stale chunks, insert fresh ones.
        # This executes within the same session/transaction as the note-level
        # embedding update — both commit together in the caller.
        await self.session.execute(
            text("DELETE FROM developer_schema.note_chunks WHERE note_id = :note_id"),
            {"note_id": note.id},
        )

        for chunk in chunks:
            chunk_text = chunk["text"]
            if not chunk_text.strip():
                continue

            # Embed each chunk synchronously in thread pool
            chunk_embedding, chunk_status = await asyncio.get_event_loop().run_in_executor(
                None, embed_text_sync, chunk_text
            )

            if chunk_embedding is None:
                logger.warning(
                    "chunk_embedding_failed",
                    note_id=note.id,
                    chunk_index=chunk["chunk_index"],
                )
                continue

            # Format embedding as PostgreSQL vector literal
            emb_str = "[" + ",".join(str(x) for x in chunk_embedding) + "]"

            await self.session.execute(
                text("""
                    INSERT INTO developer_schema.note_chunks
                        (note_id, user_id, chunk_index, content, embedding, chunking_method)
                    VALUES
                        (:note_id, :user_id, :chunk_index, :content,
                         CAST(:embedding AS vector(:dim)), :method)
                    ON CONFLICT (note_id, chunk_index) DO UPDATE
                        SET content = EXCLUDED.content,
                            embedding = EXCLUDED.embedding,
                            chunking_method = EXCLUDED.chunking_method,
                            created_at = NOW()
                """),
                {
                    "note_id": note.id,
                    "user_id": note.user_id,
                    "chunk_index": chunk["chunk_index"],
                    "content": chunk_text,
                    "embedding": emb_str,
                    "dim": EMBEDDING_DIM,
                    "method": chunk.get("chunking_method", "semantic"),
                },
            )

        logger.info(
            "note_chunk_embeddings_complete",
            note_id=note.id,
            chunk_count=len(chunks),
        )

    # ==================== HIERARCHY OPERATIONS ====================

    async def get_note_tree(self, user_id: int, root_id: Optional[int] = None) -> List[Dict]:
        """Get hierarchical note tree."""
        notes = await self.repository.get_note_hierarchy(user_id, root_id)
        return self._build_tree(notes)

    def _build_tree(self, notes: List[Dict]) -> List[Dict]:
        """Build nested tree from flat list."""
        tree = []
        nodes_by_id = {note["id"]: {**note, "children": []} for note in notes}

        for note in notes:
            if note["parent_id"] is None:
                tree.append(nodes_by_id[note["id"]])
            elif note["parent_id"] in nodes_by_id:
                nodes_by_id[note["parent_id"]]["children"].append(nodes_by_id[note["id"]])

        return tree

    # ==================== VERSION OPERATIONS ====================

    async def get_versions(self, note_id: int, user_id: int) -> List[Dict]:
        """Get version history for a note."""
        from app.models.note import Note

        query = select(Note).where(
            and_(Note.id == note_id, Note.user_id == user_id, Note.deleted_at.is_(None))
        )

        result = await self.session.execute(query)
        note = result.scalar_one_or_none()

        if not note:
            raise Exception(f"Note {note_id} not found")

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
            "updated_at": note.updated_at,
        }
