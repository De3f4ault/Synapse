/**
 * Graph Module - Link Extractor
 *
 * RESPONSIBILITY SPLIT:
 * - extractWikiLinks(): Pure parsing, no side effects
 * - resolveLinks(): Graph-level resolution (async, may query API)
 *
 * This separation keeps Graph decoupled from Notes storage.
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Raw link reference extracted from content.
 */
export interface RawLinkReference {
    /** The target identifier (note ID or title) */
    target: string;

    /** Optional display text (if [[id|display]] format) */
    displayText?: string;

    /** Position in source content */
    position: {
        start: number;
        end: number;
    };
}

/**
 * Resolved link with entity reference.
 */
export interface ResolvedLink {
    /** Original raw reference */
    raw: RawLinkReference;

    /** Resolved entity type (null if unresolved) */
    entityType: "note" | "document" | "deck" | null;

    /** Resolved entity ID (null if unresolved) */
    entityId: number | null;

    /** Resolution method used */
    resolvedBy: "id" | "title" | "alias" | "unresolved";
}

// ============================================================================
// Link Extraction (Pure Parsing)
// ============================================================================

/**
 * Wikilink pattern: [[target]] or [[target|display text]]
 *
 * Examples:
 * - [[Some Note Title]]
 * - [[123]]                    // By note ID
 * - [[meeting-notes|Meeting]]  // With display text
 */
const WIKILINK_PATTERN = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

/**
 * Extract wikilinks from content.
 *
 * This is a PURE function - no side effects, no API calls.
 *
 * @param content - Raw text content (markdown)
 * @returns Array of raw link references
 *
 * @example
 * const links = extractWikiLinks("See [[my note]] and [[123|other note]]");
 * // [
 * //   { target: "my note", displayText: undefined, position: {...} },
 * //   { target: "123", displayText: "other note", position: {...} }
 * // ]
 */
export function extractWikiLinks(content: string): RawLinkReference[] {
    const links: RawLinkReference[] = [];

    // Reset regex state
    WIKILINK_PATTERN.lastIndex = 0;

    let match;
    while ((match = WIKILINK_PATTERN.exec(content)) !== null) {
        links.push({
            target: (match[1] ?? "").trim(),
            displayText: match[2]?.trim(),
            position: {
                start: match.index,
                end: match.index + match[0].length,
            },
        });
    }

    return links;
}

/**
 * Extract markdown-style links: [text](note:123) or [text](note://title)
 */
const NOTE_LINK_PATTERN = /\[([^\]]+)\]\(note:(?:\/\/)?([^)]+)\)/g;

export function extractNoteLinks(content: string): RawLinkReference[] {
    const links: RawLinkReference[] = [];

    NOTE_LINK_PATTERN.lastIndex = 0;

    let match;
    while ((match = NOTE_LINK_PATTERN.exec(content)) !== null) {
        links.push({
            target: (match[2] ?? "").trim(),
            displayText: (match[1] ?? "").trim(),
            position: {
                start: match.index,
                end: match.index + match[0].length,
            },
        });
    }

    return links;
}

/**
 * Extract all link types from content.
 */
export function extractAllLinks(content: string): RawLinkReference[] {
    return [...extractWikiLinks(content), ...extractNoteLinks(content)];
}

// ============================================================================
// Link Resolution (Graph-Level)
// ============================================================================

/**
 * Link resolver interface.
 *
 * Inject this to keep Graph decoupled from Notes API.
 */
export interface LinkResolver {
    /**
     * Resolve a target string to an entity.
     * @param target - Note ID (numeric string) or title
     * @returns Entity info or null if not found
     */
    resolve(target: string): Promise<{
        entityType: "note" | "document" | "deck";
        entityId: number;
        resolvedBy: "id" | "title" | "alias";
    } | null>;
}

/**
 * Resolve raw links to entity references.
 *
 * @param links - Raw link references
 * @param resolver - Injected resolver (keeps Graph decoupled)
 * @returns Array of resolved links
 */
export async function resolveLinks(
    links: RawLinkReference[],
    resolver: LinkResolver
): Promise<ResolvedLink[]> {
    const results: ResolvedLink[] = [];

    for (const raw of links) {
        // Try numeric ID first
        const numericId = parseInt(raw.target, 10);
        if (!isNaN(numericId) && numericId > 0) {
            // Assume note ID
            results.push({
                raw,
                entityType: "note",
                entityId: numericId,
                resolvedBy: "id",
            });
            continue;
        }

        // Use resolver for title/alias lookup
        const resolved = await resolver.resolve(raw.target);
        if (resolved) {
            results.push({
                raw,
                entityType: resolved.entityType,
                entityId: resolved.entityId,
                resolvedBy: resolved.resolvedBy,
            });
        } else {
            results.push({
                raw,
                entityType: null,
                entityId: null,
                resolvedBy: "unresolved",
            });
        }
    }

    return results;
}

// ============================================================================
// Default Resolver (No-op for now)
// ============================================================================

/**
 * Stub resolver that only resolves numeric IDs.
 * Replace with actual implementation that queries Notes API.
 */
export const stubResolver: LinkResolver = {
    async resolve(target: string) {
        const numericId = parseInt(target, 10);
        if (!isNaN(numericId) && numericId > 0) {
            return { entityType: "note" as const, entityId: numericId, resolvedBy: "id" as const };
        }
        return null;
    },
};
