"""
Link / Knowledge Graph schemas.

Extracted from rest/links.py.
"""

from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field
from app.models.link import LinkType, LinkEntityType


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
