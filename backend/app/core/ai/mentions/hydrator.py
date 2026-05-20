"""
ContentHydrator — fetches entity content for AI context injection.

Takes resolved mentions (from MentionResolver) and produces HydrationResult:
a token-budgeted collection of HydratedContext objects ready for system prompt
injection by ContextInjectionMiddleware.

Truncation strategy for notes (tiered by embedding_status):
  READY  \u2192 Tier 2: pgvector cosine search over note_chunks scoped to this note,
              top-k results re-sorted by chunk_index into document order.
  other  \u2192 Tier 3: Structural head+tail truncation on content_text.
  Short  \u2192 Tier 1: Full injection (note fits within budget, no truncation).

Budget:
  - Mentions are processed in the order they appear in the user's message.
  - Per-entity cap: MAX_TOKENS_PER_ENTITY tokens.
  - Global cap: MAX_TOTAL_TOKENS across all injected entities.
  - Entities that would exceed the global cap are recorded as budget_overflows.
"""

import asyncio
from dataclasses import dataclass, field
from typing import Optional

import structlog
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select

logger = structlog.get_logger(__name__)

# ── Budget constants ───────────────────────────────────────────────────────────

# Hard cap per individual entity to prevent one giant note from consuming everything
MAX_TOKENS_PER_ENTITY: int = 2000

# Hard cap across all injected entities in a single request
MAX_TOTAL_TOKENS: int = 8000

# Notes with fewer than this many estimated tokens are injected in full (Tier 1)
FULL_INJECT_THRESHOLD: int = 1500

# Number of chunks to retrieve from pgvector search (Tier 2)
CHUNK_TOP_K: int = 6


# ── Result types ───────────────────────────────────────────────────────────────

@dataclass
class HydratedContext:
    """Content ready to inject into the AI system prompt for one entity."""

    entity_type: str
    entity_id: int
    title: str
    content_for_ai: str   # The actual text to inject
    token_estimate: int   # Rough token count (chars // 4)
    summary_line: str     # Header shown above content in system prompt


@dataclass
class HydrationResult:
    """
    Outcome of a full hydration pass across all resolved mentions.

    Attributes:
        injected:             Entities successfully hydrated and within budget.
        resolution_failures:  ParsedMentions that could not be resolved
                              (unknown type, not found, wrong user).
        budget_overflows:     ParsedMentions resolved successfully but cut
                              because the token budget was exhausted.
        stale_fallbacks:      note_ids that used structural truncation due to
                              stale/failed embeddings. Logged internally only,
                              NOT forwarded to the frontend.
    """

    injected: list[HydratedContext] = field(default_factory=list)
    resolution_failures: list = field(default_factory=list)   # list[ParsedMention]
    budget_overflows: list = field(default_factory=list)       # list[ParsedMention]
    stale_fallbacks: list[int] = field(default_factory=list)   # note_ids only

    @property
    def has_content(self) -> bool:
        return bool(self.injected)

    def to_sse_payload(self) -> dict:
        """
        Serialise for the data-mention-status SSE event.

        Only resolution_failures and budget_overflows are forwarded to the
        frontend. Successful injections are silent (the UI already shows
        the mention chip; no need for a second confirmation).
        stale_fallbacks are an internal detail and are never sent to the client.
        """
        return {
            "injected": [
                {"type": c.entity_type, "id": c.entity_id, "title": c.title}
                for c in self.injected
            ],
            "resolution_failures": [
                {"type": m.entity_type, "id": m.entity_id, "title": m.title}
                for m in self.resolution_failures
            ],
            "budget_overflows": [
                {"type": m.entity_type, "id": m.entity_id, "title": m.title}
                for m in self.budget_overflows
            ],
        }


# ── Hydrator ───────────────────────────────────────────────────────────────────

