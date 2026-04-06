#!/usr/bin/env python3
"""
Migrate Qdrant collection from v3 (384d MiniLM) to v4 (768d Nomic + contextual retrieval).

Uses Nomic local embedder on CPU. Designed to run overnight via nohup.
Resumes from where it left off if interrupted.

Usage:
    cd backend
    # Quick test (first 100 points):
    PYTHONPATH=. python scripts/migrate_v4_nomic_overnight.py --dry-run

    # Run overnight:
    nohup bash -c 'cd /home/de3f4ault/Desktop/Projects/synapse/backend && \\
      PYTHONPATH=. python scripts/migrate_v4_nomic_overnight.py --resume 2>&1' \\
      > /tmp/migration_v4.log &

    # Monitor:
    tail -f /tmp/migration_v4.log

Estimated time: ~5-7 hours for 27,442 chunks on i5-8365U (8 threads).
"""

import argparse
import sys
import time
import os
import logging

# Suppress noisy logs
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)
logging.getLogger("sentence_transformers").setLevel(logging.WARNING)

# Force 8 threads for Nomic CPU inference
os.environ.setdefault("OMP_NUM_THREADS", "8")
os.environ.setdefault("MKL_NUM_THREADS", "8")

from qdrant_client.http import models as qmodels


def create_nomic_embedder():
    """Create Nomic embedder directly (bypasses boundary config)."""
    from app.core.ai.rag.embeddings.models.nomic_embedder import NomicEmbedder
    return NomicEmbedder()


