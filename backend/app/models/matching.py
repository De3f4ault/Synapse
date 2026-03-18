"""
MatchingModel abstract base class.

Provides the foundation for auto-assignment matching against document content.
All classification models (Correspondent, DocumentType, StoragePath, Tag)
inherit from this base.

Sourced from Paperless-ngx: documents/models.py MatchingModel (L45-93).
"""

import enum

from sqlalchemy import String, Integer, Boolean
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base
from .mixins import TimestampMixin, UserOwnedMixin


class MatchingAlgorithm(int, enum.Enum):
    """
    Matching algorithms for auto-assignment.

    Paperless reference: documents/models.py MATCH_* constants.
    """

    NONE = 0       # Never auto-match
    ANY = 1        # Content contains ANY keyword
    ALL = 2        # Content contains ALL keywords
    LITERAL = 3    # Exact substring match (word-boundary)
    REGEX = 4      # Regular expression match
    FUZZY = 5      # Fuzzy match (ratio > 85%)
    AUTO = 6       # AI/ML classification (Gemini zero-shot)


class MatchingModel(Base, TimestampMixin, UserOwnedMixin):
    """
    Abstract base for models with auto-assignment matching.

    Each subclass (Correspondent, DocumentType, StoragePath, Tag) defines
    matching rules that are evaluated against document content during
    post-consumption classification.

    Paperless reference: documents/models.py MatchingModel (L45-93).
    """

    __abstract__ = True

    name: Mapped[str] = mapped_column(
        String(128), nullable=False,
        doc="Display name (unique per user)",
    )

    match: Mapped[str] = mapped_column(
        String(256), nullable=True, default="",
        doc="Matching keywords/pattern (comma-separated for ANY/ALL)",
    )

    matching_algorithm: Mapped[int] = mapped_column(
        Integer, default=MatchingAlgorithm.NONE,
        doc="Matching algorithm (0=none, 1=any, 2=all, 3=literal, 4=regex, 5=fuzzy, 6=auto)",
    )

    is_insensitive: Mapped[bool] = mapped_column(
        Boolean, default=True,
        doc="Case insensitive matching",
    )

    def __repr__(self) -> str:
        return f"<{type(self).__name__}(id={getattr(self, 'id', '?')}, name='{self.name}')>"

    def __str__(self) -> str:
        return self.name
