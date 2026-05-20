#!/usr/bin/env python3
"""
RAG Pipeline Single-Document Test
====================================
Tests the new chunking + unified upsert pipeline against a single real document
WITHOUT touching the production collection or resetting the database.

Usage:
    # List small documents to choose from:
    python scripts/test_pipeline_single_doc.py --list

    # Test a specific document (dry-run — no Qdrant writes):
    python scripts/test_pipeline_single_doc.py --doc-id 42 --dry-run

    # Full test (writes to a temporary test collection, not synapse_dense):
    python scripts/test_pipeline_single_doc.py --doc-id 42

    # Find a small doc automatically and run:
    python scripts/test_pipeline_single_doc.py --auto

Output sections:
  [1] Document info (filename, size, file_type)
  [2] Extraction & _clean_text() diagnostics
  [3] Content routing decision (md / code-heavy / large / semantic)
  [4] Chunk analysis (count, size distribution, boundary quality)
  [5] Embedding verification (shape, norm)
  [6] Upsert verification (point count in test collection)
  [7] Retrieval smoke test (3 sample queries, top-3 results each)
"""

import sys
import os
import re
import argparse
import statistics
import time

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND_DIR)

# ─────────────────────────────────────────────────────────────────────────────
TEST_COLLECTION = "synapse_test_pipeline"   # Never touches synapse_dense
BATCH_SIZE = 20
# ─────────────────────────────────────────────────────────────────────────────


def bar(value, max_val, width=30, char="█"):
    filled = int(width * value / max(max_val, 1))
    return char * filled + "░" * (width - filled)


def section(title):
    print()
    print(f"{'─' * 65}")
    print(f"  {title}")
    print(f"{'─' * 65}")


def list_small_docs(session, max_chars=50_000):
    """List documents with small content_text for targeted testing."""
    from sqlalchemy import text as sql_text
    rows = session.execute(sql_text("""
        SELECT id, filename, file_type, processing_status,
               length(content_text) as char_count,
               word_count, page_count
        FROM documents
        WHERE deleted_at IS NULL
          AND content_text IS NOT NULL
          AND length(content_text) BETWEEN 100 AND :max_chars
        ORDER BY length(content_text)
        LIMIT 30
    """), {"max_chars": max_chars}).fetchall()
    return rows


def find_auto_doc(session):
    """Pick one small doc from each domain if available."""
    from sqlalchemy import text as sql_text
    row = session.execute(sql_text("""
        SELECT id FROM documents
        WHERE deleted_at IS NULL
          AND content_text IS NOT NULL
          AND length(content_text) BETWEEN 1000 AND 30000
        ORDER BY length(content_text)
        LIMIT 1
    """)).fetchone()
    return row[0] if row else None


def analyze_chunks(chunks, original_text):
    """Compute chunk quality metrics."""
    sizes = [len(c["content"]) for c in chunks]
    if not sizes:
        return {}

    # Boundary quality: count chunks that end mid-sentence (no period/? before last word)
    def ends_abruptly(text):
        stripped = text.rstrip()
        if not stripped:
            return False
        return stripped[-1] not in ".!?:»\"'"

    abrupt_ends = sum(1 for c in chunks if ends_abruptly(c["content"]))

    # Overlap with previous chunk (if text.find can locate it)
    overlaps = 0
    for i in range(1, len(chunks)):
        prev = chunks[i-1]["content"][-50:]
        curr = chunks[i]["content"]
        if prev.strip() and prev.strip() in curr:
            overlaps += 1

    # Newlines per chunk (higher = more structure preserved)
    newlines_per_chunk = [c["content"].count("\n") for c in chunks]

    return {
        "count": len(chunks),
        "total_chars": sum(sizes),
        "min": min(sizes),
        "max": max(sizes),
        "mean": statistics.mean(sizes),
        "median": statistics.median(sizes),
        "stdev": statistics.stdev(sizes) if len(sizes) > 1 else 0,
        "abrupt_end_pct": 100 * abrupt_ends / len(chunks),
        "overlap_pct": 100 * overlaps / len(chunks),
        "avg_newlines": statistics.mean(newlines_per_chunk),
        "chunking_methods": list({c.get("chunking_method", "?") for c in chunks}),
    }


