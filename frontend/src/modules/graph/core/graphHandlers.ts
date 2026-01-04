/**
 * Graph Module - Event Handlers
 *
 * RESPONSIBILITIES:
 * - React to graph events from eventConsumer
 * - Mutate graph store accordingly
 * - Extract and create wikilink edges for notes
 *
 * ARCHITECTURE:
 * - No imports from domain modules
 * - Uses only shared contracts + graph store
 * - Handlers are pure functions operating on context
 */

import { type EntityRef } from "@/shared/entities";
import { onGraphEvent, type GraphEventContext } from "./eventConsumer";
import { useGraphStore, GraphEdgeType, nodeIdFromEntity } from "./graphStore";
import { extractWikiLinks, resolveLinks, stubResolver } from "./linkExtractor";

// ============================================================================
// Handler Registration
// ============================================================================

let initialized = false;
let cleanupFns: Array<() => void> = [];

/**
 * Initialize graph event handlers.
 * Call once at app startup, after initGraphEventConsumer.
 */
export function initGraphHandlers(): () => void {
    if (initialized) {
        console.warn("[GraphHandlers] Already initialized");
        return () => { };
    }

    initialized = true;

    cleanupFns = [
        onGraphEvent("entity:created", handleEntityCreated),
        onGraphEvent("entity:updated", handleEntityUpdated),
        onGraphEvent("entity:deleted", handleEntityDeleted),
        onGraphEvent("entity:accessed", handleEntityAccessed),
        onGraphEvent("entity:ready", handleEntityReady),
        onGraphEvent("mastery:updated", handleMasteryUpdated),
    ];

    if (process.env.NODE_ENV === "development") {
        console.log("[GraphHandlers] Initialized - listening for graph events");
    }

    return () => {
        cleanupFns.forEach((fn) => fn());
        cleanupFns = [];
        initialized = false;
    };
}

// ============================================================================
// Entity Created Handler
// ============================================================================

function handleEntityCreated(ctx: GraphEventContext): void {
    if (!ctx.entity) return;

    const store = useGraphStore.getState();

    // Create or update node
    const label = extractLabel(ctx.entity, ctx.payload);
    store.addNode(ctx.entity, label, {
        sourceEvent: ctx.originalType,
        createdViaEvent: true,
    });

    // For notes: extract wikilinks and create edges
    if (ctx.entity.type === "note") {
        processNoteLinks(ctx.entity, ctx.payload);
    }

    if (process.env.NODE_ENV === "development") {
        console.debug(`[GraphHandlers] Created node: ${nodeIdFromEntity(ctx.entity)}`);
    }
}

// ============================================================================
// Entity Updated Handler
// ============================================================================

function handleEntityUpdated(ctx: GraphEventContext): void {
    if (!ctx.entity) return;

    const store = useGraphStore.getState();
    const nodeId = nodeIdFromEntity(ctx.entity);

    // Check if node exists
    const existing = store.getNode(nodeId);
    if (!existing) {
        // Node doesn't exist, treat as create
        handleEntityCreated(ctx);
        return;
    }

    // Update node
    const label = extractLabel(ctx.entity, ctx.payload);
    store.updateNode(nodeId, { label });

    // For notes: re-process links (content may have changed)
    if (ctx.entity.type === "note") {
        const payload = ctx.payload as Record<string, unknown>;
        const fields = payload.fields as string[] | undefined;

        // Only reprocess if content was updated
        if (!fields || fields.includes("content")) {
            // Remove old wikilink edges from this node
            const oldEdges = store.getEdgesForNode(nodeId, "out");
            oldEdges.forEach((edge) => {
                if (edge.relationType === (GraphEdgeType.WIKILINK as string)) {
                    store.removeEdge(edge.id);
                }
            });

            // Re-extract and create new edges
            processNoteLinks(ctx.entity, ctx.payload);
        }
    }

    if (process.env.NODE_ENV === "development") {
        console.debug(`[GraphHandlers] Updated node: ${nodeId}`);
    }
}

// ============================================================================
// Entity Deleted Handler
// ============================================================================

function handleEntityDeleted(ctx: GraphEventContext): void {
    if (!ctx.entity) return;

    const store = useGraphStore.getState();
    const nodeId = nodeIdFromEntity(ctx.entity);

    // Remove node (edges are removed automatically)
    store.removeNode(nodeId);

    if (process.env.NODE_ENV === "development") {
        console.debug(`[GraphHandlers] Deleted node: ${nodeId}`);
    }
}

