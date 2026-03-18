"""
Graph Linker — Auto-Wiring Service for the Knowledge Graph.

Creates links automatically when entities are generated from other entities.
Called at the BUSINESS LOGIC layer (not CRUD), where provenance context
(which document produced which flashcard, etc.) is available.

Design principles:
    - Single entry point: on_entity_created() handles all entity types.
    - Idempotent: delegates to LinkService.create_link (upsert).
    - Direction convention: source → target (producer → produced).
    - Event-bus-ready: signatures are generic enough to extract to an
      event system later without changing callers.

Usage:
    linker = GraphLinker(session)
    await linker.on_entity_created(
        user_id=1,
        entity_type=LinkEntityType.FLASHCARD,
        entity_id=42,
        source_refs=[(LinkEntityType.DOCUMENT, 7), (LinkEntityType.DECK, 3)],
        label="generated from",
        metadata={"method": "ai", "model": "gpt-4"},
    )
"""

from typing import List, Optional, Tuple

from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from app.models.link import Link, LinkType, LinkEntityType
from app.services.graph.link_service import LinkService

logger = structlog.get_logger(__name__)


class GraphLinker:
    """
    Auto-wiring service for the knowledge graph.

    Called from business logic methods (e.g., flashcard generation,
    quiz creation) to automatically create DERIVED links that record
    provenance and build the graph incrementally.
    """

    def __init__(self, session: AsyncSession):
        self.session = session
        self.link_service = LinkService(session)

    async def on_entity_created(
        self,
        user_id: int,
        entity_type: LinkEntityType,
        entity_id: int,
        source_refs: List[Tuple[LinkEntityType, int]],
        link_type: LinkType = LinkType.DERIVED,
        strength: float = 1.0,
        label: Optional[str] = None,
        metadata: Optional[dict] = None,
    ) -> List[Link]:
        """
        Record that an entity was created from one or more source entities.

        Creates a directed link from each source to the new entity.
        Idempotent — safe to call multiple times for the same arguments.

        Args:
            user_id:      Owner user ID.
            entity_type:  Type of the newly created entity.
            entity_id:    ID of the newly created entity.
            source_refs:  List of (source_type, source_id) tuples that
                          the entity was created from.
            link_type:    Relationship type (default: DERIVED).
            strength:     Link strength 0.0–1.0 (default: 1.0).
            label:        Human-readable relationship label
                          (e.g., "generated from", "derived from").
            metadata:     Machine-readable context
                          (e.g., {"method": "ai", "model": "gpt-4"}).

        Returns:
            List of created/updated Link instances.
        """
        if not source_refs:
            logger.debug(
                "graph_linker_no_sources",
                entity=f"{entity_type.value}:{entity_id}",
            )
            return []

        created_links: List[Link] = []

        for source_type, source_id in source_refs:
            # Skip self-links (shouldn't happen, but guard defensively)
            if source_type == entity_type and source_id == entity_id:
                logger.warning(
                    "graph_linker_self_link_skipped",
                    entity=f"{entity_type.value}:{entity_id}",
                )
                continue

            link = await self.link_service.create_link(
                user_id=user_id,
                source_type=source_type,
                source_id=source_id,
                target_type=entity_type,
                target_id=entity_id,
                link_type=link_type,
                strength=strength,
                label=label,
                metadata=metadata,
            )
            created_links.append(link)

        logger.info(
            "graph_linker_wired",
            entity=f"{entity_type.value}:{entity_id}",
            links_created=len(created_links),
            sources=[f"{st.value}:{sid}" for st, sid in source_refs],
        )

        return created_links

    async def on_entity_deleted(
        self,
        user_id: int,
        entity_type: LinkEntityType,
        entity_id: int,
    ) -> int:
        """
        Remove all links to/from a deleted entity.

        Should be called within the same transaction as the entity deletion
        to prevent orphaned links.

        Args:
            user_id:     Owner user ID.
            entity_type: Type of the deleted entity.
            entity_id:   ID of the deleted entity.

        Returns:
            Number of links deleted.
        """
        deleted = await self.link_service.delete_links_for_entity(
            user_id=user_id,
            entity_type=entity_type,
            entity_id=entity_id,
        )

        logger.info(
            "graph_linker_cleaned",
            entity=f"{entity_type.value}:{entity_id}",
            links_deleted=deleted,
        )

        return deleted
