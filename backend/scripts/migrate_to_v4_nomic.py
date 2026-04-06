#!/usr/bin/env python3
"""
Migrate Qdrant collection from v3 (384d MiniLM) to v4 (768d Gemini + contextual retrieval).

Uses the Gemini Embedding API (cloud GPU) instead of local CPU inference.
This reduces migration time from ~7 hours to ~5-10 minutes.

Workflow:
  1. Create v4 collection with 768d named vectors (dense + bm25)
  2. Scroll v3 collection in batches
  3. Prepend [Source: title] to each chunk (contextual retrieval)
  4. Embed via Gemini API (768d, RETRIEVAL_DOCUMENT task type)
  5. Re-compute sparse BM25 vectors locally
  6. Upsert to v4 collection

Usage:
    cd backend
    PYTHONPATH=. python scripts/migrate_to_v4_nomic.py [--user-id 1] [--batch-size 100] [--dry-run] [--resume]

Estimated time: ~5-10 min for 27,442 chunks via Gemini API.
"""

import argparse
import sys
import time
import logging

# Suppress noisy logs during migration
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)
logging.getLogger("sentence_transformers").setLevel(logging.WARNING)

from qdrant_client.http import models as qmodels


def migrate(user_id: int, batch_size: int, dry_run: bool, resume: bool = False):
    """Run the v3 → v4 migration for a single user."""
    # ── Import components ───────────────────────────────────────
    from app.core.ai.rag.vector_store.qdrant.client import get_qdrant_client
    from app.core.ai.rag.embeddings.sparse_embedder import get_sparse_embedder
    from app.core.ai.rag.config.vector_store_config import get_vector_store_config
    from app.core.ai.rag.vector_store.qdrant.schema import get_hybrid_collection_schema
    from app.core.ai.embeddings.boundary import get_embedder

    vs_config = get_vector_store_config()
    client = get_qdrant_client().get_client()
    sparse_embedder = get_sparse_embedder()

    # Load embedder (Gemini API — no local model to download)
    print("Initializing embedding provider...")
    embedder = get_embedder()
    print(f"  Provider: {embedder.model_name}")
    print(f"  Dimensions: {embedder.embedding_dim}")

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
    print(f"  Migration: v3 → v4 (Gemini 768d + contextual retrieval)")
    print(f"  Source: {old_collection} ({total_points:,} points)")
    print(f"  Target: {new_collection}")
    print(f"  Batch size: {batch_size}")
    print(f"  Dry run: {dry_run}")
    print(f"  Resume: {resume}")
    print(f"  Changes:")
    print(f"    • Embedding: MiniLM 384d → Gemini 768d (cloud API)")
    print(f"    • Context: [Source: title] prepended to chunks")
    print(f"    • Sparse: BM25 re-computed on original text")
    print(f"{'━' * 60}")

    if dry_run:
        print(f"\n🔍 Dry run — no changes will be made.")
        print(f"   Would create collection '{new_collection}' with:")
        print(f"   - dense: 768-dim cosine (gemini-embedding-001)")
        print(f"   - bm25: sparse with Modifier.IDF")
        print(f"   - {total_points:,} points to re-embed")
        print(f"   - Estimated time: ~5-10 minutes (Gemini API)")

        # Show sample contextual text
        records, _ = client.scroll(
            collection_name=old_collection, limit=1, with_payload=True
        )
        if records:
            title = records[0].payload.get("title", "Unknown")
            text = records[0].payload.get("text", "")[:100]
            print(f"\n   Sample contextual text:")
            print(f"   [Source: {title}]")
            print(f"   {text}...")
        return

    # ── Create or resume target collection ──────────────────────
    already_migrated = 0

    if resume:
        try:
            existing = client.get_collection(new_collection)
            already_migrated = existing.points_count
            print(f"\n🔄 Resuming — {already_migrated:,} points already in target.")
            print(f"   Remaining: {total_points - already_migrated:,} points")
        except Exception:
            print(f"\n⚠️  --resume specified but target doesn't exist. Starting fresh.")
            resume = False

    if not resume:
        try:
            existing = client.get_collection(new_collection)
            print(f"\n⚠️  Target '{new_collection}' exists ({existing.points_count} points).")
            response = input("   Overwrite? [y/N]: ").strip().lower()
            if response != "y":
                print("   Aborted.")
                return
            client.delete_collection(new_collection)
            print(f"   Deleted existing '{new_collection}'.")
        except Exception:
            pass  # Doesn't exist — good

        schema = get_hybrid_collection_schema(vs_config)
        print(f"\n📦 Creating '{new_collection}'...")

        client.create_collection(
            collection_name=new_collection,
            **schema,
        )

        # Create payload indices
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
        print(f"   Collecting existing v4 IDs for skip...")
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
        print(f"   Found {len(existing_ids):,} existing IDs to skip")

    # ── Scroll, re-embed, and migrate ───────────────────────────
    remaining = total_points - already_migrated
    print(f"\n🔄 Embedding {remaining:,} points via Gemini API + contextual...")

    offset = None
    migrated = 0
    t_start = time.perf_counter()

    while True:
        # Scroll batch from v3 (payload only — we don't need old vectors)
        records, offset = client.scroll(
            collection_name=old_collection,
            limit=batch_size,
            offset=offset,
            with_vectors=False,
            with_payload=True,
        )

        if not records:
            break

        # Filter out already-migrated points (resume mode)
        if existing_ids:
            records = [r for r in records if r.id not in existing_ids]
            if not records:
                if offset is None:
                    break
                continue

        # Extract texts and build contextual versions
        original_texts = []
        contextual_texts = []
        payloads = []
        point_ids = []

        for record in records:
            text = record.payload.get("text", "")
            title = record.payload.get("title", "Unknown")

            original_texts.append(text)
            # Contextual retrieval: prepend source title for embedding
            contextual_texts.append(f"[Source: {title}]\n\n{text}")

            payloads.append(record.payload)
            point_ids.append(record.id)

        # Embed via Gemini API (uses RETRIEVAL_DOCUMENT task type)
        dense_embeddings = embedder.encode(
            contextual_texts, normalize=True
        ).tolist()

        # Compute sparse BM25 vectors on ORIGINAL text (local, fast)
        sparse_vectors = sparse_embedder.encode(original_texts)

        # Build v4 points with named vectors
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

        # Upsert to v4
        client.upsert(
            collection_name=new_collection,
            points=points,
            wait=True,
        )

        migrated += len(records)
        elapsed = time.perf_counter() - t_start
        rate = migrated / elapsed if elapsed > 0 else 0
        eta = (remaining - migrated) / rate if rate > 0 else 0

        print(
            f"   {migrated + already_migrated:>6,}/{total_points:,} "
            f"({(migrated + already_migrated)/total_points*100:5.1f}%) "
            f"│ {rate:.1f} pts/s "
            f"│ ETA {eta:.0f}s",
            end="\r",
        )

        if offset is None:
            break

    elapsed_total = time.perf_counter() - t_start
    print()  # newline after \r

    # ── Verify ──────────────────────────────────────────────────
    new_info = client.get_collection(new_collection)
    new_count = new_info.points_count

    print(f"\n{'━' * 60}")
    print(f"  Migration Complete")
    print(f"  Source: {old_collection} → {total_points:,} points")
    print(f"  Target: {new_collection} → {new_count:,} points")
    if migrated > 0:
        print(f"  Time: {elapsed_total:.1f}s ({migrated/elapsed_total:.0f} pts/s)")
    print(f"  Match: {'✅' if new_count == total_points else '❌ MISMATCH'}")
    print(f"  Model: gemini-embedding-001 (768d)")
    print(f"  Context: [Source: title] prepended")
    print(f"{'━' * 60}")

    if new_count == total_points:
        print(f"\n✅ Migration successful!")
        print(f"\nNext steps:")
        print(f"  1. Config already points to 'synapse_v4' — ready to use")
        print(f"  2. Test pipeline queries")
        print(f"  3. v3 collection kept as rollback (safe to delete after 1 week)")
    else:
        print(f"\n❌ Point count mismatch! Expected {total_points}, got {new_count}.")
        print(f"   Run with --resume to continue.")


def main():
    parser = argparse.ArgumentParser(
        description="Migrate v3 → v4 (Gemini 768d + contextual retrieval)"
    )
    parser.add_argument(
        "--user-id", type=int, default=1, help="User ID to migrate (default: 1)"
    )
    parser.add_argument(
        "--batch-size", type=int, default=100,
        help="Batch size (default: 100, max per Gemini API call)"
    )
    parser.add_argument(
        "--dry-run", action="store_true", help="Preview without making changes"
    )
    parser.add_argument(
        "--resume", action="store_true",
        help="Resume interrupted migration (skip already-migrated points)"
    )
    args = parser.parse_args()

    migrate(
        user_id=args.user_id,
        batch_size=args.batch_size,
        dry_run=args.dry_run,
        resume=args.resume,
    )


if __name__ == "__main__":
    main()
