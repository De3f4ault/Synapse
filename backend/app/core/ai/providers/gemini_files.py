"""
Gemini Files API - File upload and management for Gemini

Handles uploading files to Google's Files API for multimodal processing.
Files are retained for 48 hours before automatic deletion.

Key constraints (from Gemini API docs):
- Project storage limit: 20 GB total
- Single file max size: 2 GB
- File retention: 48 hours (ephemeral cache)
- Use for files > 20MB or videos > 1 minute
"""

import asyncio
import os
from pathlib import Path
from typing import Any, Dict, List, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass
import structlog
import google.generativeai as genai

from app.core.config import settings

logger = structlog.get_logger(__name__)


@dataclass
class GeminiFile:
    """Represents an uploaded file in Gemini's Files API"""
    name: str  # Gemini's internal file name (e.g., "files/abc123")
    display_name: str  # Original filename
    mime_type: str
    size_bytes: int
    uri: str  # The URI to use in prompts
    state: str  # "PROCESSING", "ACTIVE", "FAILED"
    create_time: datetime
    expiration_time: datetime  # 48 hours from upload

    @property
    def is_active(self) -> bool:
        """Check if file is ready for use"""
        return self.state == "ACTIVE"

    @property
    def is_expired(self) -> bool:
        """Check if file has expired (48-hour retention)"""
        return datetime.utcnow() > self.expiration_time

    @property
    def hours_until_expiry(self) -> float:
        """Hours remaining before file expires"""
        delta = self.expiration_time - datetime.utcnow()
        return max(0, delta.total_seconds() / 3600)


