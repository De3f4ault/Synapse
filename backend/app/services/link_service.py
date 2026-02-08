"""
Link Service

Business logic for managing entity links and knowledge graph operations.
"""

from typing import Dict, List, Optional, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_, delete
from sqlalchemy.orm import selectinload
import structlog

from app.models.link import Link, LinkType, LinkEntityType
from app.models.note import Note
from app.models.deck import Deck
from app.models.document import Document
from app.models.quiz import Quiz


logger = structlog.get_logger(__name__)


class LinkService:
    """
    Service layer for link operations.

    Handles:
    - CRUD operations for links
    - Graph queries (forward links, backlinks)
    - Knowledge graph data for visualization
    """

    def __init__(self, session: AsyncSession):
        """Initialize service with database session."""
        self.session = session

    # -------------------------------------------------------------------------
    # CRUD Operations
    # -------------------------------------------------------------------------

    async def create_link(
        self,
        user_id: int,
        source_type: LinkEntityType,
        source_id: int,
        target_type: LinkEntityType,
        target_id: int,
        link_type: LinkType = LinkType.MANUAL,
        strength: float = 1.0,
        label: Optional[str] = None,
        metadata: Optional[dict] = None,
    ) -> Link:
        """
        Create a new link between entities.

        Args:
            user_id: Owner user ID
            source_type: Type of source entity
            source_id: ID of source entity
            target_type: Type of target entity
            target_id: ID of target entity
            link_type: Type of link relationship
            strength: Link strength (0.0-1.0)
            label: Optional human-readable label
            metadata: Optional additional metadata

        Returns:
            Created Link instance
        """
        # Check if link already exists
        existing = await self.get_link_between(
            user_id, source_type, source_id, target_type, target_id
        )
        if existing:
            logger.info(
                "link_already_exists",
                link_id=existing.id,
                source=f"{source_type.value}:{source_id}",
                target=f"{target_type.value}:{target_id}",
            )
            return existing

        link = Link(
            user_id=user_id,
            source_type=source_type,
            source_id=source_id,
            target_type=target_type,
            target_id=target_id,
            link_type=link_type,
            strength=strength,
            label=label,
            link_metadata=metadata or {},
        )

        self.session.add(link)
        await self.session.commit()
        await self.session.refresh(link)

        logger.info(
            "link_created",
            link_id=link.id,
            source=f"{source_type.value}:{source_id}",
            target=f"{target_type.value}:{target_id}",
            link_type=link_type.value,
        )

        return link

    async def get_link(self, link_id: int, user_id: int) -> Optional[Link]:
        """Get a link by ID."""
        result = await self.session.execute(
            select(Link).where(and_(Link.id == link_id, Link.user_id == user_id))
        )
        return result.scalar_one_or_none()

    async def get_link_between(
        self,
        user_id: int,
        source_type: LinkEntityType,
        source_id: int,
        target_type: LinkEntityType,
        target_id: int,
    ) -> Optional[Link]:
        """Get a specific link between two entities."""
        result = await self.session.execute(
            select(Link).where(
                and_(
                    Link.user_id == user_id,
                    Link.source_type == source_type,
                    Link.source_id == source_id,
                    Link.target_type == target_type,
                    Link.target_id == target_id,
                )
            )
        )
        return result.scalar_one_or_none()

    async def update_link(self, link_id: int, user_id: int, **kwargs) -> Optional[Link]:
        """Update link properties."""
        link = await self.get_link(link_id, user_id)
        if not link:
            return None

        for key, value in kwargs.items():
            if hasattr(link, key) and value is not None:
                setattr(link, key, value)

        await self.session.commit()
        await self.session.refresh(link)

        logger.info("link_updated", link_id=link_id)
        return link

    async def delete_link(self, link_id: int, user_id: int) -> bool:
        """Delete a link by ID."""
        link = await self.get_link(link_id, user_id)
        if not link:
            return False

        await self.session.delete(link)
        await self.session.commit()

        logger.info("link_deleted", link_id=link_id)
        return True

    async def accept_suggested_link(self, link_id: int, user_id: int) -> Optional[Link]:
        """Accept a suggested link, converting it to manual."""
        return await self.update_link(link_id, user_id, link_type=LinkType.MANUAL)

    async def dismiss_suggested_link(self, link_id: int, user_id: int) -> bool:
        """Dismiss (delete) a suggested link."""
        return await self.delete_link(link_id, user_id)

    # -------------------------------------------------------------------------
    # Query Operations
    # -------------------------------------------------------------------------

    async def get_links_from(
        self,
        user_id: int,
        entity_type: LinkEntityType,
        entity_id: int,
        link_types: Optional[List[LinkType]] = None,
    ) -> List[Link]:
        """
        Get all links FROM an entity (outgoing).

        Args:
            user_id: Owner user ID
            entity_type: Type of source entity
            entity_id: ID of source entity
            link_types: Optional filter by link types

        Returns:
            List of outgoing links
        """
        query = select(Link).where(
            and_(
                Link.user_id == user_id,
                Link.source_type == entity_type,
                Link.source_id == entity_id,
            )
        )

        if link_types:
            query = query.where(Link.link_type.in_(link_types))

        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def get_links_to(
        self,
        user_id: int,
        entity_type: LinkEntityType,
        entity_id: int,
        link_types: Optional[List[LinkType]] = None,
    ) -> List[Link]:
        """
        Get all links TO an entity (backlinks).

        Args:
            user_id: Owner user ID
            entity_type: Type of target entity
            entity_id: ID of target entity
            link_types: Optional filter by link types

        Returns:
            List of backlinks
        """
        query = select(Link).where(
            and_(
                Link.user_id == user_id,
                Link.target_type == entity_type,
                Link.target_id == entity_id,
            )
        )

        if link_types:
            query = query.where(Link.link_type.in_(link_types))

        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def get_all_links_for(
        self, user_id: int, entity_type: LinkEntityType, entity_id: int
    ) -> Dict[str, List[Link]]:
        """
        Get both outgoing links and backlinks for an entity.

        Returns:
            Dict with 'outgoing' and 'backlinks' lists
        """
        outgoing = await self.get_links_from(user_id, entity_type, entity_id)
        backlinks = await self.get_links_to(user_id, entity_type, entity_id)

        return {"outgoing": outgoing, "backlinks": backlinks}

    async def get_suggested_links(
        self,
        user_id: int,
        entity_type: Optional[LinkEntityType] = None,
        entity_id: Optional[int] = None,
        limit: int = 20,
    ) -> List[Link]:
        """Get pending suggested links for review."""
        query = select(Link).where(
            and_(Link.user_id == user_id, Link.link_type == LinkType.SUGGESTED)
        )

        if entity_type and entity_id:
            query = query.where(
                or_(
                    and_(Link.source_type == entity_type, Link.source_id == entity_id),
                    and_(Link.target_type == entity_type, Link.target_id == entity_id),
                )
            )

        query = query.order_by(Link.strength.desc()).limit(limit)

        result = await self.session.execute(query)
        return list(result.scalars().all())

    # -------------------------------------------------------------------------
    # Knowledge Graph Operations
    # -------------------------------------------------------------------------

    async def get_knowledge_graph(
        self,
        user_id: int,
        entity_types: Optional[List[LinkEntityType]] = None,
        link_types: Optional[List[LinkType]] = None,
        include_suggested: bool = False,
        include_disconnected: bool = True,
    ) -> Dict[str, Any]:
        """
        Get full knowledge graph data for visualization.

        Args:
            user_id: Owner user ID
            entity_types: Optional filter by entity types
            link_types: Optional filter by link types
            include_suggested: Whether to include suggested links
            include_disconnected: Whether to include nodes that have no links

        Returns:
            Dict with 'nodes' and 'edges' for graph rendering
        """
        # Build query
        query = select(Link).where(Link.user_id == user_id)

        if not include_suggested:
            query = query.where(Link.link_type != LinkType.SUGGESTED)

        if link_types:
            query = query.where(Link.link_type.in_(link_types))

        result = await self.session.execute(query)
        links = list(result.scalars().all())

        # Build nodes set and edges list
        nodes_dict = {}  # Map "type:id" -> Node dict
        edges = []

        for link in links:
            # Filter by entity types if specified
            if entity_types:
                if link.source_type not in entity_types or link.target_type not in entity_types:
                    continue

            source_key = link.source_key
            target_key = link.target_key

            # Add source node placeholder if missing (will be populated fully later or just exist as ID)
            if source_key not in nodes_dict:
                nodes_dict[source_key] = {
                    "id": source_key,
                    "type": link.source_type.value,
                    "entity_id": link.source_id,
                    "label": f"Entity {link.source_id}",  # Placeholder
                }

            # Add target node placeholder if missing
            if target_key not in nodes_dict:
                nodes_dict[target_key] = {
                    "id": target_key,
                    "type": link.target_type.value,
                    "entity_id": link.target_id,
                    "label": f"Entity {link.target_id}",  # Placeholder
                }

            edges.append(
                {
                    "id": link.id,
                    "source": source_key,
                    "target": target_key,
                    "type": link.link_type.value,
                    "strength": link.strength,
                    "label": link.label,
                }
            )

        # --- Populate Disconnected Nodes & Enrich Labels ---

        # Determine which entity types to fetch
        types_to_fetch = (
            entity_types
            if entity_types
            else [
                LinkEntityType.NOTE,
                LinkEntityType.DECK,
                LinkEntityType.DOCUMENT,
                LinkEntityType.QUIZ,
            ]
        )

        # Fetch all entities for requested types
        if include_disconnected:
            # If we want disconnected, we just fetch ALL items and merge/overwrite
            pass
        else:
            # Only fetch items that are already in nodes_dict (to get their labels)
            # But honestly, fetching all user items is usually cleaner/easier than many individual queries
            # unless the user has thousands of items.
            # For now, let's fetch all active items for each type to correctly populate labels AND adding disconnected ones.
            pass

        # Helper to process entities
        async def process_entities(model, entity_type, label_field):
            if entity_type not in types_to_fetch:
                return

            stmt = select(model).where(model.user_id == user_id)
            # Add soft delete check if applicable (Note, Deck, Quiz, Document have SoftDeleteMixin)
            if hasattr(model, "deleted_at"):
                stmt = stmt.where(model.deleted_at.is_(None))

            items = (await self.session.execute(stmt)).scalars().all()

            for item in items:
                key = f"{entity_type.value}:{item.id}"

                # If we're including disconnected OR this node is already in the graph
                if include_disconnected or key in nodes_dict:
                    nodes_dict[key] = {
                        "id": key,
                        "type": entity_type.value,
                        "entity_id": item.id,
                        "label": getattr(item, label_field),
                    }

        # Run fetch operations concurrently-ish (sequentially awaited here but efficient enough)
        await process_entities(Note, LinkEntityType.NOTE, "title")
        await process_entities(Deck, LinkEntityType.DECK, "name")
        await process_entities(Document, LinkEntityType.DOCUMENT, "filename")
        await process_entities(Quiz, LinkEntityType.QUIZ, "title")
        # Chat sessions might be separate or added here if needed, keeping to core content for now

        nodes = list(nodes_dict.values())

        logger.info(
            "knowledge_graph_retrieved",
            user_id=user_id,
            node_count=len(nodes),
            edge_count=len(edges),
        )

        return {
            "nodes": nodes,
            "edges": edges,
            "stats": {"total_nodes": len(nodes), "total_edges": len(edges)},
        }

    async def get_connected_entities(
        self, user_id: int, entity_type: LinkEntityType, entity_id: int, depth: int = 1
    ) -> List[Dict[str, Any]]:
        """
        Get all entities connected to a given entity (up to specified depth).

        Args:
            user_id: Owner user ID
            entity_type: Starting entity type
            entity_id: Starting entity ID
            depth: How many hops to traverse (default 1)

        Returns:
            List of connected entity info dicts
        """
        visited = set()
        connected = []

        async def traverse(etype: LinkEntityType, eid: int, current_depth: int):
            if current_depth > depth:
                return

            key = f"{etype.value}:{eid}"
            if key in visited:
                return
            visited.add(key)

            # Get all links from/to this entity
            links_data = await self.get_all_links_for(user_id, etype, eid)

            for link in links_data["outgoing"]:
                target_key = link.target_key
                if target_key not in visited:
                    connected.append(
                        {
                            "type": link.target_type.value,
                            "id": link.target_id,
                            "link_type": link.link_type.value,
                            "direction": "outgoing",
                            "depth": current_depth,
                        }
                    )
                    await traverse(link.target_type, link.target_id, current_depth + 1)

            for link in links_data["backlinks"]:
                source_key = link.source_key
                if source_key not in visited:
                    connected.append(
                        {
                            "type": link.source_type.value,
                            "id": link.source_id,
                            "link_type": link.link_type.value,
                            "direction": "incoming",
                            "depth": current_depth,
                        }
                    )
                    await traverse(link.source_type, link.source_id, current_depth + 1)

        await traverse(entity_type, entity_id, 1)
        return connected

    # -------------------------------------------------------------------------
    # Bulk Operations
    # -------------------------------------------------------------------------

    async def delete_links_for_entity(
        self, user_id: int, entity_type: LinkEntityType, entity_id: int
    ) -> int:
        """
        Delete all links to/from an entity (called when entity is deleted).

        Returns:
            Number of links deleted
        """
        result = await self.session.execute(
            delete(Link).where(
                and_(
                    Link.user_id == user_id,
                    or_(
                        and_(Link.source_type == entity_type, Link.source_id == entity_id),
                        and_(Link.target_type == entity_type, Link.target_id == entity_id),
                    ),
                )
            )
        )
        await self.session.commit()

        deleted_count = result.rowcount
        logger.info(
            "links_deleted_for_entity",
            entity=f"{entity_type.value}:{entity_id}",
            count=deleted_count,
        )
        return deleted_count
