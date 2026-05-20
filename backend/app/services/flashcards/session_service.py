"""
Session Persistence Service — Sprint 2.

Sits above the low-level StudySession model and provides:
- Session creation with a queue snapshot (cards_planned)
- Checkpoint saving (current_card_index + per-card review detail)
- Active session lookup (resume prompt)
- Session budget curation (max 25 cards curated from due queue)
- Abandon / complete lifecycle management

The queue is snapshotted at session start so the resume experience is
deterministic — even if new cards become due while the session is paused,
the student resumes the same set they started with.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional

import structlog
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.deck import Deck
from app.models.flashcard import Flashcard, LearningState
from app.models.study_session import StudySession, StudySessionType

logger = structlog.get_logger(__name__)

# Curated session budget — we deliberately cap cards per session to
# avoid the "200 cards due is overwhelming" problem (see Ring 3 design).
DEFAULT_SESSION_BUDGET = 25
STALE_THRESHOLD_HOURS = 48  # Sessions older than this without activity are auto-abandoned


def _strip_internal(card: Dict) -> Dict:
    """Remove internal curation keys (_bucket) before returning cards to callers."""
    return {k: v for k, v in card.items() if not k.startswith("_")}


class SessionService:
    """Service layer for study session persistence."""

    def __init__(self, session: AsyncSession) -> None:
        self.db = session

    # ── Session creation ──────────────────────────────────────────────────────

    async def create_session(
        self,
        user_id: int,
        deck_id: Optional[int] = None,
        session_mode: str = "classic",
        budget: int = DEFAULT_SESSION_BUDGET,
    ) -> Dict:
        """
        Create a new study session with a curated card queue.

        Steps:
            1. Curate up to `budget` due cards (prioritised by overdue / NEW)
            2. Snapshot the ordered queue into cards_planned
            3. Persist and return the full session dict (including queue)

        Args:
            user_id: Owner
            deck_id: If set, restrict queue to a single deck
            session_mode: 'classic' | 'socratic'
            budget: Max cards in this session (default 25)

        Returns:
            Full session dict including cards_planned queue
        """
        # Auto-abandon stale in-progress sessions before creating a new one
        await self._auto_abandon_stale(user_id)

        queue = await self._curate_queue(user_id, deck_id, budget)

        cards_planned = [
            {"card_id": c["card_id"], "deck_id": c["deck_id"]} for c in queue
        ]

        study_session = StudySession(
            user_id=user_id,
            session_type=StudySessionType.FLASHCARD_REVIEW,
            modules_used={"modules": ["flashcards"]},
            started_at=datetime.now(timezone.utc),
            # New persistence columns
            deck_id=deck_id,
            session_mode=session_mode,
            resume_status="in_progress",
            cards_planned=cards_planned,
            cards_reviewed_detail=[],
            current_card_index=0,
            last_activity_at=datetime.now(timezone.utc),
        )

        self.db.add(study_session)
        await self.db.commit()
        await self.db.refresh(study_session)

        logger.info(
            "study_session_created",
            session_id=study_session.id,
            user_id=user_id,
            deck_id=deck_id,
            mode=session_mode,
            queue_size=len(cards_planned),
        )

        return self._to_dict(study_session, queue=queue)

    # ── Checkpoint ────────────────────────────────────────────────────────────

    async def save_checkpoint(
        self,
        session_id: int,
        user_id: int,
        current_card_index: int,
        card_review: Optional[Dict] = None,
    ) -> Dict:
        """
        Save the current session position.

        Called after every card review so resuming is always possible.

        Args:
            session_id: Session to checkpoint
            user_id: Must own the session
            current_card_index: 0-based index into cards_planned
            card_review: Optional dict:
                {card_id, quality, duration_ms, hint_used}
                Appended to cards_reviewed_detail if provided.

        Returns:
            Updated session dict
        """
        session = await self._get_owned(session_id, user_id)

        if session.resume_status != "in_progress":
            raise ValueError("Cannot checkpoint a completed or abandoned session")

        session.current_card_index = current_card_index
        session.last_activity_at = datetime.now(timezone.utc)

        if card_review:
            detail = list(session.cards_reviewed_detail or [])
            detail.append({
                "card_id": card_review.get("card_id"),
                "quality": card_review.get("quality"),
                "duration_ms": card_review.get("duration_ms"),
                "hint_used": card_review.get("hint_used", False),
                "reviewed_at": datetime.utcnow().isoformat(),
            })
            session.cards_reviewed_detail = detail
            session.items_completed = len(detail)
            session.items_correct = sum(
                1 for r in detail if (r.get("quality") or 0) >= 3
            )

        await self.db.commit()
        await self.db.refresh(session)

        return self._to_dict(session)

    # ── Complete ──────────────────────────────────────────────────────────────

    async def complete_session(self, session_id: int, user_id: int) -> Dict:
        """
        Mark a session as completed.

        Calculates final time_spent_seconds and sets resume_status='completed'.
        """
        session = await self._get_owned(session_id, user_id)

        if session.resume_status == "completed":
            raise ValueError("Session already completed")

        now = datetime.now(timezone.utc)
        session.ended_at = now
        session.resume_status = "completed"
        session.last_activity_at = now
        session.time_spent_seconds = int(
            (now - session.started_at.replace(tzinfo=None)).total_seconds()
        )

        # Final accuracy count from detail records
        detail = session.cards_reviewed_detail or []
        session.items_completed = len(detail)
        session.items_correct = sum(
            1 for r in detail if (r.get("quality") or 0) >= 3
        )

        await self.db.commit()
        await self.db.refresh(session)

        logger.info(
            "study_session_completed",
            session_id=session_id,
            user_id=user_id,
            cards_reviewed=session.items_completed,
            accuracy=session.accuracy,
            time_spent=session.time_spent_seconds,
        )

        return self._to_dict(session)

    # ── Abandon ───────────────────────────────────────────────────────────────

    async def abandon_session(self, session_id: int, user_id: int) -> Dict:
        """
        Mark a session as abandoned (user explicitly quit / navigated away).

        Abandoned sessions surface in 'Recent / Not Completed' on the frontend.
        """
        session = await self._get_owned(session_id, user_id)

        if session.resume_status == "completed":
            raise ValueError("Cannot abandon a completed session")

        session.resume_status = "abandoned"
        session.last_activity_at = datetime.now(timezone.utc)
        if not session.ended_at:
            session.ended_at = datetime.now(timezone.utc)

        await self.db.commit()
        await self.db.refresh(session)

        return self._to_dict(session)

    # ── Active sessions (resume prompt) ───────────────────────────────────────

    async def get_active_sessions(self, user_id: int) -> List[Dict]:
        """
        Return sessions that are resumable — in_progress or recently abandoned.

        The frontend uses this to surface "Continue where you left off?" prompts.

        Returns sessions ordered by last_activity_at DESC, limited to 5.
        Filters out sessions with no cards reviewed AND older than 2 hours
        (user just closed the tab immediately).
        """
        result = await self.db.execute(
            select(StudySession)
            .where(
                and_(
                    StudySession.user_id == user_id,
                    StudySession.resume_status.in_(["in_progress", "abandoned"]),
                    # Must have some activity to be worth showing
                    or_(
                        StudySession.current_card_index > 0,
                        StudySession.last_activity_at
                        >= datetime.now(timezone.utc) - timedelta(hours=2),
                    ),
                )
            )
            .order_by(StudySession.last_activity_at.desc())
            .limit(5)
        )
        sessions = result.scalars().all()

        output = []
        for s in sessions:
            # Enrich with deck name if deck_id set
            deck_name = await self._get_deck_name(s.deck_id) if s.deck_id else None
            d = self._to_dict(s)
            d["deck_name"] = deck_name
            output.append(d)

        return output

    # ── Queue curation ────────────────────────────────────────────────────────

    async def _curate_queue(
        self,
        user_id: int,
        deck_id: Optional[int],
        budget: int,
    ) -> List[Dict]:
        """
        Select up to `budget` due cards with topic diversity interleaving.

        Priority:
            1. Overdue (next_review past)
            2. NEW state
            3. LEARNING state
            4. REVIEW state

        Interleaving:
            After scoring by urgency, cards are sorted into per-deck topic
            buckets and a round-robin pass ensures no more than 2 consecutive
            cards share the same deck/topic. This prevents the "20 PostgreSQL
            cards in a row" cognitive overload described in the plan.
        """
        filters = [
            Deck.user_id == user_id,
            Flashcard.deleted_at.is_(None),
            Deck.deleted_at.is_(None),
            or_(
                Flashcard.next_review <= datetime.utcnow(),
                Flashcard.next_review.is_(None),
            ),
        ]
        if deck_id:
            filters.append(Flashcard.deck_id == deck_id)

        # Fetch a larger pool (2x budget) so interleaving has enough cards to
        # draw from across topics without running short.
        pool_limit = min(budget * 2, 200)
        result = await self.db.execute(
            select(Flashcard, Deck.name.label("deck_name"))
            .join(Deck, Deck.id == Flashcard.deck_id)
            .where(and_(*filters))
            .order_by(
                # Overdue first
                (Flashcard.next_review < datetime.utcnow()).desc(),
                # NEW cards second
                (Flashcard.learning_state == LearningState.NEW).desc(),
                # Then by urgency
                Flashcard.next_review.asc().nullsfirst(),
            )
            .limit(pool_limit)
        )
        rows = result.all()

        # Build card dicts preserving urgency-rank order inside each bucket
        all_cards = [
            {
                "card_id": card.id,
                "deck_id": card.deck_id,
                "deck_name": deck_name,
                "front_text": card.front_text,
                "back_text": card.back_text,
                "topic": card.topic,
                "card_type": getattr(card, "card_type", "basic"),
                "learning_state": (
                    card.learning_state.value
                    if hasattr(card.learning_state, "value")
                    else card.learning_state
                ),
                "next_review": (
                    card.next_review.isoformat() if card.next_review else None
                ),
                "ease_factor": float(card.ease_factor),
                # Bucket key: use topic if present (more granular), else deck_id
                "_bucket": (card.topic or "").split()[0] if card.topic else str(card.deck_id),
            }
            for card, deck_name in rows
        ]

        if deck_id:
            # Single-deck session: no interleaving needed, just take top N
            return [_strip_internal(c) for c in all_cards[:budget]]

        # ── Topic interleaving (round-robin across buckets) ───────────────────
        # Group cards into named buckets preserving urgency order within each
        from collections import defaultdict, deque
        buckets: dict = defaultdict(deque)
        for card in all_cards:
            buckets[card["_bucket"]].append(card)

        # Round-robin: take one card per bucket in turn until budget is met
        interleaved: List[Dict] = []
        bucket_keys = list(buckets.keys())
        i = 0
        while len(interleaved) < budget and any(buckets[k] for k in bucket_keys):
            key = bucket_keys[i % len(bucket_keys)]
            if buckets[key]:
                interleaved.append(buckets[key].popleft())
            i += 1

        return [_strip_internal(c) for c in interleaved]

    # ── Stale session cleanup ─────────────────────────────────────────────────

    async def _auto_abandon_stale(self, user_id: int) -> int:
        """
        Auto-abandon in_progress sessions that have had no activity for
        STALE_THRESHOLD_HOURS hours. Returns number of sessions abandoned.

        This prevents a session from being "in_progress" forever if the
        user just closed the tab without explicitly quitting.
        """
        stale_cutoff = datetime.now(timezone.utc) - timedelta(hours=STALE_THRESHOLD_HOURS)
        result = await self.db.execute(
            select(StudySession).where(
                and_(
                    StudySession.user_id == user_id,
                    StudySession.resume_status == "in_progress",
                    or_(
                        StudySession.last_activity_at < stale_cutoff,
                        StudySession.last_activity_at.is_(None),
                    ),
                )
            )
        )
        stale = result.scalars().all()
        for s in stale:
            s.resume_status = "abandoned"
            if not s.ended_at:
                s.ended_at = datetime.now(timezone.utc)

        if stale:
            await self.db.commit()
            logger.info(
                "stale_sessions_auto_abandoned",
                user_id=user_id,
                count=len(stale),
            )
        return len(stale)

    # ── Helpers ───────────────────────────────────────────────────────────────

    async def _get_owned(self, session_id: int, user_id: int) -> StudySession:
        result = await self.db.execute(
            select(StudySession).where(
                and_(
                    StudySession.id == session_id,
                    StudySession.user_id == user_id,
                )
            )
        )
        session = result.scalar_one_or_none()
        if not session:
            raise ValueError(f"Session {session_id} not found or access denied")
        return session

    async def _get_deck_name(self, deck_id: int) -> Optional[str]:
        result = await self.db.execute(
            select(Deck.name).where(and_(Deck.id == deck_id, Deck.deleted_at.is_(None)))
        )
        return result.scalar_one_or_none()

    @staticmethod
    def _to_dict(session: StudySession, queue: Optional[List[Dict]] = None) -> Dict:
        """
        Serialize a StudySession to dict.

        Includes `queue` (full card data) only at creation — subsequent
        checkpoint/complete responses return the stored cards_planned list
        to avoid re-fetching card content after every checkpoint.
        """
        planned = getattr(session, "cards_planned", None) or []
        idx     = getattr(session, "current_card_index", 0) or 0
        return {
            "id": session.id,
            "user_id": session.user_id,
            "deck_id": session.deck_id if hasattr(session, "deck_id") else None,
            "session_type": (
                session.session_type.value
                if hasattr(session.session_type, "value")
                else session.session_type
            ),
            "session_mode": getattr(session, "session_mode", "classic"),
            "resume_status": getattr(session, "resume_status", "in_progress"),
            "cards_planned": planned,
            "cards_reviewed_detail": getattr(session, "cards_reviewed_detail", []) or [],
            "current_card_index": idx,
            # Computed for the frontend progress bar in ResumeSessionBanner
            "progress_pct": round((idx / max(len(planned), 1)) * 100),
            "items_completed": session.items_completed,
            "items_correct": session.items_correct,
            "accuracy": session.accuracy,
            "time_spent_seconds": session.time_spent_seconds,
            "started_at": session.started_at,
            "ended_at": session.ended_at,
            "last_activity_at": getattr(session, "last_activity_at", None),
            # Full card data for creation response only
            "queue": queue,
        }
