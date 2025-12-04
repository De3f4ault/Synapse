"""
Base model for all SQLAlchemy models.

This module provides the declarative base class that all models inherit from.
Uses SQLAlchemy 2.0 declarative base pattern.
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """
    Base class for all database models.

    All models in the application should inherit from this class.
    Provides the foundation for SQLAlchemy ORM functionality.
    """
    pass