def migrate(user_id: int, batch_size: int, dry_run: bool, resume: bool = False):
    """Run the v3 → v4 migration using Nomic local embedder."""
    from app.core.ai.rag.vector_store.qdrant.client import get_qdrant_client
    from app.core.ai.rag.embeddings.sparse_embedder import get_sparse_embedder
    from app.core.ai.rag.config.vector_store_config import get_vector_store_config
    from app.core.ai.rag.vector_store.qdrant.schema import get_hybrid_collection_schema

    vs_config = get_vector_store_config()
    client = get_qdrant_client().get_client()
    sparse_embedder = get_sparse_embedder()

    # Load Nomic local model
    print("Loading Nomic embedding model (local CPU)...")
    print("  This takes ~10 seconds on first load...")
    t_load = time.perf_counter()
    embedder = create_nomic_embedder()
    print(f"  Model: {embedder.model_name}")
    print(f"  Dimensions: {embedder.embedding_dim}")
    print(f"  Loaded in {time.perf_counter() - t_load:.1f}s")

    old_collection = f"synapse_v3_user_{user_id}_documents"
    new_collection = f"synapse_v4_user_{user_id}_documents"

    # ── Validate source ─────────────────────────────────────────
    try:
        old_info = client.get_collection(old_collection)
    except Exception as e:
        print(f"❌ Source collection '{old_collection}' not found: {e}")
        sys.exit(1)

    total_points = old_info.points_count
    print(f"\n{'━' * 60}")
    print(f"  Migration: v3 → v4 (Nomic 768d + contextual retrieval)")
    print(f"  Source: {old_collection} ({total_points:,} points)")
    print(f"  Target: {new_collection}")
    print(f"  Batch size: {batch_size}")
    print(f"  Mode: {'DRY RUN' if dry_run else 'RESUME' if resume else 'FRESH'}")
    print(f"  Threads: {os.environ.get('OMP_NUM_THREADS', '?')}")
    print(f"  Changes:")
    print(f"    • Embedding: MiniLM 384d → Nomic 768d (local CPU)")
    print(f"    • Context: [Source: title] prepended to chunks")
    print(f"    • Sparse: BM25 re-computed on original text")
    print(f"    • Vectors: named (dense + bm25) for hybrid search")
    print(f"{'━' * 60}")

    if dry_run:
        print(f"\n🔍 Dry run — embedding 1 sample batch...")
        records, _ = client.scroll(
            collection_name=old_collection, limit=3, with_payload=True
        )
        if records:
            texts = []
            for r in records:
                title = r.payload.get("title", "Unknown")
                text = r.payload.get("text", "")
                ctx = f"[Source: {title}]\n\n{text}"
                texts.append(ctx)
                print(f"\n   Sample ({len(text)} chars):")
                print(f"   {ctx[:120]}...")

            t0 = time.perf_counter()
            vecs = embedder.encode(texts, normalize=True)
            dt = time.perf_counter() - t0
            print(f"\n   Embedded {len(texts)} chunks in {dt:.2f}s ({dt/len(texts):.2f}s/chunk)")
            print(f"   Vector shape: {vecs.shape}")

            est_hours = (total_points * (dt / len(texts))) / 3600
            print(f"\n   Estimated total time: ~{est_hours:.1f} hours")
        return

    # ── Create or resume target collection ──────────────────────
    already_migrated = 0

    if resume:
        try:
            existing = client.get_collection(new_collection)
            already_migrated = existing.points_count
            if already_migrated > 0:
                print(f"\n🔄 Resuming — {already_migrated:,} points already in target.")
                print(f"   Remaining: ~{total_points - already_migrated:,} points")
            else:
                print(f"\n   Target exists but empty. Continuing from start.")
        except Exception:
            print(f"\n⚠️  --resume but target doesn't exist. Creating fresh.")
            resume = False

    if not resume:
        try:
            existing = client.get_collection(new_collection)
            count = existing.points_count
            if count > 0:
                print(f"\n⚠️  Target '{new_collection}' exists ({count} points).")
                response = input("   Overwrite? [y/N]: ").strip().lower()
                if response != "y":
                    print("   Aborted.")
                    return
            client.delete_collection(new_collection)
            print(f"   Deleted existing '{new_collection}'.")
        except Exception:
            pass

        schema = get_hybrid_collection_schema(vs_config)
        print(f"\n📦 Creating '{new_collection}'...")

        client.create_collection(
            collection_name=new_collection,
            **schema,
        )

        for field, ftype in [
            ("user_id", qmodels.PayloadSchemaType.INTEGER),
            ("source_id", qmodels.PayloadSchemaType.KEYWORD),
            ("source_type", qmodels.PayloadSchemaType.KEYWORD),
        ]:
            try:
                client.create_payload_index(
                    collection_name=new_collection,
                    field_name=field,
                    field_schema=ftype,
                )
            except Exception:
                pass

        print(f"   ✅ Collection created with 768d dense + bm25 vectors")

    # ── Collect IDs already in v4 (for resume skip) ─────────────
    existing_ids = set()
    if resume and already_migrated > 0:
        print(f"   Scanning existing v4 IDs...")
        skip_offset = None
        while True:
            recs, skip_offset = client.scroll(
                collection_name=new_collection,
                limit=500,
                offset=skip_offset,
                with_vectors=False,
                with_payload=False,
            )
            if not recs:
                break
            existing_ids.update(r.id for r in recs)
            if skip_offset is None:
                break
        print(f"   Found {len(existing_ids):,} IDs to skip")

    # ── Scroll, re-embed, and migrate ───────────────────────────
    remaining = total_points - already_migrated
    print(f"\n🔄 Embedding {remaining:,} points with Nomic (local CPU)...")
    print(f"   Started: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    sys.stdout.flush()

    offset = None
    migrated = 0
    t_start = time.perf_counter()

    while True:
        records, offset = client.scroll(
            collection_name=old_collection,
            limit=batch_size,
            offset=offset,
            with_vectors=False,
            with_payload=True,
        )

        if not records:
            break

        # Skip already-migrated (resume mode)
        if existing_ids:
            records = [r for r in records if r.id not in existing_ids]
            if not records:
                if offset is None:
                    break
                continue

        original_texts = []
        contextual_texts = []
        payloads = []
        point_ids = []

        for record in records:
            text = record.payload.get("text", "")
            title = record.payload.get("title", "Unknown")
            original_texts.append(text)
            contextual_texts.append(f"[Source: {title}]\n\n{text}")
            payloads.append(record.payload)
            point_ids.append(record.id)

        # Nomic encode with "search_document:" prefix (automatic)
        dense_embeddings = embedder.encode(
            contextual_texts, normalize=True
        ).tolist()

        # BM25 on original text
        sparse_vectors = sparse_embedder.encode(original_texts)

        points = []
        for i in range(len(records)):
            points.append(
                qmodels.PointStruct(
                    id=point_ids[i],
                    vector={
                        "dense": dense_embeddings[i],
                        "bm25": sparse_vectors[i],
                    },
                    payload=payloads[i],
                )
            )

        client.upsert(
            collection_name=new_collection,
            points=points,
            wait=True,
        )

        migrated += len(records)
        elapsed = time.perf_counter() - t_start
        rate = migrated / elapsed if elapsed > 0 else 0
        eta_s = (remaining - migrated) / rate if rate > 0 else 0
        eta_h = eta_s / 3600

        # Print progress (flush for nohup log visibility)
        print(
            f"   {migrated + already_migrated:>6,}/{total_points:,} "
            f"({(migrated + already_migrated)/total_points*100:5.1f}%) "
            f"│ {rate:.1f} pts/s "
            f"│ ETA {eta_h:.1f}h ({eta_s:.0f}s)"
        )
        sys.stdout.flush()

        if offset is None:
            break

    elapsed_total = time.perf_counter() - t_start

    # ── Verify ──────────────────────────────────────────────────
    new_info = client.get_collection(new_collection)
    new_count = new_info.points_count

    print(f"\n{'━' * 60}")
    print(f"  Migration Complete")
    print(f"  Finished: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"  Source: {old_collection} → {total_points:,} points")
    print(f"  Target: {new_collection} → {new_count:,} points")
    if migrated > 0:
        print(f"  Time: {elapsed_total/3600:.1f}h ({migrated/elapsed_total:.1f} pts/s)")
    print(f"  Match: {'✅' if new_count == total_points else '❌ MISMATCH'}")
    print(f"  Model: nomic-embed-text-v1.5 (768d)")
    print(f"  Context: [Source: title] prepended")
    print(f"{'━' * 60}")

    if new_count == total_points:
        print(f"\n✅ Migration successful!")
        print(f"\n   IMPORTANT: Set EMBEDDING_PROVIDER=local in .env")
        print(f"   (ensures queries use Nomic to match indexed vectors)")
    elif new_count < total_points:
        print(f"\n⚠️  Partial migration ({new_count}/{total_points})")
        print(f"   Run again with --resume to complete.")
    else:
        print(f"\n❌ Unexpected count! Investigate.")


def main():
    parser = argparse.ArgumentParser(
        description="Migrate v3 → v4 with Nomic local embedder (overnight run)"
    )
    parser.add_argument("--user-id", type=int, default=1)
    parser.add_argument("--batch-size", type=int, default=50,
                        help="Batch size (default: 50, good for CPU)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Test embed speed on sample batch")
    parser.add_argument("--resume", action="store_true",
                        help="Resume interrupted migration")
    args = parser.parse_args()

    migrate(
        user_id=args.user_id,
        batch_size=args.batch_size,
        dry_run=args.dry_run,
        resume=args.resume,
    )


if __name__ == "__main__":
    main()
