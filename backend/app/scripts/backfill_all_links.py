"""
Backfill ALL graph edges for existing entities.

Scans quizzes, decks, and notes to retroactively create DERIVED edges
that were never persisted due to missing db.commit() calls.

Idempotent: uses upsert-based LinkService.create_link, safe to run repeatedly.
Batched: processes 100 entities at a time.
Reports orphan counts explicitly so operators know the gap is expected.

Usage:
    cd backend
    python -m app.scripts.backfill_all_links
"""

import asyncio
import structlog
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import AsyncSessionLocal
from app.models.quiz import Quiz
from app.models.deck import Deck
from app.models.note import Note
from app.models.link import LinkEntityType, LinkType
from app.services.graph.linker import GraphLinker

logger = structlog.get_logger(__name__)

BATCH_SIZE = 100

# Map quiz source_ids keys to LinkEntityType
QUIZ_SOURCE_KEY_MAP = {
    "document_ids": LinkEntityType.DOCUMENT,
    "note_ids": LinkEntityType.NOTE,
    "deck_ids": LinkEntityType.DECK,
}


async def backfill_quiz_links(session: AsyncSession, stats: dict):
    """Backfill DERIVED edges: quiz → source documents/notes/decks."""
    offset = 0
    while True:
        result = await session.execute(
            select(Quiz)
            .where(and_(Quiz.source_ids.isnot(None), Quiz.deleted_at.is_(None)))
            .order_by(Quiz.id)
            .offset(offset)
            .limit(BATCH_SIZE)
        )
        quizzes = result.scalars().all()
        if not quizzes:
            break

        for quiz in quizzes:
            stats["quizzes_scanned"] += 1
            source_ids = quiz.source_ids
            if not source_ids or not isinstance(source_ids, dict):
                stats["orphan_quizzes"] += 1
                continue

            source_refs = []
            for key, entity_type in QUIZ_SOURCE_KEY_MAP.items():
                ids = source_ids.get(key, [])
                if isinstance(ids, list):
                    for eid in ids:
                        if isinstance(eid, int):
                            source_refs.append((entity_type, eid))
                elif isinstance(ids, int):
                    source_refs.append((entity_type, ids))

            if not source_refs:
                stats["orphan_quizzes"] += 1
                continue

            try:
                linker = GraphLinker(session)
                links = await linker.on_entity_created(
                    user_id=quiz.user_id,
                    entity_type=LinkEntityType.QUIZ,
                    entity_id=quiz.id,
                    source_refs=source_refs,
                    link_type=LinkType.DERIVED,
                    label="generated from",
                    metadata={"backfill": True},
                )
                stats["quizzes_linked"] += 1
                stats["edges_created"] += len(links)
            except Exception as e:
                stats["errors"] += 1
                logger.error("backfill_quiz_error", quiz_id=quiz.id, error=str(e))

        offset += BATCH_SIZE


async def backfill_deck_links(session: AsyncSession, stats: dict):
    """Backfill DERIVED edges: deck → source document (via ai_metadata.source_document_id)."""
    offset = 0
    while True:
        result = await session.execute(
            select(Deck)
            .where(and_(Deck.ai_metadata.isnot(None), Deck.deleted_at.is_(None)))
            .order_by(Deck.id)
            .offset(offset)
            .limit(BATCH_SIZE)
        )
        decks = result.scalars().all()
        if not decks:
            break

        for deck in decks:
            stats["decks_scanned"] += 1
            ai_meta = deck.ai_metadata
            if not ai_meta or not isinstance(ai_meta, dict):
                stats["orphan_topic_decks"] += 1
                continue

            source_doc_id = ai_meta.get("source_document_id")
            if not source_doc_id or not isinstance(source_doc_id, int):
                # Topic-based deck — no source document, intentional orphan
                if ai_meta.get("source_topic"):
                    stats["orphan_topic_decks"] += 1
                else:
                    stats["orphan_other_decks"] += 1
                continue

            try:
                linker = GraphLinker(session)
                links = await linker.on_entity_created(
                    user_id=deck.user_id,
                    entity_type=LinkEntityType.DECK,
                    entity_id=deck.id,
                    source_refs=[(LinkEntityType.DOCUMENT, source_doc_id)],
                    link_type=LinkType.DERIVED,
                    label="generated from",
                    metadata={"backfill": True},
                )
                stats["decks_linked"] += 1
                stats["edges_created"] += len(links)
            except Exception as e:
                stats["errors"] += 1
                logger.error("backfill_deck_error", deck_id=deck.id, error=str(e))

        offset += BATCH_SIZE


