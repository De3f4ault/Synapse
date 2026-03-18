"""
StoragePath model.

Defines templated storage paths for organizing documents on disk.
Uses Jinja2-style templates that reference document metadata.

Sourced from Paperless-ngx: documents/models.py StoragePath (L146-153).
"""

from sqlalchemy import Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .matching import MatchingModel


class StoragePath(MatchingModel):
    """
    StoragePath — defines where documents are stored on disk.

    Uses Jinja2 templates with document metadata placeholders.
    Example: "{correspondent}/{created_year}/{title}"
    """

    __tablename__ = "storage_paths"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True,
        doc="Primary key",
    )

    path_template: Mapped[str] = mapped_column(
        String(512), nullable=False,
        doc="Jinja2 template: {correspondent}/{created_year}/{title}",
    )

    # Relationships
    documents = relationship(
        "Document", back_populates="storage_path",
        lazy="dynamic",
    )

    __table_args__ = (
        UniqueConstraint("user_id", "name", name="uq_user_storage_path_name"),
    )
