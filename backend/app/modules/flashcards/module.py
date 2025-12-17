"""
Flashcard Module Implementation

Implements the LearningModule interface for the flashcard module.
This module provides spaced repetition functionality using the SM-2 algorithm,
CRUD operations for decks and cards, and context contribution for AI agents.

The module registers itself with the ModuleRegistry on import and provides
all required methods for integration with the SYNAPSE system.
"""

from typing import Dict, List, Optional, Any
from sqlalchemy.ext.asyncio import AsyncSession

from .service import FlashcardService
from .repository import FlashcardRepository
from .constants import MODULE_NAME, MODULE_DISPLAY_NAME, MODULE_DESCRIPTION


class FlashcardModule:
    """
    Flashcard module implementation for SYNAPSE.

    Provides spaced repetition flashcard functionality with SM-2 algorithm,
    deck management, and integration with the AI context system.

    This module implements the LearningModule interface required by SYNAPSE.
    """

    def __init__(self, session: AsyncSession):
        """
        Initialize flashcard module.

        Args:
            session: AsyncSession injected by module loader
        """
        self.session = session
        self.service = FlashcardService(session)
        self.repository = FlashcardRepository(session)

    # ==================== MODULE INTERFACE ====================

    def get_name(self) -> str:
        """Return module identifier"""
        return MODULE_NAME

    def get_display_name(self) -> str:
        """Return human-readable module name"""
        return MODULE_DISPLAY_NAME

    def get_description(self) -> str:
        """Return module description"""
        return MODULE_DESCRIPTION

    def get_capabilities(self) -> List[str]:
        """
        Return list of module capabilities.

        Returns:
            List of capability flags: CREATE, READ, UPDATE, DELETE,
            SEARCH, STUDY, AI_GENERATE
        """
        return [
            "CREATE",
            "READ",
            "UPDATE",
            "DELETE",
            "SEARCH",
            "STUDY",
            "AI_GENERATE"
        ]

    # ==================== CONTENT OPERATIONS ====================

    async def create_content(self, user_id: int, data: Dict) -> Any:
        """
        Create flashcard content (deck or card).

        Args:
            user_id: User creating content
            data: Content data
                - For deck: {name, description, tags, is_public}
                - For card: {deck_id, front_text, back_text, ...}

        Returns:
            Created content as dict
        """
        # Determine if creating deck or card based on data
        if "deck_id" in data:
            # Creating a card
            return await self.service.create_card(user_id, data)
        else:
            # Creating a deck
            return await self.service.create_deck(user_id, data)

    async def get_content(
        self,
        user_id: int,
        filters: Optional[Dict] = None
    ) -> List[Any]:
        """
        Get user's flashcard content.

        Args:
            user_id: User ID
            filters: Optional filters (tags, deck_id, learning_state)

        Returns:
            List of content (decks or cards depending on filters)
        """
        filters = filters or {}

        # If no specific content type requested, return decks
        if "content_type" not in filters:
            return await self.service.list_decks(user_id, filters)

        # Return specific content type
        content_type = filters.pop("content_type")

        if content_type == "decks":
            return await self.service.list_decks(user_id, filters)
        elif content_type == "cards":
            # Would need to implement list_cards in service
            pass

        return []

    async def update_content(
        self,
        user_id: int,
        content_id: int,
        data: Dict
    ) -> Any:
        """
        Update flashcard content.

        Args:
            user_id: User updating content
            content_id: Content ID (deck or card)
            data: Updated fields

        Returns:
            Updated content
        """
        # Determine if updating deck or card based on data
        if "front_text" in data or "back_text" in data:
            # Updating a card
            return await self.service.update_card(content_id, user_id, data)
        else:
            # Updating a deck
            return await self.service.update_deck(content_id, user_id, data)

    async def delete_content(self, user_id: int, content_id: int) -> bool:
        """
        Delete flashcard content.

        Args:
            user_id: User deleting content
            content_id: Content ID

        Returns:
            True if deleted successfully
        """
        # For simplicity, assume deleting a deck
        # In real implementation, would need content_type parameter
        return await self.service.delete_deck(content_id, user_id)

    async def search_content(
        self,
        user_id: int,
        query: str,
        filters: Optional[Dict] = None
    ) -> List[Any]:
        """
        Search flashcards using vector similarity.

        This would use Qdrant for semantic search across card content.

        Args:
            user_id: User ID
            query: Search query
            filters: Optional filters

        Returns:
            List of matching cards with similarity scores
        """
        # Placeholder - would implement vector search via Qdrant
        # For now, return empty list
        return []

    # ==================== STUDY OPERATIONS ====================

    async def get_study_items(
        self,
        user_id: int,
        limit: int = 20
    ) -> List[Any]:
        """
        Get study items (due cards) for user.

        This is the primary study interface - returns cards due for review
        prioritized by SM-2 algorithm.

        Args:
            user_id: User ID
            limit: Maximum cards to return

        Returns:
            List of due cards with priority scores
        """
        return await self.service.get_due_cards(user_id, limit=limit)

    async def record_study_result(
        self,
        user_id: int,
        item_id: int,
        result: Dict
    ) -> Any:
        """
        Record study result (card review).

        Args:
            user_id: User ID
            item_id: Card ID
            result: Review result containing quality rating

        Returns:
            Review result with next_review date and updated SM-2 values
        """
        quality = result.get("quality", 0)
        return await self.service.review_card(item_id, user_id, quality)

    # ==================== AI INTEGRATION ====================

    async def contribute_context(
        self,
        user_id: int,
        query: str
    ) -> Dict:
        """
        Contribute flashcard context to AI agents.

        This is CRITICAL for SYNAPSE - provides learning context including:
        - Due cards count
        - Weak areas (topics with low accuracy)
        - Recent review activity
        - Performance statistics

        Args:
            user_id: User ID
            query: Current query (may influence context focus)

        Returns:
            Dict containing flashcard context for AI injection
        """
        # Get due cards
        due_cards = await self.service.get_due_cards(user_id, limit=5)

        # Get weak areas
        weak_areas = await self.repository.get_weak_areas(user_id, limit=3)

        # Build context dict
        context = {
            "module": MODULE_NAME,
            "relevant_content": due_cards,
            "weak_areas": weak_areas,
            "due_count": len(due_cards),
            "statistics": {
                "total_due": len(due_cards),
                "weak_topics": [area["topic"] for area in weak_areas],
                "avg_accuracy": (
                    sum(area["accuracy"] for area in weak_areas) / len(weak_areas)
                    if weak_areas else 0.0
                )
            }
        }

        return context

    async def generate_with_ai(
        self,
        user_id: int,
        prompt: str,
        context: Dict
    ) -> Any:
        """
        Generate flashcards using AI.

        This would call Gemini to generate flashcard content from:
        - Notes
        - Documents
        - User prompts

        Args:
            user_id: User ID
            prompt: Generation prompt
            context: Context for generation (source material)

        Returns:
            Generated flashcards
        """
        # Placeholder - would implement AI generation
        # This will be implemented in the AI tools phase
        return None

    async def analyze_performance(self, user_id: int) -> Dict:
        """
        Analyze user's flashcard performance.

        Returns comprehensive analytics including:
        - Overall accuracy
        - Cards by learning state
        - Weak areas
        - Study patterns

        Args:
            user_id: User ID

        Returns:
            Performance analytics dict
        """
        weak_areas = await self.repository.get_weak_areas(user_id, limit=5)

        return {
            "module": MODULE_NAME,
            "weak_areas": weak_areas,
            "analytics": {
                "weak_topics": [area["topic"] for area in weak_areas],
                "avg_weak_accuracy": (
                    sum(area["accuracy"] for area in weak_areas) / len(weak_areas)
                    if weak_areas else 0.0
                )
            }
        }
