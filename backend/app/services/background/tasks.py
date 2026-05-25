"""
Background task definitions - ENHANCED.

Includes document processing with embedding generation.
"""

import asyncio
import logging
from typing import Any, Dict
from celery import Task, shared_task
from celery.exceptions import Retry

logger = logging.getLogger(__name__)


class BaseTask(Task):
    """
    Base task with common error handling and retry logic.
    """

    autoretry_for = (Exception,)
    retry_kwargs = {"max_retries": 3, "countdown": 60}
    retry_backoff = True
    retry_backoff_max = 600
    retry_jitter = True

    def on_failure(self, exc, task_id, args, kwargs, einfo):
        """Handle task failure."""
        logger.error(
            f"Task {self.name} [{task_id}] failed: {exc}",
            extra={"task_id": task_id, "args": args, "kwargs": kwargs},
        )

    def on_retry(self, exc, task_id, args, kwargs, einfo):
        """Handle task retry."""
        logger.warning(
            f"Task {self.name} [{task_id}] retrying: {exc}",
            extra={"task_id": task_id, "retry_count": self.request.retries},
        )

    def on_success(self, retval, task_id, args, kwargs):
        """Handle task success."""
        logger.info(f"Task {self.name} [{task_id}] completed successfully")


def _process_chunk_batch(
    session,
    document,
    batch: list,
    embedder,
    upserter,
    collection_name: str,
    qdrant_client=None,   # Optional: pass pre-instantiated client to avoid repeated init
    sparse_embedder=None, # Optional: when provided, uses upsert_hybrid_batch() (named vectors)
) -> Dict[str, int]:
    """
    Process a batch of chunks: save to DB, embed, upsert to Qdrant.

    Designed for streaming ingestion - handles one batch at a time.
    Uses deterministic chunk IDs for idempotent re-ingestion.

    Args:
        session: Database session
        document: Document model instance
        batch: List of chunk dicts from iter_chunks()
        embedder: Embedding model instance
        upserter: Qdrant batch upserter
        collection_name: Qdrant collection name

    Returns:
        Dict with chunks and embeddings count
    """
    from app.models.document_chunk import DocumentChunk

    # Step 1: Save chunk records to DB WITH embedding_id (deterministic UUID)
    # The embedding_id links PG chunks to Qdrant points
    for chunk_data in batch:
        chunk = DocumentChunk(
            document_id=document.id,
            content=chunk_data["content"],
            chunk_index=chunk_data["chunk_index"],
            start_char=chunk_data["start_char"],
            end_char=chunk_data["end_char"],
            embedding_id=chunk_data["chunk_id"],  # Deterministic UUID from iter_chunks
        )
        session.add(chunk)
    session.commit()

    # Step 1b: Query back the committed rows to get their auto-assigned Postgres integer IDs.
    # This is the ONLY place we can reliably do this — the IDs don't exist until after commit.
    # We build a uuid→pg_id map so each Qdrant point payload carries pg_chunk_id, which
    # allows the parent-child swap in rag_pipeline.py to look up parent text at query time.
    from sqlalchemy import select as _sa_select_batch
    chunk_uuids = [c["chunk_id"] for c in batch]
    committed_rows = session.execute(
        _sa_select_batch(DocumentChunk).where(
            DocumentChunk.embedding_id.in_(chunk_uuids)
        )
    ).scalars().all()
    uuid_to_pg_id = {row.embedding_id: row.id for row in committed_rows}

    # Step 2: Generate embeddings for batch
    batch_texts = [c["content"] for c in batch]
    batch_embeddings = embedder.encode(batch_texts, normalize=True).tolist()

    # Step 3: Prepare payloads - IDs already match embedding_id in DB
    batch_payloads = []
    batch_ids = []
    for chunk_data in batch:
        batch_payloads.append(
            {
                "text": chunk_data["content"],
                "source_id": str(document.id),
                "source_type": "documents",
                "title": document.filename,
                "chunk_index": chunk_data["chunk_index"],
                "start_char": chunk_data["start_char"],
                "end_char": chunk_data["end_char"],
                "user_id": str(document.user_id),   # str — KEYWORD index requires string match
                "char_count": len(chunk_data["content"]),
                "chunk_strategy": chunk_data.get("chunking_method", "fixed_window"),
                # pg_chunk_id links this Qdrant point back to its DocumentChunk PG row.
                # Required for parent-child swap in rag_pipeline.py (parent text retrieval)
                # and for Qdrant payload→metadata propagation in _to_nodes().
                "pg_chunk_id": uuid_to_pg_id.get(chunk_data["chunk_id"]),
            }
        )
        batch_ids.append(chunk_data["chunk_id"])

    # Step 4: Unified upsert — dense + BM25 + ColBERT in one operation
    # Use upsert_unified_batch when sparse + colbert both available (new default).
    # Fall back gracefully if either is missing.
    from app.core.ai.rag.config.rag_config import get_rag_config as _get_rag_cfg
    _rag_cfg = _get_rag_cfg()

    if sparse_embedder is not None and _rag_cfg.colbert_enable:
        # ── Full unified path: dense + BM25 + ColBERT ───────────────────────
        batch_sparse_vectors = [sparse_embedder.encode_query(t) for t in batch_texts]
        try:
            from app.core.ai.rag.embeddings.models.colbert_embedder import get_colbert_embedder
            _colbert_multivecs = get_colbert_embedder().encode_documents(batch_texts)
            count = upserter.upsert_unified_batch(
                collection_name=collection_name,
                dense_vectors=batch_embeddings,
                sparse_vectors=batch_sparse_vectors,
                colbert_multivectors=_colbert_multivecs,
                payloads=batch_payloads,
                ids=batch_ids,
            )
            logger.debug(
                "unified_batch_upserted doc_id=%s chunks=%s",
                document.id, len(batch),
            )
        except Exception as _colbert_err:
            from billiard.exceptions import SoftTimeLimitExceeded
            if isinstance(_colbert_err, SoftTimeLimitExceeded):
                raise
            
            # ColBERT encoding failed — fall back to hybrid (dense + BM25 only).
            # Non-fatal: the collection already has the colbert vector slot;
            # those points will simply have no colbert vector until re-ingested.
            logger.warning(
                "colbert_encoding_failed_falling_back doc_id=%s error=%s",
                document.id, str(_colbert_err)[:200],
            )
            count = upserter.upsert_hybrid_batch(
                collection_name=collection_name,
                dense_vectors=batch_embeddings,
                sparse_vectors=batch_sparse_vectors,
                payloads=batch_payloads,
                ids=batch_ids,
            )
    elif sparse_embedder is not None:
        # ── Hybrid path: dense + BM25, no ColBERT ─────────────────────────
        batch_sparse_vectors = [sparse_embedder.encode_query(t) for t in batch_texts]
        count = upserter.upsert_hybrid_batch(
            collection_name=collection_name,
            dense_vectors=batch_embeddings,
            sparse_vectors=batch_sparse_vectors,
            payloads=batch_payloads,
            ids=batch_ids,
        )
    else:
        # ── Dense-only fallback (per-user collections without BM25) ───────
        count = upserter.upsert_batch(
            collection_name=collection_name,
            vectors=batch_embeddings,
            payloads=batch_payloads,
            ids=batch_ids,
        )

    # Step 5: Write parent chunks for contextual retrieval (Sprint 2 Item 3)
    # Only fires if we have enough children to form at least one parent.
    # New documents only — existing documents keep their old chunk structure.
    # The session already has the committed child rows with valid IDs.
    if len(batch) >= 4:
        try:
            from sqlalchemy import select as _sa_select
            from app.models.document_chunk import DocumentChunk as _DC

            # Re-query the freshly committed children to get their DB IDs
            child_embedding_ids = [c["chunk_id"] for c in batch]
            child_rows = session.execute(
                _sa_select(_DC).where(
                    _DC.embedding_id.in_(child_embedding_ids)
                )
            ).scalars().all()
            _write_parent_chunks(session, document.id, list(child_rows))
        except Exception as _pc_err:
            logger.warning(f"parent_chunk_write_failed (non-fatal): {_pc_err}")

    return {"chunks": len(batch), "embeddings": count}


