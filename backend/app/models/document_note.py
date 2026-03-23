"""
Document Note model — document-scoped annotations.

Ported from Paperless-ngx documents/models.py L680-712:
  class Note(SoftDeleteModel):
      document = ForeignKey(Document)
      note     = TextField()
      created  = DateTimeField(auto_now_add=True)
      user     = ForeignKey(User, blank=True, null=True)

Each document can have many notes. Notes are simple text
entries with author + timestamp — NOT the same as the
standalone Notes module (app/models/note.py).
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import ForeignKey, Integer, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class DocumentNote(Base):
    """A note/annotation attached to a document."""

    __tablename__ = "document_notes"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True, doc="Primary key"
    )

    document_id: Mapped[int] = mapped_column(
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Document this note belongs to",
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        doc="Author of this note",
    )

    note: Mapped[str] = mapped_column(
        Text, nullable=False, doc="Note content"
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
        doc="When the note was created",
    )

    # Relationships
    document = relationship("Document", backref="document_notes")
    user = relationship("User")

    def __repr__(self) -> str:
        return f"<DocumentNote(id={self.id}, doc={self.document_id}, user={self.user_id})>"
