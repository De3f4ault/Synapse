"""
Context Injection Middleware - MOST CRITICAL MIDDLEWARE

This is what makes agents SYNAPSE-aware!

Automatically injects:
- User's learning context (weak areas, progress, preferences)
- Recent activity and performance
- Module-specific context (flashcards, notes, documents)
- Learning goals and focus areas

This middleware is the bridge between SYNAPSE's context engine
and the AI agents, enabling personalized, context-aware responses.

Based on SYNAPSE agent middleware pattern.
"""

from typing import Dict, Any, Optional
import structlog

logger = structlog.get_logger(__name__)


class ContextInjectionMiddleware:
    """
    Inject SYNAPSE learning context into agent execution

    Flow:
    1. User starts agent execution
    2. before_execution: Fetch user's learning context
    3. Inject context into agent state
    4. Agent uses context for personalized responses

    Usage:
        middleware = ContextInjectionMiddleware()

        agent = BaseAgent(
            config=AgentConfig(
                ...,
                middleware=[middleware]
            )
        )
    """

    def __init__(
        self,
        context_engine: Optional[Any] = None,
        include_weak_areas: bool = True,
        include_recent_activity: bool = True,
        include_preferences: bool = True,
        max_context_tokens: int = 2000
    ):
        """
        Initialize middleware

        Args:
            context_engine: ContextEngine instance (injected)
            include_weak_areas: Include weak area analysis
            include_recent_activity: Include recent learning activity
            include_preferences: Include user preferences
            max_context_tokens: Max tokens for context
        """
        self.context_engine = context_engine
        self.include_weak_areas = include_weak_areas
        self.include_recent_activity = include_recent_activity
        self.include_preferences = include_preferences
        self.max_context_tokens = max_context_tokens
        self._session = None  # Owned DB session — opened in before, closed in after
        self.logger = logger.bind(middleware="context_injection")

    async def before_execution(
        self,
        agent: Any,
        state: Any,
        context: Dict[str, Any],
        user_id: int
    ) -> None:
        """
        Inject learning context before agent execution

        This is where the magic happens! We fetch the user's
        complete learning profile and inject it into the agent's
        context, making every response personalized.

        Args:
            agent: Agent instance
            state: Agent state
            context: Current context dict
            user_id: User ID
        """
        self.logger.info(
            "context_injection_started",
            agent=agent.name,
            user_id=user_id
        )

        try:
            # ================================================================
            # FETCH LEARNING CONTEXT
            # ================================================================
            if self.context_engine is None:
                # Create a dedicated session for this middleware invocation.
                # Agents are stateless compute — the DB concern stays here.
                from app.db.session import AsyncSessionLocal
                from app.core.context.engine import ContextEngine

                self._session = AsyncSessionLocal()

                from app.services.cache.pg_cache import PgCacheClient
                _cache = PgCacheClient(session_factory=AsyncSessionLocal)

                self.context_engine = ContextEngine(self._session, cache_client=_cache)

            # Get complete user context
            user_context = await self.context_engine.get_user_context(
                user_id=user_id,
                focus=context.get("focus")  # Optional focus area
            )

            # ================================================================
            # BUILD CONTEXT SUMMARY
            # ================================================================
            context_summary = self._build_context_summary(
                user_context,
                context.get("query", "")
            )

            # ── Card Designer override ────────────────────────────────────
            # Designer sessions store the full enriched system prompt in
            # context["card_designer_system"].  It is self-contained and
            # replaces the generic context_summary entirely — we don't want
            # tutor-style framing polluting the design conversation.
            card_designer_system = context.get("card_designer_system")
            if card_designer_system:
                context_summary = card_designer_system
            else:
                # ── Card Tutor override ───────────────────────────────────────
                # When the stream is anchored to a flashcard, prepend the card's
                # Socratic system prompt so it dominates the context window.
                card_tutor_system = context.get("card_tutor_system")
                if card_tutor_system:
                    context_summary = (
                        "**[CARD TUTOR MODE — focus exclusively on this concept]**\n\n"
                        + card_tutor_system
                        + "\n\n---\n\n"
                        + context_summary
                    )
                # ─────────────────────────────────────────────────────────────

            # ── @Mention entity injection ──────────────────────────────────────
            # If the user referenced entities via @[title](entity:type:id) markup
            # and the hydrator produced content, append it AFTER the analytics
            # context. Placement last ensures maximum LLM attention on the
            # referenced content — the model reads it immediately before the
            # user's message.
            hydration_result = context.get("hydration_result")
            if hydration_result and hydration_result.has_content:
                entity_block = self._build_entity_block(hydration_result.injected)
                context_summary = context_summary + "\n\n" + entity_block
            # ─────────────────────────────────────────────────────────────────

            # ================================================================
            # INJECT INTO AGENT STATE
            # ================================================================
            context["user_context"] = user_context
            context["context_summary"] = context_summary
            state.metadata["user_context"] = user_context
            state.metadata["context_injected"] = True
            if card_designer_system:
                state.metadata["card_designer_mode"] = True
            elif context.get("card_tutor_system"):
                state.metadata["card_tutor_mode"] = True
                state.metadata["card_id"] = context.get("card_id")

            self.logger.info(
                "context_injection_completed",
                agent=agent.name,
                user_id=user_id,
                weak_areas_count=len(user_context.get("analytics", {}).get("weak_topics", [])),
                context_tokens=self._estimate_tokens(context_summary)
            )

        except Exception as e:
            self.logger.error(
                "context_injection_failed",
                agent=agent.name,
                user_id=user_id,
                error=str(e)
            )
            # Don't fail agent execution on context injection failure
            context["context_summary"] = "Context unavailable"
            state.metadata["context_injected"] = False

    async def after_execution(
        self,
        agent: Any,
        state: Any,
        context: Dict[str, Any],
        user_id: int
    ) -> None:
        """
        Post-execution cleanup — close the DB session we opened.

        Args:
            agent: Agent instance
            state: Agent state
            context: Current context
            user_id: User ID
        """
        if self._session is not None:
            try:
                await self._session.close()
            except Exception as e:
                self.logger.warning(
                    "context_session_close_failed",
                    error=str(e),
                )
            finally:
                self._session = None
                self.context_engine = None  # Force fresh session on next invocation

    def _build_context_summary(
        self,
        user_context: Dict[str, Any],
        query: str = ""
    ) -> str:
        """
        Build human-readable context summary for agent prompt

        This formats the context in a way that the LLM can easily
        understand and use to personalize responses.

        Args:
            user_context: Complete user context from ContextEngine
            query: User's current query (optional)

        Returns:
            Formatted context string
        """
        parts = []

        # ================================================================
        # LEARNING PROFILE
        # ================================================================
        profile = user_context.get("profile", {})
        if profile and self.include_preferences:
            parts.append("**Student Profile:**")
            parts.append(f"- Learning Style: {profile.get('learning_style', 'Not specified')}")
            parts.append(f"- Study Goals: {profile.get('goals', 'Not specified')}")
            parts.append(f"- Preferred Difficulty: {profile.get('preferred_difficulty', 'Medium')}")
            parts.append("")

        # ================================================================
        # WEAK AREAS (MOST IMPORTANT!)
        # ================================================================
        analytics = user_context.get("analytics", {})
        weak_topics = analytics.get("weak_topics", [])

        if weak_topics and self.include_weak_areas:
            parts.append("**Areas Needing Focus:**")
            for topic in weak_topics[:5]:  # Top 5
                topic_name = topic.get("topic", "Unknown")
                accuracy = topic.get("accuracy", 0.0)
                parts.append(f"- {topic_name}: {accuracy:.1%} accuracy (needs improvement)")
            parts.append("")
            parts.append("*Prioritize these topics in your responses.*")
            parts.append("")

        # ================================================================
        # RECENT ACTIVITY
        # ================================================================
        recent = analytics.get("recent_activity", [])
        if recent and self.include_recent_activity:
            parts.append("**Recent Study Activity:**")
            for activity in recent[:3]:  # Last 3
                module = activity.get("module", "unknown")
                action = activity.get("action", "")
                topic = activity.get("topic", "")
                parts.append(f"- {module}: {action} ({topic})")
            parts.append("")

        # ================================================================
        # PERFORMANCE METRICS
        # ================================================================
        perf = analytics.get("performance", {})
        if perf:
            parts.append("**Overall Performance:**")
            parts.append(f"- Accuracy: {perf.get('accuracy', 0.0):.1%}")
            parts.append(f"- Cards Mastered: {perf.get('mastered_cards', 0)}")
            parts.append(f"- Study Streak: {perf.get('study_streak', 0)} days")
            parts.append("")

        # ================================================================
        # MODULE CONTEXT
        # ================================================================
        modules = user_context.get("modules", {})
        if modules:
            parts.append("**Available Learning Materials:**")
            for module_name, module_data in modules.items():
                count = module_data.get("count", 0)
                parts.append(f"- {module_name}: {count} items")
            parts.append("")

        # Truncate if too long
        summary = "\n".join(parts)
        if self._estimate_tokens(summary) > self.max_context_tokens:
            # Keep weak areas, truncate rest
            summary = self._truncate_context(summary)

        return summary

    def _truncate_context(self, context: str) -> str:
        """Truncate context to fit token budget"""
        lines = context.split("\n")

        # Always keep weak areas (highest priority)
        weak_areas_section = []
        other_sections = []

        in_weak_section = False
        for line in lines:
            if "Areas Needing Focus" in line:
                in_weak_section = True
            elif line.startswith("**"):
                in_weak_section = False

            if in_weak_section:
                weak_areas_section.append(line)
            else:
                other_sections.append(line)

        # Build truncated version
        truncated = weak_areas_section.copy()

        # Add other sections until token limit
        for line in other_sections:
            truncated.append(line)
            if self._estimate_tokens("\n".join(truncated)) > self.max_context_tokens:
                truncated.pop()
                break

        return "\n".join(truncated)

    def _estimate_tokens(self, text: str) -> int:
        """Rough token estimation (1 token ≈ 4 characters)"""
        return len(text) // 4

    def _build_entity_block(self, hydrated: list) -> str:
        """
        Build the system prompt section for @mentioned entity content.

        This section is appended AFTER the analytics context so that the LLM
        reads referenced content immediately before the user's message.
        The framing instructs the model to treat referenced content as primary
        source material and cite it by name.

        Args:
            hydrated: List of HydratedContext objects from ContentHydrator.

        Returns:
            Formatted markdown string ready for system prompt injection.
        """
        if not hydrated:
            return ""

        lines = [
            "---",
            "## Referenced Materials",
            "The user has explicitly referenced the following content using @mentions.",
            "Treat this as **primary source material** — prefer it over general knowledge.",
            "When drawing from a referenced source, cite it by name.",
            "If the user's question concerns something in the referenced content,"
            " answer from that content rather than from memory.",
            "",
        ]

        for ctx in hydrated:
            lines.append(f"### {ctx.summary_line}")
            lines.append(ctx.content_for_ai)
            lines.append("")

        return "\n".join(lines)


# Convenience function for quick middleware creation
def context_injection_middleware(**kwargs) -> ContextInjectionMiddleware:
    """
    Create context injection middleware with config

    Args:
        **kwargs: Configuration options

    Returns:
        Configured middleware

    Example:
        middleware = context_injection_middleware(
            include_weak_areas=True,
            max_context_tokens=2000
        )
    """
    return ContextInjectionMiddleware(**kwargs)