def _write_parent_chunks(session, document_id: int, child_chunks: list) -> int:
    """
    Sync helper: create 2048-token parent chunks from persisted child chunks.

    Groups children in fixed windows of 4 (512-token children → ~2048-token parents).
    Writes parent DocumentChunk rows (is_parent=True) and updates each child's
    parent_chunk_id to point to its parent.

    Args:
        session: Sync SQLAlchemy session.
        document_id: Source document ID.
        child_chunks: Already-committed DocumentChunk instances (IDs available).

    Returns:
        Number of parent chunks created.
    """
    from app.models.document_chunk import DocumentChunk as _DC

    _CHILDREN_PER_PARENT = 4

    if not child_chunks:
        return 0

    sorted_children = sorted(child_chunks, key=lambda c: c.chunk_index)
    parents_created = 0

    for window_start in range(0, len(sorted_children), _CHILDREN_PER_PARENT):
        window = sorted_children[window_start:window_start + _CHILDREN_PER_PARENT]
        parent_content = "\n\n".join(c.content for c in window)

        parent = _DC(
            document_id=document_id,
            content=parent_content,
            chunk_index=window_start // _CHILDREN_PER_PARENT,
            start_char=window[0].start_char,
            end_char=window[-1].end_char,
            is_parent=True,
            parent_chunk_id=None,
            chunk_metadata={
                "child_ids": [c.id for c in window],
                "child_count": len(window),
            },
        )
        session.add(parent)
        session.flush()  # Get parent.id

        for child in window:
            child.parent_chunk_id = parent.id

        parents_created += 1

    session.commit()

    logger.debug(
        f"parent_chunks_written: document_id={document_id} "
        f"children={len(sorted_children)} parents={parents_created}"
    )
    return parents_created


def _iter_semantic_chunks(
    text: str,
    document_id: str,
    file_type: str = "pdf",
    fallback_chunk_size: int = 1000,
    fallback_overlap: int = 200,
):
    """
    Yield chunks using content-aware routing.

    Routes by file type and content characteristics:
    - .md files → SentenceSplitter respecting \\n\\n paragraph boundaries
    - Code-heavy PDFs (>15% code-signal lines) → fixed-window (System B)
    - Large docs (>500k chars) → fixed-window (System B)
    - Everything else → AdvancedSemanticChunker (System A, tuned params)

    Produces the same dict shape as DocumentProcessor.iter_chunks:
        {"content", "chunk_index", "start_char", "end_char", "chunk_id",
         "chunking_method"}

    Args:
        text:                Raw extracted document text (\\n preserved by fixed _clean_text).
        document_id:         Document ID string for deterministic chunk UUID generation.
        file_type:           File extension (pdf, epub, md, docx, etc.).
        fallback_chunk_size: Character window size for the fallback chunker.
        fallback_overlap:    Overlap in characters for the fallback chunker.

    Yields:
        Dict with content, chunk_index, start_char, end_char, chunk_id, chunking_method.
    """
    import uuid, re
    from app.services.background.document_processor import DocumentProcessor

    # ── Route 1: Markdown files ────────────────────────────────────────────────
    # Split on double-newline paragraph boundaries (headers become natural splits).
    if (file_type or "").lower() == "md":
        logger.info(f"chunker_route: markdown (paragraph-split) doc_id={document_id}")
        processor = DocumentProcessor()
        for chunk_data in processor.iter_chunks(
            text=text,
            document_id=document_id,
            chunk_size=900,
            overlap=150,
        ):
            chunk_data["chunking_method"] = "paragraph_md"
            yield chunk_data
        return

    # ── Route 2: Code-heavy PDF/EPUB detection ───────────────────────────────
    # Detect documents where code content dominates — semantic chunker's sentence
    # similarity model produces poor boundaries on code (treats entire function
    # bodies as one semantic topic). Use fixed-window instead.
    _SAMPLE_LINES = 300
    _CODE_THRESHOLD = 0.12  # >12% code-signal lines = code-heavy
    _CODE_PATTERNS = re.compile(
        r'^(>>>|\$\s|def |class |import |from \w|#include|public |private |int |void |if \(|for \()'
    )
    _sample = text.split('\n')[:_SAMPLE_LINES]
    _code_lines = sum(1 for l in _sample if _CODE_PATTERNS.match(l.strip()))
    _code_ratio = _code_lines / max(len(_sample), 1)

    if _code_ratio > _CODE_THRESHOLD:
        logger.warning(
            f"chunker_route: code_heavy ({_code_ratio:.0%} code lines) — using fixed-window"
            f" doc_id={document_id}"
        )
        processor = DocumentProcessor()
        for chunk_data in processor.iter_chunks(
            text=text,
            document_id=document_id,
            chunk_size=fallback_chunk_size,
            overlap=fallback_overlap,
        ):
            chunk_data["chunking_method"] = "fixed_window_code"
            yield chunk_data
        return

    # ── Route 3: Size guard ────────────────────────────────────────────────────
    from app.core.ai.rag.chunking.strategies.advanced_semantic_chunker import AdvancedSemanticChunker

    # ── Size guard: System A is O(n²) in sentence count. ────────────────────
    # For documents > 500k chars, the all-MiniLM semantic chunker takes
    # 10+ minutes on CPU (686s observed for a 2.1M char doc). Skip directly
    # to System B (fixed-window) for these to keep total task time < 30 min.
    SEMANTIC_CHAR_LIMIT = 500_000
    if len(text) > SEMANTIC_CHAR_LIMIT:
        logger.warning(
            f"_iter_semantic_chunks: doc {document_id} is {len(text):,} chars "
            f"(>{SEMANTIC_CHAR_LIMIT:,}) — skipping System A, using System B (fixed-window)"
        )
        processor = DocumentProcessor()
        for chunk_data in processor.iter_chunks(
            text=text,
            document_id=document_id,
            chunk_size=fallback_chunk_size,
            overlap=fallback_overlap,
        ):
            chunk_data["chunking_method"] = "fixed_window_large_doc"
            yield chunk_data
        return

    # ── Attempt System A ──────────────────────────────────────────────────────
    try:
        chunker = AdvancedSemanticChunker()
        raw_chunks = chunker.chunk_text(text)  # returns list[dict] — synchronous

        if not raw_chunks:
            raise ValueError("AdvancedSemanticChunker returned empty chunk list")

        search_start = 0  # Forward cursor into `text` for O(n) position recovery

        for idx, raw in enumerate(raw_chunks):
            content = raw["text"]

            # Locate this chunk's position in the source text (forward-only scan)
            pos = text.find(content, search_start)
            if pos == -1:
                # Rare: semantic chunker modified whitespace — scan from 0
                pos = text.find(content)

            if pos != -1:
                start_char = pos
                end_char = pos + len(content)
                search_start = end_char  # Advance cursor
            else:
                # Can't locate content — use estimated offsets
                start_char = search_start
                end_char = start_char + len(content)
                search_start = end_char

            # Deterministic UUID: based on document_id + chunk content
            # Using content rather than character position because semantic
            # chunk boundaries are not reproducible from position alone.
            chunk_id = str(
                uuid.uuid5(uuid.NAMESPACE_OID, f"{document_id}:semantic:{idx}:{content[:64]}")
            )

            yield {
                "content": content,
                "chunk_index": idx,
                "start_char": start_char,
                "end_char": end_char,
                "chunk_id": chunk_id,
                "chunking_method": "semantic",  # Surfaced in Qdrant payload
            }

        return  # System A succeeded — skip fallback

    except Exception as sem_exc:
        logger.warning(
            "semantic_chunker_failed_falling_back_to_system_b",
            document_id=document_id,
            error=str(sem_exc),
        )

    # ── Fallback: System B ────────────────────────────────────────────────────
    processor = DocumentProcessor()
    for chunk_data in processor.iter_chunks(
        text=text,
        document_id=document_id,
        chunk_size=fallback_chunk_size,
        overlap=fallback_overlap,
    ):
        chunk_data["chunking_method"] = "fixed_window"  # Mark for observability
        yield chunk_data


