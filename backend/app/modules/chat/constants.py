"""
Chat Module Constants

Module-level configuration and constants.
"""

# Module Configuration
MODULE_NAME = "chat"
MODULE_DISPLAY_NAME = "Chat"
MODULE_DESCRIPTION = "AI-powered chat sessions with context injection"

# Session Configuration
MAX_SESSION_MESSAGES = 1000
SESSION_TITLE_MAX_LENGTH = 255

# Message Configuration
MESSAGE_CONTENT_MAX_LENGTH = 10000
MAX_TOKENS_PER_MESSAGE = 4000

# Context Configuration
DEFAULT_CONTEXT_MODULES = ["flashcards", "notes", "documents"]
MAX_CONTEXT_TOKENS = 8000

# Re-export MessageRole for convenience (authoritative source is internal/models.py)
from .internal.models import MessageRole

__all__ = [
    "MODULE_NAME",
    "MODULE_DISPLAY_NAME",
    "MODULE_DESCRIPTION",
    "MAX_SESSION_MESSAGES",
    "SESSION_TITLE_MAX_LENGTH",
    "MESSAGE_CONTENT_MAX_LENGTH",
    "MAX_TOKENS_PER_MESSAGE",
    "DEFAULT_CONTEXT_MODULES",
    "MAX_CONTEXT_TOKENS",
    "MessageRole",
]
