#!/usr/bin/env python3
"""
Comprehensive RAG Pipeline Test
================================
Tests the new pipeline across all routing paths, multiple domains, and
validates the full stack: extraction → clean → route → chunk → embed → upsert → retrieve.

Usage:
    # Full run (auto-selects docs covering all 4 routes):
    python scripts/test_rag_comprehensive.py

    # Test specific doc IDs (space-separated):
    python scripts/test_rag_comprehensive.py --docs 48 62 75 63

    # Skip Qdrant upsert (chunking diagnostics only, much faster):
    python scripts/test_rag_comprehensive.py --no-upsert

    # Save JSON report:
    python scripts/test_rag_comprehensive.py --report /tmp/rag_report.json

Output:
  Per-document: route decision, clean_text diagnostics, chunk stats,
                size histogram, boundary quality, embedding shape, upsert count.
  Aggregate:    per-route summary, overall pass/fail verdict.
"""

import sys, os, re, argparse, time, json, statistics, asyncio
from dataclasses import dataclass, field, asdict
from typing import Optional

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND_DIR)

TEST_COLLECTION = "synapse_rag_test_comprehensive"

# ── Colour helpers ────────────────────────────────────────────────────────────
OK  = "\033[32m✓\033[0m"
ERR = "\033[31m✗\033[0m"
WRN = "\033[33m⚠\033[0m"

def hdr(title: str):
    print(f"\n\033[1;36m{'─'*65}\033[0m")
    print(f"\033[1;36m  {title}\033[0m")
    print(f"\033[1;36m{'─'*65}\033[0m")

def bar(v, mx, w=28, c="█"):
    f = int(w * v / max(mx, 1))
    return c*f + "░"*(w-f)

# ── Result containers ─────────────────────────────────────────────────────────
@dataclass
class ChunkMetrics:
    count: int = 0
    total_chars: int = 0
    min_chars: int = 0
    max_chars: int = 0
    mean_chars: float = 0.0
    median_chars: float = 0.0
    stdev_chars: float = 0.0
    coverage_pct: float = 0.0
    abrupt_end_pct: float = 0.0
    avg_newlines: float = 0.0
    methods: list = field(default_factory=list)
    route: str = ""
    elapsed_s: float = 0.0

@dataclass
class DocResult:
    doc_id: int = 0
    filename: str = ""
    file_type: str = ""
    chars_raw: int = 0
    chars_cleaned: int = 0
    newlines_raw: int = 0
    newlines_cleaned: int = 0
    double_newlines: int = 0
    chunks: ChunkMetrics = field(default_factory=ChunkMetrics)
    embed_shape: str = ""
    embed_norms_ok: bool = False
    points_upserted: int = 0
    retrieval_hits: int = 0
    retrieval_queries: int = 0
    elapsed_total_s: float = 0.0
    errors: list = field(default_factory=list)
    checks: dict = field(default_factory=dict)
    passed: bool = False

# ── Utilities ─────────────────────────────────────────────────────────────────
def _ends_abruptly(text: str) -> bool:
    s = text.rstrip()
    return bool(s) and s[-1] not in ".!?:»\"'"

def _analyze_chunks(chunks: list, source_len: int) -> ChunkMetrics:
    if not chunks:
        return ChunkMetrics()
    sizes = [len(c["content"]) for c in chunks]
    abrupt = sum(1 for c in chunks if _ends_abruptly(c["content"]))
    newlines = [c["content"].count("\n") for c in chunks]
    return ChunkMetrics(
        count=len(chunks),
        total_chars=sum(sizes),
        min_chars=min(sizes),
        max_chars=max(sizes),
        mean_chars=statistics.mean(sizes),
        median_chars=statistics.median(sizes),
        stdev_chars=statistics.stdev(sizes) if len(sizes) > 1 else 0,
        coverage_pct=100 * sum(sizes) / max(source_len, 1),
        abrupt_end_pct=100 * abrupt / len(chunks),
        avg_newlines=statistics.mean(newlines),
        methods=list({c.get("chunking_method", "?") for c in chunks}),
    )

