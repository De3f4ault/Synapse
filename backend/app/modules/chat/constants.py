"""Chat Module Constants"""

from enum import Enum


class MessageRole(str, Enum):
    """Chat message roles"""
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


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
