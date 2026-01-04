/**
 * Graph Module - Document Handlers
 *
 * Handles document events to create knowledge graph edges:
 * - SOURCED_FROM: Document is source for notes/concepts
 * - MENTIONS: Document mentions notes via [[wikilinks]]
 * - EXTRACTED: Content extracted from document
 *
 * SCOPE (Phase 4.3):
 * - Deterministic extraction only
 * - No AI/embeddings
 * - Title matching + wikilink extraction
 */

import { EventBus, EventTypes, matchesEventType, type EventEnvelope } from "@/shared/events";
import { documentRef, noteRef } from "@/shared/entities";
import { useGraphStore, GraphEdgeType, nodeIdFromEntity } from "./graphStore";
import { extractWikiLinks, resolveLinks, stubResolver } from "./linkExtractor";

// ============================================================================
// Types
// ============================================================================

interface DocumentUploadedPayload {
    documentId: number;
    filename: string;
    contentType: string;
    size: number;
}

interface DocumentProcessedPayload {
    documentId: number;
    title?: string;
    text?: string;
    pageCount?: number;
    extractedLinks?: string[];
}

interface DocumentViewedPayload {
    documentId: number;
    duration?: number;
}

// ============================================================================
// Initialization
// ============================================================================

let initialized = false;
let unsubscribe: (() => void) | null = null;

/**
 * Initialize document event handlers.
 * Call once at app startup, after initLearningHandlers.
 */
export function initDocumentHandlers(): () => void {
    if (initialized) {
        console.warn("[DocumentHandlers] Already initialized");
        return () => { };
    }

    initialized = true;

    // Subscribe to document events
    unsubscribe = EventBus.subscribe("document.*", handleDocumentEvent);

    if (process.env.NODE_ENV === "development") {
        console.log("[DocumentHandlers] Initialized - listening for document events");
    }

    return () => {
        if (unsubscribe) {
            unsubscribe();
            unsubscribe = null;
        }
        initialized = false;
    };
}

// ============================================================================
// Event Handler
// ============================================================================

function handleDocumentEvent(envelope: EventEnvelope): void {
    if (matchesEventType(envelope, EventTypes.DOCUMENT_UPLOADED)) {
        handleDocumentUploaded(envelope);
    } else if (matchesEventType(envelope, EventTypes.DOCUMENT_PROCESSED)) {
        handleDocumentProcessed(envelope);
    } else if (matchesEventType(envelope, EventTypes.DOCUMENT_VIEWED)) {
        handleDocumentViewed(envelope);
    }
}

// ============================================================================
// Document Uploaded Handler
// ============================================================================

function handleDocumentUploaded(envelope: EventEnvelope): void {
    const payload = envelope.payload as DocumentUploadedPayload;
    const docId = payload.documentId ?? (envelope.entity?.id as number);

    if (!docId) return;

    const store = useGraphStore.getState();

    // Create document node
    const docEntity = documentRef(docId);
    const docNodeId = nodeIdFromEntity(docEntity);

    if (!store.getNode(docNodeId)) {
        store.addNode(docEntity, payload.filename, {
            contentType: payload.contentType,
            size: payload.size,
            uploadedAt: envelope.timestamp,
            status: "pending",
        });
    }

    if (process.env.NODE_ENV === "development") {
        console.debug(`[DocumentHandlers] Document uploaded: ${payload.filename}`);
    }
}

// ============================================================================
// Document Processed Handler
// ============================================================================

async function handleDocumentProcessed(envelope: EventEnvelope): Promise<void> {
    const payload = envelope.payload as DocumentProcessedPayload;
    const docId = payload.documentId ?? (envelope.entity?.id as number);

    if (!docId) return;

    const store = useGraphStore.getState();

    // Update document node
    const docEntity = documentRef(docId);
    const docNodeId = nodeIdFromEntity(docEntity);

    // Ensure node exists
    if (!store.getNode(docNodeId)) {
        store.addNode(docEntity, payload.title || `Document ${docId}`, {
            status: "processed",
            processedAt: envelope.timestamp,
        });
    } else {
        store.updateNode(docNodeId, {
            label: payload.title,
            metadata: {
                status: "processed",
                processedAt: envelope.timestamp,
                pageCount: payload.pageCount,
            },
        });
    }

    // Extract links from document text
    if (payload.text) {
        await processDocumentLinks(docNodeId, payload.text);
    }

    // Process pre-extracted links (from backend)
    if (payload.extractedLinks && payload.extractedLinks.length > 0) {
        for (const link of payload.extractedLinks) {
            await createMentionEdge(docNodeId, link);
        }
    }

    // Try title matching
    if (payload.title) {
        await matchDocumentToNotes(docNodeId, payload.title);
    }

    if (process.env.NODE_ENV === "development") {
        console.debug(`[DocumentHandlers] Document processed: ${docId}`);
    }
}

// ============================================================================
// Document Viewed Handler
// ============================================================================

function handleDocumentViewed(envelope: EventEnvelope): void {
    const payload = envelope.payload as DocumentViewedPayload;
    const docId = payload.documentId ?? (envelope.entity?.id as number);

    if (!docId) return;

    const store = useGraphStore.getState();
    const docNodeId = nodeIdFromEntity(documentRef(docId));

    // Touch the document node
    store.touchNode(docNodeId);

    if (process.env.NODE_ENV === "development") {
        console.debug(`[DocumentHandlers] Document viewed: ${docId}`);
    }
}

