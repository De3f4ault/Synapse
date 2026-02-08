"""
Link Tools

AI tools for managing entity links and knowledge graph operations.
These allow the AI to discover, create, and navigate connections between content.
"""

from typing import Dict, Any, List, Optional
from .base import BaseTool, ToolPermission, ToolExecutionError
import structlog

logger = structlog.get_logger()


class GetRelatedContentTool(BaseTool):
    """
    Find content related to a given entity using links and semantic similarity.

    This is a key tool for surfacing interconnected knowledge to users.
    """

    @property
    def name(self) -> str:
        return "get_related_content"

    @property
    def description(self) -> str:
        return (
            "Find content related to a specific entity (note, deck, document, quiz). "
            "Returns both explicitly linked items and semantically similar content. "
            "Use this to help users discover connections in their knowledge base."
        )

    @property
    def parameters(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "entity_type": {
                    "type": "string",
                    "description": "Type of entity: 'note', 'deck', 'document', 'quiz', 'flashcard'",
                    "enum": ["note", "deck", "document", "quiz", "flashcard"],
                },
                "entity_id": {
                    "type": "integer",
                    "description": "ID of the entity to find related content for",
                },
                "include_suggested": {
                    "type": "boolean",
                    "description": "Include AI-suggested links (default: true)",
                    "default": True,
                },
                "limit": {
                    "type": "integer",
                    "description": "Maximum number of related items to return (default: 10)",
                    "default": 10,
                },
            },
            "required": ["entity_type", "entity_id"],
        }

    @property
    def required_permissions(self) -> List[ToolPermission]:
        return [ToolPermission.READ]

    async def execute(self, user_id: int, **kwargs) -> Dict[str, Any]:
        """Execute related content retrieval."""
        try:
            from app.models.link import LinkEntityType
            from app.services.link_service import LinkService
            from app.db.session import get_async_session

            entity_type_str = kwargs.get("entity_type")
            entity_id = kwargs.get("entity_id")
            include_suggested = kwargs.get("include_suggested", True)
            limit = kwargs.get("limit", 10)

            # Convert string to LinkEntityType enum
            entity_type = LinkEntityType(entity_type_str)

            async with get_async_session() as session:
                service = LinkService(session)

                # Get explicit links
                links_data = await service.get_all_links_for(
                    user_id=user_id, entity_type=entity_type, entity_id=entity_id
                )

                # Get suggested links if requested
                suggested = []
                if include_suggested:
                    suggested = await service.get_suggested_links(
                        user_id=user_id, entity_type=entity_type, entity_id=entity_id, limit=limit
                    )

            # Format results
            related = []
            for link in links_data["outgoing"][:limit]:
                related.append(
                    {
                        "type": link.target_type.value,
                        "id": link.target_id,
                        "link_type": link.link_type.value,
                        "direction": "outgoing",
                        "strength": link.strength,
                        "label": link.label,
                    }
                )

            for link in links_data["backlinks"][:limit]:
                related.append(
                    {
                        "type": link.source_type.value,
                        "id": link.source_id,
                        "link_type": link.link_type.value,
                        "direction": "incoming",
                        "strength": link.strength,
                        "label": link.label,
                    }
                )

            suggested_items = [
                {
                    "type": link.target_type.value,
                    "id": link.target_id,
                    "strength": link.strength,
                    "label": link.label,
                }
                for link in suggested
            ]

            return {
                "success": True,
                "data": {
                    "entity": f"{entity_type_str}:{entity_id}",
                    "related": related[:limit],
                    "suggested": suggested_items[:limit],
                },
                "message": f"Found {len(related)} linked items and {len(suggested_items)} suggestions",
            }

        except Exception as e:
            logger.error("get_related_content_failed", user_id=user_id, error=str(e))
            return {
                "success": False,
                "data": {},
                "message": f"Failed to get related content: {str(e)}",
            }


class CreateLinkTool(BaseTool):
    """
    Create a link between two entities in the knowledge graph.

    AI can use this to help users build connections between their content.
    """

    @property
    def name(self) -> str:
        return "create_link"

    @property
    def description(self) -> str:
        return (
            "Create a connection between two entities in the user's knowledge graph. "
            "Use this when you identify a meaningful relationship between content items. "
            "Links help users navigate related content and build a connected knowledge base."
        )

    @property
    def parameters(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "source_type": {
                    "type": "string",
                    "description": "Type of source entity",
                    "enum": ["note", "deck", "document", "quiz", "flashcard"],
                },
                "source_id": {"type": "integer", "description": "ID of the source entity"},
                "target_type": {
                    "type": "string",
                    "description": "Type of target entity",
                    "enum": ["note", "deck", "document", "quiz", "flashcard"],
                },
                "target_id": {"type": "integer", "description": "ID of the target entity"},
                "label": {
                    "type": "string",
                    "description": "Optional human-readable label for the link (e.g., 'relates to', 'expands on')",
                },
                "reason": {
                    "type": "string",
                    "description": "Reason for creating this link (stored in metadata)",
                },
            },
            "required": ["source_type", "source_id", "target_type", "target_id"],
        }

    @property
    def required_permissions(self) -> List[ToolPermission]:
        return [ToolPermission.WRITE]

    async def execute(self, user_id: int, **kwargs) -> Dict[str, Any]:
        """Execute link creation."""
        try:
            from app.models.link import LinkEntityType, LinkType
            from app.services.link_service import LinkService
            from app.db.session import get_async_session

            source_type = LinkEntityType(kwargs.get("source_type"))
            source_id = kwargs.get("source_id")
            target_type = LinkEntityType(kwargs.get("target_type"))
            target_id = kwargs.get("target_id")
            label = kwargs.get("label")
            reason = kwargs.get("reason")

            async with get_async_session() as session:
                service = LinkService(session)

                link = await service.create_link(
                    user_id=user_id,
                    source_type=source_type,
                    source_id=source_id,
                    target_type=target_type,
                    target_id=target_id,
                    link_type=LinkType.MANUAL,  # AI-created links are treated as manual
                    label=label,
                    metadata={"ai_reason": reason} if reason else None,
                )

            return {
                "success": True,
                "data": {
                    "link_id": link.id,
                    "source": f"{source_type.value}:{source_id}",
                    "target": f"{target_type.value}:{target_id}",
                    "label": label,
                },
                "message": f"Created link between {source_type.value} and {target_type.value}",
            }

        except Exception as e:
            logger.error("create_link_failed", user_id=user_id, error=str(e))
            return {"success": False, "data": {}, "message": f"Failed to create link: {str(e)}"}


