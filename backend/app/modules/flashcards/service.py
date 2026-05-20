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

UPDATED: Now broadcasts WebSocket events when actions occur.
"""

from typing import Dict, List, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload

from .repository import FlashcardRepository
from .constants import DEFAULT_DUE_CARD_LIMIT, DEFAULT_EASE_FACTOR, INITIAL_INTERVAL, LearningState
from app.api.websockets.events import broadcast_card_reviewed


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
            ai_metadata=data.get("ai_metadata"),
        )

        self.session.add(deck)
        await self.session.commit()
        await self.session.refresh(deck)

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

        query = select(Deck).where(and_(Deck.id == deck_id, Deck.deleted_at.is_(None)))

        result = await self.session.execute(query)
        deck = result.scalar_one_or_none()

        if not deck:
            raise Exception(f"Deck {deck_id} not found")

        # Check ownership or public access
        if deck.user_id != user_id and not deck.is_public:
            raise Exception(f"Access denied to deck {deck_id}")

        return self._deck_to_dict(deck)

    async def list_decks(self, user_id: int, filters: Optional[Dict] = None) -> List[Dict]:
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

        query = (
            select(Deck)
            .where(and_(Deck.user_id == user_id, Deck.deleted_at.is_(None)))
            .order_by(Deck.updated_at.desc())
        )

        # Apply filters
        if "tags" in filters and filters["tags"]:
            # PostgreSQL array overlap operator
            query = query.where(Deck.tags.overlap(filters["tags"]))

        if "is_public" in filters:
            query = query.where(Deck.is_public == filters["is_public"])

        result = await self.session.execute(query)
        decks = result.scalars().all()

        return [self._deck_to_dict(deck) for deck in decks]

    async def update_deck(self, deck_id: int, user_id: int, data: Dict) -> Dict:
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
            and_(Deck.id == deck_id, Deck.user_id == user_id, Deck.deleted_at.is_(None))
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
            and_(Deck.id == deck_id, Deck.user_id == user_id, Deck.deleted_at.is_(None))
        )

        result = await self.session.execute(query)
        deck = result.scalar_one_or_none()

        if not deck:
            raise Exception(f"Deck {deck_id} not found or access denied")

        deck.deleted_at = datetime.utcnow()

        await self.session.commit()

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
            and_(Deck.id == data["deck_id"], Deck.user_id == user_id, Deck.deleted_at.is_(None))
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
            topic=data.get("topic"),  # noun-phrase for concept_mastery bridge
            card_type=data.get("card_type", "basic"),   # basic | cloze | socratic | scenario
            cloze_answer=data.get("cloze_answer"),       # cloze cards only
            ease_factor=DEFAULT_EASE_FACTOR,
            interval=INITIAL_INTERVAL,
            repetitions=0,
            learning_state=LearningState.NEW,
            times_reviewed=0,
            times_correct=0,
            times_incorrect=0,
        )

        self.session.add(card)
        await self.session.flush()  # Get ID, validate constraints

        # Generate embedding synchronously
        await self._generate_embeddings(card)

        await self.session.commit()
        await self.session.refresh(card)

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

        query = (
            select(Flashcard)
            .join(Deck)
            .where(
                and_(
                    Flashcard.id == card_id, Deck.user_id == user_id, Flashcard.deleted_at.is_(None)
                )
            )
        )

        result = await self.session.execute(query)
        card = result.scalar_one_or_none()

        if not card:
            raise Exception(f"Card {card_id} not found or access denied")

        return self._card_to_dict(card)

    async def update_card(self, card_id: int, user_id: int, data: Dict) -> Dict:
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

        query = (
            select(Flashcard)
            .join(Deck)
            .where(
                and_(
                    Flashcard.id == card_id, Deck.user_id == user_id, Flashcard.deleted_at.is_(None)
                )
            )
        )

        result = await self.session.execute(query)
        card = result.scalar_one_or_none()

        if not card:
            raise Exception(f"Card {card_id} not found or access denied")

        # Track if content changed
        content_changed = "front_text" in data or "back_text" in data

        # Update fields
        for key, value in data.items():
            if hasattr(card, key) and value is not None:
                setattr(card, key, value)

        # Regenerate embedding if content changed
        if content_changed:
            await self._generate_embeddings(card)

        await self.session.commit()
        await self.session.refresh(card)

        return self._card_to_dict(card)

    async def review_card(self, card_id: int, user_id: int, quality: int) -> Dict:
        """
        Record a card review, routing through the algorithm dispatcher.

        Routes to the correct scheduling algorithm (SM-2 or FSRS) based on
        deck.scheduling_algorithm. The dispatcher means adding FSRS later
        requires zero changes here — implement FSRSScheduler and flip the flag.

        UPDATED: Now routes through get_scheduler() dispatcher instead of
                 calling repository.record_review() directly.
        UPDATED: Broadcasts WebSocket event to dashboard.

        Args:
            card_id: Card ID
            user_id: User reviewing the card
            quality: Quality rating 0-5

        Returns:
            ReviewResult dict with next_review, new_interval, success
        """
        from app.models.flashcard import Flashcard
        from app.models.deck import Deck
        from app.services.flashcards.scheduler import get_scheduler

        # Verify ownership and load deck to read scheduling_algorithm
        query = (
            select(Flashcard, Deck)
            .join(Deck, Deck.id == Flashcard.deck_id)
            .where(
                and_(
                    Flashcard.id == card_id,
                    Deck.user_id == user_id,
                    Flashcard.deleted_at.is_(None),
                )
            )
        )

        result = await self.session.execute(query)
        row = result.one_or_none()

        if not row:
            raise Exception(f"Card {card_id} not found or access denied")

        card, deck = row

        # Route through the scheduler dispatcher
        # SM-2: delegates to PostgreSQL record_review function (existing behaviour)
        # FSRS: will delegate to FSRSScheduler once implemented
        algorithm = getattr(deck, "scheduling_algorithm", "sm2") or "sm2"
        scheduler = get_scheduler(algorithm)
        review_result = await scheduler.schedule(card_id, user_id, quality, self.session)

        # Commit transaction
        await self.session.commit()

        # Broadcast WebSocket event to dashboard
        await broadcast_card_reviewed(
            user_id=user_id,
            card_id=card_id,
            quality=quality,
            next_review=review_result.get("next_review_date"),  # Already a string from JSONB
        )

        # ── FSRS → concept_mastery bridge ─────────────────────────────
        # Correct recall → reinforce concept. Failure → fire gap signal.
        # Both paths are non-fatal — review always commits regardless.
        if quality >= 4:  # Correct recall (SM-2 quality 4-5)
            try:
                await self._update_concept_mastery_from_review(
                    user_id=user_id,
                    card=card,
                    quality=quality,
                )
            except Exception:
                import structlog
                structlog.get_logger().warning(
                    "concept_mastery_bridge_failed",
                    card_id=card_id,
                    user_id=user_id,
                )
        elif quality <= 2:  # "Again" (0) or "Hard" (1-2) — demonstrates a gap
            try:
                await self._fire_gap_signal(user_id=user_id, card=card)
            except Exception:
                import structlog
                structlog.get_logger().warning(
                    "concept_mastery_gap_signal_failed",
                    card_id=card_id,
                    user_id=user_id,
                )

        return review_result

    async def get_due_cards(
        self, user_id: int, deck_id: Optional[int] = None, limit: int = DEFAULT_DUE_CARD_LIMIT
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

    async def _update_concept_mastery_from_review(
        self,
        user_id: int,
        card,
        quality: int,
    ) -> None:
        """
        Bridge FSRS review → concept_mastery table (correct recall path).

        Uses card.topic (noun-phrase) as the concept key if available,
        falling back to front_text[:100] for legacy cards without a topic.
        Only called for quality >= 4 (correct recall).
        """
        from sqlalchemy import text

        # topic is the precise noun-phrase; front_text is a question string.
        # Using topic eliminates mismatches with LLMExtractor which also produces noun-phrases.
        concept = (card.topic or card.front_text or "").strip()[:100]
        if len(concept) < 4:
            return  # Too short to be a meaningful concept

        # Get deck name for subject_area
        from app.models.deck import Deck
        deck_result = await self.session.execute(
            select(Deck.name).where(Deck.id == card.deck_id)
        )
        deck_name = deck_result.scalar_one_or_none()

        delta = 0.20 if quality == 5 else 0.15  # Perfect vs good recall

        await self.session.execute(
            text("""
                INSERT INTO concept_mastery
                    (user_id, concept, subject_area, mastery_score,
                     exposure_count, source, last_exposure, first_exposure,
                     created_at, updated_at)
                VALUES
                    (:user_id, :concept, :subject_area,
                     GREATEST(0.0, LEAST(:delta, 1.0)),
                     1, 'flashcard_review', NOW(), NOW(), NOW(), NOW())
                ON CONFLICT (user_id, concept) DO UPDATE SET
                    mastery_score = GREATEST(0.0, LEAST(
                        concept_mastery.mastery_score + :delta, 1.0
                    )),
                    exposure_count = concept_mastery.exposure_count + 1,
                    last_exposure = NOW(),
                    source = 'flashcard_review',
                    updated_at = NOW()
            """),
            {
                "user_id": user_id,
                "concept": concept,
                "subject_area": deck_name,
                "delta": delta,
            },
        )
        await self.session.commit()

    async def _fire_gap_signal(
        self,
        user_id: int,
        card,
    ) -> None:
        """
        Bridge FSRS review → concept_mastery table (failure/gap path).

        Called when quality <= 2 (Again or Hard). Applies a -0.05 delta
        so the conversational agent and session curator know the student
        is currently struggling with this concept — even if SM-2 handles
        the scheduling independently.
        """
        from sqlalchemy import text

        concept = (card.topic or card.front_text or "").strip()[:100]
        if len(concept) < 4:
            return

        from app.models.deck import Deck
        deck_result = await self.session.execute(
            select(Deck.name).where(Deck.id == card.deck_id)
        )
        deck_name = deck_result.scalar_one_or_none()

        await self.session.execute(
            text("""
                INSERT INTO concept_mastery
                    (user_id, concept, subject_area, mastery_score,
                     exposure_count, source, last_exposure, first_exposure,
                     created_at, updated_at)
                VALUES
                    (:user_id, :concept, :subject_area,
                     GREATEST(0.0, -0.05),
                     1, 'flashcard_review_failure', NOW(), NOW(), NOW(), NOW())
                ON CONFLICT (user_id, concept) DO UPDATE SET
                    mastery_score = GREATEST(0.0,
                        concept_mastery.mastery_score - 0.05
                    ),
                    exposure_count = concept_mastery.exposure_count + 1,
                    last_exposure = NOW(),
                    source = 'flashcard_review_failure',
                    updated_at = NOW()
            """),
            {
                "user_id": user_id,
                "concept": concept,
                "subject_area": deck_name,
            },
        )
        await self.session.commit()

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
            "updated_at": deck.updated_at,
        }

    async def _generate_embeddings(self, card):
        """
        Generate embeddings for a flashcard SYNCHRONOUSLY.

        ARCHITECTURAL CHANGE: Transactional entities embed synchronously.
        - Uses boundary module for sync embedding (~20ms)
        - Sets embedding_status and embedding_model for versioning
        - Falls back gracefully on failure

        Args:
            card: Flashcard model instance
        """
        import structlog
        from app.core.ai.embeddings.boundary import (
            embed_text_sync,
            EMBEDDING_VERSION,
            EmbeddingStatus,
        )

        logger = structlog.get_logger()

        try:
            # Combine front and back for embedding
            text_to_embed = f"{card.front_text or ''}\n\n{card.back_text or ''}"

            # Sync embed (~20ms)
            embedding, status = embed_text_sync(text_to_embed)

            # Update card fields
            card.content_embedding = embedding
            card.embedding_status = status.value
            card.embedding_model = EMBEDDING_VERSION if status == EmbeddingStatus.READY else None

            logger.info(
                "flashcard_embedding_sync_complete", flashcard_id=card.id, status=status.value
            )

        except Exception as e:
            # Log but don't fail - allow save to proceed
            logger.warning("flashcard_embedding_sync_failed", flashcard_id=card.id, error=str(e))
            card.embedding_status = "FAILED"

    def _card_to_dict(self, card) -> Dict:
        """Convert Flashcard model to dict"""
        accuracy = card.times_correct / card.times_reviewed if card.times_reviewed > 0 else 0.0

        return {
            "id": card.id,
            "deck_id": card.deck_id,
            "front_text": card.front_text,
            "back_text": card.back_text,
            "topic": card.topic,  # noun-phrase concept name, may be None for legacy cards
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
            "updated_at": card.updated_at,
        }
