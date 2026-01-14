/**
 * Notes Module - Master Public API
 *
 * This is the ONLY entry point for all Notes module imports.
 *
 * RULES:
 * 1. No deep imports (e.g., @/modules/notes/core/engine/types)
 * 2. All imports go through this barrel file
 * 3. Pages are orchestrators only — import from here
 *
 * ARCHITECTURE:
 * ├── core/     → Domain authority (types, invariants, lifecycle, events, state)
 * ├── list/     → Discovery & navigation (tree, cards, search)
 * ├── editor/   → Authoring surface (engine, state, components)
 * ├── versions/ → Temporal dimension (history, restore)
 * ├── ai/       → Intelligence layer (summarize, tags, expand)
 * ├── shared/   → Cross-cutting UI (stats)
 * └── schemas/  → Validation (Zod schemas)
 */

// ============================================================================
// Core (Domain Authority)
// ============================================================================

export * from "./core";

// ============================================================================
// List (Discovery & Navigation)
// ============================================================================

export {
  // Components
  NoteTree,
  NeuralItem,
  NoteCard,
  NoteListItem,
  NoteSearch,
  // State
  useListStore,
  useIsExpanded,
  useIsSelected,
  // Hooks
  useNotesList,
} from "./list";

// ============================================================================
// Editor (Authoring Surface)
// ============================================================================

export {
  // Engine (Pure Functions)
  wrapText,
  makeBold,
  makeItalic,
  makeCode,
  makeInlineCode,
  makeLink,
  makeHeading,
  makeListItem,
  makeList,
  stripMarkdown,
  countWords,
  countCharacters,
  estimateReadingTime,
  extractHeadings,
  generateTOC,
  getTextAreaSelection,
  insertTextAtCursor,
  wrapSelection,
  markdownFormatters,
  getCurrentLine,
  replaceCurrentLine,
  // State
  useEditorStore,
  useEditorIsDirty,
  useEditorIsAutosaving,
  useEditorMode,
  useEditorHasError,
  useEditorError,
  // Hooks
  useNoteEditor,
  useEditorShortcuts,
  // Components

  EditorToolbar,
  MarkdownPreview,
} from "./editor";
export type { Heading, TextAreaSelection, LineInfo } from "./editor";

// BlockNote Integration (New)
export {
  BlockNoteEditor,
  blockNoteAdapter,
  computeStats,
  toStorageFormat,
  fromStorageFormat,
} from "./editor";
export type {
  BlockNoteEditorProps,
  NoteStats as BlockNoteStats,
  ValidationResult,
} from "./editor";

// ============================================================================
// Versions (Temporal Dimension)
// ============================================================================

export {
  // Hooks
  useNoteVersions,
  // Components
  VersionHistory,
} from "./versions";
export type { NoteVersion } from "./versions";

// ============================================================================
// AI (Intelligence Layer)
// ============================================================================

export {
  // Hooks
  useNoteAI,
  // Components
  AIInsightsPanel,
} from "./ai";
export type { AIInsight } from "./ai";

// ============================================================================
// Shared (Cross-cutting UI)
// ============================================================================

export { NoteStats } from "./shared";

// ============================================================================
// Schemas (Validation)
// ============================================================================

export * from "./schemas";
