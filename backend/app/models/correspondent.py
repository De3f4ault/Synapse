"""
Correspondent model.

Represents a sender/receiver of documents (e.g., a company, a person).
Documents are auto-assigned to correspondents via the matching engine.

Sourced from Paperless-ngx: documents/models.py Correspondent (L95-99).
"""

from typing import Optional

from sqlalchemy import Integer, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .matching import MatchingModel


class Correspondent(MatchingModel):
    """
    Correspondent — the sender/receiver of a document.

    Examples: "Bank of America", "Dr. Smith", "Amazon", "IRS".
    """

    __tablename__ = "correspondents"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True,
        doc="Primary key",
    )

    # Relationships
    documents = relationship(
        "Document", back_populates="correspondent",
        lazy="dynamic",
    )

    __table_args__ = (
        UniqueConstraint("user_id", "name", name="uq_user_correspondent_name"),
    )
