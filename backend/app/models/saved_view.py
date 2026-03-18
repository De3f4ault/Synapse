"""
SavedView + SavedViewFilterRule models.

Stores named filter presets that users can save and re-execute.

Sourced from Paperless-ngx: models.py lines 656-779
  - SavedView: name, sort, dashboard/sidebar flags, page_size
  - SavedViewFilterRule: rule_type + value (48 types in Paperless)
"""

import enum
from typing import Optional

from sqlalchemy import String, Integer, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.mixins import TimestampMixin, UserOwnedMixin


class FilterRuleType(int, enum.Enum):
    """
    Filter rule types for saved views.

    Subset of Paperless-ngx's 48 types — implementing the most useful ones.
    Values match Paperless for compatibility.
    """

    # Content search
    TITLE_CONTAINS = 0
    CONTENT_CONTAINS = 1

    # Classification FK filters
    CORRESPONDENT_IS = 3
    DOCUMENT_TYPE_IS = 4
    IS_IN_FOLDER = 5

    # Tag filters
    HAS_TAG = 6
    DOES_NOT_HAVE_TAG = 7
    HAS_ANY_TAG = 17

    # Date range filters
    CREATED_BEFORE = 8
    CREATED_AFTER = 9
    ADDED_BEFORE = 10
    ADDED_AFTER = 11

    # Metadata filters
    FILENAME_IS = 14
    FULLTEXT_QUERY = 20
    MORE_LIKE_THIS = 21

    # Classification existence filters
    HAS_CORRESPONDENT = 22
    HAS_DOCUMENT_TYPE = 23
    STORAGE_PATH_IS = 24

    # Ownership filters
    OWNER_IS = 30
    OWNER_ISNOT = 31
    HAS_OWNER = 32
    DOES_NOT_HAVE_OWNER = 33


class SavedView(Base, TimestampMixin, UserOwnedMixin):
    """
    Named filter preset for document listing.

    Equivalent to Paperless SavedView (models.py:656-700).
    """

    __tablename__ = "saved_views"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    sort_field: Mapped[str] = mapped_column(String(50), default="created_at")
    sort_reverse: Mapped[bool] = mapped_column(Boolean, default=True)
    show_on_dashboard: Mapped[bool] = mapped_column(Boolean, default=False)
    show_in_sidebar: Mapped[bool] = mapped_column(Boolean, default=False)
    page_size: Mapped[int] = mapped_column(Integer, default=25)

    # Cascade: deleting a view deletes its rules
    filter_rules: Mapped[list["SavedViewFilterRule"]] = relationship(
        back_populates="saved_view",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<SavedView(id={self.id}, name='{self.name}')>"


class SavedViewFilterRule(Base):
    """
    Individual filter rule within a saved view.

    Equivalent to Paperless SavedViewFilterRule (models.py:702-779).
    """

    __tablename__ = "saved_view_filter_rules"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    saved_view_id: Mapped[int] = mapped_column(
        ForeignKey("saved_views.id", ondelete="CASCADE"), index=True,
    )
    rule_type: Mapped[int] = mapped_column(Integer, nullable=False)
    value: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)

    saved_view: Mapped["SavedView"] = relationship(back_populates="filter_rules")

    def __repr__(self) -> str:
        return f"<SavedViewFilterRule(type={self.rule_type}, value='{self.value}')>"
