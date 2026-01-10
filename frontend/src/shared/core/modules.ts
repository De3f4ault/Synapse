/**
 * Shared Core - Module Identifiers
 *
 * INVARIANT: Every module in the platform is named here.
 * INVARIANT: This is the ONLY place ModuleId is defined.
 */

// ============================================================================
// Module Identifiers
// ============================================================================

/**
 * All known modules in the Synapse platform.
 */
export type ModuleId =
    | "documents"
    | "notes"
    | "flashcards"
    | "quizzes"
    | "chat"
    | "graph";

/**
 * Human-readable labels for modules.
 */
export const MODULE_LABELS: Record<ModuleId, string> = {
    documents: "Documents",
    notes: "Notes",
    flashcards: "Flashcards",
    quizzes: "Quizzes",
    chat: "Chat",
    graph: "Knowledge Graph",
};
