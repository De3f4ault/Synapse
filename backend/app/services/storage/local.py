"""
Local filesystem storage backend.

Handles file operations on local disk with proper
error handling and path management.
"""

import logging
import shutil
from pathlib import Path
from typing import Optional, BinaryIO, Union
import os

logger = logging.getLogger(__name__)


class LocalStorage:
    """
    Local filesystem storage backend.

    Provides file storage operations on local disk with
    directory management and file organization.
    """

    def __init__(
        self,
        base_path: Union[str, Path],
        create_dirs: bool = True
    ):
        """
        Initialize local storage.

        Args:
            base_path: Base directory for storage
            create_dirs: Create base directory if it doesn't exist
        """
        self.base_path = Path(base_path).resolve()

        if create_dirs:
            self.base_path.mkdir(parents=True, exist_ok=True)

        logger.info(f"Initialized LocalStorage at: {self.base_path}")

    def _resolve_path(self, file_path: Union[str, Path]) -> Path:
        """
        Resolve file path relative to base path.

        Args:
            file_path: Relative file path

        Returns:
            Path: Absolute resolved path

        Raises:
            ValueError: If path tries to escape base directory
        """
        full_path = (self.base_path / file_path).resolve()

        # Security check: ensure path is within base directory
        try:
            full_path.relative_to(self.base_path)
        except ValueError:
            raise ValueError(
                f"Path {file_path} escapes base directory"
            )

        return full_path

    def exists(self, file_path: Union[str, Path]) -> bool:
        """
        Check if file exists.

        Args:
            file_path: File path

        Returns:
            bool: True if file exists
        """
        try:
            full_path = self._resolve_path(file_path)
            return full_path.exists()
        except Exception as e:
            logger.error(f"Error checking file existence: {e}")
            return False

    def write(
        self,
        file_path: Union[str, Path],
        content: Union[bytes, str],
        overwrite: bool = False
    ) -> bool:
        """
        Write content to file.

        Args:
            file_path: Destination file path
            content: File content (bytes or string)
            overwrite: Allow overwriting existing files

        Returns:
            bool: True if successful
        """
        try:
            full_path = self._resolve_path(file_path)

            # Check if file exists
            if full_path.exists() and not overwrite:
                logger.warning(f"File exists and overwrite=False: {file_path}")
                return False

            # Create parent directories
            full_path.parent.mkdir(parents=True, exist_ok=True)

            # Write content
            if isinstance(content, str):
                full_path.write_text(content, encoding='utf-8')
            else:
                full_path.write_bytes(content)

            logger.debug(f"Wrote file: {file_path}")
            return True

        except Exception as e:
            logger.error(f"Error writing file '{file_path}': {e}")
            return False

    def read(
        self,
        file_path: Union[str, Path],
        binary: bool = False
    ) -> Optional[Union[str, bytes]]:
        """
        Read file content.

        Args:
            file_path: File path to read
            binary: Read as binary

        Returns:
            str | bytes | None: File content or None on error
        """
        try:
            full_path = self._resolve_path(file_path)

            if not full_path.exists():
                logger.warning(f"File not found: {file_path}")
                return None

            if binary:
                return full_path.read_bytes()
            else:
                return full_path.read_text(encoding='utf-8')

        except Exception as e:
            logger.error(f"Error reading file '{file_path}': {e}")
            return None

    def delete(self, file_path: Union[str, Path]) -> bool:
        """
        Delete file.

        Args:
            file_path: File path to delete

        Returns:
            bool: True if successful
        """
        try:
            full_path = self._resolve_path(file_path)

            if full_path.exists():
                if full_path.is_file():
                    full_path.unlink()
                    logger.debug(f"Deleted file: {file_path}")
                else:
                    logger.warning(f"Path is not a file: {file_path}")
                    return False
                return True
            else:
                logger.warning(f"File not found: {file_path}")
                return False

        except Exception as e:
            logger.error(f"Error deleting file '{file_path}': {e}")
            return False

    def copy(
        self,
        source: Union[str, Path],
        destination: Union[str, Path],
        overwrite: bool = False
    ) -> bool:
        """
        Copy file.

        Args:
            source: Source file path
            destination: Destination file path
            overwrite: Allow overwriting existing files

        Returns:
            bool: True if successful
        """
        try:
            src_path = self._resolve_path(source)
            dest_path = self._resolve_path(destination)

            if not src_path.exists():
                logger.warning(f"Source file not found: {source}")
                return False

            if dest_path.exists() and not overwrite:
                logger.warning(f"Destination exists and overwrite=False: {destination}")
                return False

            # Create parent directories
            dest_path.parent.mkdir(parents=True, exist_ok=True)

            shutil.copy2(src_path, dest_path)
            logger.debug(f"Copied file: {source} -> {destination}")
            return True

        except Exception as e:
            logger.error(f"Error copying file: {e}")
            return False

    def move(
        self,
        source: Union[str, Path],
        destination: Union[str, Path],
        overwrite: bool = False
    ) -> bool:
        """
        Move file.

        Args:
            source: Source file path
            destination: Destination file path
            overwrite: Allow overwriting existing files

        Returns:
            bool: True if successful
        """
        try:
            src_path = self._resolve_path(source)
            dest_path = self._resolve_path(destination)

            if not src_path.exists():
                logger.warning(f"Source file not found: {source}")
                return False

            if dest_path.exists() and not overwrite:
                logger.warning(f"Destination exists and overwrite=False: {destination}")
                return False

            # Create parent directories
            dest_path.parent.mkdir(parents=True, exist_ok=True)

            shutil.move(str(src_path), str(dest_path))
            logger.debug(f"Moved file: {source} -> {destination}")
            return True

        except Exception as e:
            logger.error(f"Error moving file: {e}")
            return False

    def list_files(
        self,
        directory: Union[str, Path] = ".",
        pattern: str = "*",
        recursive: bool = False
    ) -> list[Path]:
        """
        List files in directory.

        Args:
            directory: Directory to list
            pattern: File pattern (glob)
            recursive: Recursive listing

        Returns:
            list[Path]: List of file paths (relative to base_path)
        """
        try:
            dir_path = self._resolve_path(directory)

            if not dir_path.exists():
                logger.warning(f"Directory not found: {directory}")
                return []

            if recursive:
                files = dir_path.rglob(pattern)
            else:
                files = dir_path.glob(pattern)

            # Return relative paths
            return [
                f.relative_to(self.base_path)
                for f in files
                if f.is_file()
            ]

        except Exception as e:
            logger.error(f"Error listing files: {e}")
            return []

    def get_size(self, file_path: Union[str, Path]) -> Optional[int]:
        """
        Get file size in bytes.

        Args:
            file_path: File path

        Returns:
            int | None: File size or None on error
        """
        try:
            full_path = self._resolve_path(file_path)

            if full_path.exists():
                return full_path.stat().st_size
            else:
                logger.warning(f"File not found: {file_path}")
                return None

        except Exception as e:
            logger.error(f"Error getting file size: {e}")
            return None

    def create_directory(
        self,
        directory: Union[str, Path],
        exist_ok: bool = True
    ) -> bool:
        """
        Create directory.

        Args:
            directory: Directory path
            exist_ok: Don't raise error if exists

        Returns:
            bool: True if successful
        """
        try:
            dir_path = self._resolve_path(directory)
            dir_path.mkdir(parents=True, exist_ok=exist_ok)
            logger.debug(f"Created directory: {directory}")
            return True

        except Exception as e:
            logger.error(f"Error creating directory: {e}")
            return False

    def delete_directory(
        self,
        directory: Union[str, Path],
        recursive: bool = False
    ) -> bool:
        """
        Delete directory.

        Args:
            directory: Directory path
            recursive: Delete recursively

        Returns:
            bool: True if successful
        """
        try:
            dir_path = self._resolve_path(directory)

            if not dir_path.exists():
                logger.warning(f"Directory not found: {directory}")
                return False

            if recursive:
                shutil.rmtree(dir_path)
            else:
                dir_path.rmdir()  # Only works if empty

            logger.debug(f"Deleted directory: {directory}")
            return True

        except Exception as e:
            logger.error(f"Error deleting directory: {e}")
            return False

    def get_url(self, file_path: Union[str, Path]) -> str:
        """
        Get file URL (for local storage, returns file:// URL).

        Args:
            file_path: File path

        Returns:
            str: File URL
        """
        full_path = self._resolve_path(file_path)
        return full_path.as_uri()
