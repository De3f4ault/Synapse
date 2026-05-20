"""
Card Tutor Service — the micro-tutor agent anchored to a single flashcard.

Design:
    - Deck-scoped thread: one ChatSession per (user, deck) pair marked
      source='tutor'. Multiple cards in the same deck share one session;
      each message carries a card_id tag so history is filterable per card.
    - Card-contextual: every new card shifts the system prompt but stays in
      the same session, preserving deck-level context across card switches.
    - Hidden from Chat sidebar: source='tutor' sessions are excluded by the
      sidebar query, preventing pollution of the user's chat history.
    - Mastery-aware: opening the tutor fires a gap signal; a successful
      conversation fires a mastery_demonstrated signal (via learning_signals).

Flow:
    1. Client calls POST /cards/{card_id}/tutor  → CardTutorService.get_or_create_session()
       - Finds (or creates) the ONE tutor session for this card's deck
       - Returns session_id + card-specific opening message
    2. Client streams to POST /chat/sessions/{session_id}/stream  (existing endpoint)
       - ChatStreamRequest.card_id is forwarded and stored on every ChatMessage
    3. When the user moves to the next card, the panel calls openTutor(newCardId)
       - Same session_id is reused; messages are filtered client-side by card_id
"""

from __future__ import annotations

from datetime import datetime
from typing import Dict, Optional

import structlog
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.flashcard import Flashcard
from app.models.deck import Deck

logger = structlog.get_logger(__name__)

# System prompt template — injected as the first assistant turn of a Card Tutor session.
_CARD_TUTOR_SYSTEM = """\
You are a focused, Socratic micro-tutor helping a student understand exactly one concept.

**Flashcard under study**
- Front (Question): {front_text}
- Back (Answer):    {back_text}
- Concept:          {topic}
- Deck:             {deck_name}

{grounding_block}\
**Your job**
1. The student just failed — or isn't confident about — this card.
2. Do NOT just repeat the answer. Instead, guide them to the answer themselves.
3. Use a different angle: analogy, worked example, counter-example, or step-by-step reasoning.
4. Where grounding evidence is provided above, reference the student's own notes/documents
   to make the explanation feel personal and directly connected to their material.
5. Keep each response concise and focused on *this one concept*.
6. If they demonstrate understanding, confirm it warmly and suggest they retry the card.

Begin by acknowledging what the question is asking and offering an alternative framing.\
"""

_GROUNDING_SECTION = """\
**Evidence from your own notes and documents**
{passages}

"""

_NO_GROUNDING = ""  # Empty — grounding is always attempted but never mandatory


