"""Mention resolution and content hydration pipeline.

Three-stage pipeline that converts @[title](entity:type:id) markup in user messages
into grounded entity content injected into the AI's system prompt before any model
call is made.

    MentionResolver  →  ContentHydrator  →  ContextInjectionMiddleware
    (parse + resolve)   (fetch + budget)    (build system prompt section)

Usage (in ai_stream.py):
    from app.core.ai.mentions import MentionResolver, ContentHydrator

    resolver = MentionResolver()
    hydrator = ContentHydrator()
"""

from app.core.ai.mentions.resolver import MentionResolver, ParsedMention, ResolvedMention
from app.core.ai.mentions.hydrator import ContentHydrator, HydrationResult, HydratedContext

__all__ = [
    "MentionResolver",
    "ParsedMention",
    "ResolvedMention",
    "ContentHydrator",
    "HydrationResult",
    "HydratedContext",
]
