"""
ParentChunkStore — Parent-child chunk assembly for contextual retrieval.

Sprint 2, Item 3.

Problem:
    512-token chunks give the Cross-Encoder a precise window for relevance
    scoring. But 512 tokens is often too narrow for the LLM to answer well —
    it lacks surrounding context (the paragraph before the key sentence, the
    heading that frames it, the follow-on example).

Solution — parent-child chunking:
    At ingestion time, for each document:
    1. The chunker produces N child chunks (512 tokens each, overlapping).
    2. This service groups consecutive child chunks into 2048-token parent
       windows (4 children per parent, sliding window of step=1 parent).
    3. Parent content is stored as a DocumentChunk with is_parent=True.
    4. Children reference their parent via parent_chunk_id.

    At retrieval time (rag_pipeline.py), after cross-encoder reranking:
    5. For top-k child chunks, swap the child text for the parent content.
    6. This gives the LLM a wider context window without burning the
       cross-encoder budget on the larger chunks.

Backward compatibility:
    Old documents without parents continue to work. The retrieval swap
    (step 5) simply skips chunks where parent_chunk_id is NULL.

Ingestion interface:
    store = ParentChunkStore(session)
    await store.write_parents_for_document(document_id, child_chunks)

    child_chunks: List[DocumentChunk] — already persisted, IDs available.
    Writes parent rows and updates child.parent_chunk_id in-place.

Retrieval interface (standalone, called from rag_pipeline.py):
    parent_texts = await ParentChunkStore.load_parent_texts(
        session, chunk_ids=[12, 17, 23]
    )
    # Returns {child_id: parent_content} for any child with a parent.
    # Missing (no parent) returns no key — caller falls back to child text.
"""

from typing import Dict, List, Optional
import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document_chunk import DocumentChunk

logger = structlog.get_logger(__name__)

# 4 children per parent → 4 × 512 tokens ≈ 2048 tokens (minus overlap)
_CHILDREN_PER_PARENT = 4


class ParentChunkStore:
    """
    Manages parent chunk creation and storage for contextual retrieval.

    Usage at ingestion time (called from process_document_task):
        store = ParentChunkStore(session)
        await store.write_parents_for_document(document_id, child_chunks)

    Usage at retrieval time (called from rag_pipeline.py):
        parent_map = await ParentChunkStore.load_parent_texts(session, chunk_ids)
        # Use parent_map.get(child_id, child_text) for context assembly.
    """

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def write_parents_for_document(
        self,
        document_id: int,
        child_chunks: List[DocumentChunk],
    ) -> int:
        """
        Create parent chunks from a list of already-persisted child chunks.

        Groups consecutive children into 2048-token parent windows. Each parent
        is stored as a new DocumentChunk with is_parent=True. Children are
        updated to set parent_chunk_id pointing to their parent.

        Parent grouping strategy:
        - Simple fixed-window: children[0:4], children[4:8], etc.
        - Last group may have fewer than 4 children (accepted — still wider context).
        - NO overlap between parent windows (parents don't overlap each other;
          the underlying child overlap is preserved via child_chunk_id references).

        Args:
            document_id: Source document ID.
            child_chunks: DocumentChunk objects sorted by chunk_index ascending.
                          Must be already committed (IDs available).

        Returns:
            Number of parent chunks created.
        """
        if not child_chunks:
            return 0

        # Sort by chunk_index to ensure correct grouping order
        sorted_children = sorted(child_chunks, key=lambda c: c.chunk_index)

        parents_created = 0

        # Slide over children in windows of _CHILDREN_PER_PARENT
        for window_start in range(0, len(sorted_children), _CHILDREN_PER_PARENT):
            window = sorted_children[window_start:window_start + _CHILDREN_PER_PARENT]

            # Concatenate child content with paragraph break as separator
            parent_content = "\n\n".join(c.content for c in window)

            # Span positions from first to last child
            start_char = window[0].start_char
            end_char = window[-1].end_char

            # Create parent row — is_parent=True, parent_chunk_id=NULL
            parent = DocumentChunk(
                document_id=document_id,
                content=parent_content,
                chunk_index=window_start // _CHILDREN_PER_PARENT,  # parent index, 0-based
                start_char=start_char,
                end_char=end_char,
                is_parent=True,
                parent_chunk_id=None,  # parents don't have parents
                chunk_metadata={
                    "child_ids": [c.id for c in window],
                    "child_count": len(window),
                    "parent_window": f"{window_start}-{window_start + len(window) - 1}",
                },
            )
            self._session.add(parent)
            await self._session.flush()  # Get parent.id without committing

            # Update all children in this window to point to this parent
            for child in window:
                child.parent_chunk_id = parent.id

            parents_created += 1

        # Commit all parent rows + child FK updates together
        await self._session.commit()

        logger.info(
            "parent_chunks_written",
            document_id=document_id,
            child_count=len(sorted_children),
            parent_count=parents_created,
            children_per_parent=_CHILDREN_PER_PARENT,
        )

        return parents_created

    @staticmethod
    async def load_parent_texts(
        session: AsyncSession,
        chunk_ids: List[int],
    ) -> Dict[int, str]:
        """
        Load parent chunk content for a set of child chunk IDs.

        Called from rag_pipeline.py after cross-encoder reranking to swap
        narrow child text for wider parent context before LLM generation.

        Args:
            session: Async SQLAlchemy session.
            chunk_ids: List of child DocumentChunk.id values to look up.

        Returns:
            Dict mapping child_id → parent_content for any child that has
            a non-null parent_chunk_id. Children without parents are omitted —
            caller falls back to the child text.
        """
        if not chunk_ids:
            return {}

        # Load children to find their parent_chunk_ids
        children_result = await session.execute(
            select(DocumentChunk.id, DocumentChunk.parent_chunk_id)
            .where(
                DocumentChunk.id.in_(chunk_ids),
                DocumentChunk.parent_chunk_id.is_not(None),
            )
        )
        child_to_parent: Dict[int, int] = {
            row.id: row.parent_chunk_id  # type: ignore[union-attr]
            for row in children_result.fetchall()
        }

        if not child_to_parent:
            return {}

        # Batch-load parent content
        parent_ids = list(set(child_to_parent.values()))
        parents_result = await session.execute(
            select(DocumentChunk.id, DocumentChunk.content)
            .where(DocumentChunk.id.in_(parent_ids))
        )
        parent_content: Dict[int, str] = {
            row.id: row.content  # type: ignore[union-attr]
            for row in parents_result.fetchall()
        }

        # Build child_id → parent_content map
        return {
            child_id: parent_content[parent_id]
            for child_id, parent_id in child_to_parent.items()
            if parent_id in parent_content
        }