@shared_task(
    bind=True,
    name="app.services.background.tasks.process_document_task",
    soft_time_limit=1800,  # 30 min — semantic chunker alone takes ~11 min on 2M-char docs
    time_limit=2700,       # 45 min hard cap — headroom for embedding + upsert after chunking
)
def process_document_task(self, document_id: int) -> Dict[str, Any]:
    """
    Process document asynchronously with MEMORY-SAFE batch processing.

    INVARIANT: No background task may allocate memory proportional to total document size.
    This is enforced via batch embedding - chunks are processed in groups of BATCH_SIZE.

    Flow:
    1. Extract text from document
    2. Create chunk records in DB (batched commits)
    3. Generate embeddings in batches (BATCH_SIZE at a time)
    4. Upsert to Qdrant incrementally
    5. GC between batches to prevent memory buildup

    Args:
        document_id: Document ID to process

    Returns:
        dict: Processing result with status and statistics
    """
    import gc

    # Memory-safe batch size - limits peak memory usage
    BATCH_SIZE = 20

    logger.info(f"Starting document processing (batch mode): {document_id}")

    try:
        from app.db.session import SessionLocal
        from app.models.document import Document, ProcessingStatus
        from app.services.background.document_processor import DocumentProcessor
        from app.core.ai.embeddings.boundary import get_embedder
        from app.core.ai.rag.vector_store.qdrant.batch_upserter import BatchUpserter
        from app.core.ai.rag.vector_store.qdrant.collection_manager import CollectionManager
        from sqlalchemy import select

        with SessionLocal() as session:
            # INVARIANT: Never process soft-deleted documents.
            result = session.execute(
                select(Document).where(Document.id == document_id, Document.deleted_at.is_(None))
            )
            document = result.scalar_one_or_none()

            if not document:
                logger.warning(f"Document {document_id} not found or deleted, skipping")
                return {
                    "status": "skipped",
                    "reason": "not_found_or_deleted",
                    "document_id": document_id,
                }

            # GUARD: only process documents waiting for RAG embedding.
            # PENDING  → uploaded but DMS hasn't run yet (edge case: direct API trigger)
            # PARSED   → DMS done, text in DB, ready for chunking (normal path)
            # CHUNKING → already in-flight, skip (idempotency)
            # COMPLETED→ both pipelines done, skip
            # FAILED   → allow retry (operator can re-queue after fixing the root cause)
            if document.processing_status == ProcessingStatus.CHUNKING:
                logger.info(f"Document {document_id} already CHUNKING (in-flight), skipping")
                return {
                    "status": "skipped",
                    "reason": "already_chunking",
                    "document_id": document_id,
                }

            if document.processing_status == ProcessingStatus.COMPLETED:
                logger.info(f"Document {document_id} already COMPLETED, skipping")
                return {
                    "status": "skipped",
                    "reason": "already_completed",
                    "document_id": document_id,
                }

            if document.processing_status == ProcessingStatus.PARSING:
                # DMS pipeline still running — don't race with it.
                # process_document_task will be re-queued by IndexPlugin when it finishes.
                logger.info(f"Document {document_id} still PARSING, skipping")
                return {
                    "status": "skipped",
                    "reason": "still_parsing",
                    "document_id": document_id,
                }

            # Transition: PENDING or PARSED → CHUNKING
            document.processing_status = ProcessingStatus.CHUNKING
            session.commit()

            try:
                # IDEMPOTENCY: Delete ALL derived artifacts before re-processing
                # This ensures retries start clean
                from sqlalchemy import text as sql_text

                # 1. Delete existing PG chunks
                deleted_chunks = session.execute(
                    sql_text("DELETE FROM document_chunks WHERE document_id = :doc_id"),
                    {"doc_id": document.id},
                )
                if deleted_chunks.rowcount > 0:
                    logger.info(
                        f"Document {document_id}: Cleaned {deleted_chunks.rowcount} existing chunks"
                    )

                # 2. Delete existing Qdrant points
                from app.core.ai.rag.vector_store.qdrant.client import get_qdrant_client
                from qdrant_client.http import models as qdrant_models

                qdrant_client = get_qdrant_client().get_client()
                collection_name = f"synapse_v2_user_{document.user_id}_documents"

                try:
                    # Check if collection exists before deleting
                    qdrant_client.get_collection(collection_name)
                    qdrant_client.delete(
                        collection_name=collection_name,
                        points_selector=qdrant_models.FilterSelector(
                            filter=qdrant_models.Filter(
                                must=[
                                    qdrant_models.FieldCondition(
                                        key="source_id",
                                        match=qdrant_models.MatchValue(value=str(document.id)),
                                    )
                                ]
                            )
                        ),
                    )
                    logger.info(
                        f"Document {document_id}: Cleaned Qdrant points for collection {collection_name}"
                    )
                except Exception as qdrant_err:
                    # Collection might not exist yet - that's OK
                    logger.debug(f"Qdrant cleanup skipped: {qdrant_err}")

                session.commit()

                # Step 1: Extract text — but ONLY if we don't already have it.
                #
                # PARSED state means the DMS pipeline (IndexPlugin) already extracted
                # content_text and stored it in Postgres. Re-reading the file would:
                #   a) fail for DMS docs with relative/year-based paths
                #   b) be wasted work — the text is already there
                #
                # PENDING state means no text yet — must read from disk.
                if document.content_text:
                    # Fast path: text already in DB, skip file I/O entirely
                    logger.info(
                        f"Document {document_id}: content_text already present "
                        f"({len(document.content_text):,} chars) — skipping extraction"
                    )
                    extracted_data = {
                        "content_text": document.content_text,
                        "word_count": document.word_count or len(document.content_text.split()),
                        "page_count": document.page_count,
                        "metadata": document.file_metadata or {},
                        "ocr_performed": document.ocr_performed or False,
                    }
                else:
                    # Slow path: must extract from file.
                    # Before touching disk, check if this is an image — images use
                    # NomicVision embeddings (embed_image_task), not text chunking.
                    from app.services.background.document_processor import DocumentProcessor
                    if DocumentProcessor.is_image_type(document.file_type or ""):
                        logger.info(
                            f"Document {document_id}: image type ({document.file_type}), "
                            f"delegating to embed_image_task for visual embeddings"
                        )
                        embed_image_task.delay(document_id)
                        # embed_image_task owns its own lifecycle; our job is done here
                        return {
                            "status": "delegated_to_embed_image_task",
                            "document_id": document_id,
                        }

                    # Text/EPUB/PDF slow path: extract from file.
                    #
                    # PATH RESOLUTION — DMS vs user-upload storage roots are different:
                    #   DMS imports  → data/originals/YYYY/Author/file.pdf
                    #   User uploads → data/uploads/<uuid>.pdf  (UPLOAD_DIR)
                    #
                    # file_path in the DB is always stored relative to its own root.
                    # We must resolve to an absolute path before opening.
                    _raw_path = document.file_path or ""
                    if os.path.isabs(_raw_path):
                        _resolved_path = _raw_path
                    else:
                        # Priority 1: DMS originals directory
                        _originals_root = os.path.join(
                            os.path.dirname(settings.UPLOAD_DIR.rstrip("/")), "originals"
                        )
                        _candidate_originals = os.path.join(_originals_root, _raw_path)
                        # Priority 2: Standard upload dir
                        _candidate_uploads = os.path.join(settings.UPLOAD_DIR, _raw_path)
                        # Priority 3: DATA_DIR fallback
                        _data_dir = getattr(settings, "DATA_DIR", "data")
                        _candidate_data = os.path.join(_data_dir, _raw_path)

                        if os.path.exists(_candidate_originals):
                            _resolved_path = _candidate_originals
                        elif os.path.exists(_candidate_uploads):
                            _resolved_path = _candidate_uploads
                        elif os.path.exists(_candidate_data):
                            _resolved_path = _candidate_data
                        else:
                            raise FileNotFoundError(
                                f"Document {document_id}: file not found in any known "
                                f"storage root.\n"
                                f"  Tried originals: {_candidate_originals}\n"
                                f"  Tried uploads:   {_candidate_uploads}\n"
                                f"  Tried data:      {_candidate_data}"
                            )

                    processor = DocumentProcessor()
                    extracted_data = processor.process_document(
                        file_path=_resolved_path, file_type=document.file_type
                    )
                    # Persist the extracted text so future retries use the fast path
                    document.content_text = extracted_data["content_text"]
                    document.page_count = extracted_data.get("page_count")
                    document.word_count = extracted_data["word_count"]
                    document.file_metadata = extracted_data.get("metadata", {})
                    document.ocr_performed = extracted_data.get("ocr_performed", False)
                    session.commit()

                logger.info(
                    f"Document {document_id}: Extracted {extracted_data['word_count']:,} words, "
                    f"{extracted_data.get('page_count', 'N/A')} pages"
                )

                # Step 2: Initialize embedder and Qdrant upserter early
                embedder = get_embedder()
                from app.core.ai.rag.vector_store.qdrant.client import get_qdrant_client
                from app.core.ai.rag.vector_store.operations.upsert import VectorUpsert
                from app.core.ai.rag.embeddings.sparse_embedder import get_sparse_embedder

                qdrant_client = get_qdrant_client().get_client()
                collection_manager = CollectionManager(client=qdrant_client)

                # Use the shared named-vector collection (synapse_dense) and a proper
                # VectorUpsert that can handle hybrid upsert (dense + BM25 named vectors).
                # BatchUpserter wrote unnamed vectors — incompatible with v4 schema.
                upserter = VectorUpsert(qdrant_client)
                sparse_embedder = get_sparse_embedder()
                collection_name = "synapse_dense"

                # Early-init checkpoint cursor so it is ALWAYS defined when the
                # SoftTimeLimitExceeded except block runs (even if timeout happens
                # before the checkpoint block below reads from file_metadata).
                _emb_resume: int = -1

                # Ensure shared collection exists with unified schema (dense + bm25 + colbert)
                # Idempotent — called ONCE per task, not per batch.
                collection_manager.create_shared_collection()

                # Step 3: STREAMING INGESTION — System A (AdvancedSemanticChunker)
                # INVARIANT: Never hold full chunk list in memory.
                # _iter_semantic_chunks() is a generator; falls back to System B
                # (DocumentProcessor.iter_chunks) if the semantic chunker fails.

                batch = []
                chunks_processed = 0
                embeddings_stored = 0
                chunk_records_created = 0

                # ── Checkpoint / Resume ──────────────────────────────────────────
                # file_metadata["_emb_resume"] = last chunk_index fully embedded+upserted.
                # Written after every successful batch. On SoftTimeLimitExceeded the
                # task re-queues itself; on next run we skip chunks ≤ _emb_resume.
                _emb_resume: int = (document.file_metadata or {}).get("_emb_resume", -1)
                if _emb_resume >= 0:
                    # Remove orphaned DB rows: saved in Step 1 but never embedded
                    # (the batch that was in-flight when we crashed).
                    from app.models.document_chunk import DocumentChunk as _DC_cleanup
                    from sqlalchemy import delete as _sa_delete, and_ as _sa_and
                    session.execute(
                        _sa_delete(_DC_cleanup).where(
                            _sa_and(
                                _DC_cleanup.document_id == document.id,
                                _DC_cleanup.chunk_index > _emb_resume,
                            )
                        )
                    )
                    session.commit()
                    logger.info(
                        f"Document {document_id}: Resuming embedding from chunk "
                        f"{_emb_resume + 1} — orphaned rows cleaned up"
                    )

                logger.info(f"Document {document_id}: Starting semantic chunk processing (System A)")

                for chunk_data in _iter_semantic_chunks(
                    text=extracted_data["content_text"],
                    document_id=str(document.id),
                    file_type=document.file_type or "pdf",
                ):
                    # Skip already-embedded chunks (checkpoint resume).
                    # These have valid DB rows + Qdrant points from a previous run.
                    if chunk_data["chunk_index"] <= _emb_resume:
                        chunks_processed += 1
                        chunk_records_created += 1
                        embeddings_stored += 1
                        continue

                    batch.append(chunk_data)

                    # Process batch when full
                    if len(batch) >= BATCH_SIZE:
                        batch_result = _process_chunk_batch(
                            session=session,
                            document=document,
                            batch=batch,
                            embedder=embedder,
                            upserter=upserter,
                            collection_name=collection_name,
                            qdrant_client=qdrant_client,
                            sparse_embedder=sparse_embedder,
                        )
                        chunk_records_created += batch_result["chunks"]
                        embeddings_stored += batch_result["embeddings"]
                        chunks_processed += len(batch)
                        _emb_resume = batch[-1]["chunk_index"]  # advance cursor
                        batch.clear()

                        # Checkpoint: persist cursor so a crash here is recoverable
                        _chk_meta = dict(document.file_metadata or {})
                        _chk_meta["_emb_resume"] = _emb_resume
                        document.file_metadata = _chk_meta
                        session.commit()

                        # CRITICAL: Force garbage collection between batches
                        gc.collect()

                        logger.debug(
                            f"Document {document_id}: Processed {chunks_processed} chunks, "
                            f"{embeddings_stored} embeddings"
                        )

                # Flush remaining batch
                if batch:
                    batch_result = _process_chunk_batch(
                        session=session,
                        document=document,
                        batch=batch,
                        embedder=embedder,
                        upserter=upserter,
                        collection_name=collection_name,
                        qdrant_client=qdrant_client,
                        sparse_embedder=sparse_embedder,
                    )
                    chunk_records_created += batch_result["chunks"]
                    embeddings_stored += batch_result["embeddings"]
                    chunks_processed += len(batch)
                    batch.clear()

                # Clear checkpoint on full completion (no more re-queue needed)
                if "_emb_resume" in (document.file_metadata or {}):
                    _done_meta = dict(document.file_metadata)
                    _done_meta.pop("_emb_resume", None)
                    document.file_metadata = _done_meta
                    session.commit()

                # Step 4: Lifecycle invariant validation
                # Only mark COMPLETED if chunks == embeddings
                if chunk_records_created == embeddings_stored and chunk_records_created > 0:
                    document.processing_status = ProcessingStatus.COMPLETED
                    final_status = "completed"
                elif chunk_records_created > 0:
                    # Partial success - some chunks, not all embedded
                    # This allows manual recovery without re-processing
                    document.processing_status = ProcessingStatus.FAILED
                    final_status = "partial"
                    logger.warning(
                        f"Document {document_id}: PARTIAL - chunks={chunk_records_created}, "
                        f"embeddings={embeddings_stored}"
                    )
                else:
                    # No chunks created
                    document.processing_status = ProcessingStatus.FAILED
                    final_status = "failed_no_chunks"
                    logger.error(f"Document {document_id}: No chunks created")

                session.commit()

                result_stats = {
                    "document_id": document_id,
                    "status": final_status,
                    "chunks_created": chunk_records_created,
                    "embeddings_stored": embeddings_stored,
                    "word_count": extracted_data["word_count"],
                    "page_count": extracted_data.get("page_count"),
                    "ocr_performed": extracted_data.get("ocr_performed", False),
                    "batch_size": BATCH_SIZE,
                    "streaming": True,
                }

                logger.info(f"Document {document_id} processed: {result_stats}")
                return result_stats

            except MemoryError:
                # Do NOT retry OOM failures - mark and skip
                document.processing_status = ProcessingStatus.FAILED
                session.commit()
                logger.error(f"Document {document_id} OOM - marked FAILED, not retrying")
                from celery.exceptions import Ignore

                raise Ignore()

            except Exception as e:
                # SoftTimeLimitExceeded check: if we timed out mid-embedding,
                # checkpoint is already saved. Re-queue with delay and exit cleanly.
                # Import here to avoid billiard dependency at module level.
                try:
                    from billiard.exceptions import SoftTimeLimitExceeded as _SLTE
                except ImportError:
                    _SLTE = None

                if _SLTE is not None and isinstance(e, _SLTE):
                    logger.warning(
                        f"Document {document_id}: SoftTimeLimitExceeded at chunk "
                        f"{_emb_resume} — checkpointed, re-queuing in 60s"
                    )
                    document.processing_status = ProcessingStatus.PENDING  # allow re-entry
                    session.commit()
                    # Re-queue: 60s delay lets the worker breathe + free memory
                    process_document_task.apply_async(
                        args=[document_id],
                        countdown=60,
                    )
                    return {
                        "status": "soft_timeout_requeued",
                        "document_id": document_id,
                        "resume_from_chunk": _emb_resume + 1,
                    }

                # Mark failed
                document.processing_status = ProcessingStatus.FAILED
                session.commit()
                logger.error(f"Document {document_id} processing failed: {str(e)}", exc_info=True)
                raise

    except Exception as e:
        logger.error(f"Error processing document {document_id}: {str(e)}", exc_info=True)
        raise


