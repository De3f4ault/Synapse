"""
Reusable model mixins.

Provides common functionality that can be mixed into models:
- TimestampMixin: Automatic created_at and updated_at timestamps
- SoftDeleteMixin: Soft delete with deleted_at timestamp
- UserOwnedMixin: Foreign key to user (ownership)
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column


class TimestampMixin:
    """
    Mixin that adds automatic timestamp tracking.

    Adds:
    - created_at: Set automatically on creation
    - updated_at: Updated automatically on modification
    """

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        doc="Timestamp when record was created"
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        doc="Timestamp when record was last updated"
    )


class SoftDeleteMixin:
    """
    Mixin that adds soft delete functionality.

    Adds:
    - deleted_at: Timestamp when record was deleted (NULL if not deleted)
    - is_deleted: Property to check if record is deleted
    """

    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        default=None,
        doc="Timestamp when record was soft deleted (NULL if not deleted)"
    )

    @property
    def is_deleted(self) -> bool:
        """Check if the record is soft deleted."""
        return self.deleted_at is not None


class UserOwnedMixin:
    """
    Mixin that adds user ownership.

    Adds:
    - user_id: Foreign key reference to users table
    """

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="ID of the user who owns this record"
    )
