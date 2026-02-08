"""
Artifacts Module — HTTP API Layer.

REST API endpoints for Artifacts CRUD operations.
"""

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from app.db.session import get_db
from app.models.user import User
from app.api.deps import get_current_user
from .internal.models import (
    Artifact,
    ArtifactVersion,
    ArtifactStorage,
    ArtifactTag,
    ArtifactCollaborator,
    ArtifactType,
    ArtifactState,
)

logger = structlog.get_logger(__name__)
router = APIRouter()


# -----------------------------------------------------------------------------
# Request/Response Schemas
# -----------------------------------------------------------------------------


class ArtifactCreate(BaseModel):
    """Schema for creating a new artifact."""

    session_id: Optional[int] = None
    message_id: Optional[int] = None
    type: str = Field(..., description="MIME type of artifact")
    title: str = Field(..., min_length=1, max_length=500)
    content: str = Field(..., min_length=1, max_length=1_000_000)
    language: Optional[str] = None
    filename: Optional[str] = None


class ArtifactUpdate(BaseModel):
    """Schema for updating an artifact."""

    title: Optional[str] = Field(None, min_length=1, max_length=500)
    content: Optional[str] = Field(None, min_length=1, max_length=1_000_000)


class ArtifactResponse(BaseModel):
    """Schema for artifact response."""

    id: UUID
    slug: str
    session_id: Optional[int]
    message_id: Optional[int]
    type: str
    title: str
    content: str
    language: Optional[str]
    filename: Optional[str]
    version: int
    state: str
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class ArtifactVersionResponse(BaseModel):
    """Schema for artifact version response."""

    id: UUID
    artifact_id: UUID
    version: int
    content: str
    change_type: str
    created_at: str

    class Config:
        from_attributes = True


class StorageSetRequest(BaseModel):
    """Schema for setting storage value."""

    key: str = Field(..., max_length=200)
    value: str = Field(..., max_length=5_242_880)
    shared: bool = False


class StorageGetResponse(BaseModel):
    """Schema for storage get response."""

    key: str
    value: Optional[str]
    shared: bool


# --- Tags Schemas ---


class TagCreate(BaseModel):
    """Schema for creating a tag."""

    tag: str = Field(..., min_length=1, max_length=100)
    tag_type: Optional[str] = Field(None, max_length=50)  # "language", "framework", "topic"


class TagResponse(BaseModel):
    """Schema for tag response."""

    id: UUID
    artifact_id: UUID
    tag: str
    tag_type: Optional[str]
    confidence: Optional[float]
    created_by: str
    created_at: str

    class Config:
        from_attributes = True


class TagListResponse(BaseModel):
    """Schema for list of tags."""

    tags: List[TagResponse]


# --- Collaboration Schemas ---


class CollaboratorInvite(BaseModel):
    """Schema for inviting a collaborator."""

    user_id: int
    role: str = Field(default="viewer", pattern="^(viewer|editor|admin)$")


class CollaboratorUpdate(BaseModel):
    """Schema for updating a collaborator's role."""

    role: str = Field(..., pattern="^(viewer|editor|admin)$")


class CollaboratorResponse(BaseModel):
    """Schema for collaborator response."""

    id: UUID
    artifact_id: UUID
    user_id: int
    role: str
    invited_by: Optional[int]
    accepted_at: Optional[str]
    created_at: str

    class Config:
        from_attributes = True


class CollaboratorListResponse(BaseModel):
    """Schema for list of collaborators."""

    collaborators: List[CollaboratorResponse]


# -----------------------------------------------------------------------------
# Helper Functions
# -----------------------------------------------------------------------------


def generate_slug(title: str, artifact_type: str) -> str:
    """Generate URL-friendly slug from title."""
    import re
    import secrets

    prefix = artifact_type.split("/")[-1].replace("vnd.ant.", "")
    base = re.sub(r"[^a-z0-9]+", "-", title.lower())
    base = re.sub(r"^-|-$", "", base)[:50]
    suffix = secrets.token_hex(4)
    return f"{prefix}-{base or 'untitled'}-{suffix}"


