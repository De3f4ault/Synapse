#!/usr/bin/env python3
"""
RAG Clean-Slate Reset Script
=============================

Run ONCE before restarting the CPU worker to begin the clean-slate rebuild.

What this does:
  1. Deletes synapse_dense and synapse_colbert Qdrant collections
  2. Recreates synapse_dense with the NEW unified schema
     (dense 768D + bm25 sparse + colbert 96D multivec in one collection)
  3. NULLs content_text for ALL completed documents
     (forces fresh re-extraction through the fixed _clean_text())
  4. Resets ALL document processing_status to 'pending'
     (forces re-ingestion through the new chunking pipeline)
  5. Prints a summary of what was done

PREREQUISITES:
  - SYNAPSE_RAG_MAINTENANCE=true must be set in .env (or the running API)
  - CPU worker must be STOPPED (supervisorctl stop synapse:celery-cpu-worker)
  - Run from backend directory: python scripts/rag_reset.py

AFTER running:
  - Verify summary output shows expected doc/collection counts
  - Start CPU worker: supervisorctl start synapse:celery-cpu-worker
  - Monitor: tail -f logs/celery-cpu-worker.err.log | grep "completed\|error"
  - Lift maintenance when all docs complete: set SYNAPSE_RAG_MAINTENANCE=false
"""

import sys
import os
import time

# Ensure backend root is in Python path
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND_DIR)


def main():
    print("=" * 65)
    print("  Synapse RAG Clean-Slate Reset")
    print("=" * 65)
    print()

    # ── Step 0: Safety check ────────────────────────────────────────
    print("[0/5] Safety check...")
    from app.core.ai.rag.config.rag_config import get_rag_config
    cfg = get_rag_config()
    if not cfg.rag_maintenance:
        print()
        print("  ✗ ABORTED: SYNAPSE_RAG_MAINTENANCE is not set to true.")
        print("  Set it in .env before running this script:")
        print("    echo 'SYNAPSE_RAG_MAINTENANCE=true' >> .env")
        print()
        sys.exit(1)
    print("  ✓ Maintenance mode active")

    # ── Step 1: Connect to Qdrant ───────────────────────────────────
    print()
    print("[1/5] Connecting to Qdrant...")
    from app.core.ai.rag.vector_store.qdrant.client import get_qdrant_client
    from app.core.ai.rag.vector_store.qdrant.collection_manager import (
        CollectionManager,
        SHARED_DENSE_COLLECTION,
    )

    qdrant_wrapper = get_qdrant_client()
    qdrant_client = qdrant_wrapper.get_client()
    manager = CollectionManager(client=qdrant_client)
    print(f"  ✓ Connected to Qdrant")

    # ── Step 2: Delete old collections ──────────────────────────────
    print()
    print("[2/5] Dropping old Qdrant collections...")

    OLD_COLBERT = "synapse_colbert"
    for coll_name in [SHARED_DENSE_COLLECTION, OLD_COLBERT]:
        if manager.collection_exists(coll_name):
            print(f"  Deleting {coll_name}...", end=" ", flush=True)
            manager.delete_collection(coll_name)
            print("done")
        else:
            print(f"  {coll_name}: not found (skipped)")

    # ── Step 3: Recreate with unified schema ────────────────────────
    print()
    print("[3/5] Creating unified synapse_dense (dense + bm25 + colbert)...")
    manager.create_shared_collection()
    print(f"  ✓ {SHARED_DENSE_COLLECTION} created with unified schema")

    # Verify the schema has all 3 vector types
    info = qdrant_client.get_collection(SHARED_DENSE_COLLECTION)
    vectors = info.config.params.vectors or {}
    has_dense = "dense" in vectors
    has_colbert = "colbert" in vectors
    sparse = info.config.params.sparse_vectors or {}
    has_bm25 = "bm25" in sparse

    if has_dense and has_bm25 and has_colbert:
        print(f"  ✓ Schema verified: dense={has_dense}, bm25={has_bm25}, colbert={has_colbert}")
    else:
        print(f"  ✗ Schema INCOMPLETE: dense={has_dense}, bm25={has_bm25}, colbert={has_colbert}")
        print("    Check schema.py include_colbert=True is working.")

    # ── Step 4: Reset Postgres documents ────────────────────────────
    print()
    print("[4/5] Resetting document processing state in Postgres...")
    from app.db.session import SessionLocal
    from sqlalchemy import text as sql_text

    with SessionLocal() as session:
        # Count before reset
        result = session.execute(sql_text(
            "SELECT processing_status, COUNT(*) as n FROM documents "
            "WHERE deleted_at IS NULL GROUP BY processing_status ORDER BY processing_status"
        ))
        status_counts = result.fetchall()

        print("  Current document status counts:")
        total_docs = 0
        for row in status_counts:
            print(f"    {row[0]:<12} → {row[1]:>4}")
            total_docs += row[1]
        print(f"    {'TOTAL':<12} → {total_docs:>4}")

        print()
        print(f"  Nullifying content_text for all {total_docs} documents...", end=" ", flush=True)
        r1 = session.execute(sql_text(
            "UPDATE documents SET content_text = NULL WHERE deleted_at IS NULL"
        ))
        print(f"done ({r1.rowcount} rows)")

        print(f"  Resetting processing_status to 'pending'...", end=" ", flush=True)
        r2 = session.execute(sql_text(
            "UPDATE documents SET processing_status = 'pending' WHERE deleted_at IS NULL"
        ))
        print(f"done ({r2.rowcount} rows)")

        print(f"  Deleting all document_chunks...", end=" ", flush=True)
        r3 = session.execute(sql_text("DELETE FROM document_chunks"))
        print(f"done ({r3.rowcount} rows)")

        session.commit()
        print("  ✓ Postgres reset committed")

    # ── Step 5: Summary ─────────────────────────────────────────────
    print()
    print("[5/5] Summary")
    print("-" * 65)
    print(f"  Documents reset to pending:      {r2.rowcount}")
    print(f"  content_text NULLed:             {r1.rowcount}")
    print(f"  document_chunks deleted:         {r3.rowcount}")
    print(f"  Qdrant collection:               {SHARED_DENSE_COLLECTION}")
    print(f"  Schema:                          dense + bm25 + colbert (unified)")
    print()
    print("  Next steps:")
    print("  1. Start CPU worker:")
    print("       supervisorctl start synapse:celery-cpu-worker")
    print("  2. Monitor ingestion:")
    print("       tail -f logs/celery-cpu-worker.err.log | grep -E 'completed|ERROR|chunking_complete'")
    print("  3. When all docs are COMPLETED, lift maintenance mode:")
    print("       Set SYNAPSE_RAG_MAINTENANCE=false in .env, restart API")
    print("  4. Enable ColBERT retrieval:")
    print("       Set SYNAPSE_RAG_COLBERT_ENABLE=true in .env, restart API")
    print()
    print("=" * 65)
    print("  Reset complete. Safe to start the CPU worker now.")
    print("=" * 65)


if __name__ == "__main__":
    main()
