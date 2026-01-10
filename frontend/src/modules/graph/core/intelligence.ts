/**
 * Graph Module - Intelligence Contracts
 *
 * INVARIANT: Graph provides declarative intelligence, not just storage.
 * INVARIANT: Intelligence is consumed by the platform, not individual modules.
 *
 * This file defines HOW the graph recommends actions to the platform.
 */

import type { LearningEntity } from "@/shared/core/entity";
import type { GraphContext, PlatformAction, ConceptId } from "@/shared/context";
import { useGraphStore, GraphEdgeType, nodeIdFromEntity } from "./graphStore";

// ============================================================================
// Types (Re-exported from shared/context for convenience)
// ============================================================================

export type { GraphContext, PlatformAction, ConceptId };

// ============================================================================
// Intelligence Provider
// ============================================================================

/**
 * Compute graph intelligence for an entity.
 * This is the implementation that gets registered with shared/context.
 */
export function computeGraphIntelligence(
    entity: LearningEntity
): GraphContext | null {
    const store = useGraphStore.getState();
    const nodeId = nodeIdFromEntity({
        type: entity.type,
        id: entity.id,
    });

    const node = store.nodes.get(nodeId);
    if (!node) {
        return null;
    }

    // Find weakness and strength edges connected to this node
    const weaknesses: ConceptId[] = [];
    const strengths: ConceptId[] = [];

    store.edges.forEach((edge) => {
        if (edge.sourceId === nodeId || edge.targetId === nodeId) {
            const otherNodeId = edge.sourceId === nodeId ? edge.targetId : edge.sourceId;

            if (edge.relationType === GraphEdgeType.WEAKNESS) {
                weaknesses.push(otherNodeId);
            } else if (edge.relationType === GraphEdgeType.MASTERY) {
                strengths.push(otherNodeId);
            }
        }
    });

    // Generate recommended actions based on graph state
    const recommendedActions = generateRecommendations(entity, weaknesses);

    return {
        weaknesses,
        strengths,
        recommendedActions,
    };
}

/**
 * Generate platform recommendations based on graph intelligence.
 */
function generateRecommendations(
    entity: LearningEntity,
    weaknesses: ConceptId[]
): PlatformAction[] {
    const actions: PlatformAction[] = [];

    // If entity has weaknesses, recommend flashcard generation
    if (weaknesses.length > 0) {
        const availableCapabilities = entity.capabilities
            .filter((c) => c.available)
            .map((c) => c.capability);

        if (availableCapabilities.includes("GENERATE_FLASHCARDS")) {
            actions.push({
                type: "GENERATE_FLASHCARDS",
                target: entity,
                reason: `Found ${weaknesses.length} weak concept(s) related to this ${entity.type}`,
                priority: 80,
            });
        }

        if (availableCapabilities.includes("GENERATE_QUIZ")) {
            actions.push({
                type: "GENERATE_QUIZ",
                target: entity,
                reason: `Practice weak areas with a targeted quiz`,
                priority: 70,
            });
        }
    }

    // If entity supports graph reinforcement and hasn't been studied recently
    const reinforceCapability = entity.capabilities.find(
        (c) => c.capability === "REINFORCE_GRAPH" && c.available
    );
    if (reinforceCapability) {
        actions.push({
            type: "REINFORCE_GRAPH",
            target: entity,
            reason: "Continue building your knowledge graph",
            priority: 50,
        });
    }

    return actions.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
}

// ============================================================================
// Registration Helper
// ============================================================================

/**
 * Initialize graph as an intelligence provider.
 * Call this during app initialization to wire up graph → context.
 */
export function initGraphIntelligenceProvider(): void {
    // Dynamic import to avoid circular dependency
    import("@/shared/context").then(({ registerGraphContextFetcher }) => {
        registerGraphContextFetcher(async (entity) => {
            return computeGraphIntelligence(entity);
        });
    });
}
