"""
SYNAPSE Backend Application Package

AI-powered learning platform with spaced repetition, RAG, and intelligent tutoring.

This is the root package. Import settings from here:
    from app import settings
"""

import os

# Suppress TensorFlow logs globally
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"

from app.core.config import settings

__version__ = settings.APP_VERSION
__app_name__ = settings.APP_NAME

__all__ = [
    "settings",
    "__version__",
    "__app_name__",
]
