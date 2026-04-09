#!/usr/bin/env python3
"""
Migrate Qdrant collection from v2 (unnamed dense) to v3 (named dense + sparse BM25).

Workflow:
1. Create v3 collection with named vectors (dense + bm25)
2. Scroll v2 collection in batches
3. Re-use existing dense vectors, compute sparse BM25 vectors from text
4. Upsert to v3 collection
5. Create payload indices on v3
6. Print summary for manual verification

After verification, update VectorStoreConfig.collection_prefix to "synapse_v3"
or use Qdrant aliases to swap.

Usage:
    cd backend
    PYTHONPATH=. python scripts/migrate_to_hybrid.py [--user-id 1] [--batch-size 100] [--dry-run]
"""

import argparse
import sys
import time
import logging

# Suppress noisy logs during migration
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)

from qdrant_client.http import models as qmodels


def migrate(user_id: int, batch_size: int, dry_run: bool):
    """Run the v2 → v3 migration for a single user."""
    # ── Import components ───────────────────────────────────────
    from app.core.ai.rag.vector_store.qdrant.client import get_qdrant_client
    from app.core.ai.rag.embeddings.sparse_embedder import get_sparse_embedder
    from app.core.ai.rag.config.vector_store_config import get_vector_store_config
    from app.core.ai.rag.vector_store.qdrant.schema import get_hybrid_collection_schema

    vs_config = get_vector_store_config()
    client = get_qdrant_client().get_client()
    sparse_embedder = get_sparse_embedder()

    old_collection = f"synapse_v2_user_{user_id}_documents"
    new_collection = f"synapse_v3_user_{user_id}_documents"

    # ── Validate source ─────────────────────────────────────────
    try:
        old_info = client.get_collection(old_collection)
    except Exception as e:
        print(f"❌ Source collection '{old_collection}' not found: {e}")
        sys.exit(1)

    total_points = old_info.points_count
    print(f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print(f"  Migration: v2 → v3 (hybrid)")
    print(f"  Source: {old_collection} ({total_points:,} points)")
    print(f"  Target: {new_collection}")
    print(f"  Batch size: {batch_size}")
    print(f"  Dry run: {dry_run}")
    print(f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

    if dry_run:
        print("\n🔍 Dry run — no changes will be made.")
        print(f"   Would create collection '{new_collection}' with:")
        print(f"   - dense: 384-dim cosine")
        print(f"   - bm25: sparse with Modifier.IDF")
        print(f"   - {total_points:,} points to migrate")
        return

    # ── Create target collection ────────────────────────────────
    try:
        existing = client.get_collection(new_collection)
        print(f"\n⚠️  Target collection '{new_collection}' already exists ({existing.points_count} points).")
        response = input("   Overwrite? [y/N]: ").strip().lower()
        if response != "y":
            print("   Aborted.")
            return
        client.delete_collection(new_collection)
        print(f"   Deleted existing '{new_collection}'.")
    except Exception:
        pass  # Collection doesn't exist — good

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
            pass  # Index may already exist

    print(f"   ✅ Collection created with dense + bm25 vectors")

    # ── Scroll and migrate ──────────────────────────────────────
    print(f"\n🔄 Migrating {total_points:,} points...")

    offset = None
    migrated = 0
    t_start = time.perf_counter()

    while True:
        # Scroll batch from v2 (include vectors)
        records, offset = client.scroll(
            collection_name=old_collection,
            limit=batch_size,
            offset=offset,
            with_vectors=True,
            with_payload=True,
        )

        if not records:
            break

        # Extract texts and existing dense vectors
        texts = []
        dense_vectors = []
        payloads = []
        point_ids = []

        for record in records:
            text = record.payload.get("text", "")
            texts.append(text)

            # v2 has unnamed vector (a flat list)
            dense_vec = record.vector
            if isinstance(dense_vec, dict):
                # Shouldn't happen for v2, but handle named vectors gracefully
                dense_vec = dense_vec.get("dense", dense_vec.get("", []))
            dense_vectors.append(dense_vec)

            payloads.append(record.payload)
            point_ids.append(record.id)

        # Compute sparse BM25 vectors
        sparse_vectors = sparse_embedder.encode(texts)

        # Build v3 points with named vectors
        points = []
        for i in range(len(records)):
            points.append(
                qmodels.PointStruct(
                    id=point_ids[i],
                    vector={
                        "dense": dense_vectors[i],
                        "bm25": sparse_vectors[i],
                    },
                    payload=payloads[i],
                )
            )

        # Upsert to v3
        client.upsert(
            collection_name=new_collection,
            points=points,
            wait=True,
        )

        migrated += len(records)
        elapsed = time.perf_counter() - t_start
        rate = migrated / elapsed if elapsed > 0 else 0
        eta = (total_points - migrated) / rate if rate > 0 else 0

        print(
            f"   {migrated:>6,}/{total_points:,} "
            f"({migrated/total_points*100:5.1f}%) "
            f"│ {rate:.0f} pts/s "
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

    print(f"\n{'━' * 55}")
    print(f"  Migration Complete")
    print(f"  Source: {old_collection} → {total_points:,} points")
    print(f"  Target: {new_collection} → {new_count:,} points")
    print(f"  Time: {elapsed_total:.1f}s ({migrated/elapsed_total:.0f} pts/s)")
    print(f"  Match: {'✅' if new_count == total_points else '❌ MISMATCH'}")
    print(f"{'━' * 55}")

    if new_count == total_points:
        print(f"\n✅ Migration successful!")
        print(f"\nNext steps:")
        print(f"  1. Update collection_prefix in VectorStoreConfig to 'synapse_v3'")
        print(f"  2. Or create an alias:")
        print(f"     curl -X POST http://localhost:6333/collections/aliases \\")
        print(f'       -H "Content-Type: application/json" \\')
        print(f'       -d \'{{"actions": [{{"create_alias": {{"collection_name": "{new_collection}", "alias_name": "{old_collection}"}}}}]}}\'')
        print(f"  3. Test with: PYTHONPATH=. python -m app.core.ai.rag.tests.integration.test_pipeline_quality")
        print(f"  4. After validation, delete old collection:")
        print(f"     curl -X DELETE http://localhost:6333/collections/{old_collection}")
    else:
        print(f"\n❌ Point count mismatch! Expected {total_points}, got {new_count}.")
        print(f"   Investigate before proceeding.")


def main():
    parser = argparse.ArgumentParser(description="Migrate v2 → v3 hybrid collection")
    parser.add_argument("--user-id", type=int, default=1, help="User ID to migrate (default: 1)")
    parser.add_argument("--batch-size", type=int, default=100, help="Batch size (default: 100)")
    parser.add_argument("--dry-run", action="store_true", help="Preview without making changes")
    args = parser.parse_args()

    migrate(user_id=args.user_id, batch_size=args.batch_size, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