# =============================================================================
# WATCHDOG — Crash & orphan recovery for every pipeline stage
# =============================================================================

@shared_task(
    bind=True,
    name="tasks.recover_stalled_documents",
    max_retries=0,          # The watchdog itself never retries — it just runs next tick
    soft_time_limit=120,
    time_limit=180,
)
def recover_stalled_documents(self) -> Dict[str, Any]:
    """
    Periodic watchdog that finds documents stuck in any in-progress state
    due to a worker crash, lost broker message, or unhandled exception,
    and re-queues them automatically.

    Timeout thresholds (based on updated_at):
        CHUNKING  > 20 min  → worker died mid-embedding   → reset to PARSED,   re-queue
        PARSING   > 30 min  → DMS extraction stalled       → reset to PENDING,  re-queue
        PARSED    > 10 min  → task lost before consumption → stay PARSED,       re-queue
        PENDING   >  2 hr   → task never dispatched        → stay PENDING,      re-queue

    Retry budget:
        source_metadata["rag_retry_count"] tracks how many times the watchdog
        has re-queued a document. After MAX_WATCHDOG_RETRIES (5), the document
        is marked FAILED so engineers can investigate without infinite looping.
    """
    from datetime import timedelta, timezone
    from app.db.session import SessionLocal
    from app.models.document import Document, ProcessingStatus
    from sqlalchemy import select, and_

    MAX_WATCHDOG_RETRIES = 5

    # Thresholds: how long a document may sit in each state before recovery fires
    THRESHOLDS = {
        ProcessingStatus.CHUNKING: timedelta(minutes=20),
        ProcessingStatus.PARSING:  timedelta(minutes=30),
        ProcessingStatus.PARSED:   timedelta(minutes=10),
        ProcessingStatus.PENDING:  timedelta(hours=2),
    }

    # Where each stalled state resets to before re-queuing
    RESET_TO = {
        ProcessingStatus.CHUNKING: ProcessingStatus.PARSED,    # → re-embed
        ProcessingStatus.PARSING:  ProcessingStatus.PENDING,   # → re-parse
        ProcessingStatus.PARSED:   ProcessingStatus.PARSED,    # → already correct
        ProcessingStatus.PENDING:  ProcessingStatus.PENDING,   # → already correct
    }

    recovered = []
    failed_out = []

    try:
        with SessionLocal() as session:
            now = session.execute(__import__("sqlalchemy").text("SELECT NOW() AT TIME ZONE 'UTC'")).scalar()

            for status, threshold in THRESHOLDS.items():
                cutoff = now - threshold

                stalled = session.execute(
                    select(Document).where(
                        and_(
                            Document.processing_status == status,
                            Document.updated_at < cutoff,
                            Document.deleted_at.is_(None),
                        )
                    )
                ).scalars().all()

                for doc in stalled:
                    # Read retry count from JSONB metadata
                    meta = doc.source_metadata or {}
                    retry_count = meta.get("rag_retry_count", 0)

                    if retry_count >= MAX_WATCHDOG_RETRIES:
                        # Exhausted — mark permanently failed
                        doc.processing_status = ProcessingStatus.FAILED
                        doc.source_metadata = {**meta, "rag_failed_reason": "watchdog_retries_exhausted"}
                        session.commit()
                        failed_out.append(doc.id)
                        logger.error(
                            f"[Watchdog] doc_id={doc.id} ({doc.filename}) exhausted "
                            f"{MAX_WATCHDOG_RETRIES} retries from state={status.value} — marking FAILED"
                        )
                        continue

                    # Bump retry counter and reset state
                    doc.source_metadata = {**meta, "rag_retry_count": retry_count + 1}
                    doc.processing_status = RESET_TO[status]
                    session.commit()

                    # Re-dispatch the processing task
                    process_document_task.delay(doc.id)
                    recovered.append(doc.id)

                    logger.warning(
                        f"[Watchdog] Recovered doc_id={doc.id} ({doc.filename}) "
                        f"from state={status.value} (stuck >{threshold}) "
                        f"retry #{retry_count + 1}/{MAX_WATCHDOG_RETRIES}"
                    )

    except Exception as exc:
        logger.error(f"[Watchdog] Recovery scan failed: {exc}", exc_info=True)
        # Don't re-raise — let the next beat tick try again

    summary = {
        "recovered": recovered,
        "failed_out": failed_out,
        "recovered_count": len(recovered),
        "failed_out_count": len(failed_out),
    }

    if recovered or failed_out:
        logger.info(f"[Watchdog] Cycle complete: {summary}")

    return summary


