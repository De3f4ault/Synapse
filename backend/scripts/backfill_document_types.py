#!/usr/bin/env python3
"""
Backfill sector → DocumentType for existing documents.

For each unique `sector` value in existing documents:
1. Creates a DocumentType record with name=sector (if it doesn't exist)
2. Sets document.document_type_id = type.id

The `sector` column is left intact for backward compatibility.
Idempotent — safe to run multiple times.

Usage:
    cd backend && python -m scripts.backfill_document_types
"""

import asyncio
import logging
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(message)s")
logger = logging.getLogger("backfill_document_types")


async def backfill():
    from sqlalchemy import select, func, distinct
    from app.db.session import AsyncSessionLocal
    from app.models.document import Document
    from app.models.document_type import DocumentType

    async with AsyncSessionLocal() as db:
        # 1. Find all unique sector values
        result = await db.execute(
            select(distinct(Document.sector)).where(
                Document.sector.isnot(None),
                Document.sector != "",
            )
        )
        sectors = [row[0] for row in result.all()]

        if not sectors:
            logger.info("No sectors found to backfill")
            return 0

        logger.info("Found %d unique sectors: %s", len(sectors), sectors)

        # 2. Create DocumentType for each sector (idempotent)
        sector_to_type = {}
        for sector_name in sectors:
            # Check if already exists
            existing = await db.execute(
                select(DocumentType).where(
                    func.lower(DocumentType.name) == sector_name.lower()
                )
            )
            doc_type = existing.scalars().first()

            if not doc_type:
                doc_type = DocumentType(
                    name=sector_name,
                    match="",
                    matching_algorithm=0,  # MATCH_NONE
                    is_insensitive=True,
                )
                db.add(doc_type)
                await db.flush()
                logger.info("Created DocumentType: %s (id=%d)", sector_name, doc_type.id)
            else:
                logger.debug("DocumentType already exists: %s (id=%d)", sector_name, doc_type.id)

            sector_to_type[sector_name] = doc_type.id

        # 3. Update documents that have a sector but no document_type_id
        updated = 0
        for sector_name, type_id in sector_to_type.items():
            docs_result = await db.execute(
                select(Document).where(
                    Document.sector == sector_name,
                    Document.document_type_id.is_(None),
                )
            )
            docs = docs_result.scalars().all()

            for doc in docs:
                doc.document_type_id = type_id
                updated += 1

        if updated:
            await db.commit()

        logger.info(
            "Backfill complete: %d sectors → %d DocumentTypes, %d documents updated",
            len(sectors), len(sector_to_type), updated,
        )
        return updated


if __name__ == "__main__":
    asyncio.run(backfill())
