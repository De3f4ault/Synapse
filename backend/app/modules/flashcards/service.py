"""
Flashcard Service

Business logic for flashcard operations. This service layer orchestrates
between repository (SQL), models (ORM), and external systems (events, cache).

Responsibilities:
- Deck CRUD operations
- Flashcard CRUD operations
- Review recording with SM-2 algorithm
- Due card retrieval
- Performance analytics
- Event emission
- Cache invalidation
"""

from typing import Dict, List, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload

from .repository import FlashcardRepository
from .constants import (
    DEFAULT_DUE_CARD_LIMIT,
    DEFAULT_EASE_FACTOR,
    INITIAL_INTERVAL,
    LearningState
)


class FlashcardService:
    """
    Service layer for flashcard business logic.

    Handles all flashcard operations including deck management, card CRUD,
    review processing, and analytics. Coordinates between repository, models,
    and external systems (events, cache).
    """

    def __init__(self, session: AsyncSession):
        """
        Initialize service with database session.

        Args:
            session: AsyncSession for database operations
        """
        self.session = session
        self.repository = FlashcardRepository(session)

    # ==================== DECK OPERATIONS ====================

    async def create_deck(self, user_id: int, data: Dict) -> Dict:
        """
        Create a new flashcard deck.

        Args:
            user_id: User creating the deck
            data: Deck data (name, description, tags, is_public)

        Returns:
            Created deck as dict
        """
        from app.models.deck import Deck  # Local import to avoid circular dependency

        deck = Deck(
            user_id=user_id,
            name=data["name"],
            description=data.get("description"),
            tags=data.get("tags", []),
            is_public=data.get("is_public", False),
            ai_generated=data.get("ai_generated", False),
            ai_metadata=data.get("ai_metadata")
        )

        self.session.add(deck)
        await self.session.commit()
        await self.session.refresh(deck)

        # Emit event: deck.created
        # await EventDispatcher().emit(Event(
        #     type=EventType.DECK_CREATED,
        #     user_id=user_id,
        #     data={"deck_id": deck.id, "name": deck.name}
        # ))

        return self._deck_to_dict(deck)

    async def get_deck(self, deck_id: int, user_id: int) -> Dict:
        """
        Get a deck by ID.

        Args:
            deck_id: Deck ID
            user_id: User requesting the deck

        Returns:
            Deck as dict

        Raises:
            Exception: If deck not found or access denied
        """
        from app.models.deck import Deck

        query = select(Deck).where(
            and_(
                Deck.id == deck_id,
                Deck.deleted_at.is_(None)
            )
        )

        result = await self.session.execute(query)
        deck = result.scalar_one_or_none()

        if not deck:
            raise Exception(f"Deck {deck_id} not found")

        # Check ownership or public access
        if deck.user_id != user_id and not deck.is_public:
            raise Exception(f"Access denied to deck {deck_id}")

        return self._deck_to_dict(deck)

    async def list_decks(
        self,
        user_id: int,
        filters: Optional[Dict] = None
    ) -> List[Dict]:
        """
        List user's decks with optional filters.

        Args:
            user_id: User ID
            filters: Optional filters (tags, is_public)

        Returns:
            List of decks as dicts
        """
        from app.models.deck import Deck

        filters = filters or {}

        query = select(Deck).where(
            and_(
                Deck.user_id == user_id,
                Deck.deleted_at.is_(None)
            )
        ).order_by(Deck.updated_at.desc())

        # Apply filters
        if "tags" in filters and filters["tags"]:
            # PostgreSQL array overlap operator
            query = query.where(Deck.tags.overlap(filters["tags"]))

        if "is_public" in filters:
            query = query.where(Deck.is_public == filters["is_public"])

        result = await self.session.execute(query)
        decks = result.scalars().all()

        return [self._deck_to_dict(deck) for deck in decks]

    async def update_deck(
        self,
        deck_id: int,
        user_id: int,
        data: Dict
    ) -> Dict:
        """
        Update a deck.

        Args:
            deck_id: Deck ID
            user_id: User updating the deck
            data: Updated fields

        Returns:
            Updated deck as dict
        """
        from app.models.deck import Deck

        query = select(Deck).where(
            and_(
                Deck.id == deck_id,
                Deck.user_id == user_id,
                Deck.deleted_at.is_(None)
            )
        )

        result = await self.session.execute(query)
        deck = result.scalar_one_or_none()

        if not deck:
            raise Exception(f"Deck {deck_id} not found or access denied")

        # Update fields
        for key, value in data.items():
            if hasattr(deck, key) and value is not None:
                setattr(deck, key, value)

        await self.session.commit()
        await self.session.refresh(deck)

        # Invalidate context cache
        # await cache_manager.delete(f"context:{user_id}")

        return self._deck_to_dict(deck)

    async def delete_deck(self, deck_id: int, user_id: int) -> bool:
        """
        Soft delete a deck.

        Args:
            deck_id: Deck ID
            user_id: User deleting the deck

        Returns:
            True if deleted successfully
        """
        from app.models.deck import Deck

        query = select(Deck).where(
            and_(
                Deck.id == deck_id,
                Deck.user_id == user_id,
                Deck.deleted_at.is_(None)
            )
        )

        result = await self.session.execute(query)
        deck = result.scalar_one_or_none()

        if not deck:
            raise Exception(f"Deck {deck_id} not found or access denied")

        deck.deleted_at = datetime.utcnow()

        await self.session.commit()

        # Invalidate cache
        # await cache_manager.delete(f"context:{user_id}")

        return True

    # ==================== FLASHCARD OPERATIONS ====================

    async def create_card(self, user_id: int, data: Dict) -> Dict:
        """
        Create a new flashcard.

        Args:
            user_id: User creating the card
            data: Card data (deck_id, front_text, back_text, etc.)

        Returns:
            Created card as dict
        """
        from app.models.flashcard import Flashcard
        from app.models.deck import Deck

        # Verify deck ownership
        deck_query = select(Deck).where(
            and_(
                Deck.id == data["deck_id"],
                Deck.user_id == user_id,
                Deck.deleted_at.is_(None)
            )
        )

        deck_result = await self.session.execute(deck_query)
        deck = deck_result.scalar_one_or_none()

        if not deck:
            raise Exception(f"Deck {data['deck_id']} not found or access denied")

        # Create flashcard with initial SM-2 values
        card = Flashcard(
            deck_id=data["deck_id"],
            front_text=data["front_text"],
            back_text=data["back_text"],
            front_media_url=data.get("front_media_url"),
            back_media_url=data.get("back_media_url"),
            ease_factor=DEFAULT_EASE_FACTOR,
            interval=INITIAL_INTERVAL,
            repetitions=0,
            learning_state=LearningState.NEW,
            times_reviewed=0,
            times_correct=0,
            times_incorrect=0
        )

        self.session.add(card)
        await self.session.commit()
        await self.session.refresh(card)

        # Trigger event: card.created
        # This will trigger embedding generation in background
        # await EventDispatcher().emit(Event(
        #     type=EventType.CARD_CREATED,
        #     user_id=user_id,
        #     data={"card_id": card.id, "deck_id": deck.id}
        # ))

        return self._card_to_dict(card)

    async def get_card(self, card_id: int, user_id: int) -> Dict:
        """
        Get a flashcard by ID.

        Args:
            card_id: Card ID
            user_id: User requesting the card

        Returns:
            Card as dict
        """
        from app.models.flashcard import Flashcard
        from app.models.deck import Deck

        query = select(Flashcard).join(Deck).where(
            and_(
                Flashcard.id == card_id,
                Deck.user_id == user_id,
                Flashcard.deleted_at.is_(None)
            )
        )

        result = await self.session.execute(query)
        card = result.scalar_one_or_none()

        if not card:
            raise Exception(f"Card {card_id} not found or access denied")

        return self._card_to_dict(card)

    async def update_card(
        self,
        card_id: int,
        user_id: int,
        data: Dict
    ) -> Dict:
        """
        Update a flashcard.

        Args:
            card_id: Card ID
            user_id: User updating the card
            data: Updated fields

        Returns:
            Updated card as dict
        """
        from app.models.flashcard import Flashcard
        from app.models.deck import Deck

        query = select(Flashcard).join(Deck).where(
            and_(
                Flashcard.id == card_id,
                Deck.user_id == user_id,
                Flashcard.deleted_at.is_(None)
            )
        )

        result = await self.session.execute(query)
        card = result.scalar_one_or_none()

        if not card:
            raise Exception(f"Card {card_id} not found or access denied")

        # Update fields
        for key, value in data.items():
            if hasattr(card, key) and value is not None:
                setattr(card, key, value)

        await self.session.commit()
        await self.session.refresh(card)

        # Trigger event: card.updated
        # await EventDispatcher().emit(Event(
        #     type=EventType.CARD_UPDATED,
        #     user_id=user_id,
        #     data={"card_id": card.id}
        # ))

        return self._card_to_dict(card)

    async def review_card(
        self,
        card_id: int,
        user_id: int,
        quality: int
    ) -> Dict:
        """
        Record a card review using SM-2 algorithm.

        This calls the PostgreSQL function `record_review` which:
        1. Locks the card row
        2. Calculates new SM-2 values
        3. Updates the card
        4. Creates review history record

        Args:
            card_id: Card ID
            user_id: User reviewing the card
            quality: Quality rating 0-5

        Returns:
            ReviewResult dict with next_review, new_interval, success
        """
        from app.models.flashcard import Flashcard
        from app.models.deck import Deck

        # Verify ownership
        query = select(Flashcard).join(Deck).where(
            and_(
                Flashcard.id == card_id,
                Deck.user_id == user_id,
                Flashcard.deleted_at.is_(None)
            )
        )

        result = await self.session.execute(query)
        card = result.scalar_one_or_none()

        if not card:
            raise Exception(f"Card {card_id} not found or access denied")

        # Call repository to execute SQL function
        review_result = await self.repository.record_review(card_id, quality)

        # Commit transaction
        await self.session.commit()

        # Invalidate context cache
        # await cache_manager.delete(f"context:{user_id}")

        # Trigger event: card.reviewed
        # await EventDispatcher().emit(Event(
        #     type=EventType.CARD_REVIEWED,
        #     user_id=user_id,
        #     data={
        #         "card_id": card_id,
        #         "quality": quality,
        #         "next_review": review_result["next_review_date"],
        #         "ease_factor": review_result["new_ease_factor"]
        #     }
        # ))

        return review_result

    async def get_due_cards(
        self,
        user_id: int,
        deck_id: Optional[int] = None,
        limit: int = DEFAULT_DUE_CARD_LIMIT
    ) -> List[Dict]:
        """
        Get cards due for review.

        Args:
            user_id: User ID
            deck_id: Optional deck filter
            limit: Maximum cards to return

        Returns:
            List of due cards with priority scores
        """
        cards = await self.repository.get_due_cards(user_id, deck_id, limit)
        return cards

    # ==================== HELPER METHODS ====================

    def _deck_to_dict(self, deck) -> Dict:
        """Convert Deck model to dict"""
        return {
            "id": deck.id,
            "user_id": deck.user_id,
            "name": deck.name,
            "description": deck.description,
            "tags": deck.tags,
            "is_public": deck.is_public,
            "ai_generated": deck.ai_generated,
            "ai_metadata": deck.ai_metadata,
            "created_at": deck.created_at,
            "updated_at": deck.updated_at
        }

    def _card_to_dict(self, card) -> Dict:
        """Convert Flashcard model to dict"""
        accuracy = (
            card.times_correct / card.times_reviewed
            if card.times_reviewed > 0
            else 0.0
        )

        return {
            "id": card.id,
            "deck_id": card.deck_id,
            "front_text": card.front_text,
            "back_text": card.back_text,
            "front_media_url": card.front_media_url,
            "back_media_url": card.back_media_url,
            "ease_factor": float(card.ease_factor),
            "interval": card.interval,
            "repetitions": card.repetitions,
            "last_review": card.last_review,
            "next_review": card.next_review,
            "learning_state": card.learning_state,
            "times_reviewed": card.times_reviewed,
            "times_correct": card.times_correct,
            "times_incorrect": card.times_incorrect,
            "accuracy": accuracy,
            "created_at": card.created_at,
            "updated_at": card.updated_at
        }
