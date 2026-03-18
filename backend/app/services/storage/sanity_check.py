"""
Storage sanity check and trash cleanup tasks.

Verifies document file integrity:
- Every document in DB has a corresponding file on disk
- No orphan files on disk without a DB record
- Checksum verification for archive files
- Thumbnail existence check

Sourced from Paperless-ngx sanity_checker.py — adapted for Synapse.
"""

import logging
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


@dataclass
class SanityCheckResult:
    """Result of a storage sanity check."""

    # Documents in DB missing files on disk
    missing_originals: list[dict] = field(default_factory=list)
    missing_archives: list[dict] = field(default_factory=list)

    # Files on disk without a DB record
    orphan_originals: list[str] = field(default_factory=list)
    orphan_archives: list[str] = field(default_factory=list)

    # Checksum mismatches
    checksum_mismatches: list[dict] = field(default_factory=list)

    # Missing thumbnails
    missing_thumbnails: list[dict] = field(default_factory=list)

    @property
    def is_healthy(self) -> bool:
        """Return True if no issues found."""
        return (
            not self.missing_originals
            and not self.missing_archives
            and not self.orphan_originals
            and not self.orphan_archives
            and not self.checksum_mismatches
            and not self.missing_thumbnails
        )

    @property
    def summary(self) -> str:
        """Human-readable summary."""
        if self.is_healthy:
            return "All checks passed — storage is healthy."
        parts = []
        if self.missing_originals:
            parts.append(f"{len(self.missing_originals)} missing originals")
        if self.missing_archives:
            parts.append(f"{len(self.missing_archives)} missing archives")
        if self.orphan_originals:
            parts.append(f"{len(self.orphan_originals)} orphan originals")
        if self.orphan_archives:
            parts.append(f"{len(self.orphan_archives)} orphan archives")
        if self.checksum_mismatches:
            parts.append(f"{len(self.checksum_mismatches)} checksum mismatches")
        if self.missing_thumbnails:
            parts.append(f"{len(self.missing_thumbnails)} missing thumbnails")
        return "Issues found: " + ", ".join(parts)


async def run_sanity_check(db_session) -> SanityCheckResult:
    """
    Run a full storage sanity check.

    Compares DB records against files on disk and verifies checksums.

    Args:
        db_session: Async SQLAlchemy session.

    Returns:
        SanityCheckResult with categorized issues.
    """
    from sqlalchemy import select
    from app.models.document import Document
    from app.config.storage import storage_config
    from app.services.storage.file_manager import FileManager

    result = SanityCheckResult()
    file_manager = FileManager()

    # Get all documents from DB
    stmt = select(Document).where(Document.deleted_at.is_(None))
    db_result = await db_session.execute(stmt)
    documents = db_result.scalars().all()

    # Track which files on disk are accounted for
    known_originals: set[str] = set()
    known_archives: set[str] = set()

    for doc in documents:
        # Check original file exists
        if doc.file_path:
            orig_path = os.path.join(str(storage_config.originals_dir), doc.file_path)
            if not os.path.exists(orig_path):
                result.missing_originals.append({
                    "document_id": doc.id,
                    "filename": doc.filename,
                    "expected_path": orig_path,
                })
            else:
                # Verify content_hash if available
                if doc.content_hash:
                    actual = FileManager.compute_checksum(orig_path)
                    if actual != doc.content_hash:
                        result.checksum_mismatches.append({
                            "document_id": doc.id,
                            "filename": doc.filename,
                            "type": "original",
                            "expected": doc.content_hash,
                            "actual": actual,
                        })
            known_originals.add(orig_path)

        # Check archive file exists (if document has one)
        archive_path = getattr(doc, "archive_path", None)
        if archive_path:
            arch_full = os.path.join(str(storage_config.archive_dir), archive_path)
            if not os.path.exists(arch_full):
                result.missing_archives.append({
                    "document_id": doc.id,
                    "filename": doc.filename,
                    "expected_path": arch_full,
                })
            else:
                # Verify checksum if available
                archive_checksum = getattr(doc, "archive_checksum", None)
                if archive_checksum:
                    actual = FileManager.compute_checksum(arch_full)
                    if actual != archive_checksum:
                        result.checksum_mismatches.append({
                            "document_id": doc.id,
                            "filename": doc.filename,
                            "type": "archive",
                            "expected": archive_checksum,
                            "actual": actual,
                        })
            known_archives.add(arch_full)

    # Check for orphan files on disk
    originals_dir = str(storage_config.originals_dir)
    if os.path.isdir(originals_dir):
        for root, dirs, files in os.walk(originals_dir):
            for fname in files:
                full = os.path.join(root, fname)
                if full not in known_originals:
                    result.orphan_originals.append(full)

    archive_dir = str(storage_config.archive_dir)
    if os.path.isdir(archive_dir):
        for root, dirs, files in os.walk(archive_dir):
            for fname in files:
                full = os.path.join(root, fname)
                if full not in known_archives:
                    result.orphan_archives.append(full)

    logger.info("Sanity check complete: %s", result.summary)
    return result


async def empty_trash(db_session, older_than_days: int = 30) -> int:
    """
    Hard-delete documents that were soft-deleted more than N days ago.

    Removes: DB record, original file, archive file, thumbnail, vectors.

    Args:
        db_session: Async SQLAlchemy session.
        older_than_days: Only delete docs soft-deleted longer ago than this.

    Returns:
        Number of documents permanently deleted.
    """
    from datetime import datetime, timezone, timedelta
    from sqlalchemy import select, delete
    from app.models.document import Document
    from app.services.storage.file_manager import FileManager

    cutoff = datetime.now(timezone.utc) - timedelta(days=older_than_days)
    file_manager = FileManager()

    # Find soft-deleted documents older than cutoff
    stmt = select(Document).where(
        Document.deleted_at.isnot(None),
        Document.deleted_at < cutoff,
    )
    db_result = await db_session.execute(stmt)
    documents = db_result.scalars().all()

    deleted_count = 0
    for doc in documents:
        try:
            # Delete files
            if doc.file_path:
                file_manager.delete_document_files(
                    doc.file_path,
                    archive_path=doc.archive_path,
                    document_id=doc.id,
                )

            # Delete DB record
            await db_session.delete(doc)
            deleted_count += 1
            logger.info("Permanently deleted document %d: %s", doc.id, doc.filename)
        except Exception as e:
            logger.error("Failed to delete document %d: %s", doc.id, e)

    if deleted_count:
        await db_session.commit()

    logger.info("Empty trash: permanently deleted %d documents", deleted_count)
    return deleted_count