# =============================================================================
# DMS — Consumption directory scan (wired to Celery Beat every 30s)
# =============================================================================

@shared_task(
    bind=True,
    name="tasks.scan_consumption_directory",
    max_retries=0,       # Never retry — next Beat tick handles it
    soft_time_limit=25,
    time_limit=30,
)
def scan_consumption_directory(self) -> dict:
    """
    Periodic Beat task: scan the consumption directory for new files and
    dispatch them to the DMS ingestion pipeline via Celery.

    Uses ConsumptionWatcher.run_once() — pure polling, no inotify required.
    Works correctly across Docker volume mounts (no OS-specific watcher needed).

    Files are only dispatched after they stop growing (2s stability window),
    preventing partial-write ingestion of files still being copied in.

    Schedule: every 30s (celery_app.py beat_schedule).
    Expires: 25s — if Beat fires again before this task completes, the new
    invocation runs immediately and this one is discarded. Tasks never queue up.
    """
    try:
        from app.services.ingestion.watcher import ConsumptionWatcher
        watcher = ConsumptionWatcher()
        dispatched = watcher.run_once()
        if dispatched:
            logger.info(f"[ConsumeWatcher] Dispatched {dispatched} file(s) for ingestion")
        return {"dispatched": dispatched}
    except Exception as exc:
        logger.warning(f"[ConsumeWatcher] Scan failed: {exc}")
        # Do not raise — let next tick try again. Failure here must not
        # block the Beat queue or affect other periodic tasks.
        return {"dispatched": 0, "error": str(exc)}





