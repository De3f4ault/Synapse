/**
 * Notes Module - Editor Public API
 *
 * RULE: All editor imports go through this file.
 */

// ============================================================================
// Engine (Pure Functions - Legacy Markdown Support)
// ============================================================================

export {
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
} from "./engine/markdown";
export type { Heading } from "./engine/markdown";

export {
  getTextAreaSelection,
  insertTextAtCursor,
  wrapSelection,
  markdownFormatters,
  getCurrentLine,
  replaceCurrentLine,
} from "./engine/selection";
export type { TextAreaSelection, LineInfo } from "./engine/selection";

// ============================================================================
// State
// ============================================================================

export {
  useEditorStore,
  useEditorIsDirty,
  useEditorIsAutosaving,
  useEditorMode,
  useEditorHasError,
  useEditorError,
} from "./state/editorStore";

// ============================================================================
// BlockSuite Engine (New V2 Engine)
// ============================================================================

export {
  // Component
  BlockSuiteContainer,
  
  // Hook
  useBlockSuiteDoc,
  
  // Store / Utilities
  getWorkspace,
  createDoc,
  getDoc,
  removeDoc,
  isDocEmpty,
  initializeEmptyDoc,
  
  // Migration
  detectFormat,
  migrateLegacyContent,
} from "../engine"; // Valid import path from src/modules/notes/engine/index.ts

export type {
  BlockSuiteContainerProps,
  EditorMode,
  UseBlockSuiteDocOptions,
  UseBlockSuiteDocResult,
  LegacyFormat,
} from "../engine";

// ============================================================================
// Legacy / Deprecated
// ============================================================================

// Components below are deprecated or need updating to work with BlockSuite
export { EditorToolbar } from "./components/EditorToolbar";
export { MarkdownPreview } from "./components/MarkdownPreview";

// BlockNote exports REMOVED