def map_artifact_type(type_str: str) -> ArtifactType:
    """Map string to ArtifactType enum."""
    type_map = {
        "application/vnd.ant.code": ArtifactType.CODE,
        "application/vnd.ant.react": ArtifactType.REACT,
        "text/html": ArtifactType.HTML,
        "text/markdown": ArtifactType.MARKDOWN,
        "image/svg+xml": ArtifactType.SVG,
        "application/vnd.ant.mermaid": ArtifactType.MERMAID,
    }
    return type_map.get(type_str, ArtifactType.CODE)


# -----------------------------------------------------------------------------
# CRUD Endpoints
# -----------------------------------------------------------------------------


@router.post("", response_model=ArtifactResponse, status_code=status.HTTP_201_CREATED)
async def create_artifact(
    data: ArtifactCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new artifact."""
    # Rate limit check (10 per minute) - simple in-memory check
    # In production, use Redis-based rate limiting

    artifact = Artifact(
        slug=generate_slug(data.title, data.type),
        user_id=current_user.id,
        session_id=data.session_id,
        message_id=data.message_id,
        type=map_artifact_type(data.type),
        title=data.title,
        content=data.content,
        language=data.language,
        filename=data.filename,
        state=ArtifactState.READY,
    )

    db.add(artifact)
    await db.commit()
    await db.refresh(artifact)

    # Generate embedding for semantic search (async, non-blocking)
    try:
        from .embedding_service import embed_artifact

        await embed_artifact(
            db=db,
            artifact_id=artifact.id,
            title=artifact.title,
            content=artifact.content,
            artifact_type=data.type,
            language=artifact.language,
        )
        await db.commit()
    except Exception as e:
        logger.warning(
            "artifact_embedding_failed", artifact_id=str(artifact.id), error=str(e)[:100]
        )

    logger.info("artifact_created", artifact_id=str(artifact.id), title=artifact.title)

    return ArtifactResponse(
        id=artifact.id,
        slug=artifact.slug,
        session_id=artifact.session_id,
        message_id=artifact.message_id,
        type=artifact.type.value,
        title=artifact.title,
        content=artifact.content,
        language=artifact.language,
        filename=artifact.filename,
        version=artifact.version,
        state=artifact.state.value,
        created_at=artifact.created_at.isoformat(),
        updated_at=artifact.updated_at.isoformat(),
    )


@router.get("", response_model=List[ArtifactResponse])
async def list_artifacts(
    session_id: Optional[int] = Query(None, description="Filter by session"),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List user's artifacts, optionally filtered by session."""
    query = select(Artifact).where(Artifact.user_id == current_user.id)

    if session_id:
        query = query.where(Artifact.session_id == session_id)

    query = query.order_by(Artifact.created_at.desc()).limit(limit)

    result = await db.execute(query)
    artifacts = result.scalars().all()

    return [
        ArtifactResponse(
            id=a.id,
            slug=a.slug,
            session_id=a.session_id,
            message_id=a.message_id,
            type=a.type.value,
            title=a.title,
            content=a.content,
            language=a.language,
            filename=a.filename,
            version=a.version,
            state=a.state.value,
            created_at=a.created_at.isoformat(),
            updated_at=a.updated_at.isoformat(),
        )
        for a in artifacts
    ]


@router.get("/{artifact_id}", response_model=ArtifactResponse)
async def get_artifact(
    artifact_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific artifact by ID."""
    result = await db.execute(
        select(Artifact).where(
            and_(Artifact.id == artifact_id, Artifact.user_id == current_user.id)
        )
    )
    artifact = result.scalar_one_or_none()

    if not artifact:
        raise HTTPException(status_code=404, detail="Artifact not found")

    return ArtifactResponse(
        id=artifact.id,
        slug=artifact.slug,
        session_id=artifact.session_id,
        message_id=artifact.message_id,
        type=artifact.type.value,
        title=artifact.title,
        content=artifact.content,
        language=artifact.language,
        filename=artifact.filename,
        version=artifact.version,
        state=artifact.state.value,
        created_at=artifact.created_at.isoformat(),
        updated_at=artifact.updated_at.isoformat(),
    )


@router.patch("/{artifact_id}", response_model=ArtifactResponse)
async def update_artifact(
    artifact_id: UUID,
    data: ArtifactUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an artifact, creating a new version."""
    result = await db.execute(
        select(Artifact).where(
            and_(Artifact.id == artifact_id, Artifact.user_id == current_user.id)
        )
    )
    artifact = result.scalar_one_or_none()

    if not artifact:
        raise HTTPException(status_code=404, detail="Artifact not found")

    # Save current version before updating
    version = ArtifactVersion(
        artifact_id=artifact.id,
        version=artifact.version,
        content=artifact.content,
        change_type="update",
    )
    db.add(version)

    # Update artifact
    if data.title:
        artifact.title = data.title
    if data.content:
        artifact.content = data.content

    artifact.version += 1

    await db.commit()
    await db.refresh(artifact)

    # Re-generate embedding for semantic search
    try:
        from .embedding_service import embed_artifact

        await embed_artifact(
            db=db,
            artifact_id=artifact.id,
            title=artifact.title,
            content=artifact.content,
            artifact_type=artifact.type.value,
            language=artifact.language,
        )
        await db.commit()
    except Exception as e:
        logger.warning(
            "artifact_reembedding_failed", artifact_id=str(artifact.id), error=str(e)[:100]
        )

    logger.info("artifact_updated", artifact_id=str(artifact.id), version=artifact.version)

    return ArtifactResponse(
        id=artifact.id,
        slug=artifact.slug,
        session_id=artifact.session_id,
        message_id=artifact.message_id,
        type=artifact.type.value,
        title=artifact.title,
        content=artifact.content,
        language=artifact.language,
        filename=artifact.filename,
        version=artifact.version,
        state=artifact.state.value,
        created_at=artifact.created_at.isoformat(),
        updated_at=artifact.updated_at.isoformat(),
    )


@router.delete("/{artifact_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_artifact(
    artifact_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete an artifact."""
    result = await db.execute(
        select(Artifact).where(
            and_(Artifact.id == artifact_id, Artifact.user_id == current_user.id)
        )
    )
    artifact = result.scalar_one_or_none()

    if not artifact:
        raise HTTPException(status_code=404, detail="Artifact not found")

    await db.delete(artifact)
    await db.commit()

    logger.info("artifact_deleted", artifact_id=str(artifact_id))


# -----------------------------------------------------------------------------
# Version History Endpoints
# -----------------------------------------------------------------------------


@router.get("/{artifact_id}/versions", response_model=List[ArtifactVersionResponse])
async def get_artifact_versions(
    artifact_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get version history for an artifact."""
    # First verify ownership
    artifact_result = await db.execute(
        select(Artifact).where(
            and_(Artifact.id == artifact_id, Artifact.user_id == current_user.id)
        )
    )
    if not artifact_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Artifact not found")

    result = await db.execute(
        select(ArtifactVersion)
        .where(ArtifactVersion.artifact_id == artifact_id)
        .order_by(ArtifactVersion.version.desc())
    )
    versions = result.scalars().all()

    return [
        ArtifactVersionResponse(
            id=v.id,
            artifact_id=v.artifact_id,
            version=v.version,
            content=v.content,
            change_type=v.change_type,
            created_at=v.created_at.isoformat(),
        )
        for v in versions
    ]


# -----------------------------------------------------------------------------
# Storage API Endpoints
# -----------------------------------------------------------------------------


@router.get("/{artifact_id}/storage/{key}", response_model=StorageGetResponse)
async def get_storage(
    artifact_id: UUID,
    key: str,
    shared: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a storage value for an artifact."""
    # Verify ownership
    artifact_result = await db.execute(
        select(Artifact).where(
            and_(Artifact.id == artifact_id, Artifact.user_id == current_user.id)
        )
    )
    if not artifact_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Artifact not found")

    result = await db.execute(
        select(ArtifactStorage).where(
            and_(
                ArtifactStorage.artifact_id == artifact_id,
                ArtifactStorage.storage_key == key,
                ArtifactStorage.is_shared == shared,
            )
        )
    )
    storage = result.scalar_one_or_none()

    return StorageGetResponse(
        key=key,
        value=storage.storage_value if storage else None,
        shared=shared,
    )


@router.post("/{artifact_id}/storage", response_model=StorageGetResponse)
async def set_storage(
    artifact_id: UUID,
    data: StorageSetRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Set a storage value for an artifact."""
    # Verify ownership
    artifact_result = await db.execute(
        select(Artifact).where(
            and_(Artifact.id == artifact_id, Artifact.user_id == current_user.id)
        )
    )
    if not artifact_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Artifact not found")

    # Upsert storage
    result = await db.execute(
        select(ArtifactStorage).where(
            and_(
                ArtifactStorage.artifact_id == artifact_id,
                ArtifactStorage.storage_key == data.key,
                ArtifactStorage.is_shared == data.shared,
            )
        )
    )
    storage = result.scalar_one_or_none()

    if storage:
        storage.storage_value = data.value
        storage.value_size_bytes = len(data.value)
    else:
        storage = ArtifactStorage(
            artifact_id=artifact_id,
            storage_key=data.key,
            storage_value=data.value,
            is_shared=data.shared,
            value_size_bytes=len(data.value),
        )
        db.add(storage)

    await db.commit()

    return StorageGetResponse(
        key=data.key,
        value=data.value,
        shared=data.shared,
    )


@router.delete("/{artifact_id}/storage/{key}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_storage(
    artifact_id: UUID,
    key: str,
    shared: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a storage value."""
    # Verify ownership
    artifact_result = await db.execute(
        select(Artifact).where(
            and_(Artifact.id == artifact_id, Artifact.user_id == current_user.id)
        )
    )
    if not artifact_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Artifact not found")

    result = await db.execute(
        select(ArtifactStorage).where(
            and_(
                ArtifactStorage.artifact_id == artifact_id,
                ArtifactStorage.storage_key == key,
                ArtifactStorage.is_shared == shared,
            )
        )
    )
    storage = result.scalar_one_or_none()

    if storage:
        await db.delete(storage)
        await db.commit()


# -----------------------------------------------------------------------------
# Tags API Endpoints
# -----------------------------------------------------------------------------


@router.get("/{artifact_id}/tags", response_model=TagListResponse)
async def list_tags(
    artifact_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all tags for an artifact."""
    # Verify ownership or collaboration access
    artifact_result = await db.execute(
        select(Artifact).where(
            and_(Artifact.id == artifact_id, Artifact.user_id == current_user.id)
        )
    )
    if not artifact_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Artifact not found")

    result = await db.execute(
        select(ArtifactTag)
        .where(ArtifactTag.artifact_id == artifact_id)
        .order_by(ArtifactTag.created_at.desc())
    )
    tags = result.scalars().all()

    return TagListResponse(
        tags=[
            TagResponse(
                id=t.id,
                artifact_id=t.artifact_id,
                tag=t.tag,
                tag_type=t.tag_type,
                confidence=t.confidence,
                created_by=t.created_by,
                created_at=t.created_at.isoformat(),
            )
            for t in tags
        ]
    )


@router.post("/{artifact_id}/tags", response_model=TagResponse, status_code=status.HTTP_201_CREATED)
async def add_tag(
    artifact_id: UUID,
    data: TagCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add a tag to an artifact."""
    # Verify ownership
    artifact_result = await db.execute(
        select(Artifact).where(
            and_(Artifact.id == artifact_id, Artifact.user_id == current_user.id)
        )
    )
    if not artifact_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Artifact not found")

    # Check if tag already exists
    existing = await db.execute(
        select(ArtifactTag).where(
            and_(ArtifactTag.artifact_id == artifact_id, ArtifactTag.tag == data.tag)
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Tag already exists")

    tag = ArtifactTag(
        artifact_id=artifact_id,
        tag=data.tag,
        tag_type=data.tag_type,
        created_by="user",
    )
    db.add(tag)
    await db.commit()
    await db.refresh(tag)

    logger.info("tag_added", artifact_id=str(artifact_id), tag=data.tag)

    return TagResponse(
        id=tag.id,
        artifact_id=tag.artifact_id,
        tag=tag.tag,
        tag_type=tag.tag_type,
        confidence=tag.confidence,
        created_by=tag.created_by,
        created_at=tag.created_at.isoformat(),
    )


@router.delete("/{artifact_id}/tags/{tag}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_tag(
    artifact_id: UUID,
    tag: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove a tag from an artifact."""
    # Verify ownership
    artifact_result = await db.execute(
        select(Artifact).where(
            and_(Artifact.id == artifact_id, Artifact.user_id == current_user.id)
        )
    )
    if not artifact_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Artifact not found")

    result = await db.execute(
        select(ArtifactTag).where(
            and_(ArtifactTag.artifact_id == artifact_id, ArtifactTag.tag == tag)
        )
    )
    tag_obj = result.scalar_one_or_none()

    if not tag_obj:
        raise HTTPException(status_code=404, detail="Tag not found")

    await db.delete(tag_obj)
    await db.commit()

    logger.info("tag_removed", artifact_id=str(artifact_id), tag=tag)


# -----------------------------------------------------------------------------
# Collaboration API Endpoints
# -----------------------------------------------------------------------------


@router.get("/{artifact_id}/collaborators", response_model=CollaboratorListResponse)
async def list_collaborators(
    artifact_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all collaborators for an artifact."""
    # Verify ownership
    artifact_result = await db.execute(
        select(Artifact).where(
            and_(Artifact.id == artifact_id, Artifact.user_id == current_user.id)
        )
    )
    if not artifact_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Artifact not found")

    result = await db.execute(
        select(ArtifactCollaborator)
        .where(ArtifactCollaborator.artifact_id == artifact_id)
        .order_by(ArtifactCollaborator.created_at.desc())
    )
    collaborators = result.scalars().all()

    return CollaboratorListResponse(
        collaborators=[
            CollaboratorResponse(
                id=c.id,
                artifact_id=c.artifact_id,
                user_id=c.user_id,
                role=c.role,
                invited_by=c.invited_by,
                accepted_at=c.accepted_at.isoformat() if c.accepted_at else None,
                created_at=c.created_at.isoformat(),
            )
            for c in collaborators
        ]
    )


@router.post(
    "/{artifact_id}/collaborators",
    response_model=CollaboratorResponse,
    status_code=status.HTTP_201_CREATED,
)
async def invite_collaborator(
    artifact_id: UUID,
    data: CollaboratorInvite,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Invite a collaborator to an artifact."""
    # Verify ownership
    artifact_result = await db.execute(
        select(Artifact).where(
            and_(Artifact.id == artifact_id, Artifact.user_id == current_user.id)
        )
    )
    if not artifact_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Artifact not found")

    # Verify target user exists
    user_result = await db.execute(select(User).where(User.id == data.user_id))
    if not user_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="User not found")

    # Check if already a collaborator
    existing = await db.execute(
        select(ArtifactCollaborator).where(
            and_(
                ArtifactCollaborator.artifact_id == artifact_id,
                ArtifactCollaborator.user_id == data.user_id,
            )
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="User is already a collaborator")

    collaborator = ArtifactCollaborator(
        artifact_id=artifact_id,
        user_id=data.user_id,
        role=data.role,
        invited_by=current_user.id,
    )
    db.add(collaborator)
    await db.commit()
    await db.refresh(collaborator)

    logger.info(
        "collaborator_invited",
        artifact_id=str(artifact_id),
        user_id=data.user_id,
        role=data.role,
    )

    return CollaboratorResponse(
        id=collaborator.id,
        artifact_id=collaborator.artifact_id,
        user_id=collaborator.user_id,
        role=collaborator.role,
        invited_by=collaborator.invited_by,
        accepted_at=None,
        created_at=collaborator.created_at.isoformat(),
    )


@router.patch("/{artifact_id}/collaborators/{user_id}", response_model=CollaboratorResponse)
async def update_collaborator_role(
    artifact_id: UUID,
    user_id: int,
    data: CollaboratorUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a collaborator's role."""
    # Verify ownership
    artifact_result = await db.execute(
        select(Artifact).where(
            and_(Artifact.id == artifact_id, Artifact.user_id == current_user.id)
        )
    )
    if not artifact_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Artifact not found")

    result = await db.execute(
        select(ArtifactCollaborator).where(
            and_(
                ArtifactCollaborator.artifact_id == artifact_id,
                ArtifactCollaborator.user_id == user_id,
            )
        )
    )
    collaborator = result.scalar_one_or_none()

    if not collaborator:
        raise HTTPException(status_code=404, detail="Collaborator not found")

    collaborator.role = data.role
    await db.commit()
    await db.refresh(collaborator)

    logger.info(
        "collaborator_role_updated",
        artifact_id=str(artifact_id),
        user_id=user_id,
        role=data.role,
    )

    return CollaboratorResponse(
        id=collaborator.id,
        artifact_id=collaborator.artifact_id,
        user_id=collaborator.user_id,
        role=collaborator.role,
        invited_by=collaborator.invited_by,
        accepted_at=collaborator.accepted_at.isoformat() if collaborator.accepted_at else None,
        created_at=collaborator.created_at.isoformat(),
    )


@router.delete("/{artifact_id}/collaborators/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_collaborator(
    artifact_id: UUID,
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove a collaborator from an artifact."""
    # Verify ownership
    artifact_result = await db.execute(
        select(Artifact).where(
            and_(Artifact.id == artifact_id, Artifact.user_id == current_user.id)
        )
    )
    if not artifact_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Artifact not found")

    result = await db.execute(
        select(ArtifactCollaborator).where(
            and_(
                ArtifactCollaborator.artifact_id == artifact_id,
                ArtifactCollaborator.user_id == user_id,
            )
        )
    )
    collaborator = result.scalar_one_or_none()

    if not collaborator:
        raise HTTPException(status_code=404, detail="Collaborator not found")

    await db.delete(collaborator)
    await db.commit()

    logger.info("collaborator_removed", artifact_id=str(artifact_id), user_id=user_id)


# -----------------------------------------------------------------------------
# Search API Endpoints
# -----------------------------------------------------------------------------


class SearchRequest(BaseModel):
    """Schema for semantic search request."""

    query: str = Field(..., min_length=1, max_length=1000)
    limit: int = Field(default=20, ge=1, le=100)
    min_similarity: float = Field(default=0.3, ge=0.0, le=1.0)


class SearchResult(BaseModel):
    """Schema for a search result."""

    id: UUID
    title: str
    type: str
    similarity: float


class SearchResponse(BaseModel):
    """Schema for search response."""

    results: List[SearchResult]
    query: str


@router.post("/search", response_model=SearchResponse)
async def search_artifacts_endpoint(
    data: SearchRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Semantic search across user's artifacts.

    Uses pgvector for fast approximate nearest neighbor search.
    """
    from .embedding_service import search_artifacts

    results = await search_artifacts(
        db=db,
        user_id=current_user.id,
        query=data.query,
        limit=data.limit,
        min_similarity=data.min_similarity,
    )

    return SearchResponse(
        results=[
            SearchResult(
                id=r[0],
                title=r[1],
                type=r[2],
                similarity=r[3],
            )
            for r in results
        ],
        query=data.query,
    )


@router.get("/{artifact_id}/similar", response_model=SearchResponse)
async def find_similar_artifacts_endpoint(
    artifact_id: UUID,
    limit: int = Query(10, ge=1, le=50),
    min_similarity: float = Query(0.5, ge=0.0, le=1.0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Find artifacts similar to a given artifact.

    Uses the artifact's embedding to find semantically related artifacts.
    """
    from .embedding_service import find_similar_artifacts

    results = await find_similar_artifacts(
        db=db,
        artifact_id=artifact_id,
        user_id=current_user.id,
        limit=limit,
        min_similarity=min_similarity,
    )

    return SearchResponse(
        results=[
            SearchResult(
                id=r[0],
                title=r[1],
                type=r[2],
                similarity=r[3],
            )
            for r in results
        ],
        query=f"Similar to artifact {artifact_id}",
    )
