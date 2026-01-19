/**
 * Migration Adapter - Client-Side Legacy Transformation
 *
 * Handles one-time migration of legacy data (BlockNote/Markdown) to BlockSuite.
 * Uses native BlockSuite API (doc.addBlock) for proper structure.
 *
 * ENGINE SOVEREIGNTY: Only BlockSuite creates valid snapshots.
 */

import type { Doc } from "@blocksuite/store";

// ============================================================================
// Format Detection
// ============================================================================

export type LegacyFormat = "blocksuite" | "blocknote" | "markdown" | "unknown";

/**
 * Detect the format of stored content.
 */
export function detectFormat(content: unknown): LegacyFormat {
  if (!content) {
    return "unknown";
  }

  // BlockSuite snapshot has specific structure
  if (isBlockSuiteSnapshot(content)) {
    return "blocksuite";
  }

  // BlockNote is an array of blocks with type/content
  if (isBlockNoteFormat(content)) {
    return "blocknote";
  }

  // Legacy wrapper from backend migration
  if (isLegacyWrapper(content)) {
    return "markdown";
  }

  // Raw string = markdown
  if (typeof content === "string") {
    return "markdown";
  }

  return "unknown";
}

/**
 * Check if content is a valid BlockSuite snapshot.
 */
export function isBlockSuiteSnapshot(content: unknown): boolean {
  if (!content || typeof content !== "object") {
    return false;
  }

  const obj = content as Record<string, unknown>;

  // BlockSuite snapshots have 'blocks' and 'meta' at minimum
  // or they have the 'type' field with 'block' value
  return (
    ("blocks" in obj && "meta" in obj) ||
    (obj.type === "block" && "id" in obj && "flavour" in obj)
  );
}

/**
 * Check if content is BlockNote format (array of blocks).
 */
export function isBlockNoteFormat(content: unknown): boolean {
  if (!Array.isArray(content)) {
    return false;
  }

  if (content.length === 0) {
    return false;
  }

  // BlockNote blocks have 'type' and 'content' or 'children'
  const first = content[0];
  return (
    typeof first === "object" &&
    first !== null &&
    "type" in first &&
    ("content" in first || "children" in first)
  );
}

/**
 * Check if content is legacy wrapper from backend.
 */
function isLegacyWrapper(content: unknown): boolean {
  if (!content || typeof content !== "object") {
    return false;
  }

  const obj = content as Record<string, unknown>;
  return "legacy" in obj && typeof obj.legacy === "string";
}

// ============================================================================
// Migration Functions
// ============================================================================

/**
 * Extract text content from BlockNote inline content.
 */
function extractBlockNoteText(content: unknown[]): string {
  return content
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object" && "text" in item) {
        return (item as { text: string }).text;
      }
      return "";
    })
    .join("");
}

/**
 * Migrate BlockNote blocks into a BlockSuite Doc.
 * Uses native doc.addBlock() for proper structure.
 */
export function migrateBlockNote(doc: Doc, blocks: unknown[]): void {
  // Use any to bypass strict Flavour typing
  const anyDoc = doc as any;

  // Ensure doc has root structure
  let pageId = doc.getBlocksByFlavour("affine:page")[0]?.id;
  if (!pageId) {
    pageId = anyDoc.addBlock("affine:page", {});
    anyDoc.addBlock("affine:surface", {}, pageId);
  }

  let noteId = doc.getBlocksByFlavour("affine:note")[0]?.id;
  if (!noteId) {
    noteId = anyDoc.addBlock("affine:note", {}, pageId);
  }

  // Convert each BlockNote block
  for (const block of blocks) {
    if (!block || typeof block !== "object") continue;

    const bn = block as Record<string, unknown>;
    const type = bn.type as string;
    const content = bn.content as unknown[];

    switch (type) {
      case "paragraph": {
        const text = content ? extractBlockNoteText(content) : "";
        anyDoc.addBlock("affine:paragraph", { text }, noteId);
        break;
      }

      case "heading": {
        const text = content ? extractBlockNoteText(content) : "";
        const level = (bn.props as Record<string, unknown>)?.level ?? 1;
        anyDoc.addBlock(
          "affine:paragraph",
          {
            text,
            type: `h${level}`,
          },
          noteId
        );
        break;
      }

      case "bulletListItem":
      case "numberedListItem": {
        const text = content ? extractBlockNoteText(content) : "";
        anyDoc.addBlock(
          "affine:list",
          {
            text,
            type: type === "numberedListItem" ? "numbered" : "bulleted",
          },
          noteId
        );
        break;
      }

      default: {
        const text = content ? extractBlockNoteText(content) : "";
        if (text) {
          anyDoc.addBlock("affine:paragraph", { text }, noteId);
        }
      }
    }
  }
}

/**
 * Migrate markdown text into a BlockSuite Doc.
 */
export function migrateMarkdown(doc: Doc, markdown: string): void {
  // Use any to bypass strict Flavour typing
  const anyDoc = doc as any;

  // Ensure doc has root structure
  let pageId = doc.getBlocksByFlavour("affine:page")[0]?.id;
  if (!pageId) {
    pageId = anyDoc.addBlock("affine:page", {});
    anyDoc.addBlock("affine:surface", {}, pageId);
  }

  let noteId = doc.getBlocksByFlavour("affine:note")[0]?.id;
  if (!noteId) {
    noteId = anyDoc.addBlock("affine:note", {}, pageId);
  }

  // Simple migration
  const lines = markdown.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed) {
      anyDoc.addBlock("affine:paragraph", { text: trimmed }, noteId);
    }
  }
}

/**
 * Migrate legacy content to BlockSuite format.
 */
export function migrateLegacyContent(doc: Doc, content: unknown): boolean {
  const format = detectFormat(content);

  switch (format) {
    case "blocksuite":
      return false;

    case "blocknote":
      migrateBlockNote(doc, content as unknown[]);
      return true;

    case "markdown": {
      let markdown: string;
      if (isLegacyWrapper(content)) {
        markdown = (content as { legacy: string }).legacy;
      } else {
        markdown = content as string;
      }
      migrateMarkdown(doc, markdown);
      return true;
    }

    case "unknown":
    default:
      return false;
  }
}

export default {
  detectFormat,
  isBlockSuiteSnapshot,
  isBlockNoteFormat,
  migrateBlockNote,
  migrateMarkdown,
  migrateLegacyContent,
};
