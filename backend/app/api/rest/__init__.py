"""
REST API package.

Contains all REST API endpoints organized by domain.
"""

from .router import api_router

__all__ = ["api_router"]
