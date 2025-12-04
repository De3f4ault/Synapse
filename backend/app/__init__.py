"""
SYNAPSE Backend Application Package

AI-powered learning platform with spaced repetition, RAG, and intelligent tutoring.

This is the root package. Import settings from here:
    from app import settings
"""

from app.core.config import settings

__version__ = settings.APP_VERSION
__app_name__ = settings.APP_NAME

__all__ = [
    "settings",
    "__version__",
    "__app_name__",
]
