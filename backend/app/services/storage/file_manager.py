"""
DMS FileManager — Template-based document file storage.

Sourced from Paperless-ngx:
  - file_handling.py L44-178: generate_unique_filename(), generate_filename()
  - file_handling.py L11-41:  create_source_path_directory(), delete_empty_directories()
  - consumer.py L496-528:     dual-path file writes (original + archive)
  - signals/handlers.py L71-100: update_filename_and_move_files()

Composes the existing StorageManager — no breaking changes to existing
storage infrastructure. FileManager handles DMS-specific concerns:
  - Template-based path resolution from Document ORM objects
  - Dual-path storage (original + archive)
  - Auto-rename on metadata change
  - Checksum computation
  - Collision avoidance
"""

import hashlib
import logging
import os
import re
import shutil
from datetime import datetime
from pathlib import Path
from typing import Optional

from app.config.storage import storage_config, StorageConfig

logger = logging.getLogger(__name__)


class FileManager:
    """
    Manages document file storage with template-based paths.

    Sourced from Paperless file_handling.py and signals/handlers.py.
    Uses composition — delegates low-level ops to the filesystem
    while adding template resolution, dual-path storage, and auto-rename.
    """

    # Template variables available for filename formatting
    # (from Paperless file_handling.py context dict)
    TEMPLATE_VARIABLES = [
        "correspondent", "document_type", "title",
        "created_year", "created_month", "created_day",
        "added_year", "added_month", "added_day",
        "document_id",
    ]

    def __init__(self, config: Optional[StorageConfig] = None):
        self.config = config or storage_config
        self._ensure_directories()

    def _ensure_directories(self):
        """Create DMS storage directories if they don't exist."""
        for d in [
            self.config.originals_dir,
            self.config.archive_dir,
            self.config.thumbnail_dir,
            self.config.scratch_dir,
            self.config.consumption_dir,
        ]:
            os.makedirs(d, exist_ok=True)

    # ------------------------------------------------------------------
    # Template resolution
    # ------------------------------------------------------------------

    def resolve_path(
        self,
        document,
        template: Optional[str] = None,
    ) -> str:
        """
        Resolve a filename template using document metadata.

        Sourced from Paperless file_handling.py generate_filename() L125-177.

        Args:
            document: Document ORM instance.
            template: Override template string. If None, uses
                      document.storage_path or default_filename_format.

        Returns:
            Relative path (e.g., "2026/ACME Corp/Invoice_March.pdf").
        """
        if template is None:
            # Check StoragePath relationship first, then fall back to default
            sp = getattr(document, "storage_path_rel", None)
            if sp and hasattr(sp, "path"):
                template = sp.path
            else:
                template = self.config.default_filename_format

        context = self._build_template_context(document)

        # Format template with context
        try:
            path = template.format(**context)
        except (KeyError, ValueError, IndexError) as e:
            logger.warning(f"Template '{template}' failed: {e}. Using fallback.")
            path = f"{context['created_year']}/{context['title']}"

        # Sanitize for filesystem safety
        path = self._sanitize_path(path)

        # Add original file extension
        ext = Path(document.filename).suffix if document.filename else ""
        if ext and not path.endswith(ext):
            path = f"{path}{ext}"

        return path

    def resolve_archive_path(
        self,
        document,
        template: Optional[str] = None,
    ) -> str:
        """
        Archive version is always .pdf (PDF/A).

        Sourced from Paperless file_handling.py L56-60.
        """
        path = self.resolve_path(document, template)
        return str(Path(path).with_suffix(".pdf"))

    def _build_template_context(self, document) -> dict:
        """
        Build template variable context from document metadata.

        Maps document fields to template variables.
        """
        # Correspondent name
        correspondent = "Unknown"
        if hasattr(document, "correspondent") and document.correspondent:
            correspondent = document.correspondent.name
        elif hasattr(document, "correspondent_id") and document.correspondent_id:
            correspondent = f"correspondent_{document.correspondent_id}"

        # Document type name
        doc_type = "Uncategorized"
        if hasattr(document, "document_type") and document.document_type:
            doc_type = document.document_type.name
        elif hasattr(document, "document_type_id") and document.document_type_id:
            doc_type = f"type_{document.document_type_id}"

        # Title from filename stem
        title = Path(document.filename).stem if document.filename else "untitled"

        # Created date
        created = getattr(document, "created_date", None)
        now = datetime.utcnow()

        # Added date (created_at timestamp)
        added = getattr(document, "created_at", None) or now

        return {
            "correspondent": correspondent,
            "document_type": doc_type,
            "title": title,
            "created_year": str(created.year if created else now.year),
            "created_month": f"{created.month:02d}" if created else "00",
            "created_day": f"{created.day:02d}" if created else "00",
            "added_year": str(added.year),
            "added_month": f"{added.month:02d}",
            "added_day": f"{added.day:02d}",
            "document_id": str(document.id) if document.id else "0",
        }

    def _sanitize_path(self, path: str) -> str:
        """
        Sanitize a path for filesystem safety.

        Removes invalid characters while preserving directory separators.
        """
        # Replace invalid chars with underscores
        path = re.sub(r'[<>:"|?*]', "_", path)
        # Collapse multiple slashes/underscores
        path = re.sub(r"/{2,}", "/", path)
        path = re.sub(r"_{2,}", "_", path)
        # Remove leading/trailing whitespace per component
        parts = [p.strip() for p in path.split("/") if p.strip()]
        return "/".join(parts)

    # ------------------------------------------------------------------
    # File storage operations
    # ------------------------------------------------------------------

    def store_original(self, source_path: str, document) -> str:
        """
        Move original file to ORIGINALS_DIR using resolved template path.

        Sourced from Paperless consumer.py L496-505.

        Args:
            source_path: Current file location (upload path).
            document: Document ORM instance.

        Returns:
            Relative path stored (to be saved as document.file_path).
        """
        rel_path = self._unique_path(
            self.resolve_path(document),
            self.config.originals_dir,
        )
        dest = os.path.join(self.config.originals_dir, rel_path)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        shutil.move(source_path, dest)
        logger.info(f"Stored original: {rel_path}")
        return rel_path

    def store_archive(self, source_path: str, document) -> str:
        """
        Move archive PDF/A to ARCHIVE_DIR.

        Sourced from Paperless consumer.py L513-523.

        Returns:
            Relative path stored (to be saved as document.archive_path).
        """
        rel_path = self._unique_path(
            self.resolve_archive_path(document),
            self.config.archive_dir,
        )
        dest = os.path.join(self.config.archive_dir, rel_path)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        shutil.move(source_path, dest)
        logger.info(f"Stored archive: {rel_path}")
        return rel_path

    def store_thumbnail(self, source_path: str, document_id: int) -> str:
        """
        Store thumbnail as {id:07d}.webp.

        Sourced from Paperless models.py L39-41.

        Returns:
            Filename stored (e.g., "0000042.webp").
        """
        filename = f"{document_id:07d}.webp"
        dest = os.path.join(self.config.thumbnail_dir, filename)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        shutil.move(source_path, dest)
        logger.info(f"Stored thumbnail: {filename}")
        return filename

    # ------------------------------------------------------------------
    # Auto-rename on metadata change
    # ------------------------------------------------------------------

    def update_filename_and_move_files(self, document, old_values: dict = None):
        """
        When metadata changes that alter the storage path, rename files on disk.

        Sourced from Paperless signals/handlers.py L71-100
        update_filename_and_move_files().

        Args:
            document: Updated Document ORM instance.
            old_values: Dict of old field values (for logging).
        """
        new_path = self._unique_path(
            self.resolve_path(document),
            self.config.originals_dir,
        )

        if document.file_path == new_path:
            return  # No change needed

        old_rel = document.file_path
        logger.info(f"Renaming doc {document.id}: {old_rel} → {new_path}")

        # Move original
        old_full = os.path.join(self.config.originals_dir, old_rel)
        new_full = os.path.join(self.config.originals_dir, new_path)

        if os.path.exists(old_full):
            os.makedirs(os.path.dirname(new_full), exist_ok=True)
            shutil.move(old_full, new_full)
            self._cleanup_empty_dirs(
                os.path.dirname(old_full),
                self.config.originals_dir,
            )

        document.file_path = new_path

        # Move archive if exists
        if document.archive_path:
            new_archive = self._unique_path(
                self.resolve_archive_path(document),
                self.config.archive_dir,
            )
            old_archive_full = os.path.join(
                self.config.archive_dir, document.archive_path
            )
            new_archive_full = os.path.join(
                self.config.archive_dir, new_archive
            )

            if os.path.exists(old_archive_full):
                os.makedirs(os.path.dirname(new_archive_full), exist_ok=True)
                shutil.move(old_archive_full, new_archive_full)
                self._cleanup_empty_dirs(
                    os.path.dirname(old_archive_full),
                    self.config.archive_dir,
                )

            document.archive_path = new_archive

    # ------------------------------------------------------------------
    # Physical file deletion (for trash and sanity check)
    # ------------------------------------------------------------------

    def delete_document_files(
        self,
        file_path: str,
        archive_path: Optional[str] = None,
        document_id: Optional[int] = None,
    ):
        """
        Delete all physical files for a document.

        Sourced from Paperless tasks.py L545-559 (empty_trash inline).

        Args:
            file_path: Relative path in originals_dir.
            archive_path: Relative path in archive_dir (optional).
            document_id: For thumbnail deletion.
        """
        # Original
        orig = os.path.join(self.config.originals_dir, file_path)
        if os.path.exists(orig):
            os.remove(orig)
            self._cleanup_empty_dirs(
                os.path.dirname(orig), self.config.originals_dir
            )
            logger.info(f"Deleted original: {orig}")

        # Archive
        if archive_path:
            arch = os.path.join(self.config.archive_dir, archive_path)
            if os.path.exists(arch):
                os.remove(arch)
                self._cleanup_empty_dirs(
                    os.path.dirname(arch), self.config.archive_dir
                )
                logger.info(f"Deleted archive: {arch}")

        # Thumbnail
        if document_id:
            thumb = os.path.join(
                self.config.thumbnail_dir, f"{document_id:07d}.webp"
            )
            if os.path.exists(thumb):
                os.remove(thumb)
                logger.info(f"Deleted thumbnail: {thumb}")

    # ------------------------------------------------------------------
    # Checksum computation
    # ------------------------------------------------------------------

    @staticmethod
    def compute_checksum(file_path: str) -> str:
        """
        SHA-256 checksum of file (streaming, memory-safe).

        Paperless uses MD5 (consumer.py L525-528); Synapse uses SHA-256.
        """
        sha256 = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                sha256.update(chunk)
        return sha256.hexdigest()

    # ------------------------------------------------------------------
    # Collision handling
    # ------------------------------------------------------------------

    def _unique_path(self, rel_path: str, root_dir: str) -> str:
        """
        Ensure path doesn't collide with existing files.

        Sourced from Paperless file_handling.py L84-99:
        appends _01, _02, etc. to avoid collisions.

        Args:
            rel_path: Proposed relative path.
            root_dir: Root directory to check against.

        Returns:
            Unique relative path.
        """
        full = os.path.join(root_dir, rel_path)
        if not os.path.exists(full):
            return rel_path

        stem = Path(rel_path).stem
        suffix = Path(rel_path).suffix
        parent = str(Path(rel_path).parent)

        counter = 1
        while True:
            new_name = f"{stem}_{counter:02d}{suffix}"
            new_rel = (
                os.path.join(parent, new_name)
                if parent != "."
                else new_name
            )
            if not os.path.exists(os.path.join(root_dir, new_rel)):
                return new_rel
            counter += 1

    # ------------------------------------------------------------------
    # Directory cleanup
    # ------------------------------------------------------------------

    def _cleanup_empty_dirs(self, dir_path: str, root: str):
        """
        Remove empty parent directories up to the storage root.

        Sourced from Paperless file_handling.py L15-41
        delete_empty_directories().
        """
        while dir_path and dir_path != root:
            if not os.path.isdir(dir_path):
                break
            try:
                if not os.listdir(dir_path):
                    os.rmdir(dir_path)
                    dir_path = os.path.dirname(dir_path)
                else:
                    break
            except OSError:
                break
