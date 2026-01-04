/**
 * Shared Entities - Entity Reference
 *
 * INVARIANT: This is the ONE way to reference any domain entity.
 * INVARIANT: Graph NEVER imports domain types - only EntityRef.
 *
 * This solves the "what is a thing?" problem for cross-module analytics.
 */

// ============================================================================
// Core Types
// ============================================================================

/**
 * All known entity types in the system.
 * Add new types here as modules are created.
 */
export type EntityType =
    | "note"
    | "quiz"
    | "deck"
    | "flashcard"
    | "document"
    | "chat_session"
    | "chat_message"
    // Learning intelligence types
    | "concept"    // A learning concept (topic/skill)
    | "user";      // A user in the system

/**
 * A universal reference to any entity in the system.
 * This is how modules communicate about "things" without coupling.
 */
export interface EntityRef {
    /** The entity's unique ID (within its type) */
    readonly id: string | number;

    /** The type of entity */
    readonly type: EntityType;

    /** Optional: Human-readable label for debugging/display */
    readonly label?: string;
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create an EntityRef from raw values.
 */
export function createEntityRef(
    type: EntityType,
    id: string | number,
    label?: string
): EntityRef {
    return { id, type, label };
}

/**
 * Create an EntityRef for a Note.
 */
export function noteRef(id: number, label?: string): EntityRef {
    return createEntityRef("note", id, label);
}

/**
 * Create an EntityRef for a Quiz.
 */
export function quizRef(id: number, label?: string): EntityRef {
    return createEntityRef("quiz", id, label);
}

/**
 * Create an EntityRef for a Deck.
 */
export function deckRef(id: number, label?: string): EntityRef {
    return createEntityRef("deck", id, label);
}

/**
 * Create an EntityRef for a Flashcard.
 */
export function flashcardRef(id: number, label?: string): EntityRef {
    return createEntityRef("flashcard", id, label);
}

/**
 * Create an EntityRef for a Document.
 */
export function documentRef(id: number, label?: string): EntityRef {
    return createEntityRef("document", id, label);
}

/**
 * Create an EntityRef for a Chat Session.
 */
export function chatSessionRef(id: string, label?: string): EntityRef {
    return createEntityRef("chat_session", id, label);
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Check if two EntityRefs point to the same entity.
 */
export function isSameEntity(a: EntityRef, b: EntityRef): boolean {
    return a.type === b.type && String(a.id) === String(b.id);
}

/**
 * Create a stable, unique key for an EntityRef.
 * Useful for Maps, Sets, React keys.
 */
export function entityKey(ref: EntityRef): string {
    return `${ref.type}:${ref.id}`;
}

/**
 * Parse an entity key back to an EntityRef.
 */
export function parseEntityKey(key: string): EntityRef | null {
    const [type, id] = key.split(":");
    if (!type || !id) return null;

    return {
        type: type as EntityType,
        id: /^\d+$/.test(id) ? parseInt(id, 10) : id,
    };
}

/**
 * Type guard to check if something is an EntityRef.
 */
export function isEntityRef(value: unknown): value is EntityRef {
    return (
        typeof value === "object" &&
        value !== null &&
        "id" in value &&
        "type" in value &&
        typeof (value as EntityRef).type === "string"
    );
}
