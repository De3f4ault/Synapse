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

Based on LangChain 1.0 middleware pattern.
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
                # Lazy import to avoid circular dependency
                from app.core.context.engine import get_context_engine
                self.context_engine = get_context_engine()

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

            # ================================================================
            # INJECT INTO AGENT STATE
            # ================================================================
            context["user_context"] = user_context
            context["context_summary"] = context_summary
            state.metadata["user_context"] = user_context
            state.metadata["context_injected"] = True

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
        Post-execution hook (not used for context injection)

        Args:
            agent: Agent instance
            state: Agent state
            context: Current context
            user_id: User ID
        """
        # Could be used to invalidate cache or track context usage
        pass

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
