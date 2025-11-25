"""
Notes Module Constants

Defines constants for the notes module including format types,
hierarchy configuration, and module metadata.
"""

from enum import Enum


class NoteFormat(str, Enum):
    """Note content format"""
    MARKDOWN = "markdown"
    HTML = "html"
    PLAIN = "plain"


# Module Configuration
MODULE_NAME = "notes"
MODULE_DISPLAY_NAME = "Notes"
MODULE_DESCRIPTION = "Hierarchical note-taking with version control and full-text search"

# Hierarchy Configuration
MAX_HIERARCHY_DEPTH = 10       # Maximum nesting level for notes
MAX_CHILDREN_PER_NOTE = 100    # Maximum direct children per note

# Note Size Limits
NOTE_TITLE_MAX_LENGTH = 500
NOTE_CONTENT_MAX_LENGTH = 1000000  # 1MB in characters
TAG_NAME_MAX_LENGTH = 100
TAG_COLOR_MAX_LENGTH = 7       # Hex color #RRGGBB

# Version Control
MAX_VERSIONS_STORED = 50       # Maximum versions to keep per note
VERSION_RETENTION_DAYS = 90    # Days to retain old versions

# Search Configuration
FTS_SEARCH_LIMIT = 20          # Default full-text search results
VECTOR_SEARCH_LIMIT = 10       # Default vector search results
HYBRID_SEARCH_WEIGHT = 0.7     # Weight for vector vs FTS (0.7 vector, 0.3 FTS)

# Performance
NOTE_LIST_DEFAULT_LIMIT = 50
NOTE_LIST_MAX_LIMIT = 200
