"""Context-aware query rewriter for RAG grounding.

Resolves context-dependent queries (pronouns, continuations, bare references)
using recent conversation history BEFORE HyDE expansion or vector search.

Pipeline order:
    Raw query → ContextAwareRewriter → (HyDE if standalone) → Vector search

The rewriter only fires when ``is_context_dependent()`` returns ``True``,
ensuring standalone queries like "what is pg_catalog?" skip it entirely.

When the rewriter fires it also replaces HyDE — a well-resolved query does
not benefit from further expansion and the latency saving is worthwhile.
"""

from __future__ import annotations

from typing import List, Optional
import structlog

logger = structlog.get_logger(__name__)

# ── Trigger word sets ─────────────────────────────────────────────────────────

_PRONOUN_TRIGGERS: frozenset[str] = frozenset({
    "it", "its", "this", "that", "these", "those", "they", "them", "their",
})

_CONTINUATION_PHRASES: frozenset[str] = frozenset({
    "build on", "continue", "elaborate", "more about", "proceed",
    "go deeper", "expand", "what about", "and also", "tell me more",
    "explain more", "how does it", "what is it", "dig into", "dive deeper",
    "next", "further", "besides that", "on that note", "keep going",
    "what else", "more on", "say more", "go on",
})

_STOP_WORDS: frozenset[str] = frozenset({
    "let", "us", "we", "can", "you", "i", "me", "the", "a", "an",
    "is", "are", "was", "be", "do", "does", "did", "will", "would",
    "could", "should", "please", "okay", "ok", "sure", "yes", "no",
    "to", "of", "in", "on", "at", "by", "for", "with", "about",
})

_REWRITE_PROMPT = """\
Given this conversation history:
{context_window}

The user just asked: "{query}"

Rewrite the user's message as a specific, self-contained search query that \
captures what they actually want to know using context from the conversation. \
Return ONLY the rewritten query — no quotes, no explanation, no preamble.

Examples:
- History: [discussing pg_catalog], Query: "build on this"
  → pg_catalog system tables practical querying pg_tables pg_indexes usage examples
- History: [discussing MVCC], Query: "how does it handle conflicts"
  → how PostgreSQL MVCC handles write conflicts and deadlocks
- History: [discussing Miyamoto Musashi], Query: "let us move onto the next scroll"
  → Miyamoto Musashi Water Scroll Mizu no Maki techniques mental fluidity\
"""


class ContextAwareRewriter:
    """
    Rewrites ambiguous queries using recent conversation history.

    **Activation heuristic** — fires when ALL of:
    - query is < 10 words, AND
    - contains a pronoun/continuation trigger  OR  has no content nouns at all

    **History weighting** — assistant responses get 400-char excerpts
    (they contain the established knowledge substrate), user turns get 150
    chars (topic signal only).  Last 3 full exchanges (6 messages) used.

    **Model** — ``synapse-utility`` (gemini-2.5-flash-lite primary, with
    automatic Ollama fallback via the LiteLLM Router).  Typical latency
    300–500 ms; only incurred on ambiguous queries.
    """

    def __init__(self, model_alias: str = "synapse-utility") -> None:
        # Lazily import the router to avoid circular imports at module load time
        self._model_alias = model_alias
        self._router = None

    def _get_router(self):
        if self._router is None:
            from app.core.ai.providers.litellm_router import get_llm_router
            self._router = get_llm_router()
        return self._router

    # ── Public API ────────────────────────────────────────────────────────────

    def is_context_dependent(self, query: str) -> bool:
        """Return ``True`` when the query implicitly references prior context."""
        q = query.lower().strip()
        words = q.split()
        wc = len(words)

        # Long specific questions are always standalone
        if wc >= 10:
            return False

        # Pronoun trigger in short query → context-dependent
        if wc < 8 and (set(words) & _PRONOUN_TRIGGERS):
            return True

        # Continuation phrase anywhere in query
        for phrase in _CONTINUATION_PHRASES:
            if phrase in q:
                return True

        # Bare query (< 5 words) with no content nouns at all
        if wc < 5 and not self._has_content_words(words):
            return True

        return False

    async def rewrite(
        self,
        query: str,
        history: List[dict],
    ) -> str:
        """
        Return a self-contained search query resolved from conversation history.

        ``history`` is a list of ``{"role": "user"|"assistant", "content": str}``
        dicts in chronological order.  Falls back to the original query on any
        failure so the search pipeline is never blocked.
        """
        if not history:
            logger.debug("context_rewrite_skipped_no_history", query=query[:60])
            return query

        context_window = self._format_history(history[-6:])   # last 3 exchanges
        prompt = _REWRITE_PROMPT.format(context_window=context_window, query=query)

        try:
            router = self._get_router()
            response = await router.acompletion(
                model=self._model_alias,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=80,
                temperature=0.1,
            )
            rewritten = (response.choices[0].message.content or "").strip().strip('"\'')

            if rewritten and rewritten.lower() != query.lower():
                logger.info(
                    "context_rewrite_applied",
                    original=query,
                    rewritten=rewritten,
                    history_turns=len(history) // 2,
                )
                return rewritten

            logger.debug("context_rewrite_unchanged", query=query[:60])

        except Exception as err:
            logger.warning(
                "context_rewrite_failed",
                error=str(err)[:120],
                query=query[:60],
            )

        return query   # graceful fallback — never block the search

    # ── Private helpers ───────────────────────────────────────────────────────

    def _format_history(self, history: list[dict]) -> str:
        """
        Build a compact context block for the rewrite prompt.

        Assistant responses get more space (400 chars) because they contain
        the established knowledge the student wants to build on.
        User messages get 150 chars — just enough for topic signal.
        """
        lines: list[str] = []
        for msg in history:
            role = msg.get("role", "").upper()
            content = msg.get("content") or ""
            if role == "ASSISTANT":
                excerpt = content[:400] + ("..." if len(content) > 400 else "")
                lines.append(f"ASSISTANT (established context): {excerpt}")
            elif role == "USER":
                excerpt = content[:150] + ("..." if len(content) > 150 else "")
                lines.append(f"USER (asked about): {excerpt}")
        return "\n".join(lines)

    def _has_content_words(self, words: list[str]) -> bool:
        """Return True if any word in the query carries semantic content."""
        return bool({w.lower() for w in words} - _STOP_WORDS)


# ── Singleton ─────────────────────────────────────────────────────────────────

_rewriter: Optional[ContextAwareRewriter] = None


def get_context_rewriter() -> ContextAwareRewriter:
    """Return the process-level ContextAwareRewriter singleton."""
    global _rewriter
    if _rewriter is None:
        _rewriter = ContextAwareRewriter()
    return _rewriter
