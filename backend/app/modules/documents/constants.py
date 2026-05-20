"""
Documents Module Constants

Defines constants for document processing including:
- Allowed file types
- Size limits
- Processing configuration
- Chunking parameters
"""

from enum import Enum


class ProcessingStatus(str, Enum):
    """Document processing status (mirrors app.models.document.ProcessingStatus)."""
    PENDING   = "pending"
    PARSING   = "parsing"
    PARSED    = "parsed"
    CHUNKING  = "chunking"
    COMPLETED = "completed"
    FAILED    = "failed"


# Module Configuration
MODULE_NAME = "documents"
MODULE_DISPLAY_NAME = "Documents"
MODULE_DESCRIPTION = "Document upload, processing, and RAG-powered querying"

# Allowed File Types
ALLOWED_FILE_TYPES = [
    ".pdf",
    ".epub",
    ".docx",
    ".txt",
    ".md"
]

# Size Limits
MAX_FILE_SIZE = 100 * 1024 * 1024          # 100MB per file
GEMINI_FILE_SIZE_LIMIT = 2 * 1024 * 1024 * 1024  # 2GB for Gemini Files API

# Chunking Configuration
CHUNK_SIZE = 512                           # Characters per chunk
CHUNK_OVERLAP = 50                         # Character overlap between chunks
MIN_CHUNK_SIZE = 100                       # Minimum chunk size

# Processing Configuration
MAX_CONCURRENT_PROCESSING = 4              # Max documents processing simultaneously
PROCESSING_TIMEOUT_SECONDS = 600           # 10 minutes timeout per document

# Gemini Files API
GEMINI_FILE_EXPIRATION_HOURS = 48          # Files expire after 48 hours
GEMINI_FILE_REFRESH_HOURS = 42             # Refresh 6 hours before expiration

# Storage Paths
DOCUMENT_STORAGE_BASE = "data/uploads/documents"
DOCUMENT_PATH_PATTERN = "{user_id}/{document_id}_{filename}"

# Search Configuration
DOCUMENT_SEARCH_LIMIT = 10                 # Default search results
CHUNK_SEARCH_LIMIT = 20                    # Chunks to retrieve per search

# Metadata
DOCUMENT_FILENAME_MAX_LENGTH = 255
DOCUMENT_FILETYPE_MAX_LENGTH = 10
