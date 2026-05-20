"""
AI Card Design Service.

Assembles the enriched user-learning context block that is injected into the
AI designer's system prompt at session creation time.  This is what makes the
conversation intelligent — the AI knows your weak spots, your schedule, and
your existing coverage before you type a single word.
"""

from __future__ import annotations

from typing import Optional
import structlog

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, text

from app.models.flashcard import Flashcard, LearningState
from app.models.deck import Deck
from app.models.review import Review

logger = structlog.get_logger(__name__)

# ---------------------------------------------------------------------------
# System prompt for the design agent
# ---------------------------------------------------------------------------

DESIGNER_SYSTEM_PROMPT = """You are a learning designer embedded inside Synapse, an adaptive study app.
Your job is NOT to be a flashcard factory — it is to interview the user, understand their learning goals, and then propose a precise, targeted card plan.

## Your Persona
You are warm, intellectually curious, and pedagogically sound.
You ask sharp, specific questions — not vague ones like "What's your level?".
You surface blind spots the user didn't know they had.
You push back if their plan doesn't make sense (too many cards, wrong difficulty, shaky prerequisites).

## What You Have Access To
A <LEARNING_CONTEXT> block will be injected below your system prompt.
It contains the user's real data: weak topics, overdue cards, daily review volume, existing deck coverage.
Use this data actively. Reference it explicitly: "I can see your subjunctive recall is 41%..."

## Conversation Flow
1. Open by asking what they want to learn and roughly where they are.
2. Probe with 2-3 targeted follow-up questions — knowledge gaps, prerequisites, time available.
3. Check their existing coverage and performance from the context block.
4. When you have enough signal (usually 4-6 exchanges), call the propose_card_plan tool.
5. Adjust the plan if they push back. Re-call the tool with the updated plan.

## Card Styles (use these deliberately)
- basic: standard Q/A — use for factual recall
- cloze: fill-in-the-blank — use for terminology and formulae
- socratic: "What would happen if..." / "Why does..." — use for conceptual understanding
- scenario: situation-based — use for application and procedural knowledge

## Rules
- NEVER ask the user how many cards they want or what difficulty to set. YOU decide based on context.
- Recommend count based on time available and cognitive load (existing overdue queue matters).
- If source_material is provided, scope ALL subtopics to that material only.
- Always explain your rationale when proposing a plan.
- Keep individual messages concise. No walls of text.

## CRITICAL: How to Propose a Plan

You have access to the `propose_card_plan` function tool. When you are ready to present
a plan you MUST call it as a structured function — do NOT write JSON into the conversation text.

**Why this matters:** Calling the tool populates the design panel on the right side of the
screen. If you output JSON as text, the panel stays empty and the user cannot generate cards.

**Protocol:**
1. Have your conversation normally (text messages only).
2. When ready to propose, call `propose_card_plan(...)` as a function tool call.
3. After the tool call, you MAY add a short follow-up text message asking for feedback.
4. If the user asks for changes, call `propose_card_plan(...)` again with the updated plan.
5. NEVER embed a JSON object inside a prose message. NEVER mix tool calls with long text in the same turn.
"""

CONTEXT_BLOCK_TEMPLATE = """
<LEARNING_CONTEXT>
{context}
</LEARNING_CONTEXT>
"""


