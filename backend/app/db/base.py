"""
Declarative base for SQLAlchemy ORM models.

This module provides the base class that all database models will inherit from.
Uses SQLAlchemy 2.0's DeclarativeBase for modern ORM functionality.
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """
    Base class for all SQLAlchemy ORM models.

    All model classes should inherit from this base to be properly
    registered with SQLAlchemy's metadata system.

    Usage:
        from app.db.base import Base

        class User(Base):
            __tablename__ = "users"
            ...
    """
    pass
