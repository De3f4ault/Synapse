/**
 * Quizzes Module - Platform Registration
 *
 * INVARIANT: This file wires the Quizzes module into the platform.
 * INVARIANT: Called once during app initialization.
 */

import { registerModule, type ModuleContract, successResult, errorResult } from "@/shared/platform";
import { registerEntityFetcher, registerAvailabilityChecker } from "@/shared/context";
import type { LearningEntity } from "@/shared/core";
import type { EntityCapability } from "@/shared/core/capabilities";
import { ENTITY_CAPABILITIES } from "@/shared/core/capabilities";
import { QuizzesService } from "@/api/generated";

// ============================================================================
// Entity Fetcher
// ============================================================================

/**
 * Fetch a quiz by ID and convert to platform format.
 * Note: Uses list endpoint and filters, as there's no direct get-by-id endpoint.
 */
async function fetchQuiz(id: string | number) {
    try {
        // Use list endpoint and find by ID
        const quizzes = await QuizzesService.listQuizzesApiV1QuizzesGet();
        const quiz = quizzes.find((q) => q.id === Number(id));

        if (!quiz) return null;

        return {
            id: quiz.id,
            title: quiz.title,
            createdAt: quiz.created_at,
            metadata: {
                description: quiz.description,
                difficulty: quiz.difficulty,
                timeLimitMinutes: quiz.time_limit_minutes,
                questionCount: quiz.question_count,
            },
        };
    } catch {
        return null;
    }
}

/**
 * Check capability availability for quizzes.
 */
function checkQuizCapabilityAvailability(
    entity: { metadata?: Record<string, unknown> },
    capability: EntityCapability
): { available: boolean; reason?: string } {
    const questionCount = (entity.metadata?.questionCount as number) ?? 0;

    switch (capability) {
        case "REINFORCE_GRAPH":
            if (questionCount < 1) {
                return {
                    available: false,
                    reason: "Quiz has no questions",
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

async function executeQuizCapability(
    capability: EntityCapability,
    _entity: LearningEntity,
    _options?: Record<string, unknown>
) {
    switch (capability) {
        case "REINFORCE_GRAPH":
            return successResult("Quiz results reinforced in knowledge graph");

        default:
            return errorResult(
                "UNSUPPORTED_CAPABILITY",
                `Quizzes module does not support "${capability}"`,
                false
            );
    }
}

// ============================================================================
// Module Contract
// ============================================================================

const quizzesModuleContract: ModuleContract = {
    id: "quizzes",
    name: "Quizzes",
    entityTypes: ["quiz"],

    resolveEntity: async (id) => {
        const raw = await fetchQuiz(id);
        if (!raw) return null;

        const capabilityList = ENTITY_CAPABILITIES.quiz ?? [];
        const capabilities = capabilityList.map((cap) => {
            const { available, reason } = checkQuizCapabilityAvailability(
                { metadata: raw.metadata },
                cap
            );
            return { capability: cap, available, reason };
        });

        return {
            id: raw.id,
            type: "quiz",
            sourceModule: "quizzes",
            title: raw.title,
            createdAt: raw.createdAt,
            capabilities,
            visibility: "private",
            metadata: raw.metadata,
        };
    },

    executeCapability: executeQuizCapability,
};

// ============================================================================
// Registration
// ============================================================================

/**
 * Initialize Quizzes module with the platform.
 */
export function initQuizzesModule(): void {
    registerModule(quizzesModuleContract);
    registerEntityFetcher("quiz", fetchQuiz);
    registerAvailabilityChecker("quiz", checkQuizCapabilityAvailability);

    if (process.env.NODE_ENV === "development") {
        console.debug("[QuizzesModule] Initialized and registered with platform");
    }
}
