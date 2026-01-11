#!/usr/bin/env python3
"""Backfill embeddings for existing chat messages.

This script generates embeddings for all assistant messages that
don't have embeddings yet, using the Q+A pair embedding strategy.

Usage:
    python -m scripts.backfill_chat_embeddings

Or with options:
    python -m scripts.backfill_chat_embeddings --batch-size 50 --dry-run
"""

import asyncio
import argparse
from typing import Optional
import structlog

# Configure logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.dev.ConsoleRenderer(),
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
)

logger = structlog.get_logger(__name__)


async def backfill_chat_embeddings(
    batch_size: int = 100,
    dry_run: bool = False,
    limit: Optional[int] = None,
) -> dict:
    """
    Backfill embeddings for assistant messages without embeddings.

    Args:
        batch_size: Number of messages to process at a time
        dry_run: If True, don't actually write embeddings
        limit: Maximum number of messages to process (None = all)

    Returns:
        Dict with statistics about the backfill
    """
    from sqlalchemy import text
    from app.db.session import async_session_factory
    from app.services.search.chat_embedding import generate_chat_embedding

    stats = {
        "total_found": 0,
        "processed": 0,
        "succeeded": 0,
        "failed": 0,
        "skipped": 0,
    }

    async with async_session_factory() as db:
        # Count messages needing embeddings
        count_result = await db.execute(
            text("""
                SELECT COUNT(*) 
                FROM developer_schema.chat_messages m
                WHERE m.role = 'assistant'
                  AND m.is_active = true
                  AND m.embedding IS NULL
            """)
        )
        total = count_result.scalar()
        stats["total_found"] = total

        if limit:
            total = min(total, limit)

        logger.info(
            "backfill_starting", total_messages=total, batch_size=batch_size, dry_run=dry_run
        )

        if total == 0:
            logger.info("no_messages_to_backfill")
            return stats

        # Process in batches
        offset = 0
        while offset < total:
            # Fetch batch of messages with their parent (user question) and session
            result = await db.execute(
                text("""
                    SELECT 
                        m.id,
                        m.content,
                        p.content as parent_content,
                        s.title as session_title
                    FROM developer_schema.chat_messages m
                    LEFT JOIN developer_schema.chat_messages p ON m.parent_message_id = p.id
                    LEFT JOIN developer_schema.chat_sessions s ON m.session_id = s.id
                    WHERE m.role = 'assistant'
                      AND m.is_active = true
                      AND m.embedding IS NULL
                    ORDER BY m.id
                    LIMIT :limit OFFSET :offset
                """),
                {"limit": batch_size, "offset": offset},
            )

            messages = result.fetchall()
            if not messages:
                break

            logger.info(
                "processing_batch", batch_num=offset // batch_size + 1, messages=len(messages)
            )

            for msg in messages:
                stats["processed"] += 1

                try:
                    # Generate embedding
                    embedding = generate_chat_embedding(
                        content=msg.content,
                        parent_content=msg.parent_content,
                        session_title=msg.session_title,
                        is_assistant=True,
                    )

                    if not dry_run:
                        # Format for PostgreSQL
                        embedding_str = "[" + ",".join(map(str, embedding)) + "]"

                        # Update message
                        await db.execute(
                            text("""
                                UPDATE developer_schema.chat_messages 
                                SET embedding = CAST(:embedding AS vector(384))
                                WHERE id = :message_id
                            """),
                            {"embedding": embedding_str, "message_id": msg.id},
                        )

                    stats["succeeded"] += 1

                    if stats["succeeded"] % 50 == 0:
                        logger.info("progress", succeeded=stats["succeeded"], total=total)

                except Exception as e:
                    stats["failed"] += 1
                    logger.warning("embedding_failed", message_id=msg.id, error=str(e)[:100])

            # Commit after each batch
            if not dry_run:
                await db.commit()

            offset += batch_size

    logger.info(
        "backfill_complete",
        total_found=stats["total_found"],
        processed=stats["processed"],
        succeeded=stats["succeeded"],
        failed=stats["failed"],
    )

    return stats


def main():
    parser = argparse.ArgumentParser(description="Backfill chat message embeddings")
    parser.add_argument("--batch-size", type=int, default=100, help="Batch size for processing")
    parser.add_argument("--dry-run", action="store_true", help="Don't write embeddings, just count")
    parser.add_argument("--limit", type=int, default=None, help="Maximum messages to process")

    args = parser.parse_args()

    stats = asyncio.run(
        backfill_chat_embeddings(
            batch_size=args.batch_size,
            dry_run=args.dry_run,
            limit=args.limit,
        )
    )

    print("\n=== Backfill Complete ===")
    print(f"Total found:  {stats['total_found']}")
    print(f"Processed:    {stats['processed']}")
    print(f"Succeeded:    {stats['succeeded']}")
    print(f"Failed:       {stats['failed']}")


if __name__ == "__main__":
    main()