def _clean_filename_for_context(filename: str) -> str:
    """
    Produce a readable surrounding_context string from a filename.

    Strips extension, replaces underscores and hyphens with spaces.
    Never returns an empty string — the Cross-Encoder must have text to score.

    Examples:
        whiteboard_system_arch.jpg  -> whiteboard system arch
        circuit-diagram-v2.png      -> circuit diagram v2
        IMG_4021.HEIC               -> IMG 4021
    """
    import os
    name = os.path.splitext(filename)[0]          # strip extension
    name = name.replace("_", " ").replace("-", " ")  # normalize separators
    name = " ".join(name.split())                 # collapse whitespace
    return name or filename                       # last-resort: use raw filename


@shared_task(
    bind=True,
    name="app.services.background.tasks.embed_image_task",
    soft_time_limit=300,
    time_limit=600,
    max_retries=3,
    default_retry_delay=30,
)
def embed_image_task(self, document_id: int, caption: str | None = None) -> dict:
    """
    Embed an uploaded image into synapse_dense using NomicVisionEmbedder.

    Hierarchy: LLM-generated caption (primary) -> user caption (appended) -> filename (fallback).

    Flow:
    1. Load Document record + verify ownership
    2. Open image from disk as PIL Image
    3. Generate LLM caption if possible
    4. Encode via NomicVisionEmbedder -> 768D vector
    5. Build payload (content_type, surrounding_context, user_id, etc.)
    6. Ensure synapse_dense collection exists (idempotent)
    7. Upsert vector + payload to synapse_dense
    8. Update processing_status = COMPLETED in PostgreSQL

    Args:
        document_id: PostgreSQL Document.id
        caption: Optional user-provided image description
    """
    import uuid
    from datetime import datetime, timezone

    logger.info(f"embed_image_task start: document_id={document_id}")

    try:
        from app.db.session import SessionLocal
        from app.models.document import Document, ProcessingStatus
        from app.core.config import settings
        from sqlalchemy import select

        DATA_DIR = getattr(settings, "DATA_DIR", "data")

        with SessionLocal() as session:
            result = session.execute(
                select(Document).where(
                    Document.id == document_id,
                    Document.deleted_at.is_(None),
                )
            )
            document = result.scalar_one_or_none()

            if not document:
                logger.warning(f"embed_image_task: document {document_id} not found or deleted")
                return {"status": "skipped", "reason": "not_found_or_deleted"}

            # Resolve absolute path
            file_path = document.file_path
            if not file_path:
                logger.error(f"embed_image_task: document {document_id} has no file_path")
                document.processing_status = ProcessingStatus.FAILED
                session.commit()
                return {"status": "failed", "reason": "no_file_path"}

            import os
            if not os.path.isabs(file_path):
                file_path = os.path.join(DATA_DIR, file_path)

            if not os.path.exists(file_path):
                logger.error(f"embed_image_task: file not found on disk: {file_path}")
                document.processing_status = ProcessingStatus.FAILED
                session.commit()
                return {"status": "failed", "reason": "file_not_on_disk"}

            # Load image
            from PIL import Image as PILImage
            try:
                image = PILImage.open(file_path).convert("RGB")
            except Exception as img_err:
                logger.error(f"embed_image_task: failed to open image: {img_err}")
                document.processing_status = ProcessingStatus.FAILED
                session.commit()
                return {"status": "failed", "reason": f"image_open_error: {img_err}"}

            # Generate LLM Caption
            llm_caption = ""
            try:
                from app.core.ai.llm.vision_captioner import get_vision_captioner
                captioner = get_vision_captioner()
                llm_caption = captioner.generate_caption(image)
            except Exception as e:
                logger.warning(f"embed_image_task: LLM captioning failed: {e}")

            # Encode via NomicVisionEmbedder -> 768D
            from app.core.ai.rag.embeddings.models.nomic_vision_embedder import get_vision_embedder
            embedder = get_vision_embedder()
            embedding = embedder.encode([image], normalize=True)
            vector = embedding[0].tolist()

            # Build surrounding_context — three-tier hierarchy:
            # Tier 1: LLM-generated visual description (primary, most accurate)
            # Tier 2: User caption appended with semantic prefix (temporal/contextual)
            # Tier 3: Cleaned filename (absolute fallback when both above are absent)
            filename_clean = _clean_filename_for_context(
                document.original_filename or document.filename
            )
            if llm_caption and caption and caption.strip():
                # Both available: LLM description + user's contextual note
                surrounding_context = f"{llm_caption}. User context: {caption.strip()}"
                context_source = "llm_caption_plus_user"
            elif llm_caption:
                surrounding_context = llm_caption
                context_source = "llm_caption"
            elif caption and caption.strip():
                # LLM failed but user provided something — still useful
                surrounding_context = caption.strip()
                context_source = "user_caption_fallback"
            else:
                surrounding_context = filename_clean
                context_source = "filename_fallback"

            # Build Qdrant payload
            payload = {
                "content_type": "image",
                "surrounding_context": surrounding_context,
                "source_id": str(document.id),
                "source_title": document.original_filename or document.filename,
                "storage_path": file_path,
                "user_id": str(document.user_id),
                "chunk_index": 0,
                "embedding_model_version": "nomic-vision-v1.5",
                "created_at": datetime.now(timezone.utc).isoformat(),
            }

            # Deterministic UUID
            point_id = str(
                uuid.uuid5(uuid.NAMESPACE_OID, f"image:{document.id}")
            )

            # Ensure synapse_dense exists
            from app.core.ai.rag.vector_store.qdrant.client import get_qdrant_client
            from app.core.ai.rag.vector_store.qdrant.collection_manager import CollectionManager
            
            qdrant_client = get_qdrant_client()
            collection_manager = CollectionManager(client=qdrant_client.get_client())
            collection_name = collection_manager.create_shared_collection()

            # Upsert
            from qdrant_client.http import models as qdrant_models
            qdrant_client.get_client().upsert(
                collection_name=collection_name,
                points=[
                    qdrant_models.PointStruct(
                        id=point_id,
                        vector={"dense": vector},
                        payload=payload,
                    )
                ],
            )

            logger.info(
                f"embed_image_task: upserted image vector",
                extra={
                    "document_id": document_id,
                    "collection": collection_name,
                    "point_id": point_id,
                    "context_source": context_source,
                    "context_length": len(surrounding_context),
                },
            )

            document.processing_status = ProcessingStatus.COMPLETED
            session.commit()

            return {
                "status": "completed",
                "document_id": document_id,
                "collection": collection_name,
                "point_id": point_id,
                "context_source": context_source,
                "context_length": len(surrounding_context),
            }

    except Exception as e:
        logger.error(f"embed_image_task failed for document {document_id}: {e}", exc_info=True)
        raise self.retry(exc=e)


# All other tasks remain unchanged below this line


@shared_task(
    base=BaseTask,
    bind=True,
    name="tasks.retry_failed_webhooks",
    soft_time_limit=300,
    time_limit=600,
)
def retry_failed_webhooks_task(self) -> Dict[str, int]:
    """
    Retry all failed webhooks that are due for retry.

    This is a scheduled task that runs periodically (e.g., every 5 minutes).

    Returns:
        dict: Retry statistics
    """
    logger.info("Starting webhook retry job")

    try:
        from app.db.session import SessionLocal
        from app.core.events.webhooks.retry import retry_failed_webhooks_sync

        with SessionLocal() as session:
            stats = retry_failed_webhooks_sync(session)

        logger.info("Webhook retry job completed", extra=stats)

        return stats

    except Exception as e:
        logger.error(f"Webhook retry job failed: {e}", exc_info=True)
        raise


@shared_task(
    base=BaseTask,
    bind=True,
    name="tasks.send_email",
    soft_time_limit=30,
    time_limit=60,
)
def send_email_task(self, to: str, subject: str, body: str, html: bool = False) -> bool:
    """
    Send email asynchronously.

    Args:
        to: Recipient email
        subject: Email subject
        body: Email body
        html: Whether body is HTML

    Returns:
        bool: True if sent successfully
    """
    logger.info(f"Sending email to {to}: {subject}")

    try:
        from ...services.email.sender import EmailSender

        logger.info(f"Email sent successfully to {to}")
        return True

    except Exception as e:
        logger.error(f"Error sending email to {to}: {e}")
        raise


