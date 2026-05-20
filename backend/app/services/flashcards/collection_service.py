"""
Collection Service — CRUD + AI auto-categorisation for deck_collections.

Responsibilities:
- Create / list / update / delete collections
- Assign a deck to a collection
- AI-assisted categorisation: given a deck name + description, suggest which
  existing collection it belongs to (or create a new one)

The AI categorisation is intentionally lightweight — it uses the LLMExtractor
model (gemini-2.5-flash-lite) directly for a single structured-output call
rather than spinning up a full agent.
"""

from __future__ import annotations

import structlog
from typing import Dict, List, Optional

from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.deck_collection import DeckCollection
from app.models.deck import Deck

logger = structlog.get_logger(__name__)


class CollectionService:
    """
    Service layer for deck_collections.

    All methods are user-scoped — a user can only touch their own collections.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    # ── CRUD ─────────────────────────────────────────────────────────────────

    async def create_collection(self, user_id: int, data: Dict) -> Dict:
        """Create a new collection (folder)."""
        collection = DeckCollection(
            user_id=user_id,
            name=data["name"],
            description=data.get("description"),
            parent_id=data.get("parent_id"),
        )
        self.session.add(collection)
        await self.session.commit()
        await self.session.refresh(collection)
        return self._to_dict(collection)

    async def list_collections(self, user_id: int) -> List[Dict]:
        """List all collections owned by a user, ordered by name."""
        result = await self.session.execute(
            select(DeckCollection)
            .where(DeckCollection.user_id == user_id)
            .order_by(DeckCollection.name)
        )
        collections = result.scalars().all()

        # Attach deck counts in a second query to avoid N+1
        counts = await self._get_deck_counts(user_id)
        return [self._to_dict(c, deck_count=counts.get(c.id, 0)) for c in collections]

    async def get_collection(self, collection_id: int, user_id: int) -> Dict:
        """Get a single collection with its decks."""
        collection = await self._get_owned(collection_id, user_id)
        decks = await self._get_decks_in_collection(collection_id, user_id)
        return {**self._to_dict(collection), "decks": decks}

    async def update_collection(
        self, collection_id: int, user_id: int, data: Dict
    ) -> Dict:
        """Update collection name or description."""
        collection = await self._get_owned(collection_id, user_id)
        if "name" in data:
            collection.name = data["name"]
        if "description" in data:
            collection.description = data.get("description")
        await self.session.commit()
        await self.session.refresh(collection)
        return self._to_dict(collection)

    async def delete_collection(self, collection_id: int, user_id: int) -> bool:
        """
        Delete a collection.

        Decks inside the collection are NOT deleted — their collection_id is set
        to NULL by the ON DELETE SET NULL FK constraint. They become uncategorised.
        """
        collection = await self._get_owned(collection_id, user_id)
        await self.session.delete(collection)
        await self.session.commit()
        return True

    # ── Deck Assignment ───────────────────────────────────────────────────────

    async def assign_deck(
        self, deck_id: int, user_id: int, collection_id: Optional[int]
    ) -> Dict:
        """
        Assign (or unassign) a deck to a collection.

        Pass collection_id=None to move a deck to 'Uncategorised'.
        """
        result = await self.session.execute(
            select(Deck).where(
                and_(Deck.id == deck_id, Deck.user_id == user_id, Deck.deleted_at.is_(None))
            )
        )
        deck = result.scalar_one_or_none()
        if not deck:
            raise ValueError(f"Deck {deck_id} not found or access denied")

        if collection_id is not None:
            # Verify the collection belongs to this user
            await self._get_owned(collection_id, user_id)

        deck.collection_id = collection_id
        await self.session.commit()
        return {"deck_id": deck_id, "collection_id": collection_id}

    # ── AI Auto-categorisation ────────────────────────────────────────────────

    async def suggest_collection(
        self, user_id: int, deck_name: str, deck_description: Optional[str] = None
    ) -> Optional[Dict]:
        """
        Suggest an existing collection for a deck, or propose a new one.

        Uses gemini-2.5-flash-lite with structured output.
        Returns:
            {collection_id: int, name: str, action: 'existing'|'create'}
        or None if suggestion fails (graceful degradation).
        """
        existing = await self.list_collections(user_id)
        if not existing:
            # No collections yet — propose creating one based on the deck name
            proposed = await self._propose_collection_name(deck_name, deck_description)
            return {"collection_id": None, "name": proposed, "action": "create"}

        try:
            import json
            import litellm

            existing_names = "\n".join(
                f"- id={c['id']}: {c['name']}" + (f" ({c['description']})" if c.get("description") else "")
                for c in existing
            )

            prompt = f"""You are organising flashcard decks into collections (folders).

Existing collections:
{existing_names}

