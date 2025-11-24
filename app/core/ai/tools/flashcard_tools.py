"""
Flashcard Tools

AI tools for flashcard manipulation and spaced repetition.
"""

from typing import Dict, Any, List
from .base import BaseTool, ToolPermission, ToolExecutionError
from app.core.module_system.registry import ModuleRegistry
import structlog

logger = structlog.get_logger()


class CreateFlashcardTool(BaseTool):
    """Create a new flashcard in a specific deck."""

    @property
    def name(self) -> str:
        return "create_flashcard"

    @property
    def description(self) -> str:
        return (
            "Create a new flashcard in a specific deck. "
            "The card will be added to the user's spaced repetition system. "
            "Use this when the user asks to add flashcards or create study materials."
        )

    @property
    def parameters(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "deck_id": {
                    "type": "integer",
                    "description": "ID of the deck to add the card to"
                },
                "front_text": {
                    "type": "string",
                    "description": "Text to display on the front of the card (the question)"
                },
                "back_text": {
                    "type": "string",
                    "description": "Text to display on the back of the card (the answer)"
                },
                "tags": {
                    "type": "array",
                    "description": "Optional tags for categorizing the card",
                    "items": {"type": "string"}
                }
            },
            "required": ["deck_id", "front_text", "back_text"]
        }

    @property
    def required_permissions(self) -> List[ToolPermission]:
        return [ToolPermission.WRITE]

    async def execute(self, user_id: int, **kwargs) -> Dict[str, Any]:
        """Execute flashcard creation."""
        try:
            # Get flashcard module
            registry = ModuleRegistry()
            flashcard_module = registry.get_module("flashcards")

            if not flashcard_module:
                raise ToolExecutionError("Flashcard module not available")

            # Create card through module
            card = await flashcard_module.create_content(
                user_id=user_id,
                data={
                    "deck_id": kwargs["deck_id"],
                    "front_text": kwargs["front_text"],
                    "back_text": kwargs["back_text"],
                    "tags": kwargs.get("tags", [])
                }
            )

            return {
                "success": True,
                "data": {
                    "card_id": card.id,
                    "deck_id": card.deck_id,
                    "front_text": card.front_text,
                    "next_review": card.next_review.isoformat() if card.next_review else None
                },
                "message": f"Flashcard created successfully in deck {kwargs['deck_id']}"
            }

        except Exception as e:
            logger.error(
                "flashcard_creation_failed",
                user_id=user_id,
                error=str(e)
            )
            return {
                "success": False,
                "data": {},
                "message": f"Failed to create flashcard: {str(e)}"
            }


class SearchFlashcardsTool(BaseTool):
    """Search flashcards by content using vector similarity."""

    @property
    def name(self) -> str:
        return "search_flashcards"

    @property
    def description(self) -> str:
        return (
            "Search through the user's flashcards using semantic search. "
            "Finds cards related to a query even if exact words don't match. "
            "Use this to find relevant study materials or check if content already exists."
        )

    @property
    def parameters(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Search query (can be a question, topic, or concept)"
                },
                "deck_id": {
                    "type": "integer",
                    "description": "Optional: Limit search to specific deck"
                },
                "limit": {
                    "type": "integer",
                    "description": "Maximum number of results to return",
                    "default": 5
                }
            },
            "required": ["query"]
        }

    @property
    def required_permissions(self) -> List[ToolPermission]:
        return [ToolPermission.READ]

    async def execute(self, user_id: int, **kwargs) -> Dict[str, Any]:
        """Execute flashcard search."""
        try:
            registry = ModuleRegistry()
            flashcard_module = registry.get_module("flashcards")

            if not flashcard_module:
                raise ToolExecutionError("Flashcard module not available")

            # Search cards
            cards = await flashcard_module.search_content(
                user_id=user_id,
                query=kwargs["query"],
                filters={
                    "deck_id": kwargs.get("deck_id"),
                    "limit": kwargs.get("limit", 5)
                }
            )

            # Format results
            results = [
                {
                    "card_id": card.id,
                    "deck_id": card.deck_id,
                    "front_text": card.front_text,
                    "back_text": card.back_text,
                    "learning_state": card.learning_state,
                    "times_reviewed": card.times_reviewed
                }
                for card in cards
            ]

            return {
                "success": True,
                "data": {
                    "results": results,
                    "count": len(results),
                    "query": kwargs["query"]
                },
                "message": f"Found {len(results)} matching flashcards"
            }

        except Exception as e:
            logger.error(
                "flashcard_search_failed",
                user_id=user_id,
                query=kwargs.get("query"),
                error=str(e)
            )
            return {
                "success": False,
                "data": {"results": [], "count": 0},
                "message": f"Search failed: {str(e)}"
            }