// ============================================================================
// Entity Accessed Handler
// ============================================================================

function handleEntityAccessed(ctx: GraphEventContext): void {
    if (!ctx.entity) return;

    const store = useGraphStore.getState();
    const nodeId = nodeIdFromEntity(ctx.entity);

    // Update lastAccessedAt
    store.touchNode(nodeId);

    if (process.env.NODE_ENV === "development") {
        console.debug(`[GraphHandlers] Touched node: ${nodeId}`);
    }
}

// ============================================================================
// Entity Ready Handler (e.g., document processed)
// ============================================================================

function handleEntityReady(ctx: GraphEventContext): void {
    if (!ctx.entity) return;

    const store = useGraphStore.getState();
    const nodeId = nodeIdFromEntity(ctx.entity);

    // Update node metadata
    store.updateNode(nodeId, {
        metadata: {
            ready: true,
            readyAt: ctx.timestamp,
        },
    });

    if (process.env.NODE_ENV === "development") {
        console.debug(`[GraphHandlers] Marked ready: ${nodeId}`);
    }
}

// ============================================================================
// Mastery Updated Handler
// ============================================================================

function handleMasteryUpdated(ctx: GraphEventContext): void {
    if (!ctx.entity) return;

    const store = useGraphStore.getState();
    const nodeId = nodeIdFromEntity(ctx.entity);

    // Extract mastery data from payload
    const payload = ctx.payload as Record<string, unknown>;
    const score = payload.score as number | undefined;
    const percentage = payload.percentage as number | undefined;

    // Update node metadata with mastery info
    store.updateNode(nodeId, {
        metadata: {
            masteryScore: score,
            masteryPercentage: percentage,
            lastMasteryUpdate: ctx.timestamp,
        },
    });

    if (process.env.NODE_ENV === "development") {
        console.debug(`[GraphHandlers] Updated mastery: ${nodeId}`, { score, percentage });
    }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract a human-readable label from entity/payload.
 */
function extractLabel(entity: EntityRef, payload: unknown): string {
    // Prefer entity label if present
    if (entity.label) return entity.label;

    // Try to extract from payload
    const p = payload as Record<string, unknown> | null;
    if (p) {
        if (typeof p.title === "string") return p.title;
        if (typeof p.name === "string") return p.name;
        if (typeof p.front_text === "string") return p.front_text.slice(0, 50);
    }

    // Fallback to entity key
    return `${entity.type}:${entity.id}`;
}

/**
 * Process wikilinks in note content and create edges.
 */
async function processNoteLinks(entity: EntityRef, payload: unknown): Promise<void> {
    const p = payload as Record<string, unknown> | null;
    if (!p) return;

    // Get content from payload
    const content = p.content as string | undefined;
    if (!content) return;

    // Extract links
    const rawLinks = extractWikiLinks(content);
    if (rawLinks.length === 0) return;

    // Resolve links (for now, use stub resolver)
    const resolvedLinks = await resolveLinks(rawLinks, stubResolver);

    // Create edges
    const store = useGraphStore.getState();
    const sourceNodeId = nodeIdFromEntity(entity);

    for (const link of resolvedLinks) {
        if (link.entityType && link.entityId) {
            const targetEntity: EntityRef = {
                type: link.entityType,
                id: link.entityId,
            };
            const targetNodeId = nodeIdFromEntity(targetEntity);

            // Ensure target node exists (create placeholder if not)
            if (!store.getNode(targetNodeId)) {
                store.addNode(targetEntity, link.raw.displayText || link.raw.target, {
                    placeholder: true,
                });
            }

            // Create wikilink edge
            store.addEdge(sourceNodeId, targetNodeId, GraphEdgeType.WIKILINK, 1.0, {
                displayText: link.raw.displayText,
                resolvedBy: link.resolvedBy,
            });
        }
    }

    if (process.env.NODE_ENV === "development" && resolvedLinks.length > 0) {
        console.debug(
            `[GraphHandlers] Created ${resolvedLinks.filter((l) => l.entityId).length} wikilink edges from ${sourceNodeId}`
        );
    }
}
