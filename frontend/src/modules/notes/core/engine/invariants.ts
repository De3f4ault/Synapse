/**
 * Notes Module - Domain Invariants
 * Business rules that must match backend constraints.
 *
 * RULE: These values are canonical. Frontend never overrides them.
 */

// ============================================================================
// Hierarchy Constraints
// ============================================================================

/** Maximum depth for note hierarchy (matches backend PostgreSQL function) */
export const MAX_HIERARCHY_DEPTH = 20;

/** Maximum number of children before warning */
export const WARN_CHILDREN_COUNT = 50;

// ============================================================================
// Content Formats
// ============================================================================

/** Supported note formats */
export const NOTE_FORMATS = ["markdown", "html", "plain"] as const;
export type NoteFormat = (typeof NOTE_FORMATS)[number];

/** Default format for new notes */
export const DEFAULT_NOTE_FORMAT: NoteFormat = "markdown";

// ============================================================================
// Content Limits (match backend Pydantic schemas)
// ============================================================================

/** Maximum title length */
export const MAX_TITLE_LENGTH = 500;

/** Minimum title length */
export const MIN_TITLE_LENGTH = 1;

/** Maximum content length */
export const MAX_CONTENT_LENGTH = 1_000_000;

/** Minimum content length */
export const MIN_CONTENT_LENGTH = 1;

// ============================================================================
// Editor Behavior
// ============================================================================

/** Autosave debounce delay (ms) */
export const AUTOSAVE_DELAY_MS = 2000;

/** Number of autosave retries on failure */
export const AUTOSAVE_RETRY_COUNT = 3;

/** Delay between retry attempts (ms) */
export const AUTOSAVE_RETRY_DELAY_MS = 1000;

// ============================================================================
// Search Behavior
// ============================================================================

/** Minimum query length for search */
export const MIN_SEARCH_QUERY_LENGTH = 1;

/** Debounce delay for search input (ms) */
export const SEARCH_DEBOUNCE_MS = 300;

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Check if a note can have children added.
 * Uses depth from backend response.
 */
export function canAddChild(currentDepth: number): boolean {
    return currentDepth < MAX_HIERARCHY_DEPTH - 1;
}

/**
 * Check if title is valid.
 */
export function isValidTitle(title: string): boolean {
    return title.length >= MIN_TITLE_LENGTH && title.length <= MAX_TITLE_LENGTH;
}

/**
 * Check if content is valid.
 */
export function isValidContent(content: string): boolean {
    return content.length >= MIN_CONTENT_LENGTH && content.length <= MAX_CONTENT_LENGTH;
}

/**
 * Check if format is valid.
 */
export function isValidFormat(format: string): format is NoteFormat {
    return NOTE_FORMATS.includes(format as NoteFormat);
}