class GeminiFilesManager:
    """
    Manager for Gemini Files API operations

    Handles:
    - File uploads (sync and async)
    - File status checking
    - File deletion
    - Expiration tracking

    Usage:
        manager = GeminiFilesManager()

        # Upload a file
        gemini_file = await manager.upload_file(
            file_path="/path/to/document.pdf",
            display_name="My Document"
        )

        # Use in prompt
        model = genai.GenerativeModel("gemini-2.5-flash")
        response = model.generate_content([
            gemini_file.uri,
            "Summarize this document"
        ])

        # Check expiration
        if gemini_file.hours_until_expiry < 1:
            # Re-upload before it expires
            gemini_file = await manager.upload_file(...)
    """

    # Supported MIME types for Gemini
    SUPPORTED_MIME_TYPES = {
        # Documents
        ".pdf": "application/pdf",
        ".txt": "text/plain",
        ".html": "text/html",
        ".css": "text/css",
        ".js": "application/javascript",
        ".json": "application/json",
        ".md": "text/markdown",
        ".csv": "text/csv",
        ".xml": "text/xml",
        ".rtf": "text/rtf",

        # Code
        ".py": "text/x-python",
        ".java": "text/x-java",
        ".c": "text/x-c",
        ".cpp": "text/x-c++",
        ".go": "text/x-go",
        ".rs": "text/x-rust",
        ".rb": "text/x-ruby",
        ".php": "text/x-php",
        ".ts": "text/typescript",

        # Images
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif",
        ".webp": "image/webp",
        ".heic": "image/heic",
        ".heif": "image/heif",

        # Audio
        ".mp3": "audio/mp3",
        ".wav": "audio/wav",
        ".aiff": "audio/aiff",
        ".aac": "audio/aac",
        ".ogg": "audio/ogg",
        ".flac": "audio/flac",

        # Video
        ".mp4": "video/mp4",
        ".mpeg": "video/mpeg",
        ".mov": "video/quicktime",
        ".avi": "video/x-msvideo",
        ".flv": "video/x-flv",
        ".mpg": "video/mpg",
        ".webm": "video/webm",
        ".wmv": "video/wmv",
        ".3gp": "video/3gpp",
    }

    # File size limits
    MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024  # 2 GB
    MAX_PROJECT_STORAGE = 20 * 1024 * 1024 * 1024  # 20 GB
    FILE_RETENTION_HOURS = 48

    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize Files Manager

        Args:
            api_key: Optional API key (defaults to settings.GEMINI_API_KEY)
        """
        self.api_key = api_key or settings.GEMINI_API_KEY
        genai.configure(api_key=self.api_key)
        self.logger = logger.bind(component="gemini_files")

    def _get_mime_type(self, file_path: str) -> str:
        """Determine MIME type from file extension"""
        ext = Path(file_path).suffix.lower()
        return self.SUPPORTED_MIME_TYPES.get(ext, "application/octet-stream")

    async def upload_file(
        self,
        file_path: str,
        display_name: Optional[str] = None,
        mime_type: Optional[str] = None
    ) -> GeminiFile:
        """
        Upload a file to Gemini Files API

        Args:
            file_path: Path to the file to upload
            display_name: Optional display name (defaults to filename)
            mime_type: Optional MIME type (auto-detected if not provided)

        Returns:
            GeminiFile object with upload details

        Raises:
            FileNotFoundError: If file doesn't exist
            ValueError: If file exceeds size limit or unsupported type
        """
        path = Path(file_path)

        # Validate file exists
        if not path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        # Check file size
        file_size = path.stat().st_size
        if file_size > self.MAX_FILE_SIZE:
            raise ValueError(
                f"File size ({file_size / 1e9:.2f} GB) exceeds "
                f"maximum allowed ({self.MAX_FILE_SIZE / 1e9:.2f} GB)"
            )

        # Determine MIME type
        mime = mime_type or self._get_mime_type(file_path)
        name = display_name or path.name

        self.logger.info(
            "uploading_file",
            file_path=str(path),
            display_name=name,
            mime_type=mime,
            size_bytes=file_size
        )

        try:
            # Run upload in executor (blocking operation)
            loop = asyncio.get_event_loop()
            uploaded_file = await loop.run_in_executor(
                None,
                lambda: genai.upload_file(
                    path=str(path),
                    display_name=name,
                    mime_type=mime
                )
            )

            # Wait for processing to complete
            gemini_file = await self._wait_for_processing(uploaded_file)

            self.logger.info(
                "file_uploaded",
                gemini_name=gemini_file.name,
                uri=gemini_file.uri,
                hours_until_expiry=gemini_file.hours_until_expiry
            )

            return gemini_file

        except Exception as e:
            self.logger.error(
                "file_upload_failed",
                file_path=str(path),
                error=str(e)
            )
            raise

    async def _wait_for_processing(
        self,
        uploaded_file,
        timeout_seconds: int = 300,
        poll_interval: float = 2.0
    ) -> GeminiFile:
        """
        Wait for file to finish processing

        Args:
            uploaded_file: The uploaded file object from genai
            timeout_seconds: Maximum wait time
            poll_interval: Seconds between status checks

        Returns:
            GeminiFile once processing is complete
        """
        start_time = asyncio.get_event_loop().time()

        while True:
            # Check timeout
            elapsed = asyncio.get_event_loop().time() - start_time
            if elapsed > timeout_seconds:
                raise TimeoutError(
                    f"File processing timed out after {timeout_seconds}s"
                )

            # Get current file status
            loop = asyncio.get_event_loop()
            file_info = await loop.run_in_executor(
                None,
                lambda: genai.get_file(uploaded_file.name)
            )

            state = file_info.state.name if hasattr(file_info.state, 'name') else str(file_info.state)

            if state == "ACTIVE":
                # File is ready
                return self._to_gemini_file(file_info)
            elif state == "FAILED":
                raise RuntimeError(f"File processing failed: {file_info.name}")

            # Still processing, wait and retry
            await asyncio.sleep(poll_interval)

    def _to_gemini_file(self, file_info) -> GeminiFile:
        """Convert genai file object to GeminiFile dataclass"""
        # Parse timestamps
        create_time = datetime.utcnow()  # Approximate if not available
        if hasattr(file_info, 'create_time') and file_info.create_time:
            create_time = file_info.create_time

        # Calculate expiration (48 hours from creation)
        expiration_time = create_time + timedelta(hours=self.FILE_RETENTION_HOURS)

        # Get state as string
        state = "ACTIVE"
        if hasattr(file_info, 'state'):
            state = file_info.state.name if hasattr(file_info.state, 'name') else str(file_info.state)

        return GeminiFile(
            name=file_info.name,
            display_name=getattr(file_info, 'display_name', ''),
            mime_type=getattr(file_info, 'mime_type', ''),
            size_bytes=getattr(file_info, 'size_bytes', 0),
            uri=file_info.uri if hasattr(file_info, 'uri') else f"https://generativelanguage.googleapis.com/v1beta/{file_info.name}",
            state=state,
            create_time=create_time,
            expiration_time=expiration_time
        )

    async def get_file(self, file_name: str) -> Optional[GeminiFile]:
        """
        Get file info by name

        Args:
            file_name: Gemini file name (e.g., "files/abc123")

        Returns:
            GeminiFile or None if not found
        """
        try:
            loop = asyncio.get_event_loop()
            file_info = await loop.run_in_executor(
                None,
                lambda: genai.get_file(file_name)
            )
            return self._to_gemini_file(file_info)
        except Exception as e:
            self.logger.warning(
                "file_not_found",
                file_name=file_name,
                error=str(e)
            )
            return None

    async def list_files(self) -> List[GeminiFile]:
        """
        List all files in the project

        Returns:
            List of GeminiFile objects
        """
        try:
            loop = asyncio.get_event_loop()
            files = await loop.run_in_executor(
                None,
                lambda: list(genai.list_files())
            )
            return [self._to_gemini_file(f) for f in files]
        except Exception as e:
            self.logger.error("list_files_failed", error=str(e))
            return []

    async def delete_file(self, file_name: str) -> bool:
        """
        Delete a file from Gemini

        Args:
            file_name: Gemini file name to delete

        Returns:
            True if deleted successfully
        """
        try:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                None,
                lambda: genai.delete_file(file_name)
            )
            self.logger.info("file_deleted", file_name=file_name)
            return True
        except Exception as e:
            self.logger.error(
                "file_delete_failed",
                file_name=file_name,
                error=str(e)
            )
            return False

    async def cleanup_expired_files(self) -> int:
        """
        Delete all expired files

        Returns:
            Number of files deleted
        """
        files = await self.list_files()
        deleted = 0

        for file in files:
            if file.is_expired:
                if await self.delete_file(file.name):
                    deleted += 1

        if deleted > 0:
            self.logger.info("expired_files_cleaned", count=deleted)

        return deleted
