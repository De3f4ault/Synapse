"""
Backfill DERIVED links for existing quizzes.

Scans all quizzes that have source_ids populated and creates
DERIVED links from each source entity to the quiz.

Uses idempotent upserts so this script is safe to run multiple times.

Usage:
    cd backend
    python -m app.scripts.backfill_quiz_links
"""

import asyncio
import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import AsyncSessionLocal
from app.models.quiz import Quiz
from app.models.link import LinkEntityType, LinkType
from app.services.graph_linker import GraphLinker

logger = structlog.get_logger(__name__)

# Map source_ids keys to LinkEntityType
SOURCE_KEY_MAP = {
    "document_ids": LinkEntityType.DOCUMENT,
    "note_ids": LinkEntityType.NOTE,
    "deck_ids": LinkEntityType.DECK,
    # Add more mappings as new source types appear
}

# Batch size for chunked processing
BATCH_SIZE = 100


async def backfill_quiz_links() -> dict:
    """
    Create DERIVED links for all quizzes with source_ids.

    Returns:
        Summary dict with counts of processed quizzes and links created.
    """
    stats = {
        "quizzes_scanned": 0,
        "quizzes_with_sources": 0,
        "links_created": 0,
        "errors": 0,
    }

    async with AsyncSessionLocal() as session:
        # Stream through all quizzes in batches
        offset = 0
        while True:
            result = await session.execute(
                select(Quiz)
                .where(Quiz.source_ids.isnot(None))
                .where(Quiz.deleted_at.is_(None))
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
                    continue

                stats["quizzes_with_sources"] += 1

                # Build source refs from all known keys
                source_refs = []
                for key, entity_type in SOURCE_KEY_MAP.items():
                    ids = source_ids.get(key, [])
                    if isinstance(ids, list):
                        for entity_id in ids:
                            if isinstance(entity_id, int):
                                source_refs.append((entity_type, entity_id))
                    elif isinstance(ids, int):
                        source_refs.append((entity_type, ids))

                if not source_refs:
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
                    stats["links_created"] += len(links)
                except Exception as e:
                    stats["errors"] += 1
                    logger.error(
                        "backfill_quiz_link_error",
                        quiz_id=quiz.id,
                        error=str(e),
                    )

            offset += BATCH_SIZE
            logger.info(
                "backfill_progress",
                offset=offset,
                quizzes_scanned=stats["quizzes_scanned"],
                links_created=stats["links_created"],
            )

    return stats


async def main():
    logger.info("backfill_quiz_links_start")
    stats = await backfill_quiz_links()
    logger.info("backfill_quiz_links_complete", **stats)
    print(f"\nBackfill complete:")
    print(f"  Quizzes scanned:     {stats['quizzes_scanned']}")
    print(f"  Quizzes with sources: {stats['quizzes_with_sources']}")
    print(f"  Links created:       {stats['links_created']}")
    print(f"  Errors:              {stats['errors']}")


if __name__ == "__main__":
    asyncio.run(main())
