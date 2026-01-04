/**
 * Documents Module - Platform Registration
 *
 * INVARIANT: This file wires the Documents module into the platform.
 * INVARIANT: Called once during app initialization.
 */

import { registerModule, type ModuleContract, successResult, errorResult } from "@/shared/platform";
import { registerEntityFetcher, registerAvailabilityChecker } from "@/shared/context";
import type { LearningEntity } from "@/shared/core";
import type { EntityCapability } from "@/shared/core/capabilities";
import { ENTITY_CAPABILITIES } from "@/shared/core/capabilities";
import { DocumentsService } from "@/api/generated";

// ============================================================================
// Entity Fetcher
// ============================================================================

/**
 * Fetch a document by ID and convert to platform format.
 */
async function fetchDocument(id: string | number) {
    try {
        const doc = await DocumentsService.getDocumentApiV1DocumentsDocumentIdGet(Number(id));

        return {
            id: doc.id,
            title: doc.filename, // Documents use filename as title
            createdAt: doc.created_at,
            metadata: {
                filename: doc.filename,
                fileType: doc.file_type,
                status: doc.processing_status,
                pageCount: doc.page_count,
            },
        };
    } catch {
        return null;
    }
}

/**
 * Check capability availability for documents.
 */
function checkDocumentCapabilityAvailability(
    entity: { metadata?: Record<string, unknown> },
    capability: EntityCapability
): { available: boolean; reason?: string } {
    const status = entity.metadata?.status as string | undefined;
    const pageCount = (entity.metadata?.pageCount as number) ?? 0;

    // All capabilities require document to be processed
    if (status !== "completed") {
        return {
            available: false,
            reason: status === "processing"
                ? "Document is still being processed"
                : "Document is not ready",
        };
    }

    switch (capability) {
        case "GENERATE_FLASHCARDS":
        case "GENERATE_QUIZ":
            if (pageCount < 1) {
                return {
                    available: false,
                    reason: "Document has no content to generate from",
                };
            }
            return { available: true };

        case "SUMMARIZE":
            if (pageCount < 1) {
                return {
                    available: false,
                    reason: "Document has no content to summarize",
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

async function executeDocumentCapability(
    capability: EntityCapability,
    _entity: LearningEntity,
    _options?: Record<string, unknown>
) {
    switch (capability) {
        case "REFERENCE_IN_CHAT":
            return successResult("Document ready to reference in chat");

        case "GENERATE_FLASHCARDS":
            return successResult("Flashcard generation from document started");

        case "GENERATE_QUIZ":
            return successResult("Quiz generation from document started");

        case "SUMMARIZE":
            return successResult("Document summary generation started");

        case "EXPORT":
            return successResult("Document export started");

        default:
            return errorResult(
                "UNSUPPORTED_CAPABILITY",
                `Documents module does not support "${capability}"`,
                false
            );
    }
}

// ============================================================================
// Module Contract
// ============================================================================

const documentsModuleContract: ModuleContract = {
    id: "documents",
    name: "Documents",
    entityTypes: ["document"],

    resolveEntity: async (id) => {
        const raw = await fetchDocument(id);
        if (!raw) return null;

        const capabilityList = ENTITY_CAPABILITIES.document ?? [];
        const capabilities = capabilityList.map((cap) => {
            const { available, reason } = checkDocumentCapabilityAvailability(
                { metadata: raw.metadata },
                cap
            );
            return { capability: cap, available, reason };
        });

        return {
            id: raw.id,
            type: "document",
            sourceModule: "documents",
            title: raw.title,
            createdAt: raw.createdAt,
            capabilities,
            visibility: "private",
            metadata: raw.metadata,
        };
    },

    executeCapability: executeDocumentCapability,
};

// ============================================================================
// Registration
// ============================================================================

/**
 * Initialize Documents module with the platform.
 * Call this during app startup.
 */
export function initDocumentsModule(): void {
    registerModule(documentsModuleContract);
    registerEntityFetcher("document", fetchDocument);
    registerAvailabilityChecker("document", checkDocumentCapabilityAvailability);

    if (process.env.NODE_ENV === "development") {
        console.debug("[DocumentsModule] Initialized and registered with platform");
    }
}
