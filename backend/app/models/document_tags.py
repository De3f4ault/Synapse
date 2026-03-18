"""
Document ↔ Tag many-to-many association table.

Sourced from Paperless-ngx: Document.tags M2M field.
"""

from sqlalchemy import Table, Column, Integer, ForeignKey, UniqueConstraint

from .base import Base

document_tags = Table(
    "document_tags",
    Base.metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column(
        "document_id",
        Integer,
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    ),
    Column(
        "tag_id",
        Integer,
        ForeignKey("tags.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    ),
    UniqueConstraint("document_id", "tag_id", name="uq_document_tag"),
)
