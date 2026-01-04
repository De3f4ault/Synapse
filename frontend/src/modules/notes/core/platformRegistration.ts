/**
 * Notes Module - Platform Registration
 *
 * INVARIANT: This file wires the Notes module into the platform.
 * INVARIANT: Called once during app initialization.
 */

import { registerModule, type ModuleContract, successResult, errorResult } from "@/shared/platform";
import { registerEntityFetcher, registerAvailabilityChecker } from "@/shared/context";
import type { LearningEntity } from "@/shared/core";
import type { EntityCapability } from "@/shared/core/capabilities";
import { ENTITY_CAPABILITIES } from "@/shared/core/capabilities";
import { NotesService } from "@/api/generated";

// ============================================================================
// Entity Fetcher
// ============================================================================

/**
 * Fetch a note by ID and convert to platform format.
 */
async function fetchNote(id: string | number) {
    try {
        const note = await NotesService.getNoteApiV1NotesNoteIdGet(Number(id));

        return {
            id: note.id,
            title: note.title,
            createdAt: note.created_at,
            metadata: {
                content: note.content,
                charCount: note.content?.length ?? 0,
                parentId: note.parent_id,
            },
        };
    } catch {
        return null;
    }
}

/**
 * Check capability availability for notes.
 */
function checkNoteCapabilityAvailability(
    entity: { metadata?: Record<string, unknown> },
    capability: EntityCapability
): { available: boolean; reason?: string } {
    const charCount = (entity.metadata?.charCount as number) ?? 0;

    switch (capability) {
        case "GENERATE_FLASHCARDS":
        case "GENERATE_QUIZ":
            if (charCount < 100) {
                return {
                    available: false,
                    reason: "Note is too short (minimum 100 characters)",
                };
            }
            return { available: true };

        case "SUMMARIZE":
            if (charCount < 200) {
                return {
                    available: false,
                    reason: "Note is too short to summarize",
                };
            }
            return { available: true };

        default:
            return { available: true };
    }
}

// ============================================================================
// Capability Executor
// ============================================================================

async function executeNoteCapability(
    capability: EntityCapability,
    _entity: LearningEntity,
    _options?: Record<string, unknown>
) {
    switch (capability) {
        case "REFERENCE_IN_CHAT":
            return successResult("Note ready to reference in chat");

        case "GENERATE_FLASHCARDS":
            return successResult("Flashcard generation started");

        case "GENERATE_QUIZ":
            return successResult("Quiz generation started");

        case "REINFORCE_GRAPH":
            return successResult("Graph reinforced");

        case "SUMMARIZE":
            return successResult("Summary generation started");

        default:
            return errorResult(
                "UNSUPPORTED_CAPABILITY",
                `Notes module does not support "${capability}"`,
                false
            );
    }
}

// ============================================================================
// Module Contract
// ============================================================================

const notesModuleContract: ModuleContract = {
    id: "notes",
    name: "Notes",
    entityTypes: ["note"],

    resolveEntity: async (id) => {
        const raw = await fetchNote(id);
        if (!raw) return null;

        const capabilityList = ENTITY_CAPABILITIES.note ?? [];
        const capabilities = capabilityList.map((cap) => {
            const { available, reason } = checkNoteCapabilityAvailability(
                { metadata: raw.metadata },
                cap
            );
            return { capability: cap, available, reason };
        });

        return {
            id: raw.id,
            type: "note",
            sourceModule: "notes",
            title: raw.title,
            createdAt: raw.createdAt,
            capabilities,
            visibility: "private",
            metadata: raw.metadata,
        };
    },

    executeCapability: executeNoteCapability,
};

// ============================================================================
// Registration
// ============================================================================

/**
 * Initialize Notes module with the platform.
 * Call this during app startup.
 */
export function initNotesModule(): void {
    registerModule(notesModuleContract);
    registerEntityFetcher("note", fetchNote);
    registerAvailabilityChecker("note", checkNoteCapabilityAvailability);

    if (process.env.NODE_ENV === "development") {
        console.debug("[NotesModule] Initialized and registered with platform");
    }
}