@shared_task(
    base=BaseTask,
    bind=True,
    name="tasks.generate_report",
    soft_time_limit=600,
    time_limit=900,
)
def generate_report_task(self, report_type: str, user_id: str, parameters: Dict[str, Any]) -> str:
    """
    Generate report asynchronously.

    Args:
        report_type: Type of report to generate
        user_id: User ID requesting report
        parameters: Report parameters

    Returns:
        str: Report file path
    """
    logger.info(f"Generating {report_type} report for user {user_id}")

    try:
        from ...services.analytics.reports import ReportGenerator
        from ...services.storage.manager import StorageManager

        logger.info(f"Report {report_type} generated for user {user_id}")

        return "path/to/report.pdf"

    except Exception as e:
        logger.error(f"Error generating report {report_type}: {e}")
        raise


@shared_task(
    base=BaseTask,
    bind=True,
    name="tasks.cleanup",
)
def cleanup_task(self, cleanup_type: str) -> Dict[str, int]:
    """
    Perform cleanup operations.

    Args:
        cleanup_type: Type of cleanup ('temp_files', 'old_logs', etc.)

    Returns:
        dict: Cleanup statistics
    """
    logger.info(f"Running cleanup task: {cleanup_type}")

    try:
        stats = {}

        if cleanup_type == "temp_files":
            from ...services.storage.manager import StorageManager

            stats["files_deleted"] = 0

        elif cleanup_type == "old_logs":
            stats["logs_deleted"] = 0

        elif cleanup_type == "expired_cache":
            stats["cache_keys_expired"] = 0

        logger.info(f"Cleanup {cleanup_type} completed: {stats}")
        return stats

    except Exception as e:
        logger.error(f"Error in cleanup task {cleanup_type}: {e}")
        raise


@shared_task(
    name="tasks.process_webhook",
    soft_time_limit=60,
    time_limit=120,
)
def process_webhook_task(event_type: str, event_data: Dict[str, Any]) -> bool:
    """
    Process webhook event asynchronously.

    Args:
        event_type: Type of webhook event
        event_data: Event data payload

    Returns:
        bool: True if processed successfully
    """
    logger.info(f"Processing webhook event: {event_type}")

    try:
        from .webhook_handlers import handle_webhook_event

        result = handle_webhook_event(event_type, event_data)

        logger.info(f"Webhook event {event_type} processed successfully")
        return result

    except Exception as e:
        logger.error(f"Error processing webhook {event_type}: {e}")
        raise


@shared_task(
    name="tasks.scheduled_weekly_report",
)
def scheduled_weekly_report_task() -> None:
    """
    Generate and send weekly reports (scheduled task).

    This task runs weekly via Celery Beat.
    """
    logger.info("Running scheduled weekly report generation")

    try:
        logger.info("Weekly reports scheduled for all users")

    except Exception as e:
        logger.error(f"Error in scheduled weekly report: {e}")
        raise


@shared_task(
    name="tasks.index_documents",
)
def index_documents_task(document_ids: list[str]) -> Dict[str, int]:
    """
    Index multiple documents for search.

    Args:
        document_ids: List of document IDs to index

    Returns:
        dict: Indexing statistics
    """
    logger.info(f"Indexing {len(document_ids)} documents")

    try:
        stats = {
            "total": len(document_ids),
            "succeeded": 0,
            "failed": 0,
        }

        for doc_id in document_ids:
            try:
                process_document_task.delay(doc_id)
                stats["succeeded"] += 1
            except Exception as e:
                logger.error(f"Failed to index document {doc_id}: {e}")
                stats["failed"] += 1

        logger.info(f"Document indexing completed: {stats}")
        return stats

    except Exception as e:
        logger.error(f"Error in bulk indexing: {e}")
        raise


# =============================================================================
# DMS PHASE 2 — INGESTION PIPELINE TASKS
# =============================================================================


