"""
High-level storage management operations.

Provides application-specific file operations including
document storage, media handling, and temporary files.
"""

import logging
import uuid
from pathlib import Path
from typing import Optional, Union, BinaryIO
from datetime import datetime
import mimetypes

from .local import LocalStorage

logger = logging.getLogger(__name__)


class StorageManager:
    """
    High-level file storage manager.

    Handles application-specific storage operations with
    organized directory structure and file naming.
    """

    def __init__(self, storage: LocalStorage):
        """
        Initialize storage manager.

        Args:
            storage: LocalStorage instance
        """
        self.storage = storage

        # Create standard directories
        self._ensure_directories()
        logger.debug("Initialized StorageManager")

    def _ensure_directories(self) -> None:
        """Create standard storage directories."""
        directories = [
            "documents",
            "media/images",
            "media/videos",
            "media/audio",
            "temp",
            "uploads",
            "exports",
        ]

        for directory in directories:
            self.storage.create_directory(directory)

    def _generate_filename(
        self,
        original_filename: Optional[str] = None,
        extension: Optional[str] = None
    ) -> str:
        """
        Generate unique filename.

        Args:
            original_filename: Original filename (optional)
            extension: File extension (optional)

        Returns:
            str: Generated filename
        """
        unique_id = uuid.uuid4().hex

        if original_filename:
            ext = Path(original_filename).suffix
            return f"{unique_id}{ext}"
        elif extension:
            ext = extension if extension.startswith('.') else f".{extension}"
            return f"{unique_id}{ext}"
        else:
            return unique_id

    def _get_category_path(self, category: str) -> str:
        """
        Get storage path for category.

        Args:
            category: File category

        Returns:
            str: Category directory path
        """
        category_map = {
            "document": "documents",
            "image": "media/images",
            "video": "media/videos",
            "audio": "media/audio",
            "temp": "temp",
            "upload": "uploads",
            "export": "exports",
        }

        return category_map.get(category, "uploads")

    def save_file(
        self,
        content: Union[bytes, str],
        filename: Optional[str] = None,
        category: str = "upload",
        subdirectory: Optional[str] = None
    ) -> Optional[str]:
        """
        Save file to storage.

        Args:
            content: File content
            filename: Filename (generated if None)
            category: File category
            subdirectory: Optional subdirectory

        Returns:
            str | None: Saved file path or None on error
        """
        try:
            # Generate filename if not provided
            if filename is None:
                filename = self._generate_filename()
            else:
                filename = self._generate_filename(original_filename=filename)

            # Build file path
            path_parts = [self._get_category_path(category)]
            if subdirectory:
                path_parts.append(subdirectory)
            path_parts.append(filename)

            file_path = str(Path(*path_parts))

            # Save file
            if self.storage.write(file_path, content):
                logger.info(f"Saved file: {file_path}")
                return file_path

            return None

        except Exception as e:
            logger.error(f"Error saving file: {e}")
            return None

    def save_document(
        self,
        content: Union[bytes, str],
        document_id: str,
        filename: Optional[str] = None
    ) -> Optional[str]:
        """
        Save document file.

        Args:
            content: Document content
            document_id: Document ID
            filename: Filename (optional)

        Returns:
            str | None: Saved file path
        """
        return self.save_file(
            content,
            filename=filename,
            category="document",
            subdirectory=document_id
        )

    def save_upload(
        self,
        content: Union[bytes, str],
        user_id: str,
        filename: Optional[str] = None
    ) -> Optional[str]:
        """
        Save uploaded file.

        Args:
            content: File content
            user_id: User ID
            filename: Original filename (optional)

        Returns:
            str | None: Saved file path
        """
        return self.save_file(
            content,
            filename=filename,
            category="upload",
            subdirectory=user_id
        )

    def save_temp_file(
        self,
        content: Union[bytes, str],
        extension: Optional[str] = None
    ) -> Optional[str]:
        """
        Save temporary file.

        Args:
            content: File content
            extension: File extension

        Returns:
            str | None: Temporary file path
        """
        filename = self._generate_filename(extension=extension)
        return self.save_file(content, filename=filename, category="temp")

    def get_file(self, file_path: str, binary: bool = False) -> Optional[Union[str, bytes]]:
        """
        Get file content.

        Args:
            file_path: File path
            binary: Read as binary

        Returns:
            str | bytes | None: File content
        """
        return self.storage.read(file_path, binary=binary)

    def delete_file(self, file_path: str) -> bool:
        """
        Delete file.

        Args:
            file_path: File path

        Returns:
            bool: True if successful
        """
        return self.storage.delete(file_path)

    def file_exists(self, file_path: str) -> bool:
        """
        Check if file exists.

        Args:
            file_path: File path

        Returns:
            bool: True if exists
        """
        return self.storage.exists(file_path)

    def get_file_info(self, file_path: str) -> Optional[dict]:
        """
        Get file information.

        Args:
            file_path: File path

        Returns:
            dict | None: File information
        """
        if not self.storage.exists(file_path):
            return None

        size = self.storage.get_size(file_path)

        # Get MIME type
        mime_type, _ = mimetypes.guess_type(file_path)

        return {
            "path": file_path,
            "size": size,
            "mime_type": mime_type,
            "url": self.storage.get_url(file_path),
        }

    def list_user_files(self, user_id: str, category: str = "upload") -> list[Path]:
        """
        List files for a user.

        Args:
            user_id: User ID
            category: File category

        Returns:
            list[Path]: List of file paths
        """
        directory = f"{self._get_category_path(category)}/{user_id}"
        return self.storage.list_files(directory)

    def cleanup_temp_files(self, older_than_hours: int = 24) -> int:
        """
        Clean up old temporary files.

        Args:
            older_than_hours: Delete files older than this

        Returns:
            int: Number of files deleted
        """
        temp_files = self.storage.list_files("temp")
        deleted = 0

        current_time = datetime.now().timestamp()
        cutoff_time = current_time - (older_than_hours * 3600)

        for file_path in temp_files:
            full_path = self.storage._resolve_path(file_path)

            if full_path.stat().st_mtime < cutoff_time:
                if self.storage.delete(file_path):
                    deleted += 1

        logger.info(f"Cleaned up {deleted} temporary files")
        return deleted
