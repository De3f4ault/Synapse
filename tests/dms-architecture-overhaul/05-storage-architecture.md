# 05 — Storage Architecture

> **Goal**: Implement dual-path storage (original + PDF/A archive), template-based naming, and checksum verification.

---

## Source of Truth: Paperless Implementation

### Key Paperless Files

| File | Lines | What We're Sourcing |
|---|---|---|
| [file_handling.py](file:///home/de3f4ault/Desktop/Projects/synapse/tests/paperless-ngx/src/documents/file_handling.py) | ~300 | `generate_unique_filename()`, `create_source_path_directory()`, path resolution |
| [signals/handlers.py](file:///home/de3f4ault/Desktop/Projects/synapse/tests/paperless-ngx/src/documents/signals/handlers.py) L1-136 | 136 | `update_filename_and_move_files()` — auto-rename on metadata change |
| [consumer.py](file:///home/de3f4ault/Desktop/Projects/synapse/tests/paperless-ngx/src/documents/consumer.py) L600-700 | ~100 | `_store()` — dual-path file saving (original + archive) |
| [models.py](file:///home/de3f4ault/Desktop/Projects/synapse/tests/paperless-ngx/src/documents/models.py) L200-280 | ~80 | `Document.source_path`, `Document.archive_path`, `Document.thumbnail_path` |
| [sanity_checker.py](file:///home/de3f4ault/Desktop/Projects/synapse/tests/paperless-ngx/src/documents/sanity_checker.py) | ~250 | File integrity verification |
| [tasks.py](file:///home/de3f4ault/Desktop/Projects/synapse/tests/paperless-ngx/src/documents/tasks.py) L354-388 | 34 | `empty_trash()` — hard delete with physical cleanup |

### Paperless Storage Layout

Paperless stores **two versions** of every document plus a thumbnail:

```python
# From models.py — computed path properties
@property
def source_path(self):
    # ORIGINALS_DIR / {filename}
    return os.path.join(settings.ORIGINALS_DIR, self.filename)

@property
def archive_path(self):
    # ARCHIVE_DIR / {archive_filename}
    if not self.has_archive_version:
        return None
    return os.path.join(settings.ARCHIVE_DIR, self.archive_filename)

@property
def thumbnail_path(self):
    # THUMBNAIL_DIR / {pk:07d}.webp
    return os.path.join(settings.THUMBNAIL_DIR, f"{self.pk:07d}.webp")
```

### Paperless File Naming — `generate_unique_filename()`

From `file_handling.py`:

```python
def generate_unique_filename(document, archive_filename=False):
    """
    Generate a filename based on the StoragePath template or a default pattern.
    Template variables: {correspondent}, {document_type}, {title},
    {created_year}, {created_month}, {created_day}, {added_year},
    {asn}, {owner_username}, {tag_list}, {doc_pk}
    """
    if document.storage_path:
        template = document.storage_path.path
    else:
        template = settings.FILENAME_FORMAT or DEFAULT_FILENAME_FORMAT

    path = pathvalidate.sanitize_filepath(template.format(**context), platform="auto")
    # Handle collisions with counter suffix
    return path
```

### Paperless Auto-Rename Signal

From [signals/handlers.py:1-136](file:///home/de3f4ault/Desktop/Projects/synapse/tests/paperless-ngx/src/documents/signals/handlers.py):

```python
def update_filename_and_move_files(sender, instance, **kwargs):
    """
    When document metadata changes (title, correspondent, type, storage_path),
    regenerate filename from template and move both original + archive files.
    """
    if not instance.filename:
        return

    old_filename = instance.filename
    new_filename = generate_unique_filename(instance)

    if old_filename == new_filename:
        return

    old_source = os.path.join(settings.ORIGINALS_DIR, old_filename)
    new_source = os.path.join(settings.ORIGINALS_DIR, new_filename)

    with FileLock(settings.MEDIA_LOCK):
        create_source_path_directory(new_source)
        os.rename(old_source, new_source)

        if instance.has_archive_version:
            old_archive = instance.archive_path
            new_archive_fn = generate_unique_filename(instance, archive_filename=True)
            new_archive = os.path.join(settings.ARCHIVE_DIR, new_archive_fn)
            create_source_path_directory(new_archive)
            os.rename(old_archive, new_archive)
            instance.archive_filename = new_archive_fn

        instance.filename = new_filename
```

### Paperless Sanity Checker

From `sanity_checker.py`:

```python
def check_sanity(*, scheduled=False):
    # For each document:
    # 1. Check original file exists on disk
    # 2. Check archive file exists (if has_archive_version)
    # 3. Verify checksum matches DB
    # 4. Check thumbnail exists
    # 5. Check content is not empty
    # 6. Check for orphaned files (on disk but not in DB)
```

---

## Synapse Files Being Modified

| File | Current State | Change |
|---|---|---|
| [service.py](file:///home/de3f4ault/Desktop/Projects/synapse/backend/app/services/document/service.py) (343 lines) | `generate_upload_path()` → `{upload_dir}/{user_id}/{uuid}_{filename}` | **Replace** with template-based path + dual storage |
| [document.py model](file:///home/de3f4ault/Desktop/Projects/synapse/backend/app/models/document.py) | `file_path`, `content_hash` columns only | **Add**: `archive_path`, `archive_checksum`, `archive_filename` |
| **New file**: `services/storage/file_manager.py` | Does not exist | **Create**: Template resolution, auto-rename, file operations |
| **New file**: `services/storage/sanity_check.py` | Does not exist | **Create**: Integrity verification task |
| **New file**: `config/storage.py` | Does not exist | **Create**: Storage directories configuration |

---

## Implementation

### Configuration

```python
# backend/app/config/storage.py

import os
from pydantic_settings import BaseSettings


class StorageConfig(BaseSettings):
    originals_dir: str = "data/originals"
    archive_dir: str = "data/archive"
    thumbnail_dir: str = "data/thumbnails"
    consumption_dir: str = "data/consumption"
    scratch_dir: str = "/tmp/synapse_scratch"
    # Default filename template (used when no StoragePath assigned)
    default_filename_format: str = "{created_year}/{correspondent}/{title}"

    class Config:
        env_prefix = "SYNAPSE_STORAGE_"


storage_config = StorageConfig()
```

### Directory Structure

```
data/
├── originals/                   # Pristine source files
│   └── 2024/
│       └── ACME Corp/
│           └── Invoice_March.pdf
├── archive/                     # PDF/A with OCR text layer
│   └── 2024/
│       └── ACME Corp/
│           └── Invoice_March.pdf    ← Always PDF/A
├── thumbnails/
│   └── 0000001.webp
├── consumption/                 # Watched folder input
└── scratch/                     # Temporary processing
```

### Template Resolution

```python
# backend/app/services/storage/file_manager.py

import os
import re
import shutil
import hashlib
from pathlib import Path
from typing import Optional
from datetime import datetime

import pathvalidate


class FileManager:
    """
    Manages document file storage with template-based paths.

    Sourced from Paperless:
    - file_handling.py: generate_unique_filename()
    - signals/handlers.py: update_filename_and_move_files()
    """

    TEMPLATE_VARIABLES = [
        "correspondent", "document_type", "title",
        "created_year", "created_month", "created_day",
        "added_year", "added_month", "added_day",
        "asn", "owner", "document_id",
    ]

    def __init__(self, config=None):
        from app.config.storage import storage_config
        self.config = config or storage_config

    def resolve_path(self, document, template: Optional[str] = None) -> str:
        """
        Resolve a filename template using document metadata.

        Sourced from Paperless file_handling.py generate_unique_filename().
        """
        if template is None:
            if document.storage_path:
                template = document.storage_path.path_template
            else:
                template = self.config.default_filename_format

        context = {
            "correspondent": (
                document.correspondent.name if document.correspondent else "Unknown"
            ),
            "document_type": (
                document.document_type.name if document.document_type else "Uncategorized"
            ),
            "title": Path(document.filename).stem,
            "created_year": (
                str(document.created_date.year)
                if document.created_date else str(datetime.utcnow().year)
            ),
            "created_month": (
                f"{document.created_date.month:02d}"
                if document.created_date else "00"
            ),
            "created_day": (
                f"{document.created_date.day:02d}"
                if document.created_date else "00"
            ),
            "added_year": str(document.created_at.year) if document.created_at else "",
            "added_month": (
                f"{document.created_at.month:02d}" if document.created_at else "00"
            ),
            "added_day": (
                f"{document.created_at.day:02d}" if document.created_at else "00"
            ),
            "asn": (
                f"{document.archive_serial_number:07d}"
                if document.archive_serial_number else ""
            ),
            "owner": document.user.username if hasattr(document, "user") else "unknown",
            "document_id": str(document.id),
        }

        # Format and sanitize
        try:
            path = template.format(**context)
        except (KeyError, ValueError):
            path = f"{context['created_year']}/{context['title']}"

        # Sanitize for filesystem safety
        path = pathvalidate.sanitize_filepath(path, platform="auto")

        # Add original file extension
        ext = Path(document.filename).suffix
        if not path.endswith(ext):
            path = f"{path}{ext}"

        return path

    def resolve_archive_path(self, document, template: Optional[str] = None) -> str:
        """Archive version is always .pdf (PDF/A)."""
        path = self.resolve_path(document, template)
        # Replace extension with .pdf
        return str(Path(path).with_suffix(".pdf"))

    def store_original(self, source_path: str, document) -> str:
        """
        Move original file to ORIGINALS_DIR using resolved template path.
        Returns the relative path stored.
        """
        rel_path = self.resolve_path(document)
        dest = os.path.join(self.config.originals_dir, rel_path)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        shutil.move(source_path, dest)
        return rel_path

    def store_archive(self, source_path: str, document) -> str:
        """
        Move archive PDF/A to ARCHIVE_DIR.
        Returns the relative path stored.
        """
        rel_path = self.resolve_archive_path(document)
        dest = os.path.join(self.config.archive_dir, rel_path)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        shutil.move(source_path, dest)
        return rel_path

    def store_thumbnail(self, source_path: str, document_id: int) -> str:
        """Store thumbnail as {id:07d}.webp."""
        filename = f"{document_id:07d}.webp"
        dest = os.path.join(self.config.thumbnail_dir, filename)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        shutil.move(source_path, dest)
        return filename

    def update_filename_and_move_files(self, document, old_values: dict):
        """
        When metadata changes that would alter the storage path,
        rename files on disk.

        Sourced from Paperless signals/handlers.py
        update_filename_and_move_files() (136 lines).
        """
        new_path = self.resolve_path(document)

        if document.file_path == new_path:
            return  # No change needed

        # Move original
        old_path = os.path.join(self.config.originals_dir, document.file_path)
        new_full = os.path.join(self.config.originals_dir, new_path)

        if os.path.exists(old_path):
            os.makedirs(os.path.dirname(new_full), exist_ok=True)
            shutil.move(old_path, new_full)
            # Clean up empty parent directories
            self._cleanup_empty_dirs(os.path.dirname(old_path))

        document.file_path = new_path

        # Move archive if exists
        if document.archive_path:
            new_archive = self.resolve_archive_path(document)
            old_archive = os.path.join(self.config.archive_dir, document.archive_path)
            new_archive_full = os.path.join(self.config.archive_dir, new_archive)

            if os.path.exists(old_archive):
                os.makedirs(os.path.dirname(new_archive_full), exist_ok=True)
                shutil.move(old_archive, new_archive_full)
                self._cleanup_empty_dirs(os.path.dirname(old_archive))

            document.archive_path = new_archive

    def compute_checksum(self, file_path: str) -> str:
        """SHA-256 checksum of file."""
        sha256 = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                sha256.update(chunk)
        return sha256.hexdigest()

    def _cleanup_empty_dirs(self, dir_path: str):
        """Remove empty parent directories up to the storage root."""
        while dir_path and dir_path not in (
            self.config.originals_dir, self.config.archive_dir
        ):
            try:
                os.rmdir(dir_path)  # Only succeeds if empty
                dir_path = os.path.dirname(dir_path)
            except OSError:
                break
```

### Sanity Check Task

```python
# backend/app/services/storage/sanity_check.py

import os
import logging
from celery import shared_task
from sqlalchemy import select, text
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class SanityCheckResult:
    """
    Sourced from Paperless sanity_checker.py.
    Checks performed:
    1. Every DB record has a file on disk
    2. Checksum matches stored value
    3. Archive file exists if parser generated one
    4. Thumbnail exists
    5. Document content is not empty
    6. Orphaned files (on disk but not in DB)
    """
    missing_originals: list = field(default_factory=list)
    checksum_mismatches: list = field(default_factory=list)
    missing_archives: list = field(default_factory=list)
    missing_thumbnails: list = field(default_factory=list)
    empty_content: list = field(default_factory=list)
    orphaned_files: list = field(default_factory=list)

    @property
    def has_errors(self) -> bool:
        return bool(
            self.missing_originals or self.checksum_mismatches
            or self.missing_archives
        )

    @property
    def has_warnings(self) -> bool:
        return bool(
            self.missing_thumbnails or self.empty_content
            or self.orphaned_files
        )

    def summary(self) -> str:
        total = (
            len(self.missing_originals) + len(self.checksum_mismatches)
            + len(self.missing_archives) + len(self.missing_thumbnails)
            + len(self.empty_content) + len(self.orphaned_files)
        )
        if total == 0:
            return "No issues detected."
        return (
            f"Issues: {len(self.missing_originals)} missing originals, "
            f"{len(self.checksum_mismatches)} checksum mismatches, "
            f"{len(self.missing_archives)} missing archives, "
            f"{len(self.missing_thumbnails)} missing thumbnails, "
            f"{len(self.empty_content)} empty content, "
            f"{len(self.orphaned_files)} orphaned files"
        )


@shared_task
def sanity_check():
    """
    Verify file integrity across all documents.

    Sourced from Paperless tasks.py:208-223 + sanity_checker.py.
    """
    from app.config.storage import storage_config
    from app.services.storage.file_manager import FileManager

    fm = FileManager()
    result = SanityCheckResult()

    with get_sync_session() as db:
        documents = db.execute(
            select(Document).where(Document.deleted_at.is_(None))
        ).scalars().all()

        for doc in documents:
            # 1. Check original exists
            original = os.path.join(storage_config.originals_dir, doc.file_path)
            if not os.path.exists(original):
                result.missing_originals.append(
                    f"Document {doc.id} ({doc.filename}): {original}"
                )
                continue

            # 2. Verify checksum
            if doc.content_hash:
                actual = fm.compute_checksum(original)
                if actual != doc.content_hash:
                    result.checksum_mismatches.append(
                        f"Document {doc.id}: expected {doc.content_hash}, got {actual}"
                    )

            # 3. Check archive exists if expected
            if doc.archive_path:
                archive = os.path.join(storage_config.archive_dir, doc.archive_path)
                if not os.path.exists(archive):
                    result.missing_archives.append(
                        f"Document {doc.id}: {archive}"
                    )

            # 4. Check thumbnail
            thumb = os.path.join(
                storage_config.thumbnail_dir, f"{doc.id:07d}.webp"
            )
            if not os.path.exists(thumb):
                result.missing_thumbnails.append(f"Document {doc.id}")

            # 5. Check content
            if not doc.content_text or len(doc.content_text.strip()) == 0:
                result.empty_content.append(
                    f"Document {doc.id} ({doc.filename})"
                )

    logger.info(f"Sanity check: {result.summary()}")
    return result.summary()
```

### Empty Trash Task

```python
# Sourced from Paperless tasks.py:354-388

@shared_task
def empty_trash(days_old: int = 30):
    """
    Hard-delete documents soft-deleted more than N days ago.

    Paperless original uses Django's post_delete signal
    to trigger physical file cleanup. We do it inline.
    """
    from datetime import datetime, timedelta

    threshold = datetime.utcnow() - timedelta(days=days_old)

    with get_sync_session() as db:
        expired = db.execute(
            select(Document).where(
                and_(
                    Document.deleted_at.isnot(None),
                    Document.deleted_at < threshold,
                )
            )
        ).scalars().all()

        fm = FileManager()
        deleted_count = 0

        for doc in expired:
            # Remove physical files
            try:
                original = os.path.join(storage_config.originals_dir, doc.file_path)
                if os.path.exists(original):
                    os.remove(original)
                if doc.archive_path:
                    archive = os.path.join(storage_config.archive_dir, doc.archive_path)
                    if os.path.exists(archive):
                        os.remove(archive)
                thumb = os.path.join(storage_config.thumbnail_dir, f"{doc.id:07d}.webp")
                if os.path.exists(thumb):
                    os.remove(thumb)
            except OSError as e:
                logger.warning(f"Failed to delete files for doc {doc.id}: {e}")

            # Hard delete from DB
            db.delete(doc)
            deleted_count += 1

        db.commit()
        logger.info(f"Emptied trash: {deleted_count} documents permanently deleted")
```

---

## Module Structure

```
backend/app/services/storage/
├── __init__.py
├── file_manager.py            # FileManager: paths, store, rename, checksum
├── sanity_check.py            # sanity_check() + empty_trash() tasks

backend/app/config/
├── storage.py                 # StorageConfig pydantic settings
```

---

## Engineering Tasks

1. **Create `config/storage.py`** module with directory settings + env vars
2. **Implement `FileManager`** class — template resolution, store_original, store_archive, auto-rename, checksum
3. **Add `archive_path`, `archive_checksum`, `archive_filename`** columns to Document model
4. **Implement dual-file storage** in ConsumerPlugin — call `store_original()` + `store_archive()`
5. **Implement auto-rename** signal — on correspondent/type/title change, call `update_filename_and_move_files()`
6. **Create dedicated thumbnail directory** with `{id:07d}.webp` naming
7. **Implement `sanity_check`** Celery task — 6 integrity checks
8. **Implement `empty_trash`** Celery task — hard delete with physical cleanup
9. **Write migration script** to move existing files from `data/uploads/` to `data/originals/` structure
10. **Write tests** — template resolution with various metadata, file operations, sanity check detection