async def backfill_note_links(session: AsyncSession, stats: dict):
    """Backfill DERIVED edges: child note → parent note (via parent_id)."""
    offset = 0
    while True:
        result = await session.execute(
            select(Note)
            .where(and_(Note.deleted_at.is_(None)))
            .order_by(Note.id)
            .offset(offset)
            .limit(BATCH_SIZE)
        )
        notes = result.scalars().all()
        if not notes:
            break

        for note in notes:
            stats["notes_scanned"] += 1

            if note.parent_id is None:
                stats["orphan_standalone_notes"] += 1
                continue

            try:
                linker = GraphLinker(session)
                links = await linker.on_entity_created(
                    user_id=note.user_id,
                    entity_type=LinkEntityType.NOTE,
                    entity_id=note.id,
                    source_refs=[(LinkEntityType.NOTE, note.parent_id)],
                    link_type=LinkType.DERIVED,
                    label="child of",
                    metadata={"backfill": True},
                )
                stats["notes_linked"] += 1
                stats["edges_created"] += len(links)
            except Exception as e:
                stats["errors"] += 1
                logger.error("backfill_note_error", note_id=note.id, error=str(e))

        offset += BATCH_SIZE


async def count_unlinked_documents(session: AsyncSession, stats: dict):
    """Count documents that have no derived entities yet (expected orphans)."""
    from app.models.document import Document
    from app.models.link import Link

    result = await session.execute(
        select(Document.id)
        .where(Document.deleted_at.is_(None))
    )
    all_doc_ids = {row[0] for row in result.all()}

    # Find docs that appear as targets in any link
    linked_result = await session.execute(
        select(Link.target_id)
        .where(and_(Link.target_type == LinkEntityType.DOCUMENT))
        .distinct()
    )
    linked_as_target = {row[0] for row in linked_result.all()}

    # Also find docs that appear as sources
    linked_result2 = await session.execute(
        select(Link.source_id)
        .where(and_(Link.source_type == LinkEntityType.DOCUMENT))
        .distinct()
    )
    linked_as_source = {row[0] for row in linked_result2.all()}

    linked_doc_ids = linked_as_target | linked_as_source
    stats["orphan_unlinked_documents"] = len(all_doc_ids - linked_doc_ids)
    stats["documents_total"] = len(all_doc_ids)


async def main():
    stats = {
        # Quizzes
        "quizzes_scanned": 0,
        "quizzes_linked": 0,
        "orphan_quizzes": 0,
        # Decks
        "decks_scanned": 0,
        "decks_linked": 0,
        "orphan_topic_decks": 0,
        "orphan_other_decks": 0,
        # Notes
        "notes_scanned": 0,
        "notes_linked": 0,
        "orphan_standalone_notes": 0,
        # Documents
        "documents_total": 0,
        "orphan_unlinked_documents": 0,
        # Totals
        "edges_created": 0,
        "errors": 0,
    }

    print("\n" + "=" * 60)
    print("Synapse Knowledge Graph — Backfill All Links")
    print("=" * 60)

    async with AsyncSessionLocal() as session:
        print("\n[1/4] Backfilling quiz links...")
        await backfill_quiz_links(session, stats)
        logger.info("backfill_quizzes_done", **{k: v for k, v in stats.items() if "quiz" in k})

        print("[2/4] Backfilling deck links...")
        await backfill_deck_links(session, stats)
        logger.info("backfill_decks_done", **{k: v for k, v in stats.items() if "deck" in k})

        print("[3/4] Backfilling note links...")
        await backfill_note_links(session, stats)
        logger.info("backfill_notes_done", **{k: v for k, v in stats.items() if "note" in k})

        print("[4/4] Counting unlinked documents...")
        await count_unlinked_documents(session, stats)

    total_orphans = (
        stats["orphan_quizzes"]
        + stats["orphan_topic_decks"]
        + stats["orphan_other_decks"]
        + stats["orphan_standalone_notes"]
        + stats["orphan_unlinked_documents"]
    )

    print(f"""
Backfill complete:
  Edges created:       {stats['edges_created']}
  Quizzes linked:      {stats['quizzes_linked']} / {stats['quizzes_scanned']} scanned
  Decks linked:        {stats['decks_linked']} / {stats['decks_scanned']} scanned
  Notes linked:        {stats['notes_linked']} / {stats['notes_scanned']} scanned
  Errors:              {stats['errors']}

  Orphans remaining:   {total_orphans} (expected — no linkable source)
    Topic decks:       {stats['orphan_topic_decks']}
    Other decks:       {stats['orphan_other_decks']}
    Standalone notes:  {stats['orphan_standalone_notes']}
    Unlinked documents:{stats['orphan_unlinked_documents']}
    Quizzes (no src):  {stats['orphan_quizzes']}
""")

    if stats["errors"] > 0:
        print(f"  {stats['errors']} errors occurred. Check logs for details.")
    else:
        print(" No errors.")

    logger.info("backfill_all_links_complete", **stats)


if __name__ == "__main__":
    asyncio.run(main())
