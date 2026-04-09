"""
Artifacts Module — ORM Models

All SQLAlchemy models for the Artifacts domain.

IMPORTANT: These models are INTERNAL to the Artifacts module.
No other module should import directly from this file.
"""

from datetime import datetime
from enum import Enum
from uuid import uuid4
from sqlalchemy import (
    Column,
    String,
    Text,
    Integer,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
    Enum as SQLEnum,
    CheckConstraint,
    Index,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import Base
from app.db.types import Vector
from app.core.ai.embeddings.boundary import EMBEDDING_DIM


# =============================================================================
# ENUMS
# =============================================================================


class ArtifactType(str, Enum):
    """MIME types for artifact content (matches Claude's format)."""

    CODE = "application/vnd.ant.code"
    REACT = "application/vnd.ant.react"
    HTML = "text/html"
    MARKDOWN = "text/markdown"
    SVG = "image/svg+xml"
    MERMAID = "application/vnd.ant.mermaid"


class ArtifactState(str, Enum):
    """Lifecycle state of an artifact."""

    CREATING = "creating"
    STREAMING = "streaming"
    READY = "ready"
    ERROR = "error"


# =============================================================================
# ARTIFACT MODEL
# =============================================================================


class Artifact(Base):
    """Artifact model for structured AI outputs.

    Artifacts are first-class, persistent, structured outputs that
    live outside the linear chat scroll. They can be code, HTML,
    React components, diagrams, or documents.

    INVARIANTS:
    - Each artifact has a unique slug for URL-friendly access
    - Content size is limited to 1MB (enforced at API layer)
    - Embeddings enable semantic search via pgvector
    """

    __tablename__ = "artifacts"

    # Primary identifiers
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    slug = Column(String(255), unique=True, nullable=False, index=True)

    # Ownership & context
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    session_id = Column(
        Integer, ForeignKey("chat_sessions.id", ondelete="SET NULL"), nullable=True, index=True
    )
    message_id = Column(
        Integer, ForeignKey("chat_messages.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # Content
    type = Column(SQLEnum(ArtifactType), nullable=False)
    title = Column(String(500), nullable=False)
    content = Column(Text, nullable=False)
    language = Column(String(50), nullable=True)  # For code artifacts
    filename = Column(String(255), nullable=True)  # Suggested filename

    # Version tracking
    version = Column(Integer, default=1, nullable=False)
    parent_id = Column(
        UUID(as_uuid=True), ForeignKey("artifacts.id", ondelete="SET NULL"), nullable=True
    )
    is_latest = Column(Boolean, default=True, nullable=False)

    # State
    state = Column(SQLEnum(ArtifactState), default=ArtifactState.READY, nullable=False)

    # Publishing (Phase 4+)
    is_published = Column(Boolean, default=False, nullable=False)
    public_url = Column(Text, nullable=True, unique=True)
    view_count = Column(Integer, default=0, nullable=False)

    # Semantic search embedding (pgvector)
    embedding = Column(Vector(EMBEDDING_DIM), nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", foreign_keys=[user_id], lazy="selectin")
    session = relationship("ChatSession", foreign_keys=[session_id], lazy="selectin")
    message = relationship("ChatMessage", foreign_keys=[message_id], lazy="selectin")
    parent = relationship("Artifact", remote_side=[id], foreign_keys=[parent_id], lazy="selectin")

    # Indexes
    __table_args__ = (
        Index("idx_artifacts_user_type_date", "user_id", "type", "created_at"),
        Index("idx_artifacts_session", "session_id", "created_at"),
        CheckConstraint("length(content) <= 1000000", name="max_content_size"),
    )

    @property
    def content_size(self) -> int:
        """Size of content in bytes."""
        return len(self.content) if self.content else 0

    @property
    def line_count(self) -> int:
        """Number of lines in content."""
        return len(self.content.split("\n")) if self.content else 0

    @property
    def embedding_text(self) -> str:
        """Generate text for embedding.

        Combines title and content excerpt for semantic search.
        """
        content_preview = self.content[:1000] if self.content else ""
        return f"{self.title}\n{self.type.value}\n{self.language or ''}\n{content_preview}"

    def __repr__(self) -> str:
        return f"<Artifact(id={self.id}, title={self.title}, type={self.type})>"


class ArtifactVersion(Base):
    """Historical version of an artifact.

    Stores previous versions for undo/redo and version history.
    """

    __tablename__ = "artifact_versions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    artifact_id = Column(
        UUID(as_uuid=True),
        ForeignKey("artifacts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    version = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    change_type = Column(String(20), nullable=False)  # 'create', 'update', 'rewrite'
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    artifact = relationship("Artifact", foreign_keys=[artifact_id], lazy="selectin")

    __table_args__ = (Index("idx_artifact_versions_artifact", "artifact_id", "version"),)

    def __repr__(self) -> str:
        return f"<ArtifactVersion(artifact_id={self.artifact_id}, version={self.version})>"


class ArtifactStorage(Base):
    """Key-value storage for stateful artifacts (like Canvas storage API)."""

    __tablename__ = "artifact_storage"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    artifact_id = Column(
        UUID(as_uuid=True),
        ForeignKey("artifacts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    storage_key = Column(String(200), nullable=False)
    storage_value = Column(Text, nullable=False)
    is_shared = Column(Boolean, default=False, nullable=False)
    value_size_bytes = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    artifact = relationship("Artifact", foreign_keys=[artifact_id], lazy="selectin")

    __table_args__ = (
        Index("idx_artifact_storage_key", "artifact_id", "storage_key", "is_shared", unique=True),
        CheckConstraint("value_size_bytes <= 5242880", name="max_storage_value_size"),
    )

    def __repr__(self) -> str:
        return f"<ArtifactStorage(artifact_id={self.artifact_id}, key={self.storage_key})>"


class ArtifactTag(Base):
    """Tags for artifact categorization and search."""

    __tablename__ = "artifact_tags"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    artifact_id = Column(
        UUID(as_uuid=True),
        ForeignKey("artifacts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    tag = Column(String(100), nullable=False)
    tag_type = Column(String(50), nullable=True)  # "language", "framework", "topic"
    confidence = Column(Float, nullable=True)  # For AI-generated tags
    created_by = Column(String(20), default="user", nullable=False)  # "user" or "ai"
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    artifact = relationship("Artifact", foreign_keys=[artifact_id], lazy="selectin")

    __table_args__ = (
        Index("idx_artifact_tags_unique", "artifact_id", "tag", unique=True),
        Index("idx_artifact_tags_tag", "tag"),
        Index("idx_artifact_tags_type", "tag_type"),
    )

    def __repr__(self) -> str:
        return f"<ArtifactTag(artifact_id={self.artifact_id}, tag={self.tag})>"


class ArtifactCollaborator(Base):
    """Collaborators for artifact sharing."""

    __tablename__ = "artifact_collaborators"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    artifact_id = Column(
        UUID(as_uuid=True),
        ForeignKey("artifacts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role = Column(String(20), default="viewer", nullable=False)  # "viewer", "editor", "admin"
    invited_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    accepted_at = Column(DateTime, nullable=True)  # NULL = pending invitation
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    artifact = relationship("Artifact", foreign_keys=[artifact_id], lazy="selectin")
    inviter = relationship("User", foreign_keys=[invited_by], lazy="selectin")

    __table_args__ = (
        Index("idx_artifact_collaborators_unique", "artifact_id", "user_id", unique=True),
        Index("idx_artifact_collaborators_user", "user_id"),
    )

    def __repr__(self) -> str:
        return f"<ArtifactCollaborator(artifact_id={self.artifact_id}, user_id={self.user_id}, role={self.role})>"


# =============================================================================
# MODULE EXPORTS
# =============================================================================

__all__ = [
    "ArtifactType",
    "ArtifactState",
    "Artifact",
    "ArtifactVersion",
    "ArtifactStorage",
    "ArtifactTag",
    "ArtifactCollaborator",
]