New deck:
  Name: {deck_name}
  Description: {deck_description or 'None'}

Choose the best existing collection for this deck, or suggest creating a new one.

Return ONLY valid JSON:
{{
  "action": "existing" or "create",
  "collection_id": <int or null>,
  "new_collection_name": "<string if action=create, else null>",
  "confidence": 0.0-1.0,
  "reason": "<one sentence>"
}}"""

            response = await litellm.acompletion(
                model="gemini/gemini-2.5-flash-lite",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=200,
                temperature=0.1,
                response_format={"type": "json_object"},
            )

            data = json.loads(response.choices[0].message.content)

            if data.get("action") == "existing" and data.get("collection_id"):
                # Validate the suggested collection actually belongs to this user
                valid_ids = {c["id"] for c in existing}
                if data["collection_id"] in valid_ids:
                    matched = next(c for c in existing if c["id"] == data["collection_id"])
                    return {
                        "collection_id": data["collection_id"],
                        "name": matched["name"],
                        "action": "existing",
                        "confidence": data.get("confidence", 0.7),
                    }

            # action == 'create' or invalid existing id
            return {
                "collection_id": None,
                "name": data.get("new_collection_name") or deck_name,
                "action": "create",
                "confidence": data.get("confidence", 0.5),
            }

        except Exception as exc:
            logger.warning("collection_suggestion_failed", error=str(exc))
            return None  # Graceful degradation — caller decides what to do

    async def auto_assign_deck(self, deck_id: int, user_id: int) -> Optional[Dict]:
        """
        Run AI categorisation on an existing deck and apply the result.

        Called after deck creation. Returns the assignment result or None.
        """
        result = await self.session.execute(
            select(Deck).where(
                and_(Deck.id == deck_id, Deck.user_id == user_id, Deck.deleted_at.is_(None))
            )
        )
        deck = result.scalar_one_or_none()
        if not deck:
            return None

        suggestion = await self.suggest_collection(user_id, deck.name, deck.description)
        if not suggestion:
            return None

        if suggestion["action"] == "existing" and suggestion.get("collection_id"):
            return await self.assign_deck(deck_id, user_id, suggestion["collection_id"])

        if suggestion["action"] == "create":
            new_collection = await self.create_collection(
                user_id, {"name": suggestion["name"]}
            )
            return await self.assign_deck(deck_id, user_id, new_collection["id"])

        return None

    # ── Private Helpers ───────────────────────────────────────────────────────

    async def _get_owned(self, collection_id: int, user_id: int) -> DeckCollection:
        result = await self.session.execute(
            select(DeckCollection).where(
                and_(
                    DeckCollection.id == collection_id,
                    DeckCollection.user_id == user_id,
                )
            )
        )
        collection = result.scalar_one_or_none()
        if not collection:
            raise ValueError(f"Collection {collection_id} not found or access denied")
        return collection

    async def _get_deck_counts(self, user_id: int) -> Dict[int, int]:
        """Return {collection_id: deck_count} for all user's collections."""
        rows = await self.session.execute(
            select(Deck.collection_id, func.count(Deck.id))
            .where(and_(Deck.user_id == user_id, Deck.deleted_at.is_(None),
                        Deck.collection_id.is_not(None)))
            .group_by(Deck.collection_id)
        )
        return {row[0]: row[1] for row in rows.all()}

    async def _get_decks_in_collection(
        self, collection_id: int, user_id: int
    ) -> List[Dict]:
        rows = await self.session.execute(
            select(Deck)
            .where(
                and_(
                    Deck.collection_id == collection_id,
                    Deck.user_id == user_id,
                    Deck.deleted_at.is_(None),
                )
            )
            .order_by(Deck.name)
        )
        decks = rows.scalars().all()
        return [{"id": d.id, "name": d.name, "description": d.description} for d in decks]

    async def _propose_collection_name(
        self, deck_name: str, description: Optional[str]
    ) -> str:
        """Derive a collection name from the deck name when no collections exist."""
        # Simple heuristic: strip card-count suffixes and use the base topic
        # e.g. "Flashcards: PostgreSQL Internals" → "PostgreSQL"
        name = deck_name
        for prefix in ("Flashcards:", "Flashcard:", "Cards:", "Deck:"):
            if name.startswith(prefix):
                name = name[len(prefix):].strip()
        # Take the first word as the subject area for a broad collection
        return name.split(":")[0].strip() or deck_name

    @staticmethod
    def _to_dict(collection: DeckCollection, deck_count: int = 0) -> Dict:
        return {
            "id": collection.id,
            "user_id": collection.user_id,
            "name": collection.name,
            "description": collection.description,
            "parent_id": collection.parent_id,
            "deck_count": deck_count,
            "created_at": collection.created_at,
            "updated_at": collection.updated_at,
        }
