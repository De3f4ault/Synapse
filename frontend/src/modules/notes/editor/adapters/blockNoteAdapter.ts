/**
 * BlockNote Adapter
 *
 * Converts between BlockNote document format and storage format.
 * Handles validation, stats computation, and format conversions.
 *
 * PRINCIPLE: Your database owns truth. BlockNote is ephemeral.
 */

import type { Block } from "@blocknote/core";

// ============================================================================
// Types
// ============================================================================

export interface NoteStats {
  blocks: number;
  words: number;
  chars: number;
  readingTimeMinutes: number;
  blockTypes: Record<string, number>;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// ============================================================================
// Storage Conversion
// ============================================================================

/**
 * Convert BlockNote blocks to storage format (JSON string).
 * This is what gets saved to your PostgreSQL database.
 */
export function toStorageFormat(blocks: Block[]): string {
  return JSON.stringify(blocks);
}

/**
 * Convert storage format back to BlockNote blocks.
 * Handles legacy markdown content gracefully.
 */
export function fromStorageFormat(stored: string | null | undefined): Block[] {
  if (!stored) {
    return [];
  }

  // Try parsing as JSON (BlockNote format)
  try {
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed)) {
      return parsed as Block[];
    }
  } catch {
    // Not JSON - treat as legacy markdown
    // Split by newlines to create specific blocks rather than one giant paragraph.
    // This improves rendering performance and editability.
    const lines = stored.split("\n");
    return lines.map((line) => ({
      id: crypto.randomUUID(),
      type: "paragraph",
      content: line ? [{ type: "text", text: line }] : [],
      children: [],
    })) as unknown as Block[];
  }

  return [];
}

/**
 * Check if content is in BlockNote format (JSON) or legacy markdown.
 */
export function isBlockNoteFormat(content: string | null | undefined): boolean {
  if (!content) return false;
  try {
    const parsed = JSON.parse(content);
    return Array.isArray(parsed);
  } catch {
    return false;
  }
}

// ============================================================================
// Stats Computation
// ============================================================================

/**
 * Extract plain text from all blocks for stats calculation.
 */
function extractPlainText(blocks: Block[]): string {
  const extractFromBlock = (block: Block): string => {
    let text = "";

    // Extract text from inline content
    if (block.content && Array.isArray(block.content)) {
      text = block.content
        .map((item) => {
          if (typeof item === "string") return item;
          if (item && typeof item === "object" && "text" in item) {
            return (item as { text: string }).text;
          }
          return "";
        })
        .join("");
    }

    // Recursively extract from children
    if (block.children && Array.isArray(block.children)) {
      text += " " + block.children.map(extractFromBlock).join(" ");
    }

    return text;
  };

  return blocks.map(extractFromBlock).join("\n").trim();
}

/**
 * Compute comprehensive stats from BlockNote blocks.
 */
export function computeStats(blocks: Block[]): NoteStats {
  const plainText = extractPlainText(blocks);
  const words = plainText.trim() ? plainText.trim().split(/\s+/).length : 0;
  const chars = plainText.length;

  // Count block types
  const blockTypes: Record<string, number> = {};
  const countTypes = (block: Block) => {
    blockTypes[block.type] = (blockTypes[block.type] || 0) + 1;
    if (block.children) {
      block.children.forEach(countTypes);
    }
  };
  blocks.forEach(countTypes);

  // Estimate reading time (200 words per minute average)
  const readingTimeMinutes = Math.ceil(words / 200);

  return {
    blocks: blocks.length,
    words,
    chars,
    readingTimeMinutes,
    blockTypes,
  };
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate blocks against invariants.
 * This is where you enforce structural rules for your notes.
 */
export function validate(blocks: Block[]): ValidationResult {
  const errors: string[] = [];

  // Example invariants (customize as needed):

  // 1. Check max depth
  const MAX_DEPTH = 6;
  const checkDepth = (block: Block, depth: number) => {
    if (depth > MAX_DEPTH) {
      errors.push(`Block nesting exceeds maximum depth of ${MAX_DEPTH}`);
      return;
    }
    if (block.children) {
      block.children.forEach((child) => checkDepth(child, depth + 1));
    }
  };
  blocks.forEach((block) => checkDepth(block, 1));

  // 2. Check for empty notes
  if (blocks.length === 0) {
    // Empty is valid (new note)
  }

  // 3. Additional invariants can be added here
  // - No more than N headings
  // - Required block types
  // - Content length limits
  // - etc.

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// Export Adapter Object
// ============================================================================

export const blockNoteAdapter = {
  toStorageFormat,
  fromStorageFormat,
  isBlockNoteFormat,
  computeStats,
  validate,
};

export default blockNoteAdapter;