class GetDueCardsTool(BaseTool):
    """Get flashcards due for review based on spaced repetition."""

    @property
    def name(self) -> str:
        return "get_due_cards"

    @property
    def description(self) -> str:
        return (
            "Get flashcards that are due for review according to the spaced repetition algorithm. "
            "Use this to show the user what they should study now. "
            "Can filter by specific deck if needed."
        )

    @property
    def parameters(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "deck_id": {
                    "type": "integer",
                    "description": "Optional: Get due cards from specific deck only"
                },
                "limit": {
                    "type": "integer",
                    "description": "Maximum number of cards to return",
                    "default": 20
                }
            },
            "required": []
        }

    @property
    def required_permissions(self) -> List[ToolPermission]:
        return [ToolPermission.READ]

    async def execute(self, user_id: int, **kwargs) -> Dict[str, Any]:
        """Execute due cards retrieval."""
        try:
            registry = ModuleRegistry()
            flashcard_module = registry.get_module("flashcards")

            if not flashcard_module:
                raise ToolExecutionError("Flashcard module not available")

            # Get due cards
            cards = await flashcard_module.get_study_items(
                user_id=user_id,
                limit=kwargs.get("limit", 20)
            )

            # Filter by deck if specified
            if kwargs.get("deck_id"):
                cards = [c for c in cards if c.deck_id == kwargs["deck_id"]]

            # Format results
            due_cards = [
                {
                    "card_id": card.id,
                    "deck_id": card.deck_id,
                    "deck_name": card.deck.name if hasattr(card, "deck") else None,
                    "front_text": card.front_text,
                    "ease_factor": float(card.ease_factor),
                    "interval": card.interval,
                    "times_reviewed": card.times_reviewed,
                    "next_review": card.next_review.isoformat() if card.next_review else None
                }
                for card in cards
            ]

            return {
                "success": True,
                "data": {
                    "due_cards": due_cards,
                    "count": len(due_cards)
                },
                "message": f"{len(due_cards)} cards are due for review"
            }

        except Exception as e:
            logger.error(
                "get_due_cards_failed",
                user_id=user_id,
                error=str(e)
            )
            return {
                "success": False,
                "data": {"due_cards": [], "count": 0},
                "message": f"Failed to get due cards: {str(e)}"
            }


class UpdateFlashcardTool(BaseTool):
    """Update an existing flashcard's content."""

    @property
    def name(self) -> str:
        return "update_flashcard"

    @property
    def description(self) -> str:
        return (
            "Update the content of an existing flashcard. "
            "Use this to correct errors, improve wording, or add information. "
            "This does NOT record a review - use record_review for that."
        )

    @property
    def parameters(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "card_id": {
                    "type": "integer",
                    "description": "ID of the card to update"
                },
                "front_text": {
                    "type": "string",
                    "description": "New text for the front of the card"
                },
                "back_text": {
                    "type": "string",
                    "description": "New text for the back of the card"
                }
            },
            "required": ["card_id"]
        }

    @property
    def required_permissions(self) -> List[ToolPermission]:
        return [ToolPermission.WRITE]

    async def execute(self, user_id: int, **kwargs) -> Dict[str, Any]:
        """Execute flashcard update."""
        try:
            registry = ModuleRegistry()
            flashcard_module = registry.get_module("flashcards")

            if not flashcard_module:
                raise ToolExecutionError("Flashcard module not available")

            # Build update data
            update_data = {}
            if "front_text" in kwargs:
                update_data["front_text"] = kwargs["front_text"]
            if "back_text" in kwargs:
                update_data["back_text"] = kwargs["back_text"]

            # Update card
            card = await flashcard_module.update_content(
                user_id=user_id,
                content_id=kwargs["card_id"],
                data=update_data
            )

            return {
                "success": True,
                "data": {
                    "card_id": card.id,
                    "front_text": card.front_text,
                    "back_text": card.back_text
                },
                "message": "Flashcard updated successfully"
            }

        except Exception as e:
            logger.error(
                "flashcard_update_failed",
                user_id=user_id,
                card_id=kwargs.get("card_id"),
                error=str(e)
            )
            return {
                "success": False,
                "data": {},
                "message": f"Failed to update flashcard: {str(e)}"
            }
