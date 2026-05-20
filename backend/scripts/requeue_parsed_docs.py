#!/usr/bin/env python3
"""
Re-queue all documents stuck in 'parsed' state for RAG embedding.

Run this AFTER restarting the celery-cpu-worker so it picks up
the new task code (CHUNKING guard, PARSED → COMPLETED path).

Usage:
    cd /home/de3f4ault/Desktop/Projects/synapse/backend
    .venv/bin/python scripts/requeue_parsed_docs.py

Options:
    --dry-run   Print doc IDs without dispatching tasks
    --limit N   Process at most N documents (default: all)
"""
import sys
import os
import argparse

# Allow running from project root
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="Print IDs, don't dispatch")
    parser.add_argument("--limit", type=int, default=None, help="Max documents to process")
    args = parser.parse_args()

    import sqlalchemy
    from sqlalchemy import create_engine, text

    db_url = os.environ.get(
        "DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/synapse",
    )
    engine = create_engine(db_url)

    with engine.connect() as conn:
        query = "SELECT id, filename FROM documents WHERE processing_status = 'parsed' ORDER BY id"
        if args.limit:
            query += f" LIMIT {args.limit}"

        rows = conn.execute(text(query)).fetchall()

    if not rows:
        print("✅ No documents in 'parsed' state — nothing to re-queue.")
        return

    print(f"Found {len(rows)} documents in 'parsed' state.")

    if args.dry_run:
        print("\n[DRY RUN] Would re-queue:")
        for doc_id, filename in rows:
            print(f"  doc_id={doc_id:6d}  {filename}")
        return

    # Dispatch Celery tasks
    from app.services.background.tasks import process_document_task

    dispatched = 0
    errors = 0
    for doc_id, filename in rows:
        try:
            process_document_task.delay(doc_id)
            print(f"  ✓ Queued doc_id={doc_id}  {filename}")
            dispatched += 1
        except Exception as e:
            print(f"  ✗ Failed doc_id={doc_id}: {e}")
            errors += 1

    print(f"\n{'─'*50}")
    print(f"Dispatched: {dispatched}  |  Errors: {errors}")
    print("Monitor progress: watch celery-cpu-worker logs or query:")
    print("  SELECT processing_status, COUNT(*) FROM documents GROUP BY 1;")


if __name__ == "__main__":
    main()
