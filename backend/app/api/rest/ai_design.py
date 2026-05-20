"""
AI Card Designer API.

Two endpoints:
  POST /ai/design/session   — create/resume a design conversation session
  POST /ai/design/generate  — execute a CardDesignPlan → create flashcards

The design session is a regular ChatSession with source='card_designer'.
It is hidden from the main chat sidebar (same pattern as source='tutor').
The system prompt is enriched with the user's real learning context by
CardDesignService before the first message is sent.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
import structlog

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.schemas.flashcards.card_design import (
    CardDesignSessionRequest,
    CardDesignSessionResponse,
    CardDesignGenerateRequest,
    DesignSessionSummary,
)
from typing import List


logger = structlog.get_logger(__name__)
router = APIRouter()


@router.post(
    "/session",
    response_model=CardDesignSessionResponse,
    # 200 for resumed, 201 for new — FastAPI sends 201 by default for POST,
    # so we override per-response below
    status_code=status.HTTP_201_CREATED,
    summary="Start or resume AI Card Design session",
    description=(
        "Create or resume a design conversation. Returns a session_id that "
        "the frontend uses with POST /chat/sessions/{id}/stream. "
        "If a session already exists for this user+deck it is resumed, "
        "preserving the full conversation history."
    ),
)
async def create_design_session(
    body: CardDesignSessionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CardDesignSessionResponse:
    """
    Find-or-create a ChatSession with source='card_designer'.

    Resume path: if a prior session exists for this user+deck, return it
    immediately — no new session is created, conversation history is intact.

    New path: build the enriched system prompt, create the session, and
    (when deck_id is set and the deck already has cards) inject a synthetic
    assistant message showing the current deck state so the AI has real
    data from the very first user turn.
    """
    from app.modules.chat.internal.models import ChatSession, ChatMessage, MessageRole
    from app.services.flashcards.card_design_service import CardDesignService
    from app.models.deck import Deck

    try:
        design_svc = CardDesignService(db)

        # ── Resolve deck name (needed for both paths) ──────────────────
        deck_name: str | None = None
        if body.deck_id:
            deck_res = await db.execute(
                select(Deck).where(
                    and_(
                        Deck.id == body.deck_id,
                        Deck.user_id == current_user.id,
                        Deck.deleted_at.is_(None),
                    )
                )
            )
            _deck = deck_res.scalar_one_or_none()
            if _deck:
                deck_name = _deck.name

        # ── Try to resume an existing session ─────────────────────────
        existing_res = await db.execute(
            select(ChatSession)
            .where(
                and_(
                    ChatSession.user_id == current_user.id,
                    ChatSession.source == "card_designer",
                    ChatSession.deck_id == body.deck_id,
                    ChatSession.deleted_at.is_(None),
                )
            )
            .order_by(ChatSession.created_at.desc())
            .limit(1)
        )
        existing = existing_res.scalar_one_or_none()

        if existing:
            logger.info(
                "card_design_session_resumed",
                session_id=existing.id,
                user_id=current_user.id,
                deck_id=body.deck_id,
            )
            return CardDesignSessionResponse(
                session_id=existing.id,
                deck_id=body.deck_id,
                deck_name=deck_name,
                is_resumed=True,
            )

        # ── Create new session ─────────────────────────────────────────
        system_prompt = await design_svc.build_system_prompt(
            user_id=current_user.id,
            deck_id=body.deck_id,
        )

        session = ChatSession(
            user_id=current_user.id,
            title=f"AI Card Designer{f' — {deck_name}' if deck_name else ''}",
            source="card_designer",
            deck_id=body.deck_id,
            context_modules={"system_prompt": system_prompt},
        )
        db.add(session)
        await db.flush()  # get session.id before adding messages

        # ── Synthetic deck-state message ───────────────────────────────
        # When targeting an existing deck, prime the conversation with a
        # concrete summary of what cards are already there. This appears
        # as the first assistant message so the AI references real data
        # without needing to ask the user about it.
        if body.deck_id:
            try:
                deck_detail = await design_svc._deck_detail(
                    current_user.id, body.deck_id
                )
                if deck_detail and deck_detail["card_count"] > 0:
                    topics = deck_detail.get("topic_breakdown", [])[:4]
                    topics_summary = ", ".join(
                        f'**{t["topic"]}** ({t["count"]})'
                        for t in topics
                    )
                    card_count = deck_detail["card_count"]
                    synthetic_content = (
                        f"I can see **\"{deck_detail['name']}\"** already has "
                        f"**{card_count} card{'s' if card_count != 1 else ''}** "
                        f"covering: {topics_summary}. "
                        "I'll make sure we build on what's there rather than duplicate it.\n\n"
                        "What would you like to add or strengthen?"
                    )
                    db.add(
                        ChatMessage(
                            session_id=session.id,
                            role=MessageRole.ASSISTANT,
                            content=synthetic_content,
                            tokens=max(1, len(synthetic_content) // 4),
                        )
                    )
            except Exception:
                pass  # non-fatal — session is still usable without the hint

        await db.commit()
        await db.refresh(session)

        logger.info(
            "card_design_session_created",
            session_id=session.id,
            user_id=current_user.id,
            deck_id=body.deck_id,
        )

        return CardDesignSessionResponse(
            session_id=session.id,
            deck_id=body.deck_id,
            deck_name=deck_name,
            is_resumed=False,
        )

    except Exception as exc:
        await db.rollback()
        logger.exception("card_design_session_failed", error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create design session: {exc}",
        )


@router.post(
    "/generate",
    summary="Generate cards from accepted plan",
    description=(
        "Execute a CardDesignPlan accepted by the user. "
        "Creates or updates a deck and generates flashcards per subtopic."
    ),
)
async def generate_from_design_plan(
    body: CardDesignGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Generate flashcards from the plan the AI designer proposed.

    Reuses generate_from_plan() which handles deck resolution, per-subtopic
    generation with style-specific prompts, and cloze_answer population.
    """
    from app.services.deck.generation import generate_from_plan

    try:
        result = await generate_from_plan(
            user_id=current_user.id,
            plan=body.plan,
            db=db,
        )

        # ── Inject synthetic post-generation context into the session ─────────
        # This keeps the AI grounded in the new deck state for follow-up turns.
        if body.session_id:
            try:
                from app.modules.chat.internal.models import ChatMessage, MessageRole
                from app.services.flashcards.card_design_service import CardDesignService

                design_svc = CardDesignService(db)
                summary = await design_svc.build_post_generation_message(
                    user_id=current_user.id,
                    deck_id=result["deck_id"],
                    cards_generated=result["cards_generated"],
                    plan=body.plan,
                )
                db.add(
                    ChatMessage(
                        session_id=body.session_id,
                        role=MessageRole.ASSISTANT,
                        content=summary,
                        tokens=max(1, len(summary) // 4),
                    )
                )
                await db.commit()
                logger.info(
                    "card_design_post_gen_message_injected",
                    session_id=body.session_id,
                    deck_id=result["deck_id"],
                )
            except Exception as msg_exc:
                logger.warning(
                    "card_design_post_gen_message_failed",
                    error=str(msg_exc),
                )
                # Non-fatal — generation result is still returned

        return result

    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except Exception as exc:
        await db.rollback()
        logger.exception("card_design_generate_failed", error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Generation failed: {exc}",
        )


@router.get(
    "/sessions",
    response_model=List[DesignSessionSummary],
    summary="List AI Card Design sessions",
    description="Return all card_designer sessions for the current user, newest first.",
)
async def list_design_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[DesignSessionSummary]:
    """
    History feed for the designer sidebar.

    Joins ChatSession → Deck (for name) → Flashcard (for card count).
    Fetches the most recent assistant message for the preview snippet.
    """
    from app.modules.chat.internal.models import ChatSession, ChatMessage, MessageRole
    from app.models.deck import Deck
    from app.models.flashcard import Flashcard
    from sqlalchemy import func, and_, outerjoin

    # ── 1. Sessions with deck name and card count ──────────────────────────
    stmt = (
        select(
            ChatSession,
            Deck.name.label("deck_name"),
            func.count(Flashcard.id)
            .filter(Flashcard.deleted_at.is_(None))
            .label("card_count"),
        )
        .outerjoin(Deck, and_(Deck.id == ChatSession.deck_id, Deck.deleted_at.is_(None)))
        .outerjoin(
            Flashcard,
            and_(
                Flashcard.deck_id == ChatSession.deck_id,
                Flashcard.deleted_at.is_(None),
            ),
        )
        .where(
            and_(
                ChatSession.user_id == current_user.id,
                ChatSession.source == "card_designer",
                ChatSession.deleted_at.is_(None),
            )
        )
        .group_by(ChatSession.id, Deck.name)
        .order_by(ChatSession.updated_at.desc())
        .limit(50)
    )

    rows = (await db.execute(stmt)).all()

    # ── 2. Last assistant message per session (one query per session is fine
    #       given the 50-row cap; can batch with a lateral join if needed) ──
    result: List[DesignSessionSummary] = []
    for session, deck_name, card_count in rows:
        last_msg_res = await db.execute(
            select(ChatMessage.content)
            .where(
                and_(
                    ChatMessage.session_id == session.id,
                    ChatMessage.role == MessageRole.ASSISTANT,
                )
            )
            .order_by(ChatMessage.created_at.desc())
            .limit(1)
        )
        last_content: str | None = last_msg_res.scalar_one_or_none()

        result.append(
            DesignSessionSummary(
                session_id=session.id,
                deck_id=session.deck_id,
                deck_name=deck_name or session.title or "Untitled Design",
                card_count=int(card_count or 0),
                last_message_preview=(last_content or "")[:120] or None,
                updated_at=session.updated_at.isoformat(),
            )
        )

    return result

