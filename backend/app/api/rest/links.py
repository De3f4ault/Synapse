"""
Links REST API endpoints.

Knowledge graph management and entity linking.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field
from app.schemas.common import MessageResponse
from datetime import datetime

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.link import Link, LinkType, LinkEntityType
from app.services.link_service import LinkService

router = APIRouter()


# ============================================================================
# Request/Response Schemas
# ============================================================================


class LinkCreate(BaseModel):
    """Link creation request."""

    source_type: LinkEntityType
    source_id: int
    target_type: LinkEntityType
    target_id: int
    link_type: LinkType = LinkType.MANUAL
    strength: float = Field(1.0, ge=0.0, le=1.0)
    label: Optional[str] = Field(None, max_length=255)
    link_metadata: Optional[dict] = None


class LinkUpdate(BaseModel):
    """Link update request."""

    strength: Optional[float] = Field(None, ge=0.0, le=1.0)
    label: Optional[str] = Field(None, max_length=255)
    link_type: Optional[LinkType] = None


class LinkResponse(BaseModel):
    """Link response."""

    id: int
    source_type: LinkEntityType
    source_id: int
    target_type: LinkEntityType
    target_id: int
    link_type: LinkType
    strength: float
    label: Optional[str]
    link_metadata: Optional[dict]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class EntityLinksResponse(BaseModel):
    """Response for all links associated with an entity."""

    outgoing: List[LinkResponse]
    backlinks: List[LinkResponse]


class GraphNode(BaseModel):
    """Node in knowledge graph."""

    id: str
    type: str
    entity_id: int
    label: Optional[str] = None


class GraphEdge(BaseModel):
    """Edge in knowledge graph."""

    id: int
    source: str
    target: str
    type: str
    strength: float
    label: Optional[str]


class GraphStats(BaseModel):
    """Graph statistics."""

    total_nodes: int
    total_edges: int


class KnowledgeGraphResponse(BaseModel):
    """Knowledge graph data for visualization."""

    nodes: List[GraphNode]
    edges: List[GraphEdge]
    stats: GraphStats


class ConnectedEntityResponse(BaseModel):
    """Connected entity info."""

    type: str
    id: int
    link_type: str
    direction: str
    depth: int




# ============================================================================
# Endpoints
# ============================================================================


@router.get(
    "",
    response_model=List[LinkResponse],
    summary="List all links",
    description="Get all links for the current user",
)
async def list_links(
    link_type: Optional[LinkType] = Query(None, description="Filter by link type"),
    source_type: Optional[LinkEntityType] = Query(None, description="Filter by source entity type"),
    target_type: Optional[LinkEntityType] = Query(None, description="Filter by target entity type"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List user's links with optional filtering."""
    from sqlalchemy import select

    query = select(Link).where(Link.user_id == current_user.id)

    if link_type:
        query = query.where(Link.link_type == link_type)
    if source_type:
        query = query.where(Link.source_type == source_type)
    if target_type:
        query = query.where(Link.target_type == target_type)

    query = query.offset((page - 1) * page_size).limit(page_size)
    query = query.order_by(Link.created_at.desc())

    result = await db.execute(query)
    links = result.scalars().all()

    return [LinkResponse.model_validate(link) for link in links]


