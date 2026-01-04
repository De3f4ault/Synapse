/**
 * Flashcards Module - Platform Registration
 *
 * INVARIANT: This file wires the Flashcards module into the platform.
 * INVARIANT: Called once during app initialization.
 */

import { registerModule, type ModuleContract, successResult, errorResult } from "@/shared/platform";
import { registerEntityFetcher, registerAvailabilityChecker } from "@/shared/context";
import type { LearningEntity } from "@/shared/core";
import type { EntityCapability } from "@/shared/core/capabilities";
import { ENTITY_CAPABILITIES } from "@/shared/core/capabilities";
import { FlashcardsService } from "@/api/generated";

// ============================================================================
// Entity Fetcher
// ============================================================================

/**
 * Fetch a flashcard by ID and convert to platform format.
 */
async function fetchFlashcard(id: string | number) {
    try {
        const card = await FlashcardsService.getCardApiV1CardsCardIdGet(Number(id));

        return {
            id: card.id,
            title: card.front_text.substring(0, 50) + (card.front_text.length > 50 ? "..." : ""),
            createdAt: card.last_review ?? new Date().toISOString(),
            metadata: {
                frontText: card.front_text,
                backText: card.back_text,
                deckId: card.deck_id,
                easeFactor: card.ease_factor,
                interval: card.interval,
                timesReviewed: card.times_reviewed,
                accuracy: card.accuracy,
            },
        };
    } catch {
        return null;
    }
}

/**
 * Check capability availability for flashcards.
 */
function checkFlashcardCapabilityAvailability(
    _entity: { metadata?: Record<string, unknown> },
    _capability: EntityCapability
): { available: boolean; reason?: string } {
    // Flashcards primarily support REINFORCE_GRAPH
    return { available: true };
}

// ============================================================================
// Capability Executor
// ============================================================================

async function executeFlashcardCapability(
    capability: EntityCapability,
    _entity: LearningEntity,
    _options?: Record<string, unknown>
) {
    switch (capability) {
        case "REINFORCE_GRAPH":
            return successResult("Flashcard reinforced in knowledge graph");

        default:
            return errorResult(
                "UNSUPPORTED_CAPABILITY",
                `Flashcards module does not support "${capability}"`,
                false
            );
    }
}

// ============================================================================
// Module Contract
// ============================================================================

const flashcardsModuleContract: ModuleContract = {
    id: "flashcards",
    name: "Flashcards",
    entityTypes: ["flashcard"],

    resolveEntity: async (id) => {
        const raw = await fetchFlashcard(id);
        if (!raw) return null;

        const capabilityList = ENTITY_CAPABILITIES.flashcard ?? [];
        const capabilities = capabilityList.map((cap) => {
            const { available, reason } = checkFlashcardCapabilityAvailability(
                { metadata: raw.metadata },
                cap
            );
            return { capability: cap, available, reason };
        });

        return {
            id: raw.id,
            type: "flashcard",
            sourceModule: "flashcards",
            title: raw.title,
            createdAt: raw.createdAt,
            capabilities,
            visibility: "private",
            metadata: raw.metadata,
        };
    },

    executeCapability: executeFlashcardCapability,
};

// ============================================================================
// Registration
// ============================================================================

/**
 * Initialize Flashcards module with the platform.
 */
export function initFlashcardsModule(): void {
    registerModule(flashcardsModuleContract);
    registerEntityFetcher("flashcard", fetchFlashcard);
    registerAvailabilityChecker("flashcard", checkFlashcardCapabilityAvailability);

    if (process.env.NODE_ENV === "development") {
        console.debug("[FlashcardsModule] Initialized and registered with platform");
    }
}
