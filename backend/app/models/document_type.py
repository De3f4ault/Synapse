"""
DocumentType model.

Classifies documents by type (e.g., Invoice, Contract, Receipt).
Documents are auto-assigned types via the matching engine.

Sourced from Paperless-ngx: documents/models.py DocumentType (L140-143).
"""

from sqlalchemy import Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .matching import MatchingModel


class DocumentType(MatchingModel):
    """
    DocumentType — categorizes documents by kind.

    Examples: "Invoice", "Contract", "Receipt", "Letter", "Manual".
    """

    __tablename__ = "document_types"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True,
        doc="Primary key",
    )

    # Relationships
    documents = relationship(
        "Document", back_populates="document_type",
        lazy="dynamic",
    )

    __table_args__ = (
        UniqueConstraint("user_id", "name", name="uq_user_document_type_name"),
    )