def _run_async(coro):
    """Run an async coroutine from a sync Celery task."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                return pool.submit(asyncio.run, coro).result()
        else:
            return loop.run_until_complete(coro)
    except RuntimeError:
        return asyncio.run(coro)


def _create_task_record(
    task_id: str,
    task_name: str,
    filename: str = "",
    owner_id: int = None,
) -> None:
    """Create a SynapseTask record for UI tracking (best-effort)."""
    try:
        from app.db.session import SessionLocal
        from app.models.synapse_task import SynapseTask, TaskType

        with SessionLocal() as db:
            task = SynapseTask(
                task_id=task_id,
                task_name=task_name,
                celery_task_name=f"ingestion.{task_name.lower()}",
                task_type=TaskType.AUTO,
                status="PENDING",
                task_file_name=filename,
                owner_id=owner_id,
            )
            db.add(task)
            db.commit()
    except Exception as e:
        logger.debug("Failed to create SynapseTask record: %s", e)


@shared_task(
    bind=True,
    name="ingestion.ingest_document",
    acks_late=True,
    reject_on_worker_lost=True,
    time_limit=1800,       # 30-minute hard limit
    soft_time_limit=1500,  # 25-minute soft limit
    queue="ingestion",
)
def consume_document(self: Task, consumable_data: dict):
    """
    Ingest a new document through the DMS plugin pipeline.

    Sourced from Paperless tasks.py:138-204 consume_file().

    Key reliability patterns:
    - bind=True: access to self.request for task ID
    - acks_late: message only acked after SUCCESS (survives worker crash)
    - reject_on_worker_lost: requeue if worker dies mid-task

    Args:
        consumable_data: Dict with:
            - source_path: str — path to uploaded file on disk
            - original_filename: str — user-visible filename
            - user_id: int — owning user ID
            - mime_type: str (optional) — pre-detected MIME type
            - folder_id: int (optional) — target folder
            - document_id: int (optional) — existing Document row ID
    """
    from app.services.background.progress import ProgressManager, ProgressStatus
    from app.services.ingestion import create_pipeline, IngestDocument

    source_path = consumable_data["source_path"]
    filename = consumable_data.get("original_filename", "unknown")
    user_id = consumable_data["user_id"]

    # Create SynapseTask record for UI tracking
    _create_task_record(
        task_id=self.request.id,
        task_name="CONSUME_DOCUMENT",
        filename=filename,
        owner_id=user_id,
    )

    with ProgressManager(filename, self.request.id) as progress:
        doc = IngestDocument(
            source_path=source_path,
            original_filename=filename,
            user_id=user_id,
            mime_type=consumable_data.get("mime_type"),
            folder_id=consumable_data.get("folder_id"),
        )
        doc.document_id = consumable_data.get("document_id")

        pipeline = create_pipeline()

        def progress_cb(plugin_name, step, total):
            progress.send_progress(
                ProgressStatus.WORKING,
                f"Running {plugin_name}",
                step, total,
            )

        result = _run_async(pipeline.run(doc, progress_callback=progress_cb))

    return {
        "status": result.status.value,
        "document_id": result.document_id,
        "filename": result.original_filename,
        "text_length": len(result.text) if result.text else 0,
        "error": result.error_message,
    }


@shared_task(
    bind=True,
    name="ingestion.reprocess_document",
    time_limit=900,
    soft_time_limit=600,
    queue="ingestion",
    max_retries=2,
    default_retry_delay=30,
)
def reprocess_document(self: Task, document_id: int):
    """
    Re-OCR an existing document and update content.

    Sourced from Paperless tasks.py:246-351.
    """
    from app.services.parsers import get_parser_for_mime_type
    from app.services.storage.file_manager import FileManager
    from app.models.document import Document, ProcessingStatus

    _create_task_record(
        task_id=self.request.id,
        task_name="REPROCESS_DOCUMENT",
        filename=f"doc:{document_id}",
    )

    try:
        from app.db.session import SessionLocal
        from sqlalchemy import select

        with SessionLocal() as session:
            document = session.execute(
                select(Document).where(Document.id == document_id)
            ).scalar_one_or_none()

            if not document:
                logger.error("Document %d not found for reprocessing", document_id)
                return

            mime = document.mime_type or "application/pdf"
            parser_class = get_parser_for_mime_type(mime)
            if not parser_class:
                logger.error("No parser for MIME type %s", mime)
                return

            parser = parser_class()
            try:
                document.processing_status = ProcessingStatus.PARSING
                session.commit()

                parser.parse(document.file_path, mime, document.filename)

                document.content_text = parser.get_text()
                document.page_count = parser.get_page_count()
                document.word_count = len((parser.get_text() or "").split())

                # Update archive if parser generates one
                archive = parser.get_archive_path()
                if archive:
                    fm = FileManager()
                    document.archive_path = str(archive)
                    document.archive_checksum = FileManager.compute_checksum(str(archive))

                # Reprocessing only re-runs the DMS side — set PARSED so
                # process_document_task picks it up for re-embedding.
                document.processing_status = ProcessingStatus.PARSED
                session.commit()
                logger.info("Reprocessed document %d successfully (status=PARSED)", document_id)

            except Exception as e:
                document.processing_status = ProcessingStatus.FAILED
                session.commit()
                logger.exception("Reprocessing failed for document %d: %s", document_id, e)
                raise self.retry(exc=e)
            finally:
                parser.cleanup()

    except Retry:
        raise
    except Exception as e:
        logger.error("Error reprocessing document %d: %s", document_id, e)
        raise


@shared_task(name="storage.sanity_check", time_limit=300)
def run_sanity_check():
    """Nightly storage integrity check (delegated to storage module)."""
    from app.services.storage.sanity_check import run_sanity_check as _check

    async def _run():
        from app.db.session import AsyncSessionLocal as async_session_factory
        async with async_session_factory() as db:
            return await _check(db)

    result = _run_async(_run())
    logger.info("Sanity check complete: %s", result)
    return str(result)


@shared_task(name="storage.empty_trash", time_limit=300)
def run_empty_trash():
    """Weekly hard-delete of expired soft-deleted documents."""
    from app.services.storage.sanity_check import empty_trash as _trash

    async def _run():
        from app.db.session import AsyncSessionLocal as async_session_factory
        async with async_session_factory() as db:
            return await _trash(db)

    count = _run_async(_run())
    logger.info("Trash cleanup: deleted %d documents", count)
    return f"Deleted {count} documents"


@shared_task(
    bind=True,
    name="app.services.background.tasks.migrate_user_to_synapse_dense",
    soft_time_limit=3600,   # 1h — large collections can take time
    time_limit=7200,
    max_retries=0,          # No auto-retry — operator confirms each run
)
def migrate_user_to_synapse_dense(
    self,
    user_id: int,
    source_collection: str,
    dry_run: bool = True,
) -> dict:
    """
    Migrate per-user vector collection to the shared synapse_dense index.

    Sprint 2, Item 5. Copies all vectors from a user's private collection
    into synapse_dense, augmenting the payload with:
        - user_id (str cast — required for KEYWORD index multi-tenancy filter)
        - content_type: "text" (image chunks are already in synapse_dense)
        - embedding_model_version: "nomic-text-v1.5"

    State machine:
        PENDING → IN_PROGRESS → VERIFYING → DONE
                                           ↘ FAILED (count mismatch)

    Args:
        user_id: Postgres User.id owning the source collection.
        source_collection: Qdrant collection name to migrate FROM.
        dry_run: If True, prints what would happen but writes nothing.
                 Always start with dry_run=True to validate the source.

    Returns:
        dict with {status, points_copied, source_count, dest_count, dry_run}
    """
    import uuid as _uuid

    _log = logger

    _log.info(
        f"migrate_user_to_synapse_dense START user_id={user_id} source={source_collection} dry_run={dry_run}"
    )

    try:
        from app.core.ai.rag.vector_store.qdrant.client import get_qdrant_client
        from app.core.ai.rag.vector_store.qdrant.collection_manager import CollectionManager
        from qdrant_client.http import models as _qm

        qdrant = get_qdrant_client()
        client = qdrant.get_client()

        # Verify source collection exists
        try:
            source_info = client.get_collection(source_collection)
            source_count = source_info.points_count
        except Exception:
            return {
                "status": "FAILED",
                "reason": f"source collection '{source_collection}' not found",
                "user_id": user_id,
                "dry_run": dry_run,
            }

        _log.info(f"Source collection: {source_collection}, points: {source_count}")

        # Ensure synapse_dense exists
        collection_manager = CollectionManager(client=client)
        dest_collection = collection_manager.create_shared_collection()

        if dry_run:
            _log.info(
                f"DRY RUN: would copy {source_count} points "
                f"from '{source_collection}' to '{dest_collection}'"
            )
            return {
                "status": "DRY_RUN",
                "source_collection": source_collection,
                "dest_collection": dest_collection,
                "source_count": source_count,
                "dry_run": True,
            }

        # === IN_PROGRESS: scroll + upsert ===
        _log.info(f"Starting vector copy: {source_collection} → {dest_collection}")

        points_copied = 0
        offset = None
        _SCROLL_BATCH = 100

        while True:
            records, next_offset = client.scroll(
                collection_name=source_collection,
                with_vectors=True,
                with_payload=True,
                limit=_SCROLL_BATCH,
                offset=offset,
            )

            if not records:
                break

            # Augment payload for each point
            augmented_points = []
            for record in records:
                payload = dict(record.payload or {})
                # Ensure user_id is a string (KEYWORD index requirement)
                payload["user_id"] = str(user_id)
                # Mark as text content (image chunks are handled separately)
                payload.setdefault("content_type", "text")
                # Track model version for future migrations
                payload.setdefault("embedding_model_version", "nomic-text-v1.5")
                # Preserve original point ID — deterministic, idempotent
                # record.vector is already a named-vector dict: {"dense": [...], "bm25": SparseVector}
                # Source and dest collections share identical vector schemas — pass through directly.
                augmented_points.append(
                    _qm.PointStruct(
                        id=str(record.id),
                        vector=record.vector,
                        payload=payload,
                    )
                )

            client.upsert(
                collection_name=dest_collection,
                points=augmented_points,
            )
            points_copied += len(records)

            _log.info(
                f"migrate_progress: copied {points_copied}/{source_count} points"
            )

            if next_offset is None:
                break
            offset = next_offset

        # === VERIFYING: count check ===
        _log.info("Verifying point count in synapse_dense...")

        # Count our user's points in synapse_dense
        dest_user_count = client.count(
            collection_name=dest_collection,
            count_filter=_qm.Filter(
                must=[
                    _qm.FieldCondition(
                        key="user_id",
                        match=_qm.MatchValue(value=str(user_id)),
                    )
                ]
            ),
            exact=True,
        ).count

        if dest_user_count < points_copied:
            _log.error(
                f"migrate_count_mismatch: copied={points_copied} "
                f"dest_user_count={dest_user_count}"
            )
            return {
                "status": "FAILED",
                "reason": "count_mismatch",
                "points_copied": points_copied,
                "dest_user_count": dest_user_count,
                "user_id": user_id,
            }

        # === DONE ===
        _log.info(
            f"migrate_user_to_synapse_dense DONE user_id={user_id} source={source_collection} "
            f"dest={dest_collection} points_copied={points_copied} dest_user_count={dest_user_count}"
        )

        return {
            "status": "DONE",
            "user_id": user_id,
            "source_collection": source_collection,
            "dest_collection": dest_collection,
            "points_copied": points_copied,
            "dest_user_count": dest_user_count,
            "dry_run": False,
        }

    except Exception as e:
        _log.error(
            f"migrate_user_to_synapse_dense FAILED: {e}",
            exc_info=True,
        )
        return {
            "status": "FAILED",
            "reason": str(e),
            "user_id": user_id,
            "dry_run": dry_run,
        }
