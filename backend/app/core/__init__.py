"""
Core package - Configuration, security, and shared utilities.

Exports commonly used core components for easy importing:
    from app.core import settings, security, exceptions
"""

from app.core.config import settings
from app.core import security
from app.core import exceptions
from app.core.dependencies import get_current_user

__all__ = [
    "settings",
    "security",
    "exceptions",
    "get_current_user",
]