class ContentHydrator:
    """
    Fetches entity content and enforces a token budget for system prompt injection.

    Designed to be instantiated once and reused (stateless between calls).
    """

    async def hydrate_all(
        self,
        resolved_mentions: list,        # list[ResolvedMention | None]
        parsed_mentions: list,           # list[ParsedMention] — parallel to resolved_mentions
        db: AsyncSession,
        user_id: int,
        user_message: str = "",
        mode_id: str = "direct",
    ) -> HydrationResult:
        """
        Hydrate all successfully resolved mentions, respecting the token budget.

        Args:
            resolved_mentions: Output of MentionResolver.resolve_all().
            parsed_mentions:   Original ParsedMention list (same order).
            db:                Database session.
            user_id:           Authenticated user ID.
            user_message:      Original user message (used for chunk similarity search).
            mode_id:           Current chat mode (used by QuizIntentClassifier).

        Returns:
            HydrationResult with injected content and failure records.
        """
        result = HydrationResult()
        total_tokens = 0

        for parsed, resolved in zip(parsed_mentions, resolved_mentions):
            if resolved is None:
                result.resolution_failures.append(parsed)
                continue

            ctx = await self._hydrate_one(
                resolved, db, user_id, user_message, mode_id, result
            )

            if ctx is None:
                # hydration produced nothing (unsupported type or empty content)
                continue

            if total_tokens + ctx.token_estimate > MAX_TOTAL_TOKENS:
                result.budget_overflows.append(resolved.mention)
                continue

            result.injected.append(ctx)
            total_tokens += ctx.token_estimate

        if result.stale_fallbacks:
            logger.info(
                "hydration_stale_fallbacks",
                note_ids=result.stale_fallbacks,
                count=len(result.stale_fallbacks),
            )

        return result

    async def _hydrate_one(
        self,
        resolved,          # ResolvedMention
        db: AsyncSession,
        user_id: int,
        user_message: str,
        mode_id: str,
        result: HydrationResult,
    ) -> Optional[HydratedContext]:
        """Dispatch to the per-entity-type hydration handler."""
        entity_type = resolved.entity.type.value

        handlers = {
            "note":      self._hydrate_note,
            "quiz":      self._hydrate_quiz,
            "document":  self._hydrate_document,
            "flashcard": self._hydrate_flashcard,
        }

        handler = handlers.get(entity_type)
        if handler is None:
            logger.warning("hydration_unsupported_type", entity_type=entity_type)
            return None

        return await handler(resolved, db, user_id, user_message, mode_id, result)

    # ── Note hydration ─────────────────────────────────────────────────────────

    async def _hydrate_note(
        self, resolved, db, user_id, user_message, mode_id, result
    ) -> Optional[HydratedContext]:
        from app.models.note import Note

        note_result = await db.execute(
            select(Note).where(
                Note.id == resolved.entity.id,
                Note.user_id == user_id,
                Note.deleted_at.is_(None),
            )
        )
        note = note_result.scalar_one_or_none()
        if not note:
            return None

        body = note.content_text or ""
        full_text = f"{note.title}\n\n{body}".strip()
        token_estimate = len(full_text) // 4

        if token_estimate <= FULL_INJECT_THRESHOLD:
            # Tier 1: small note — inject everything
            content = full_text[:MAX_TOKENS_PER_ENTITY * 4]

        elif note.embedding_status == "READY":
            # Tier 2: embedding is current — semantic chunk search within note
            content = await self._chunk_search_within_note(
                note_id=note.id,
                query=user_message,
                db=db,
                budget_tokens=MAX_TOKENS_PER_ENTITY,
            )
            if not content:
                # Chunk table empty or search failed — fall back to structural
                content = self._structural_truncate(full_text)

        else:
            # Tier 3: stale or failed embedding — structural truncation
            result.stale_fallbacks.append(note.id)
            content = self._structural_truncate(full_text)

        final_token_estimate = min(len(content) // 4, MAX_TOKENS_PER_ENTITY)

        return HydratedContext(
            entity_type="note",
            entity_id=note.id,
            title=note.title,
            content_for_ai=content,
            token_estimate=final_token_estimate,
            summary_line=f"Note: {note.title}",
        )

    async def _chunk_search_within_note(
        self,
        note_id: int,
        query: str,
        db: AsyncSession,
        budget_tokens: int,
    ) -> str:
        """
        Cosine similarity search over note_chunks scoped to a single note.

        Top-k chunks are selected by similarity, then RE-SORTED by chunk_index
        into document order before stitching. This ensures the AI receives
        content in the order the author wrote it, not in random similarity order.

        Args:
            note_id:       Scope the search to this note's chunks.
            query:         User message text used as the similarity target.
            db:            Database session.
            budget_tokens: Token budget for the assembled result.

        Returns:
            Assembled chunk content, or empty string if no chunks found.
        """
        import asyncio
        from app.core.ai.embeddings.boundary import embed_text_sync, EMBEDDING_DIM

        # Embed query in thread pool
        query_embedding, _ = await asyncio.get_event_loop().run_in_executor(
            None, embed_text_sync, query
        )

        if query_embedding is None:
            return ""

        emb_str = "[" + ",".join(str(x) for x in query_embedding) + "]"

        rows = (await db.execute(text("""
            SELECT chunk_index, content,
                   1 - (embedding <=> CAST(:emb AS vector(:dim))) AS similarity
            FROM developer_schema.note_chunks
            WHERE note_id = :note_id
            ORDER BY embedding <=> CAST(:emb AS vector(:dim))
            LIMIT :k
        """), {
            "emb": emb_str,
            "dim": EMBEDDING_DIM,
            "note_id": note_id,
            "k": CHUNK_TOP_K,
        })).fetchall()

        if not rows:
            return ""

        # Re-sort by chunk_index (document order) before stitching.
        # Similarity ranking selected the relevant chunks; document order
        # ensures the assembled context is narratively coherent.
        rows_in_order = sorted(rows, key=lambda r: r.chunk_index)

        assembled: list[str] = []
        token_count = 0

        for row in rows_in_order:
            chunk_tokens = len(row.content) // 4
            if token_count + chunk_tokens > budget_tokens:
                break
            assembled.append(row.content)
            token_count += chunk_tokens

        return "\n\n---\n\n".join(assembled)

    def _structural_truncate(
        self,
        text: str,
        head_tokens: int = 1300,
        tail_tokens: int = 200,
    ) -> str:
        """
        Return the first head_tokens and last tail_tokens of text.

        Used for Tier 3 (stale/failed embedding) where semantic retrieval is
        unavailable. The head carries context and definitions; the tail
        often carries conclusions and summaries.
        """
        head_chars = head_tokens * 4
        tail_chars = tail_tokens * 4
        total_budget = head_chars + tail_chars

        if len(text) <= total_budget:
            return text

        head = text[:head_chars]
        tail = text[-tail_chars:]
        return f"{head}\n\n[...content truncated \u2014 embedding stale or unavailable...]\n\n{tail}"

    # ── Quiz hydration ─────────────────────────────────────────────────────────

    async def _hydrate_quiz(
        self, resolved, db, user_id, user_message, mode_id, result
    ) -> Optional[HydratedContext]:
        from app.models.quiz import Quiz
        from app.core.ai.mentions.quiz_intent import QuizIntentClassifier

        quiz_result = await db.execute(
            select(Quiz).where(
                Quiz.id == resolved.entity.id,
                Quiz.user_id == user_id,
            )
        )
        quiz = quiz_result.scalar_one_or_none()
        if not quiz:
            return None

        expose_answers = QuizIntentClassifier().should_expose_answers(user_message, mode_id)
        questions = quiz.questions or []

        lines = [f"Quiz: {quiz.title}"]
        if quiz.description:
            lines.append(f"Description: {quiz.description}")
        lines.append(f"Questions ({len(questions)} total):\n")

        for idx, q in enumerate(questions, 1):
            q_text = q.get("question_text", "") if isinstance(q, dict) else getattr(q, "question_text", "")
            lines.append(f"{idx}. {q_text}")

            options = q.get("options", {}) if isinstance(q, dict) else getattr(q, "options", {})
            if isinstance(options, dict) and options.get("choices"):
                for letter, choice in zip("ABCD", options["choices"]):
                    lines.append(f"   {letter}) {choice}")

            if expose_answers:
                answer = q.get("correct_answer", "") if isinstance(q, dict) else getattr(q, "correct_answer", "")
                explanation = q.get("explanation", "") if isinstance(q, dict) else getattr(q, "explanation", "")
                if answer:
                    lines.append(f"   \u2713 Correct: {answer}")
                if explanation:
                    lines.append(f"   Explanation: {explanation}")

            lines.append("")

        content = "\n".join(lines)
        token_estimate = min(len(content) // 4, MAX_TOKENS_PER_ENTITY)

        return HydratedContext(
            entity_type="quiz",
            entity_id=quiz.id,
            title=quiz.title,
            content_for_ai=content[:MAX_TOKENS_PER_ENTITY * 4],
            token_estimate=token_estimate,
            summary_line=f"Quiz: {quiz.title} ({len(questions)} questions)",
        )

    # ── Flashcard hydration ────────────────────────────────────────────────────

    async def _hydrate_flashcard(
        self, resolved, db, user_id, user_message, mode_id, result
    ) -> Optional[HydratedContext]:
        """
        Hydrate a flashcard DECK — entity_id is now a deck ID, not a card ID.

        Returns all active cards as numbered Q&A pairs, truncated to token budget.
        """
        from app.models.deck import Deck
        from app.models.flashcard import Flashcard
        from sqlalchemy import select

        deck_result = await db.execute(
            select(Deck).where(
                Deck.id == resolved.entity.id,
                Deck.user_id == user_id,
                Deck.deleted_at.is_(None),
            )
        )
        deck = deck_result.scalar_one_or_none()
        if not deck:
            return None

        cards_result = await db.execute(
            select(Flashcard).where(
                Flashcard.deck_id == deck.id,
                Flashcard.deleted_at.is_(None),
            ).order_by(Flashcard.id)
        )
        cards = cards_result.scalars().all()

        if not cards:
            return None

        lines = [f"Flashcard Deck: {deck.name}"]
        if deck.description:
            lines.append(f"Description: {deck.description}")
        lines.append(f"Total cards: {len(cards)}\n")

        budget_chars = MAX_TOKENS_PER_ENTITY * 4
        included = 0

        for idx, card in enumerate(cards, 1):
            entry = f"{idx}. Q: {card.front_text}\n   A: {card.back_text}"
            # Check if adding this card would exceed budget
            current_len = sum(len(l) for l in lines)
            if current_len + len(entry) > budget_chars:
                lines.append(f"\n[... {len(cards) - included} more cards not shown — token budget reached]")
                break
            lines.append(entry)
            included += 1

        content = "\n".join(lines)
        token_estimate = min(len(content) // 4, MAX_TOKENS_PER_ENTITY)

        return HydratedContext(
            entity_type="flashcard",
            entity_id=deck.id,
            title=deck.name,
            content_for_ai=content,
            token_estimate=token_estimate,
            summary_line=f"Flashcard Deck: {deck.name} ({len(cards)} cards)",
        )

    # ── Document hydration ─────────────────────────────────────────────────────

    async def _hydrate_document(
        self, resolved, db, user_id, user_message, mode_id, result
    ) -> Optional[HydratedContext]:
        """
        Document hydration: fetch content_text from the document record.

        Documents are typically large, so we always apply structural truncation
        at the entity budget limit. Future work: chunk-level pgvector search for
        documents (same pattern as notes, once the document pipeline migrates to
        AdvancedSemanticChunker).
        """
        from app.models.document import Document

        doc_result = await db.execute(
            select(Document).where(
                Document.id == resolved.entity.id,
                Document.user_id == user_id,
            )
        )
        doc = doc_result.scalar_one_or_none()
        if not doc:
            return None

        body = getattr(doc, "content_text", None) or getattr(doc, "extracted_text", None) or ""
        if not body:
            return None

        full_text = f"{doc.title or 'Document'}\n\n{body}"
        content = self._structural_truncate(
            full_text,
            head_tokens=int(MAX_TOKENS_PER_ENTITY * 0.85),
            tail_tokens=int(MAX_TOKENS_PER_ENTITY * 0.15),
        )
        token_estimate = min(len(content) // 4, MAX_TOKENS_PER_ENTITY)

        return HydratedContext(
            entity_type="document",
            entity_id=doc.id,
            title=getattr(doc, "title", "Document") or "Document",
            content_for_ai=content,
            token_estimate=token_estimate,
            summary_line=f"Document: {getattr(doc, 'title', 'Document') or 'Document'}",
        )