// ============================================================================
// Link Extraction
// ============================================================================

/**
 * Extract [[wikilinks]] from document text and create MENTIONS edges.
 */
async function processDocumentLinks(docNodeId: string, text: string): Promise<void> {
    const rawLinks = extractWikiLinks(text);

    if (rawLinks.length === 0) return;

    const resolvedLinks = await resolveLinks(rawLinks, stubResolver);
    const store = useGraphStore.getState();

    let mentionCount = 0;

    for (const link of resolvedLinks) {
        if (link.entityType === "note" && link.entityId) {
            const targetEntity = noteRef(link.entityId);
            const targetNodeId = nodeIdFromEntity(targetEntity);

            // Ensure target node exists (create placeholder if not)
            if (!store.getNode(targetNodeId)) {
                store.addNode(targetEntity, link.raw.displayText || link.raw.target, {
                    placeholder: true,
                });
            }

            // Create MENTIONS edge
            store.addEdge(docNodeId, targetNodeId, GraphEdgeType.MENTIONS, 1.0, {
                displayText: link.raw.displayText,
                resolvedBy: link.resolvedBy,
            });

            mentionCount++;
        }
    }

    if (process.env.NODE_ENV === "development" && mentionCount > 0) {
        console.debug(`[DocumentHandlers] Created ${mentionCount} mention edges from ${docNodeId}`);
    }
}

/**
 * Create a MENTIONS edge for a pre-extracted link.
 */
async function createMentionEdge(docNodeId: string, target: string): Promise<void> {
    const resolved = await resolveLinks([{ target, position: { start: 0, end: 0 } }], stubResolver);
    const store = useGraphStore.getState();

    for (const link of resolved) {
        if (link.entityType === "note" && link.entityId) {
            const targetEntity = noteRef(link.entityId);
            const targetNodeId = nodeIdFromEntity(targetEntity);

            if (!store.getNode(targetNodeId)) {
                store.addNode(targetEntity, target, { placeholder: true });
            }

            store.addEdge(docNodeId, targetNodeId, GraphEdgeType.MENTIONS, 1.0, {
                resolvedBy: link.resolvedBy,
            });
        }
    }
}

// ============================================================================
// Title Matching
// ============================================================================

/**
 * Match document title to existing notes.
 * Creates soft SOURCED_FROM links when titles match.
 *
 * This is deterministic matching only - no fuzzy/semantic matching.
 */
async function matchDocumentToNotes(docNodeId: string, title: string): Promise<void> {
    const store = useGraphStore.getState();
    const normalizedTitle = normalizeTitle(title);

    // Iterate through all notes and check for title matches
    // This is O(n) but sufficient for v1
    let matchCount = 0;

    store.nodes.forEach((node) => {
        if (node.entityType === "note") {
            const noteTitle = normalizeTitle(node.label);

            // Exact match or containment
            if (
                noteTitle === normalizedTitle ||
                noteTitle.includes(normalizedTitle) ||
                normalizedTitle.includes(noteTitle)
            ) {
                // Create SOURCED_FROM edge (weak weight for title match)
                store.addEdge(docNodeId, node.id, GraphEdgeType.SOURCED_FROM, 0.5, {
                    matchType: "title",
                    documentTitle: title,
                    noteTitle: node.label,
                });

                matchCount++;
            }
        }
    });

    if (process.env.NODE_ENV === "development" && matchCount > 0) {
        console.debug(
            `[DocumentHandlers] Title matched ${matchCount} notes for "${title}"`
        );
    }
}

/**
 * Normalize a title for comparison.
 */
function normalizeTitle(title: string): string {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

// ============================================================================
// Manual Link Creation (for future UI)
// ============================================================================

/**
 * Create an explicit SOURCED_FROM edge.
 * Called when user manually links a note to a document.
 */
export function linkNoteToDocument(noteId: number, documentId: number): void {
    const store = useGraphStore.getState();

    const docNodeId = nodeIdFromEntity(documentRef(documentId));
    const noteNodeId = nodeIdFromEntity(noteRef(noteId));

    // Ensure both nodes exist
    if (!store.getNode(docNodeId)) {
        store.addNode(documentRef(documentId), `Document ${documentId}`, {});
    }
    if (!store.getNode(noteNodeId)) {
        store.addNode(noteRef(noteId), `Note ${noteId}`, { placeholder: true });
    }

    // Create strong SOURCED_FROM edge (user-confirmed)
    store.addEdge(docNodeId, noteNodeId, GraphEdgeType.SOURCED_FROM, 1.0, {
        manualLink: true,
        createdAt: new Date().toISOString(),
    });
}

/**
 * Create an EXTRACTED edge when user extracts content from document.
 */
export function markNoteExtractedFromDocument(
    noteId: number,
    documentId: number,
    pageNumber?: number
): void {
    const store = useGraphStore.getState();

    const docNodeId = nodeIdFromEntity(documentRef(documentId));
    const noteNodeId = nodeIdFromEntity(noteRef(noteId));

    store.addEdge(docNodeId, noteNodeId, GraphEdgeType.EXTRACTED, 1.0, {
        pageNumber,
        extractedAt: new Date().toISOString(),
    });
}