class CardDesignService:
    """Assembles the user learning context for the AI designer's system prompt."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def build_system_prompt(
        self, user_id: int, deck_id: Optional[int] = None
    ) -> str:
        """
        Build the full system prompt for the design session.

        Injects a structured context block with real user data above the
        designer persona prompt so the AI can reference it from turn 1.
        """
        context = await self.build_user_learning_context(user_id, deck_id)
        context_block = CONTEXT_BLOCK_TEMPLATE.format(context=context)
        return context_block + "\n" + DESIGNER_SYSTEM_PROMPT

    async def build_user_learning_context(
        self, user_id: int, deck_id: Optional[int] = None
    ) -> str:
        """
        Assemble a structured natural-language context block.

        Queries:
        - Schedule pressure (overdue + due today + avg daily volume)
        - Weak topics across all decks (recall < 70%, >= 3 reviews)
        - Deck coverage summary (existing topics)
        - Prerequisite alerts (recall < 60% on "foundational" topics)
        - If deck_id given: specific deck stats
        """
        try:
            lines: list[str] = []

            # 1. Schedule pressure
            pressure = await self._schedule_pressure(user_id)
            lines.append(f"SCHEDULE: {pressure}")

            # 2. Weak topics (global, across all decks)
            weak = await self._weak_topics(user_id, limit=8)
            if weak:
                lines.append("WEAK TOPICS (recall < 70%, ≥3 reviews):")
                for w in weak:
                    lines.append(f"  - {w['topic']} [{w['deck_name']}]: {w['recall']}% recall")
            else:
                lines.append("WEAK TOPICS: none identified yet (insufficient review data)")

            # 3. Deck coverage
            coverage = await self._deck_coverage(user_id, limit=6)
            if coverage:
                lines.append("EXISTING DECK COVERAGE:")
                for d in coverage:
                    lines.append(
                        f"  - \"{d['name']}\": {d['card_count']} cards"
                        + (f", avg recall {d['avg_recall']}%" if d["avg_recall"] else "")
                    )
            else:
                lines.append("EXISTING DECK COVERAGE: no decks yet")

            # 4. Target deck specifics (if adding to existing)
            if deck_id:
                deck_detail = await self._deck_detail(user_id, deck_id)
                if deck_detail:
                    lines.append(f"TARGET DECK: \"{deck_detail['name']}\"")
                    lines.append(f"  Cards: {deck_detail['card_count']} total")
                    if deck_detail["topic_breakdown"]:
                        lines.append("  Topics already covered:")
                        for t in deck_detail["topic_breakdown"][:8]:
                            lines.append(f"    - {t['topic']}: {t['count']} cards")

            return "\n".join(lines)

        except Exception as exc:
            logger.warning("card_design_context_failed", user_id=user_id, error=str(exc))
            return "LEARNING_CONTEXT: unavailable (data query failed)"

    async def build_post_generation_message(
        self,
        user_id: int,
        deck_id: int,
        cards_generated: int,
        plan: "CardDesignPlan",
    ) -> str:
        """
        Build the synthetic assistant message injected after card generation.

        This keeps the AI grounded in the deck's new state so that subsequent
        conversation turns can reference what was actually created.
        """
        from app.schemas.flashcards.card_design import CardDesignPlan  # noqa: F401 type hint

        # Subtopic summary
        subtopic_lines = "\n".join(
            f"  ✓ **{s.topic}** — {s.count} {s.style.value if hasattr(s.style, 'value') else s.style} card{'s' if s.count != 1 else ''}"
            for s in plan.subtopics
        )

        # Fresh deck state
        deck_detail = await self._deck_detail(user_id, deck_id)
        total_now = deck_detail["card_count"] if deck_detail else cards_generated

        # Due count
        try:
            from sqlalchemy import text as _text
            due_res = await self.db.execute(
                _text("""
                    SELECT COUNT(*) FROM flashcards
                    WHERE deck_id = :did AND deleted_at IS NULL
                      AND (next_review IS NULL OR next_review <= NOW())
                """),
                {"did": deck_id},
            )
            due_count = int(due_res.scalar_one() or 0)
        except Exception:
            due_count = 0

        due_note = (
            f" **{due_count} {'are' if due_count != 1 else 'is'} due for review right now.**"
            if due_count > 0
            else " None are due yet — they'll appear in your queue after your first review session."
        )

        return (
            f"✓ Generated **{cards_generated} card{'s' if cards_generated != 1 else ''}** "
            f"and added them to **\"{plan.deck_name}\"**:\n\n"
            f"{subtopic_lines}\n\n"
            f"Your deck now has **{total_now} total cards**.{due_note}\n\n"
            "Come back after a review session and I can see which topics you're "
            "struggling with — then we can refine or extend the set."
        )



    # -------------------------------------------------------------------------
    # Private query helpers
    # -------------------------------------------------------------------------

    async def _schedule_pressure(self, user_id: int) -> str:
        """Returns a readable description of the user's current review load."""
        try:
            result = await self.db.execute(
                text("""
                    SELECT
                        COUNT(*) FILTER (WHERE f.next_review <= NOW())         AS overdue,
                        COUNT(*) FILTER (WHERE f.next_review::date = NOW()::date) AS due_today,
                        COUNT(*)                                                AS total_cards
                    FROM flashcards f
                    JOIN decks d ON d.id = f.deck_id
                    WHERE d.user_id = :uid
                      AND f.deleted_at IS NULL
                      AND d.deleted_at IS NULL
                """),
                {"uid": user_id},
            )
            row = result.mappings().first()
            if not row:
                return "no cards yet"
            overdue = row["overdue"] or 0
            due_today = row["due_today"] or 0
            total = row["total_cards"] or 0

            # Avg daily reviews over last 14 days
            vol_result = await self.db.execute(
                text("""
                    SELECT COALESCE(COUNT(*) / NULLIF(14, 0), 0) AS avg_daily
                    FROM reviews r
                    JOIN flashcards f ON f.id = r.card_id
                    JOIN decks d ON d.id = f.deck_id
                    WHERE d.user_id = :uid
                      AND r.reviewed_at >= NOW() - INTERVAL '14 days'
                """),
                {"uid": user_id},
            )
            vol_row = vol_result.mappings().first()
            avg_daily = int(vol_row["avg_daily"] or 0) if vol_row else 0

            return (
                f"{overdue} overdue, {due_today} due today, "
                f"{total} total cards, ~{avg_daily} reviews/day (14-day avg)"
            )
        except Exception:
            return "unknown"

    async def _weak_topics(self, user_id: int, limit: int = 8) -> list[dict]:
        """Cards/topics where recall < 70% with at least 3 reviews."""
        try:
            result = await self.db.execute(
                text("""
                    SELECT
                        COALESCE(f.topic, LEFT(f.front_text, 50)) AS topic,
                        d.name AS deck_name,
                        ROUND(
                            100.0 * SUM(f.times_correct) / NULLIF(SUM(f.times_reviewed), 0)
                        , 0) AS recall
                    FROM flashcards f
                    JOIN decks d ON d.id = f.deck_id
                    WHERE d.user_id = :uid
                      AND f.deleted_at IS NULL
                      AND d.deleted_at IS NULL
                      AND f.times_reviewed >= 3
                    GROUP BY f.topic, f.front_text, d.name
                    HAVING
                        ROUND(100.0 * SUM(f.times_correct) / NULLIF(SUM(f.times_reviewed), 0), 0) < 70
                    ORDER BY recall ASC
                    LIMIT :lim
                """),
                {"uid": user_id, "lim": limit},
            )
            return [
                {
                    "topic": row["topic"],
                    "deck_name": row["deck_name"],
                    "recall": int(row["recall"] or 0),
                }
                for row in result.mappings().all()
            ]
        except Exception:
            return []

    async def _deck_coverage(self, user_id: int, limit: int = 6) -> list[dict]:
        """Returns a summary of the user's decks (name, card count, avg recall)."""
        try:
            result = await self.db.execute(
                text("""
                    SELECT
                        d.name,
                        COUNT(f.id) AS card_count,
                        ROUND(
                            100.0 * SUM(f.times_correct) / NULLIF(SUM(f.times_reviewed), 0)
                        , 0) AS avg_recall
                    FROM decks d
                    LEFT JOIN flashcards f ON f.deck_id = d.id AND f.deleted_at IS NULL
                    WHERE d.user_id = :uid
                      AND d.deleted_at IS NULL
                    GROUP BY d.id, d.name
                    ORDER BY card_count DESC
                    LIMIT :lim
                """),
                {"uid": user_id, "lim": limit},
            )
            return [
                {
                    "name": row["name"],
                    "card_count": int(row["card_count"] or 0),
                    "avg_recall": int(row["avg_recall"]) if row["avg_recall"] else None,
                }
                for row in result.mappings().all()
            ]
        except Exception:
            return []

    async def _deck_detail(self, user_id: int, deck_id: int) -> Optional[dict]:
        """Returns detailed stats for a specific deck."""
        try:
            deck_result = await self.db.execute(
                select(Deck).where(
                    and_(Deck.id == deck_id, Deck.user_id == user_id, Deck.deleted_at.is_(None))
                )
            )
            deck = deck_result.scalar_one_or_none()
            if not deck:
                return None

            topic_result = await self.db.execute(
                text("""
                    SELECT
                        COALESCE(topic, LEFT(front_text, 50)) AS topic,
                        COUNT(*) AS count
                    FROM flashcards
                    WHERE deck_id = :did AND deleted_at IS NULL
                    GROUP BY topic, front_text
                    ORDER BY count DESC
                    LIMIT 10
                """),
                {"did": deck_id},
            )
            topics = [
                {"topic": row["topic"], "count": int(row["count"])}
                for row in topic_result.mappings().all()
            ]

            card_count_result = await self.db.execute(
                select(func.count(Flashcard.id)).where(
                    and_(Flashcard.deck_id == deck_id, Flashcard.deleted_at.is_(None))
                )
            )
            card_count = card_count_result.scalar_one() or 0

            return {
                "name": deck.name,
                "card_count": card_count,
                "topic_breakdown": topics,
            }
        except Exception:
            return None