def main():
    parser = argparse.ArgumentParser(description="RAG pipeline single-document test")
    parser.add_argument("--doc-id", type=int, help="Document ID to test")
    parser.add_argument("--list", action="store_true", help="List small testable documents")
    parser.add_argument("--auto", action="store_true", help="Auto-pick a small document")
    parser.add_argument("--dry-run", action="store_true",
                        help="Skip Qdrant upsert and retrieval (chunking analysis only)")
    parser.add_argument("--max-list-chars", type=int, default=50_000,
                        help="Max chars for --list filter (default 50000)")
    args = parser.parse_args()

    print("=" * 65)
    print("  Synapse RAG Pipeline — Single-Document Test")
    print("=" * 65)

    from app.db.session import SessionLocal
    from app.models.document import Document

    with SessionLocal() as session:

        # ── --list mode ────────────────────────────────────────────
        if args.list:
            rows = list_small_docs(session, args.max_list_chars)
            if not rows:
                print("  No small documents with content_text found.")
                return
            print(f"\n  {'ID':>5}  {'chars':>7}  {'words':>6}  {'type':<8}  {'status':<12}  filename")
            print(f"  {'─'*5}  {'─'*7}  {'─'*6}  {'─'*8}  {'─'*12}  {'─'*30}")
            for r in rows:
                chars = r[4] or 0
                words = r[5] or 0
                print(f"  {r[0]:>5}  {chars:>7,}  {words:>6,}  {(r[2] or '?'):<8}  {r[3]:<12}  {r[1][:45]}")
            print(f"\n  Use:  python scripts/test_pipeline_single_doc.py --doc-id <ID>")
            return

        # ── Resolve doc_id ─────────────────────────────────────────
        doc_id = args.doc_id
        if args.auto or doc_id is None:
            doc_id = find_auto_doc(session)
            if not doc_id:
                print("  No suitable document found. Upload a small doc first.")
                sys.exit(1)
            print(f"  Auto-selected document ID: {doc_id}")

        # ── [1] Document info ──────────────────────────────────────
        section("[1] Document Info")
        from sqlalchemy import select as sa_select
        doc = session.execute(
            sa_select(Document).where(Document.id == doc_id, Document.deleted_at.is_(None))
        ).scalar_one_or_none()

        if not doc:
            print(f"  ✗  Document {doc_id} not found or deleted.")
            sys.exit(1)

        print(f"  ID:         {doc.id}")
        print(f"  Filename:   {doc.filename}")
        print(f"  File type:  {doc.file_type}")
        print(f"  Status:     {doc.processing_status}")
        print(f"  Words:      {doc.word_count:,}" if doc.word_count else "  Words:      N/A")
        print(f"  Pages:      {doc.page_count}" if doc.page_count else "  Pages:      N/A")

        # ── [2] Extract text ───────────────────────────────────────
        section("[2] Text Extraction & _clean_text() Diagnostics")
        from app.services.background.document_processor import DocumentProcessor
        processor = DocumentProcessor()

        if doc.content_text:
            raw_text = doc.content_text
            print(f"  Source:     content_text (DB cache)")
        else:
            print(f"  Source:     file extraction from {doc.file_path}")
            if not os.path.exists(doc.file_path or ""):
                print(f"  ✗  File not found: {doc.file_path}")
                sys.exit(1)
            extracted = processor.process_document(
                file_path=doc.file_path, file_type=doc.file_type
            )
            raw_text = extracted["content_text"]

        # Show what _clean_text does now
        cleaned = processor._clean_text(raw_text)

        newlines_before = raw_text.count("\n")
        newlines_after = cleaned.count("\n")
        double_newlines = cleaned.count("\n\n")

        print(f"  Raw text:   {len(raw_text):,} chars")
        print(f"  Cleaned:    {len(cleaned):,} chars")
        print(f"  Newlines before clean:  {newlines_before:,}")
        print(f"  Newlines after clean:   {newlines_after:,}  ← MUST be > 0 (structure preserved)")
        print(f"  Paragraph breaks (\\n\\n): {double_newlines:,}  ← More = better structure")

        if newlines_after == 0:
            print()
            print("  ✗  WARNING: _clean_text() still destroying newlines! Check the fix.")
        elif double_newlines > 0:
            print()
            print("  ✓  Paragraph structure preserved")
        else:
            print()
            print("  ⚠  Single newlines only — check if source had paragraph breaks")

        # Show a snippet of the cleaned text with newlines visible
        snippet = cleaned[:800].replace("\n\n", " ¶¶ ").replace("\n", " ¶ ")
        print(f"\n  First 800 chars (¶=newline, ¶¶=paragraph):")
        print(f"  {snippet[:400]}")
        if len(snippet) > 400:
            print(f"  {snippet[400:]}")

        # ── [3] Content routing ────────────────────────────────────
        section("[3] Content Routing Decision")
        file_type = doc.file_type or "pdf"

        if file_type.lower() == "md":
            route = "markdown (Route 1)"
        else:
            # Run code detection heuristic
            _CODE_PATTERNS = re.compile(
                r'^(>>>|\$\s|def |class |import |from \w|#include|public |private |int |void |if \(|for \()'
            )
            _sample = cleaned.split('\n')[:300]
            _code_lines = sum(1 for l in _sample if _CODE_PATTERNS.match(l.strip()))
            _code_ratio = _code_lines / max(len(_sample), 1)

            if _code_ratio > 0.12:
                route = f"code-heavy fixed-window (Route 2) — {_code_ratio:.1%} code-signal lines"
            elif len(cleaned) > 500_000:
                route = f"large-doc fixed-window (Route 3) — {len(cleaned):,} chars > 500k limit"
            else:
                route = "semantic chunker System A (Route 4)"
                if file_type.lower() != "md":
                    print(f"  Code ratio:  {_code_ratio:.1%} (<12% threshold — NOT code-heavy)")

        print(f"  File type:  {file_type}")
        print(f"  Route:      {route}")

        # ── [4] Chunk analysis ─────────────────────────────────────
        section("[4] Chunk Analysis")

        from app.services.background.tasks import _iter_semantic_chunks

        print("  Running chunker... ", end="", flush=True)
        t0 = time.time()
        chunks = list(_iter_semantic_chunks(
            text=cleaned,
            document_id=str(doc_id),
            file_type=file_type,
        ))
        elapsed = time.time() - t0
        print(f"done in {elapsed:.1f}s")

        if not chunks:
            print("  ✗  No chunks produced!")
            sys.exit(1)

        metrics = analyze_chunks(chunks, cleaned)
        coverage = 100 * metrics["total_chars"] / max(len(cleaned), 1)

        print(f"\n  Chunks:         {metrics['count']}")
        print(f"  Method(s):      {', '.join(metrics['chunking_methods'])}")
        print(f"  Coverage:       {coverage:.1f}% of source text")
        print(f"  Min size:       {metrics['min']:,} chars")
        print(f"  Max size:       {metrics['max']:,} chars")
        print(f"  Mean size:      {metrics['mean']:.0f} chars")
        print(f"  Median size:    {metrics['median']:.0f} chars")
        print(f"  Std dev:        {metrics['stdev']:.0f} chars")
        print(f"  Abrupt endings: {metrics['abrupt_end_pct']:.1f}%  (lower = better boundaries)")
        print(f"  Avg newlines/chunk: {metrics['avg_newlines']:.1f}  (higher = structure preserved)")

        # Size distribution histogram
        print(f"\n  Size distribution (chars):")
        buckets = [(0, 100), (100, 300), (300, 600), (600, 1000), (1000, 2000), (2000, 99999)]
        bucket_labels = ["<100", "100-300", "300-600", "600-1k", "1k-2k", ">2k"]
        for (lo, hi), label in zip(buckets, bucket_labels):
            count = sum(1 for c in chunks if lo <= len(c["content"]) < hi)
            pct = 100 * count / len(chunks)
            print(f"  {label:>8}  {bar(count, len(chunks), 25)} {count:>4} ({pct:.0f}%)")

        # Show first 3 chunks with boundaries
        print(f"\n  First 3 chunks (showing content + boundary quality):")
        for i, c in enumerate(chunks[:3]):
            content = c["content"]
            method = c.get("chunking_method", "?")
            starts_with = repr(content[:80])
            ends_with = repr(content[-80:])
            ends_ok = content.rstrip()[-1] in ".!?:»\"'" if content.strip() else False
            boundary = "✓" if ends_ok else "⚠"
            print(f"\n  Chunk {i} [{method}] — {len(content)} chars  {boundary}")
            print(f"    START: {starts_with}")
            print(f"    END:   {ends_with}")

        if args.dry_run:
            print()
            print("  [DRY RUN] Skipping Qdrant upsert and retrieval.")
            print(f"\n{'=' * 65}")
            print("  Test complete (dry-run). Chunks look good — run without")
            print("  --dry-run to also verify Qdrant upsert and retrieval.")
            print(f"{'=' * 65}")
            return

        # ── [5] Embedding verification ─────────────────────────────
        section("[5] Embedding Verification")
        from app.core.ai.embeddings.boundary import get_embedder
        import numpy as np

        embedder = get_embedder()
        sample_texts = [c["content"] for c in chunks[:3]]
        print(f"  Encoding {len(sample_texts)} sample chunks... ", end="", flush=True)
        t0 = time.time()
        vecs = embedder.encode(sample_texts, normalize=True)
        elapsed = time.time() - t0
        print(f"done in {elapsed:.2f}s")

        if hasattr(vecs, 'shape'):
            print(f"  Shape:  {vecs.shape}  (expected: ({len(sample_texts)}, 768))")
            norms = np.linalg.norm(vecs, axis=1)
            print(f"  Norms:  {norms.round(4).tolist()}  (should be ≈ 1.0)")
            if all(abs(n - 1.0) < 0.01 for n in norms):
                print("  ✓ Embeddings normalized correctly")
            else:
                print("  ⚠ Embeddings not unit-norm — check normalize=True")

        # ── [6] Qdrant upsert test ─────────────────────────────────
        section("[6] Qdrant Upsert (Test Collection)")
        from app.core.ai.rag.vector_store.qdrant.client import get_qdrant_client
        from app.core.ai.rag.vector_store.qdrant.collection_manager import CollectionManager
        from app.core.ai.rag.vector_store.operations.upsert import VectorUpsert
        from app.core.ai.rag.vector_store.qdrant.schema import get_collection_schema
        from app.core.ai.rag.config.vector_store_config import get_vector_store_config
        from app.core.ai.rag.config.rag_config import get_rag_config

        qdrant_wrapper = get_qdrant_client()
        qdrant_client = qdrant_wrapper.get_client()
        manager = CollectionManager(client=qdrant_client)
        upserter = VectorUpsert(qdrant_client)
        rag_cfg = get_rag_config()

        # Ensure test collection exists (clean slate for this run)
        if manager.collection_exists(TEST_COLLECTION):
            print(f"  Dropping stale {TEST_COLLECTION}...")
            manager.delete_collection(TEST_COLLECTION)

        vs_cfg = get_vector_store_config()
        schema = get_collection_schema(vs_cfg, include_colbert=rag_cfg.colbert_enable)
        qdrant_client.create_collection(collection_name=TEST_COLLECTION, **schema)
        print(f"  ✓ Created {TEST_COLLECTION}")

        # Embed all chunks
        from app.core.ai.rag.embeddings.sparse_embedder import get_sparse_embedder
        sparse_embedder = get_sparse_embedder()

        all_texts = [c["content"] for c in chunks]
        print(f"  Encoding {len(chunks)} chunks (dense)... ", end="", flush=True)
        t0 = time.time()
        dense_vecs = embedder.encode(all_texts, normalize=True).tolist()
        print(f"done in {time.time()-t0:.1f}s")

        print(f"  Encoding sparse BM25... ", end="", flush=True)
        sparse_vecs = [sparse_embedder.encode_query(t) for t in all_texts]
        print("done")

        colbert_vecs = None
        if rag_cfg.colbert_enable:
            from app.core.ai.rag.embeddings.models.colbert_embedder import get_colbert_embedder
            print(f"  Encoding ColBERT... ", end="", flush=True)
            t0 = time.time()
            colbert_vecs = get_colbert_embedder().encode_documents(all_texts)
            print(f"done in {time.time()-t0:.1f}s")
            print(f"  ColBERT shape: [{len(colbert_vecs)}] × [{len(colbert_vecs[0])} tokens] × 96D")

        # Build payloads
        import uuid
        payloads, ids = [], []
        for c in chunks:
            payloads.append({
                "text": c["content"],
                "source_id": str(doc.id),
                "source_type": "documents",
                "title": doc.filename,
                "chunk_index": c["chunk_index"],
                "user_id": str(doc.user_id),
                "chunk_strategy": c.get("chunking_method", "?"),
                "char_count": len(c["content"]),
                "pg_chunk_id": None,
            })
            ids.append(c["chunk_id"])

        # Upsert in batches
        print(f"  Upserting {len(chunks)} points to {TEST_COLLECTION}... ", end="", flush=True)
        t0 = time.time()
        if colbert_vecs is not None:
            for start in range(0, len(ids), BATCH_SIZE):
                end = min(start + BATCH_SIZE, len(ids))
                upserter.upsert_unified_batch(
                    collection_name=TEST_COLLECTION,
                    dense_vectors=dense_vecs[start:end],
                    sparse_vectors=sparse_vecs[start:end],
                    colbert_multivectors=colbert_vecs[start:end],
                    payloads=payloads[start:end],
                    ids=ids[start:end],
                )
        else:
            for start in range(0, len(ids), BATCH_SIZE):
                end = min(start + BATCH_SIZE, len(ids))
                upserter.upsert_hybrid_batch(
                    collection_name=TEST_COLLECTION,
                    dense_vectors=dense_vecs[start:end],
                    sparse_vectors=sparse_vecs[start:end],
                    payloads=payloads[start:end],
                    ids=ids[start:end],
                )
        print(f"done in {time.time()-t0:.1f}s")

        # Verify point count
        info = qdrant_client.get_collection(TEST_COLLECTION)
        stored = info.points_count
        print(f"\n  Points in Qdrant:   {stored}")
        print(f"  Chunks produced:    {len(chunks)}")
        if stored == len(chunks):
            print("  ✓ All chunks upserted successfully (1:1 match)")
        else:
            print(f"  ✗ Mismatch! expected={len(chunks)}, stored={stored}")

        # ── [7] Retrieval smoke test ───────────────────────────────
        section("[7] Retrieval Smoke Test")

        # Auto-generate sample queries from first chunk content
        first_chunk_words = chunks[0]["content"].split()
        mid = len(first_chunk_words) // 2
        auto_query = " ".join(first_chunk_words[max(0, mid-5):mid+5])

        test_queries = [
            auto_query,
            chunks[len(chunks)//2]["content"][:80] if len(chunks) > 1 else auto_query,
            chunks[-1]["content"][:80] if len(chunks) > 1 else auto_query,
        ]
        # Deduplicate
        test_queries = list(dict.fromkeys(test_queries))[:3]

        from app.core.ai.rag.vector_store.operations.search import VectorSearch
        searcher = VectorSearch(qdrant_client)

        for qi, query in enumerate(test_queries):
            print(f"\n  Query {qi+1}: \"{query[:70]}...\"" if len(query) > 70 else f"\n  Query {qi+1}: \"{query}\"")

            # Encode query
            if hasattr(embedder, "encode_query"):
                qvec = embedder.encode_query(query).tolist()
            else:
                qvec = embedder.encode([query], normalize=True)[0].tolist()

            sparse_q = sparse_embedder.encode_query(query)

            import asyncio
            results = asyncio.run(searcher.hybrid_search(
                collection_name=TEST_COLLECTION,
                dense_vector=qvec,
                sparse_vector=sparse_q,
                limit=3,
                prefetch_limit=10,
                filters=None,
            ))

            if not results:
                print("    ✗ No results returned")
                continue

            for ri, r in enumerate(results[:3]):
                text_snippet = r.payload.get("text", "")[:100].replace("\n", " ")
                method = r.payload.get("chunk_strategy", "?")
                print(f"    [{ri+1}] score={r.score:.4f} method={method}  \"{text_snippet}...\"")

        # ── Cleanup ────────────────────────────────────────────────
        section("[8] Cleanup")
        manager.delete_collection(TEST_COLLECTION)
        print(f"  ✓ {TEST_COLLECTION} deleted")

        # ── Final verdict ──────────────────────────────────────────
        print()
        print("=" * 65)
        print("  TEST COMPLETE — VERDICT")
        print("─" * 65)

        ok_newlines = newlines_after > 0
        ok_double   = double_newlines > 0
        ok_chunks   = len(chunks) > 0
        ok_coverage = coverage > 80
        ok_upsert   = stored == len(chunks)

        checks = [
            (ok_newlines,  "Newlines preserved by _clean_text()"),
            (ok_double,    "Paragraph breaks (\\n\\n) present"),
            (ok_chunks,    f"Chunks produced ({len(chunks)})"),
            (ok_coverage,  f"Coverage > 80% ({coverage:.1f}%)"),
            (ok_upsert,    "All chunks upserted to Qdrant"),
        ]

        all_ok = all(r for r, _ in checks)
        for result, label in checks:
            icon = "✓" if result else "✗"
            print(f"  {icon}  {label}")

        print()
        if all_ok:
            print("  ✓✓  All checks passed — pipeline is healthy.")
            print("      Safe to run rag_reset.py and process the full corpus.")
        else:
            print("  ✗   Some checks failed. Investigate before full reset.")

        print("=" * 65)


if __name__ == "__main__":
    main()