class CardTutorService:
    """
    Manages Card Tutor chat sessions — one session per (user, deck) pair.

    Philosophy:
        Get-or-create at deck scope: all cards within the same deck share a
        single tutor session. Each message carries a card_id so the frontend
        can filter the view per card. This prevents thread proliferation
        (no new sidebar entry per card) and keeps deck-level context alive
        across card switches within a session.

        Sessions are marked source='tutor' and never appear in the Chat sidebar.
    """

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_or_create_session(
        self,
        user_id: int,
        card_id: int,
    ) -> Dict:
        """
        Return the deck-scoped tutor session, creating it if it doesn't exist.

        One session per (user, deck) pair — multiple cards share the same session.
        Messages are tagged with card_id for client-side filtering.

        Returns:
            {
                session_id: int,
                card_id: int,
                deck_id: int,
                topic: str,
                deck_name: str | None,
                is_new: bool,
                system_prompt: str,
                opening_message: str,
            }
        """
        from app.modules.chat.internal.models import ChatSession, ChatMessage, MessageRole

        # 1. Load the card and its deck for context
        card, deck = await self._load_card_context(card_id, user_id)

        # 2. Look for an existing deck-scoped tutor session
        existing = await self._find_existing_session(user_id, deck.id)

        # 3. Build system prompt and opening message from card context only.
        # NOTE: grounding is intentionally skipped here. The opening message is
        # a pure template (no AI call, no retrieval needed). Per-message grounding
        # runs dynamically via the GroundingMiddleware in ai_stream.py when the
        # user actually sends their first follow-up question.
        system_prompt = self._build_system_prompt(card, deck)
        opening_message = self._build_opening_message(card, deck)
        topic_label = card.topic or card.front_text[:60]

        if existing:
            # Deck session already exists — add a card-change marker message
            # so the conversation history shows which card we moved to.
            # This is a lightweight ASSISTANT turn tagged with the new card_id.
            card_intro = ChatMessage(
                session_id=existing.id,
                role=MessageRole.ASSISTANT,
                content=opening_message,
                tokens=len(opening_message) // 4,
                card_id=card_id,
                model_used="card_tutor",
            )
            self.db.add(card_intro)
            await self.db.commit()

            logger.info(
                "card_tutor_session_resumed",
                session_id=existing.id,
                deck_id=deck.id,
                card_id=card_id,
                user_id=user_id,
            )
            return {
                "session_id": existing.id,
                "card_id": card_id,
                "deck_id": deck.id,
                "topic": topic_label,
                "deck_name": deck.name,
                "is_new": False,
                "system_prompt": system_prompt,
                "opening_message": opening_message,
            }

        # 4. Create the ONE deck-scoped tutor session
        # Title format: "Flashcards: {deck_name}" — never per-card, never clutters sidebar
        session = ChatSession(
            user_id=user_id,
            title=f"Flashcards: {deck.name}",
            source="tutor",           # ← hidden from chat sidebar
            deck_id=deck.id,          # ← deck anchor
            context_modules={"modules": ["card_tutor"], "deck_id": deck.id},
        )
        self.db.add(session)
        await self.db.flush()

        # 5. Inject opening message for the first card
        first_message = ChatMessage(
            session_id=session.id,
            role=MessageRole.ASSISTANT,
            content=opening_message,
            tokens=len(opening_message) // 4,
            card_id=card_id,
            model_used="card_tutor",
        )
        self.db.add(first_message)
        await self.db.commit()
        await self.db.refresh(session)

        logger.info(
            "card_tutor_session_created",
            session_id=session.id,
            deck_id=deck.id,
            card_id=card_id,
            user_id=user_id,
            deck_name=deck.name,
        )

        return {
            "session_id": session.id,
            "card_id": card_id,
            "deck_id": deck.id,
            "topic": topic_label,
            "deck_name": deck.name,
            "is_new": True,
            "system_prompt": system_prompt,
            "opening_message": opening_message,
        }

    async def get_card_history(self, card_id: int, user_id: int) -> Dict:
        """
        Return all previous Card Tutor messages for a specific card.

        Used by the frontend to resurface conversation history when a card's
        tutor panel is re-opened.  Messages are filtered from the deck-scoped
        session by card_id so only this card's conversation is returned.

        Returns:
            {
                card_id: int,
                session_id: int | None,
                messages: [{id, role, content, created_at}],
                has_history: bool,
            }
        """
        from app.modules.chat.internal.models import ChatSession, ChatMessage

        # Find the deck-scoped tutor session for this card's deck
        card, deck = await self._load_card_context(card_id, user_id)

        session_result = await self.db.execute(
            select(ChatSession).where(
                and_(
                    ChatSession.user_id == user_id,
                    ChatSession.source == "tutor",
                    ChatSession.deck_id == deck.id,
                    ChatSession.deleted_at.is_(None),
                )
            ).order_by(ChatSession.created_at.desc()).limit(1)
        )
        session = session_result.scalar_one_or_none()

        if not session:
            return {"card_id": card_id, "session_id": None, "messages": [], "has_history": False}

        # Fetch all messages tagged with this card_id, chronological order
        messages_result = await self.db.execute(
            select(ChatMessage).where(
                and_(
                    ChatMessage.session_id == session.id,
                    ChatMessage.card_id == card_id,
                )
            ).order_by(ChatMessage.created_at.asc())
        )
        messages = messages_result.scalars().all()

        return {
            "card_id": card_id,
            "session_id": session.id,
            "messages": [
                {
                    "id": m.id,
                    "role": m.role.value if hasattr(m.role, "value") else m.role,
                    "content": m.content,
                    "created_at": m.created_at.isoformat() if m.created_at else None,
                }
                for m in messages
            ],
            "has_history": len(messages) > 0,
        }


    def get_card_tutor_context(self, card: Flashcard, deck: Optional[Deck]) -> str:
        """
        Return the system prompt string for injection into the ContextEngine.

        Called by the ContextInjectionMiddleware when card_id is present
        in the agent context dict.
        """
        return self._build_system_prompt(card, deck)

    # ── Private helpers ───────────────────────────────────────────────────────

    async def _load_card_context(
        self, card_id: int, user_id: int
    ):
        """Load card and its parent deck. Raises ValueError if not found."""
        from app.models.deck import Deck as _Deck

        card_result = await self.db.execute(
            select(Flashcard).where(
                and_(Flashcard.id == card_id, Flashcard.deleted_at.is_(None))
            )
        )
        card = card_result.scalar_one_or_none()
        if not card:
            raise ValueError(f"Flashcard {card_id} not found")

        deck = None
        if card.deck_id:
            deck_result = await self.db.execute(
                select(_Deck).where(
                    and_(
                        _Deck.id == card.deck_id,
                        _Deck.user_id == user_id,
                        _Deck.deleted_at.is_(None),
                    )
                )
            )
            deck = deck_result.scalar_one_or_none()

        if not deck:
            raise ValueError(f"Access denied or deck not found for card {card_id}")

        return card, deck

    async def _find_existing_session(
        self, user_id: int, deck_id: int
    ):
        """Return the most recent active tutor session for this (user, deck) pair."""
        from app.modules.chat.internal.models import ChatSession

        result = await self.db.execute(
            select(ChatSession)
            .where(
                and_(
                    ChatSession.user_id == user_id,
                    ChatSession.deleted_at.is_(None),
                    ChatSession.source == "tutor",
                    ChatSession.deck_id == deck_id,
                )
            )
            .order_by(ChatSession.created_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    @staticmethod
    def _build_system_prompt(
        card: Flashcard,
        deck: Optional[Deck],
        grounding_block: str = "",
    ) -> str:
        return _CARD_TUTOR_SYSTEM.format(
            front_text=card.front_text,
            back_text=card.back_text,
            topic=card.topic or "(not specified)",
            deck_name=deck.name if deck else "(unknown deck)",
            grounding_block=grounding_block,
        )

    async def _fetch_grounding(self, query: str, user_id: int) -> str:
        """
        Ground the card's question against the user's uploaded documents.

        Returns a formatted grounding block ready for insertion into the
        system prompt — empty string if no evidence found or on any error.

        NOTE: Not called on session open (avoids 12-second RAG pipeline for a
        template message). Reserved for explicit enrichment if needed in future.
        """
        try:
            from app.services.grounding.grounding_service import GroundingService

            grounding_svc = GroundingService(self.db)
            result = await grounding_svc.ground(
                query=query,
                user_id=user_id,
                surface="study_hub",
                max_chunks=4,
                min_confidence=0.25,
            )

            if not result.has_grounding:
                return _NO_GROUNDING

            # EvidenceChunk is a Pydantic model: .title and .snippet (not dicts)
            passages = ""
            for i, chunk in enumerate(result.evidence[:4], 1):
                source = chunk.title or "Your notes"
                text = chunk.snippet.strip()[:400]
                passages += f"{i}. [{source}] {text}\n"

            logger.info(
                "card_tutor_grounding_success",
                query=query[:60],
                user_id=user_id,
                chunk_count=len(result.evidence),
            )
            return _GROUNDING_SECTION.format(passages=passages.strip())

        except Exception as exc:
            logger.warning(
                "card_tutor_grounding_failed",
                query=query[:60],
                error=str(exc),
            )
            return _NO_GROUNDING

    @staticmethod
    def _build_opening_message(card: Flashcard, deck: Optional[Deck]) -> str:
        topic = card.topic or card.front_text[:60]
        deck_name = deck.name if deck else "your deck"
        return (
            f"Let's work through **{topic}** from *{deck_name}* together.\n\n"
            f"The question asks: *\"{card.front_text}\"*\n\n"
            f"Instead of just giving you the answer, let me offer a different angle. "
            f"What part of this is least clear — the *what*, the *why*, or the *how it works*?"
        )