class GetKnowledgeGraphTool(BaseTool):
    """
    Get the user's knowledge graph structure.

    Useful for understanding how the user's knowledge is organized.
    """

    @property
    def name(self) -> str:
        return "get_knowledge_graph"

    @property
    def description(self) -> str:
        return (
            "Get an overview of the user's knowledge graph structure. "
            "Returns statistics and a summary of how their content is connected. "
            "Use this to understand the user's knowledge organization."
        )

    @property
    def parameters(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "entity_types": {
                    "type": "array",
                    "description": "Filter to specific entity types",
                    "items": {"type": "string", "enum": ["note", "deck", "document", "quiz"]},
                }
            },
            "required": [],
        }

    @property
    def required_permissions(self) -> List[ToolPermission]:
        return [ToolPermission.READ]

    async def execute(self, user_id: int, **kwargs) -> Dict[str, Any]:
        """Execute knowledge graph retrieval."""
        try:
            from app.models.link import LinkEntityType
            from app.services.link_service import LinkService
            from app.db.session import get_async_session

            entity_types_str = kwargs.get("entity_types")
            entity_types = None
            if entity_types_str:
                entity_types = [LinkEntityType(t) for t in entity_types_str]

            async with get_async_session() as session:
                service = LinkService(session)

                graph_data = await service.get_knowledge_graph(
                    user_id=user_id, entity_types=entity_types, include_suggested=False
                )

            return {
                "success": True,
                "data": {
                    "total_nodes": graph_data["stats"]["total_nodes"],
                    "total_edges": graph_data["stats"]["total_edges"],
                    "summary": f"Knowledge graph has {graph_data['stats']['total_nodes']} nodes and {graph_data['stats']['total_edges']} connections",
                },
                "message": "Knowledge graph summary retrieved",
            }

        except Exception as e:
            logger.error("get_knowledge_graph_failed", user_id=user_id, error=str(e))
            return {
                "success": False,
                "data": {},
                "message": f"Failed to get knowledge graph: {str(e)}",
            }


class SuggestLinksTool(BaseTool):
    """
    AI suggests potential links based on content similarity.

    This proactively helps users discover connections they might have missed.
    """

    @property
    def name(self) -> str:
        return "suggest_links"

    @property
    def description(self) -> str:
        return (
            "Find potential links to suggest to the user based on content similarity. "
            "Analyzes the content of an entity and finds semantically related items. "
            "Suggestions can be accepted or dismissed by the user."
        )

    @property
    def parameters(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "entity_type": {
                    "type": "string",
                    "description": "Type of entity to find suggestions for",
                    "enum": ["note", "deck", "document", "quiz"],
                },
                "entity_id": {"type": "integer", "description": "ID of the entity"},
                "limit": {
                    "type": "integer",
                    "description": "Maximum suggestions to return",
                    "default": 5,
                },
            },
            "required": ["entity_type", "entity_id"],
        }

    @property
    def required_permissions(self) -> List[ToolPermission]:
        return [ToolPermission.READ]

    async def execute(self, user_id: int, **kwargs) -> Dict[str, Any]:
        """Execute link suggestion."""
        try:
            # For now, return pending suggestions from the link service
            # Future: Integrate with RAG for semantic similarity detection
            from app.models.link import LinkEntityType
            from app.services.link_service import LinkService
            from app.db.session import get_async_session

            entity_type = LinkEntityType(kwargs.get("entity_type"))
            entity_id = kwargs.get("entity_id")
            limit = kwargs.get("limit", 5)

            async with get_async_session() as session:
                service = LinkService(session)

                suggested = await service.get_suggested_links(
                    user_id=user_id, entity_type=entity_type, entity_id=entity_id, limit=limit
                )

            suggestions = [
                {
                    "link_id": link.id,
                    "target_type": link.target_type.value,
                    "target_id": link.target_id,
                    "strength": link.strength,
                    "label": link.label,
                }
                for link in suggested
            ]

            return {
                "success": True,
                "data": {
                    "entity": f"{kwargs.get('entity_type')}:{entity_id}",
                    "suggestions": suggestions,
                },
                "message": f"Found {len(suggestions)} link suggestions",
            }

        except Exception as e:
            logger.error("suggest_links_failed", user_id=user_id, error=str(e))
            return {"success": False, "data": {}, "message": f"Failed to suggest links: {str(e)}"}
