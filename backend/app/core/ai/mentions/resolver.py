"""
MentionResolver — parse and resolve @[title](entity:type:id) mention markup.

Responsibilities:
  1. Parse mention markup from raw user message text
  2. Validate entity type against the EntityType enum
  3. Resolve each entity via the platform registry's ModuleContract.resolve_entity
  4. Return per-mention resolution results (None = resolution failed)

This module is intentionally module-agnostic: it never imports domain models
directly. All entity access goes through the platform registry.
"""

import re
from dataclasses import dataclass
from typing import Optional

import asyncio
from sqlalchemy.ext.asyncio import AsyncSession

# Pattern: @[Display Title](entity:entity_type:entity_id)
# entity_type: lowercase alphanumeric + underscore (matches EntityType values)
# entity_id: integer
MENTION_PATTERN = re.compile(
    r"@\[([^\]]+)\]\(entity:([a-zA-Z0-9_]+):(\d+)\)"
)


@dataclass(frozen=True)
class ParsedMention:
    """A mention found in the user's message, before resolution."""

    title: str        # Display title from mention markup
    entity_type: str  # Raw type string (e.g. "note", "quiz")
    entity_id: int    # Entity primary key
    mention_index: int  # Ordinal position in message (0-based) — used for budget ordering


@dataclass
class ResolvedMention:
    """A successfully resolved mention — entity confirmed owned by user."""

    mention: ParsedMention
    entity: object  # LearningEntity from platform registry


class MentionResolver:
    """
    Parses @mention markup and resolves entities via the platform registry.

    Designed to be instantiated once and reused (stateless between calls).
    """

    def parse(self, message: str) -> list[ParsedMention]:
        """
        Extract all @[title](entity:type:id) mentions from a message string.

        Returns mentions in the order they appear in the text. An empty list
        means no mentions were present \u2014 the caller should skip hydration entirely.

        Args:
            message: Raw user message text (may contain markdown, etc.)

        Returns:
            List of ParsedMention in document order.
        """
        return [
            ParsedMention(
                title=m.group(1),
                entity_type=m.group(2).lower(),
                entity_id=int(m.group(3)),
                mention_index=idx,
            )
            for idx, m in enumerate(MENTION_PATTERN.finditer(message))
        ]

    async def resolve_all(
        self,
        mentions: list[ParsedMention],
        db: AsyncSession,
        user_id: int,
    ) -> list[Optional[ResolvedMention]]:
        """
        Resolve all mentions concurrently via the platform registry.

        Returns a list aligned 1:1 with `mentions`. A None entry at position i
        means mentions[i] failed to resolve (unknown type, entity not found, or
        ownership mismatch). The caller is responsible for tracking which
        ParsedMention corresponds to each None.

        Args:
            mentions: Output of parse()
            db: Database session
            user_id: Authenticated user ID — enforces ownership

        Returns:
            List of Optional[ResolvedMention], same length as mentions.
        """
        results = await asyncio.gather(
            *[self._resolve_one(mention, db, user_id) for mention in mentions],
            return_exceptions=False,
        )
        return list(results)

    async def _resolve_one(
        self,
        mention: ParsedMention,
        db: AsyncSession,
        user_id: int,
    ) -> Optional[ResolvedMention]:
        """
        Resolve a single mention. Returns None on any failure.

        Failure modes:
          - Unknown entity_type (not in EntityType enum)
          - No module registered for this entity type
          - Entity not found in DB
          - Entity belongs to a different user (ownership enforced in resolve_entity)
        """
        from app.schemas.common.enums import EntityType
        from app.platform.registry import get_module_for_entity_type

        try:
            entity_type = EntityType(mention.entity_type)
        except ValueError:
            # Entity type not recognised — don't surface as an error, just skip
            return None

        module = get_module_for_entity_type(entity_type)
        if module is None:
            return None

        entity = await module.resolve_entity(mention.entity_id, db, user_id)
        if entity is None:
            return None

        return ResolvedMention(mention=mention, entity=entity)
