"""
Document metadata schema — technical file metadata response.

Matches Paperless-ngx DocumentViewSet.metadata() output.
Returns checksums, MIME type, original filename, archive info.
"""

from pydantic import BaseModel, Field


class DocumentMetadataResponse(BaseModel):
    """Technical metadata for a document file."""

    original_filename: str | None = Field(default=None, description="Original filename as uploaded")
    original_mime_type: str | None = Field(default=None, description="Detected MIME type")
    original_checksum: str | None = Field(default=None, description="SHA256 of original file")
    archive_checksum: str | None = Field(default=None, description="SHA256 of archive copy")
    original_size: int = Field(description="Original file size in bytes")
    archive_size: int | None = Field(default=None, description="Archive file size in bytes")
    lang: str | None = Field(default=None, description="Detected language")
    has_archive_version: bool = Field(default=False, description="Whether archive copy exists")
