"""Search Identity Contracts.

Defines the canonical identity model for the Search Intelligence Bus.
All search results must express identity through this contract.
"""

from pydantic import BaseModel
from typing import Literal, Optional
from enum import Enum


class IdentityAuthority(str, Enum):
    """
    Who owns this entity's truth?

    This determines how much trust is placed in the entity's existence
    and correctness. Used to prevent inference from overwriting facts.
    """

    USER_CONTENT = "user_content"  # Notes, flashcards, documents (authoritative)
    SYSTEM_DERIVED = "system_derived"  # Chunks, embeddings (derived from user content)
    KNOWLEDGE_GRAPH = "knowledge_graph"  # Concepts, mastery nodes (computed)


# Identity Authority Lookup Table
# This is the source of truth for authority assignment
IDENTITY_AUTHORITY_MAP = {
    # Postgres entities (authoritative)
    ("postgres", "note"): IdentityAuthority.USER_CONTENT,
    ("postgres", "flashcard"): IdentityAuthority.USER_CONTENT,
    ("postgres", "document"): IdentityAuthority.USER_CONTENT,
    ("postgres", "conversation"): IdentityAuthority.USER_CONTENT,
    # Qdrant entities (derived)
    ("qdrant", "chunk"): IdentityAuthority.SYSTEM_DERIVED,
    # Graph entities (computed)
    ("graph", "concept"): IdentityAuthority.KNOWLEDGE_GRAPH,
}


class EntityIdentity(BaseModel):
    """
    Composite, unambiguous identity for any searchable entity.

    Identity Rules (enforced in contract.py):
    1. Only USER_CONTENT entities may define root_id as self
    2. SYSTEM_DERIVED entities MUST inherit root_id from parent
    3. KNOWLEDGE_GRAPH entities have no root_id (self-referential)
    """

    id: str | int
    type: Literal["note", "flashcard", "document", "chunk", "concept", "conversation"]
    authority: IdentityAuthority
    parent_id: Optional[str | int] = None  # e.g., chunk -> document
    root_id: Optional[str | int] = None  # canonical dedup anchor
    store: Literal["postgres", "qdrant", "graph"] = "postgres"

    def __hash__(self):
        return hash((self.store, self.type, self.id))

    def __eq__(self, other):
        if not isinstance(other, EntityIdentity):
            return False
        return (self.store, self.type, self.id) == (other.store, other.type, other.id)


def get_authority(store: str, entity_type: str) -> IdentityAuthority:
    """Look up the correct authority for an entity."""
    key = (store, entity_type)
    if key not in IDENTITY_AUTHORITY_MAP:
        raise ValueError(f"Unknown entity type: {store}.{entity_type}")
    return IDENTITY_AUTHORITY_MAP[key]