@router.post(
    "",
    response_model=LinkResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create link",
    description="Create a new link between two entities",
)
async def create_link(
    link_data: LinkCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new link between entities."""
    service = LinkService(db)

    link = await service.create_link(
        user_id=current_user.id,
        source_type=link_data.source_type,
        source_id=link_data.source_id,
        target_type=link_data.target_type,
        target_id=link_data.target_id,
        link_type=link_data.link_type,
        strength=link_data.strength,
        label=link_data.label,
        metadata=link_data.link_metadata,
    )

    return LinkResponse.model_validate(link)


@router.get(
    "/graph",
    response_model=KnowledgeGraphResponse,
    summary="Get knowledge graph",
    description="Get full knowledge graph data for visualization",
)
async def get_knowledge_graph(
    entity_types: Optional[str] = Query(
        None, description="Filter by entity types (comma-separated)"
    ),
    link_types: Optional[str] = Query(None, description="Filter by link types (comma-separated)"),
    include_suggested: bool = Query(False, description="Include suggested links"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get knowledge graph for visualization."""
    service = LinkService(db)

    # Parse comma-separated filters
    entity_type_list = None
    if entity_types:
        entity_type_list = [LinkEntityType(t.strip()) for t in entity_types.split(",")]

    link_type_list = None
    if link_types:
        link_type_list = [LinkType(t.strip()) for t in link_types.split(",")]

    graph_data = await service.get_knowledge_graph(
        user_id=current_user.id,
        entity_types=entity_type_list,
        link_types=link_type_list,
        include_suggested=include_suggested,
    )

    return KnowledgeGraphResponse(
        nodes=[GraphNode(**node) for node in graph_data["nodes"]],
        edges=[GraphEdge(**edge) for edge in graph_data["edges"]],
        stats=GraphStats(**graph_data["stats"]),
    )


@router.get(
    "/entity/{entity_type}/{entity_id}",
    response_model=EntityLinksResponse,
    summary="Get entity links",
    description="Get all links to and from a specific entity",
)
async def get_entity_links(
    entity_type: LinkEntityType,
    entity_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all links for a specific entity."""
    service = LinkService(db)

    links_data = await service.get_all_links_for(
        user_id=current_user.id, entity_type=entity_type, entity_id=entity_id
    )

    return EntityLinksResponse(
        outgoing=[LinkResponse.model_validate(link) for link in links_data["outgoing"]],
        backlinks=[LinkResponse.model_validate(link) for link in links_data["backlinks"]],
    )


@router.get(
    "/entity/{entity_type}/{entity_id}/connected",
    response_model=List[ConnectedEntityResponse],
    summary="Get connected entities",
    description="Get all entities connected to a specific entity (traverses graph)",
)
async def get_connected_entities(
    entity_type: LinkEntityType,
    entity_id: int,
    depth: int = Query(1, ge=1, le=3, description="How many hops to traverse"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get entities connected to a specific entity."""
    service = LinkService(db)

    connected = await service.get_connected_entities(
        user_id=current_user.id, entity_type=entity_type, entity_id=entity_id, depth=depth
    )

    return [ConnectedEntityResponse(**c) for c in connected]


@router.get(
    "/suggested",
    response_model=List[LinkResponse],
    summary="Get suggested links",
    description="Get AI-suggested links pending user review",
)
async def get_suggested_links(
    entity_type: Optional[LinkEntityType] = Query(None, description="Filter by entity type"),
    entity_id: Optional[int] = Query(None, description="Filter by entity ID"),
    limit: int = Query(20, ge=1, le=100, description="Maximum results"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get suggested links for review."""
    service = LinkService(db)

    suggested = await service.get_suggested_links(
        user_id=current_user.id, entity_type=entity_type, entity_id=entity_id, limit=limit
    )

    return [LinkResponse.model_validate(link) for link in suggested]


@router.get(
    "/{link_id}",
    response_model=LinkResponse,
    summary="Get link",
    description="Get a specific link by ID",
)
async def get_link(
    link_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    """Get a specific link."""
    service = LinkService(db)
    link = await service.get_link(link_id, current_user.id)

    if not link:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Link not found")

    return LinkResponse.model_validate(link)


@router.put(
    "/{link_id}",
    response_model=LinkResponse,
    summary="Update link",
    description="Update link properties",
)
async def update_link(
    link_id: int,
    link_data: LinkUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing link."""
    service = LinkService(db)

    update_data = link_data.model_dump(exclude_none=True)
    link = await service.update_link(link_id, current_user.id, **update_data)

    if not link:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Link not found")

    return LinkResponse.model_validate(link)


@router.post(
    "/{link_id}/accept",
    response_model=LinkResponse,
    summary="Accept suggested link",
    description="Accept a suggested link, converting it to manual",
)
async def accept_link(
    link_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    """Accept a suggested link."""
    service = LinkService(db)

    link = await service.accept_suggested_link(link_id, current_user.id)

    if not link:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Link not found")

    return LinkResponse.model_validate(link)


@router.delete(
    "/{link_id}", response_model=MessageResponse, summary="Delete link", description="Delete a link"
)
async def delete_link(
    link_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    """Delete a link."""
    service = LinkService(db)

    deleted = await service.delete_link(link_id, current_user.id)

    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Link not found")

    return MessageResponse(message="Link deleted successfully")
