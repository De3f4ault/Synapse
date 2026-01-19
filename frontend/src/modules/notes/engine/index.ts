/**
 * BlockSuite Engine Module
 *
 * Exports all BlockSuite-related functionality for the notes module.
 */

// Store (Singleton Workspace)
export {
  getWorkspace,
  createDoc,
  getDoc,
  removeDoc,
  hardDeleteDoc,
  listDocMetas,
  setDocMeta,
  getDocMeta,
  extractDocTitle,
  extractDocPreview,
  isDocEmpty,
  initializeEmptyDoc,
} from "./blocksuiteStore";
export type { DocMeta } from "./blocksuiteStore";

// Workspace Docs Hook (replaces API hooks)
export { useWorkspaceDocs } from "./useWorkspaceDocs";
export type { UseWorkspaceDocsResult } from "./useWorkspaceDocs";

// Migration Adapter
export {
  detectFormat,
  isBlockSuiteSnapshot,
  isBlockNoteFormat,
  migrateBlockNote,
  migrateMarkdown,
  migrateLegacyContent,
} from "./migrationAdapter";
export type { LegacyFormat } from "./migrationAdapter";

// React Hook
export { useBlockSuiteDoc } from "./useBlockSuiteDoc";
export type {
  UseBlockSuiteDocOptions,
  UseBlockSuiteDocResult,
} from "./useBlockSuiteDoc";

// React Component
export { BlockSuiteContainer } from "./BlockSuiteContainer";
export type { EditorMode, BlockSuiteContainerProps } from "./BlockSuiteContainer";

// Mode Switch Component
export { EditorModeSwitch } from "./EditorModeSwitch";
export type { EditorModeSwitchProps } from "./EditorModeSwitch";

// Editor Right Sidebar
export { EditorRightSidebar, SidebarToggleButtons } from "./EditorRightSidebar";
export type { EditorRightSidebarProps, SidebarToggleButtonsProps, SidebarTab } from "./EditorRightSidebar";

// Outline Hook
export { useBlockSuiteOutline } from "./useBlockSuiteOutline";
export type { OutlineHeading, OutlineFrame, DocProperties, BlockSuiteOutline } from "./useBlockSuiteOutline";

// AI Sidebar
export { AISidebar } from "./AISidebar";
export type { AISidebarProps } from "./AISidebar";