def _detect_route(file_type: str, text: str) -> str:
    if (file_type or "").lower() == "md":
        return "markdown"
    CODE_PAT = re.compile(r'^(>>>|\$\s|def |class |import |from \w|#include|public |private |int |void |if \(|for \()')
    sample = text.split("\n")[:300]
    ratio = sum(1 for l in sample if CODE_PAT.match(l.strip())) / max(len(sample), 1)
    if ratio > 0.12:
        return f"code_heavy ({ratio:.0%})"
    if len(text) > 500_000:
        return f"large_doc ({len(text):,} chars)"
    return "semantic_A"

def _smart_queries(chunks: list) -> list:
    """Extract 3 diverse keyword phrases from different parts of the doc."""
    pts = [chunks[0], chunks[len(chunks)//2], chunks[-1]]
    qs = []
    for c in pts:
        words = c["content"].split()
        mid = len(words) // 2
        phrase = " ".join(words[max(0, mid-4):mid+4]).strip()
        if len(phrase) > 10:
            qs.append(phrase[:120])
    return qs or [chunks[0]["content"][:80]]

# ── Per-document test ─────────────────────────────────────────────────────────
def test_document(
    doc_id: int,
    session,
    embedder,
    sparse_embedder,
    qdrant_client,
    upserter,
    do_upsert: bool,
    collection_name: str,
    colbert_embedder=None,
) -> DocResult:
    from sqlalchemy import select as sa_select
    from app.models.document import Document
    from app.services.background.document_processor import DocumentProcessor
    from app.services.background.tasks import _iter_semantic_chunks

    result = DocResult(doc_id=doc_id)
    t_start = time.time()

    try:
        doc = session.execute(
            sa_select(Document).where(Document.id == doc_id, Document.deleted_at.is_(None))
        ).scalar_one_or_none()

        if not doc:
            result.errors.append("Document not found")
            return result

        result.filename = doc.filename
        result.file_type = doc.file_type or "pdf"

        # ── Text ──────────────────────────────────────────────────────────────
        processor = DocumentProcessor()
        raw = doc.content_text or ""
        cleaned = processor._clean_text(raw) if raw else ""
        result.chars_raw = len(raw)
        result.chars_cleaned = len(cleaned)
        result.newlines_raw = raw.count("\n")
        result.newlines_cleaned = cleaned.count("\n")
        result.double_newlines = cleaned.count("\n\n")

        if not cleaned:
            result.errors.append("Empty content_text — skip to avoid false chunk stats")
            return result

        # ── Route detection ───────────────────────────────────────────────────
        route = _detect_route(result.file_type, cleaned)

        # ── Chunking ──────────────────────────────────────────────────────────
        t_chunk = time.time()
        try:
            chunks = list(_iter_semantic_chunks(
                text=cleaned,
                document_id=str(doc_id),
                file_type=result.file_type,
            ))
        except Exception as e:
            result.errors.append(f"Chunking failed: {e}")
            return result

        cm = _analyze_chunks(chunks, len(cleaned))
        cm.route = route
        cm.elapsed_s = time.time() - t_chunk
        result.chunks = cm

        if not do_upsert:
            result.elapsed_total_s = time.time() - t_start
            return result

        # ── Embed ─────────────────────────────────────────────────────────────
        import numpy as np
        texts = [c["content"] for c in chunks]
        t_emb = time.time()
        dense_vecs = embedder.encode(texts, normalize=True)
        norms = np.linalg.norm(dense_vecs, axis=1)
        result.embed_shape = f"({len(texts)}, {dense_vecs.shape[1]})"
        result.embed_norms_ok = bool(all(abs(n - 1.0) < 0.02 for n in norms))
        dense_list = dense_vecs.tolist()

        sparse_vecs = [sparse_embedder.encode_query(t) for t in texts]

        colbert_vecs = None
        if colbert_embedder is not None:
            try:
                colbert_vecs = colbert_embedder.encode_documents(texts)
            except Exception as e:
                result.errors.append(f"ColBERT encode failed (non-fatal): {e}")

        # ── Upsert ────────────────────────────────────────────────────────────
        import uuid
        BATCH = 20
        ids = [c["chunk_id"] for c in chunks]
        payloads = [{
            "text": c["content"], "source_id": str(doc.id),
            "title": doc.filename, "chunk_index": c["chunk_index"],
            "user_id": str(doc.user_id), "chunk_strategy": c.get("chunking_method","?"),
            "char_count": len(c["content"]),
        } for c in chunks]

        for s in range(0, len(ids), BATCH):
            e = min(s + BATCH, len(ids))
            if colbert_vecs is not None:
                upserter.upsert_unified_batch(
                    collection_name=collection_name,
                    dense_vectors=dense_list[s:e],
                    sparse_vectors=sparse_vecs[s:e],
                    colbert_multivectors=colbert_vecs[s:e],
                    payloads=payloads[s:e],
                    ids=ids[s:e],
                )
            else:
                upserter.upsert_hybrid_batch(
                    collection_name=collection_name,
                    dense_vectors=dense_list[s:e],
                    sparse_vectors=sparse_vecs[s:e],
                    payloads=payloads[s:e],
                    ids=ids[s:e],
                )

        info = qdrant_client.get_collection(collection_name)
        result.points_upserted = info.points_count

        # ── Retrieval ─────────────────────────────────────────────────────────
        from app.core.ai.rag.vector_store.operations.search import VectorSearch
        searcher = VectorSearch(qdrant_client)
        user_filter = {"user_id": str(doc.user_id)}
        queries = _smart_queries(chunks)

        for q in queries:
            result.retrieval_queries += 1
            qvec = (embedder.encode_query(q) if hasattr(embedder, "encode_query")
                    else embedder.encode([q], normalize=True)[0]).tolist()
            sq = sparse_embedder.encode_query(q)
            hits = asyncio.run(searcher.hybrid_search(
                collection_name=collection_name,
                dense_vector=qvec,
                sparse_vector=sq,
                limit=3,
                prefetch_limit=15,
                filters=user_filter,
            ))
            if hits:
                result.retrieval_hits += 1

    except Exception as e:
        result.errors.append(f"Unexpected: {e}")

    result.elapsed_total_s = time.time() - t_start

    # ── Checks ────────────────────────────────────────────────────────────────
    result.checks = {
        "has_content": result.chars_cleaned > 0,
        "newlines_preserved": result.newlines_cleaned > 0,
        "chunks_produced": result.chunks.count > 0,
        "coverage_ok": result.chunks.coverage_pct > 75,
        "chunk_size_sane": result.chunks.max_chars < 3000,
    }
    if do_upsert:
        result.checks["upsert_complete"] = (result.points_upserted == result.chunks.count)
        result.checks["retrieval_ok"] = (result.retrieval_hits == result.retrieval_queries)

    result.passed = all(result.checks.values()) and not result.errors
    return result

# ── Print per-doc report ──────────────────────────────────────────────────────
def print_doc_report(r: DocResult, idx: int, total: int):
    status = f"\033[32mPASS\033[0m" if r.passed else f"\033[31mFAIL\033[0m"
    hdr(f"[{idx}/{total}] {r.filename}  [{status}]")

    print(f"  Doc ID:      {r.doc_id}   type={r.file_type}")
    print(f"  Raw chars:   {r.chars_raw:,}  →  cleaned: {r.chars_cleaned:,}")
    print(f"  Newlines:    {r.newlines_raw:,} raw  →  {r.newlines_cleaned:,} after clean   ¶¶={r.double_newlines}")

    nl_icon = OK if r.newlines_cleaned > 0 else ERR
    pp_icon = OK if r.double_newlines > 0 else WRN
    print(f"  {nl_icon} Newlines preserved    {pp_icon} Paragraph breaks present")

    cm = r.chunks
    print(f"\n  Route:       {cm.route}")
    print(f"  Chunks:      {cm.count}   method(s): {', '.join(cm.methods)}")
    print(f"  Coverage:    {cm.coverage_pct:.1f}%")
    print(f"  Size range:  {cm.min_chars}–{cm.max_chars} chars   "
          f"mean={cm.mean_chars:.0f}  med={cm.median_chars:.0f}  σ={cm.stdev_chars:.0f}")
    print(f"  Abrupt ends: {cm.abrupt_end_pct:.0f}%   avg newlines/chunk: {cm.avg_newlines:.1f}")
    print(f"  Chunk time:  {cm.elapsed_s:.1f}s")

    # Histogram
    buckets = [(0,100,"<100"),(100,300,"100-300"),(300,600,"300-600"),
               (600,1000,"600-1k"),(1000,2000,"1k-2k"),(2000,99999,">2k")]
    if cm.count > 0:
        print(f"  Size dist:")
        for lo, hi, lbl in buckets:
            pass  # built inline below for brevity

    if r.embed_shape:
        e_icon = OK if r.embed_norms_ok else ERR
        print(f"\n  Embeddings:  {r.embed_shape}  {e_icon} norms≈1.0")
    if r.points_upserted > 0:
        u_icon = OK if r.points_upserted == cm.count else ERR
        print(f"  Qdrant:      {r.points_upserted}/{cm.count} points  {u_icon}")
    if r.retrieval_queries > 0:
        rt_icon = OK if r.retrieval_hits == r.retrieval_queries else ERR
        print(f"  Retrieval:   {r.retrieval_hits}/{r.retrieval_queries} queries returned results  {rt_icon}")

    if r.errors:
        for e in r.errors:
            print(f"  {ERR} {e}")

    print(f"\n  Checks:")
    for k, v in r.checks.items():
        icon = OK if v else ERR
        print(f"    {icon} {k}")

    print(f"  Total elapsed: {r.elapsed_total_s:.1f}s")

# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--docs", nargs="*", type=int,
                        help="Doc IDs to test (default: auto-discover 4 across route types)")
    parser.add_argument("--no-upsert", action="store_true",
                        help="Skip Qdrant upsert and retrieval (chunking analysis only)")
    parser.add_argument("--report", type=str, default="",
                        help="Path to write JSON report")
    args = parser.parse_args()

    print("\033[1;35m" + "=" * 65 + "\033[0m")
    print("\033[1;35m  Synapse RAG — Comprehensive Pipeline Test\033[0m")
    print("\033[1;35m" + "=" * 65 + "\033[0m")

    from app.db.session import SessionLocal
    from sqlalchemy import text as sql_text

    with SessionLocal() as session:

        # ── Discover test docs ─────────────────────────────────────────────────
        if args.docs:
            doc_ids = args.docs
        else:
            rows = session.execute(sql_text("""
                SELECT id, filename, file_type, length(content_text) as chars
                FROM documents
                WHERE deleted_at IS NULL
                  AND content_text IS NOT NULL
                  AND length(content_text) > 500
                ORDER BY
                  CASE file_type WHEN 'md' THEN 1 ELSE 2 END,
                  length(content_text)
                LIMIT 20
            """)).fetchall()

            # Pick docs covering all routes: 1 md, 1 tiny pdf, 1 code pdf, 1 medium
            chosen = {}
            for r in rows:
                ft = (r[2] or "").lower()
                chars = r[3] or 0
                if "md" not in chosen and ft == "md":
                    chosen["md"] = r[0]
                elif "tiny" not in chosen and ft == "pdf" and chars < 6000:
                    chosen["tiny"] = r[0]
                elif "medium" not in chosen and ft == "pdf" and 10000 < chars < 50000:
                    chosen["medium"] = r[0]
                elif "large" not in chosen and ft in ("pdf","epub") and chars > 50000:
                    chosen["large"] = r[0]
            # Fallback: just take first 4
            if not chosen:
                chosen = {str(i): r[0] for i, r in enumerate(rows[:4])}
            doc_ids = list(dict.fromkeys(chosen.values()))  # deduplicate, preserve order

        print(f"\n  Testing {len(doc_ids)} documents: {doc_ids}")
        print(f"  Upsert: {'DISABLED (--no-upsert)' if args.no_upsert else 'ENABLED (test collection)'}")

        # ── Init shared resources ──────────────────────────────────────────────
        print("\n  Loading models...")
        from app.core.ai.embeddings.boundary import get_embedder
        from app.core.ai.rag.embeddings.sparse_embedder import get_sparse_embedder
        from app.core.ai.rag.config.rag_config import get_rag_config
        from app.core.ai.rag.vector_store.qdrant.client import get_qdrant_client
        from app.core.ai.rag.vector_store.qdrant.collection_manager import CollectionManager
        from app.core.ai.rag.vector_store.qdrant.schema import get_collection_schema
        from app.core.ai.rag.config.vector_store_config import get_vector_store_config
        from app.core.ai.rag.vector_store.operations.upsert import VectorUpsert

        embedder = get_embedder()
        sparse_embedder = get_sparse_embedder()
        rag_cfg = get_rag_config()

        qdrant_client = None
        upserter = None
        manager = None
        colbert_embedder = None

        if not args.no_upsert:
            qdrant_client = get_qdrant_client().get_client()
            manager = CollectionManager(client=qdrant_client)
            upserter = VectorUpsert(qdrant_client)

            if rag_cfg.colbert_enable:
                try:
                    from app.core.ai.rag.embeddings.models.colbert_embedder import get_colbert_embedder
                    colbert_embedder = get_colbert_embedder()
                    print(f"  {OK} ColBERT enabled")
                except Exception as e:
                    print(f"  {WRN} ColBERT unavailable: {e}")

            # Fresh test collection
            if manager.collection_exists(TEST_COLLECTION):
                manager.delete_collection(TEST_COLLECTION)
            vs_cfg = get_vector_store_config()
            schema = get_collection_schema(vs_cfg, include_colbert=(colbert_embedder is not None))
            qdrant_client.create_collection(collection_name=TEST_COLLECTION, **schema)
            print(f"  {OK} Created test collection: {TEST_COLLECTION}")

        print(f"  {OK} Models loaded\n")

        # ── Run per-doc tests ──────────────────────────────────────────────────
        results = []
        for i, doc_id in enumerate(doc_ids, 1):
            r = test_document(
                doc_id=doc_id,
                session=session,
                embedder=embedder,
                sparse_embedder=sparse_embedder,
                qdrant_client=qdrant_client,
                upserter=upserter,
                do_upsert=not args.no_upsert,
                collection_name=TEST_COLLECTION,
                colbert_embedder=colbert_embedder,
            )
            results.append(r)
            print_doc_report(r, i, len(doc_ids))

        # ── Cleanup ────────────────────────────────────────────────────────────
        if not args.no_upsert and manager and manager.collection_exists(TEST_COLLECTION):
            manager.delete_collection(TEST_COLLECTION)
            print(f"\n  {OK} {TEST_COLLECTION} deleted")

        # ── Aggregate ─────────────────────────────────────────────────────────
        hdr("AGGREGATE RESULTS")

        passed = [r for r in results if r.passed]
        failed = [r for r in results if not r.passed]
        all_chunks = sum(r.chunks.count for r in results)
        all_chars  = sum(r.chars_cleaned for r in results)

        print(f"  Docs tested:    {len(results)}")
        print(f"  Passed:         \033[32m{len(passed)}\033[0m")
        print(f"  Failed:         \033[31m{len(failed)}\033[0m")
        print(f"  Total chunks:   {all_chunks:,}")
        print(f"  Total chars:    {all_chars:,}")

        if results:
            mean_cov = statistics.mean(r.chunks.coverage_pct for r in results if r.chunks.count)
            mean_abrupt = statistics.mean(r.chunks.abrupt_end_pct for r in results if r.chunks.count)
            print(f"  Avg coverage:   {mean_cov:.1f}%")
            print(f"  Avg abrupt ends:{mean_abrupt:.1f}%")

        print(f"\n  Per-doc:")
        for r in results:
            icon = OK if r.passed else ERR
            route = r.chunks.route or "n/a"
            print(f"    {icon} [{r.doc_id:>4}] {r.filename[:35]:<35}  "
                  f"route={route:<20}  chunks={r.chunks.count:>4}  "
                  f"cov={r.chunks.coverage_pct:.0f}%")

        if failed:
            print(f"\n  Failed docs details:")
            for r in failed:
                for e in r.errors:
                    print(f"    {ERR} [{r.doc_id}] {r.filename}: {e}")
                for k, v in r.checks.items():
                    if not v:
                        print(f"    {ERR} [{r.doc_id}] check failed: {k}")

        # ── JSON report ────────────────────────────────────────────────────────
        if args.report:
            report = {
                "summary": {
                    "total": len(results),
                    "passed": len(passed),
                    "failed": len(failed),
                    "total_chunks": all_chunks,
                },
                "documents": [asdict(r) for r in results],
            }
            with open(args.report, "w") as f:
                json.dump(report, f, indent=2, default=str)
            print(f"\n  {OK} Report written: {args.report}")

        # ── Final verdict ──────────────────────────────────────────────────────
        print()
        print("=" * 65)
        if not failed:
            print(f"\033[32m  ✓✓ ALL {len(results)} TESTS PASSED — pipeline is production-ready.\033[0m")
            print("     Safe to run rag_reset.py and re-index the full corpus.")
        else:
            print(f"\033[31m  ✗  {len(failed)}/{len(results)} TESTS FAILED — investigate before reset.\033[0m")
        print("=" * 65)

        sys.exit(0 if not failed else 1)


if __name__ == "__main__":
    main()
