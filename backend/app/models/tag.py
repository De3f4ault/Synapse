"""
Tag model.

User-defined tags for organizing and categorizing content.
Supports color coding for visual organization.
"""

from sqlalchemy import String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base
from .mixins import TimestampMixin, UserOwnedMixin


class Tag(Base, TimestampMixin, UserOwnedMixin):
    """
    Tag model for content organization.

    Tags are user-specific and can be applied to notes, decks,
    or other content types. Supports color coding for visual distinction.
    """

    __tablename__ = "tags"

    # Primary Key
    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
        doc="Primary key"
    )

    # Tag Information
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        doc="Tag name (unique per user)"
    )

    color: Mapped[str] = mapped_column(
        String(7),
        nullable=False,
        default="#808080",
        doc="Hex color code (e.g., '#FF5733')"
    )

    # Constraints
    __table_args__ = (
        UniqueConstraint(
            'user_id',
            'name',
            name='uq_user_tag_name'
        ),
    )

    # Relationships
    # notes: Many-to-many with Note (requires association table)
    # user: Many-to-one with User (provided by UserOwnedMixin)

    def __repr__(self) -> str:
        """String representation of Tag."""
        return f"<Tag(id={self.id}, name='{self.name}', user_id={self.user_id})>"
