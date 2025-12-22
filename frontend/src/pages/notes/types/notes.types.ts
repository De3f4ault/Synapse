import type { NoteResponse } from "@/api/generated";

/**
 * Extended note type with hierarchical children
 */
export interface NoteTreeItem extends NoteResponse {
  children?: NoteTreeItem[];
}

/**
 * Local note state for editing
 */
export interface LocalNoteState {
  title: string;
  content: string;
  tags?: string[];
}

/**
 * Note editor mode
 */
export type EditorMode = "edit" | "view";

/**
 * AI processing status
 */
export interface AIProcessingStatus {
  isProcessing: boolean;
  action?: "summarize" | "tags" | "expand" | "correct";
}

/**
 * Note tree expansion state
 */
export interface TreeExpansionState {
  expandedFolders: Set<number>;
  selectedId: number | null;
}

/**
 * Note metadata
 */
export interface NoteMetadata {
  wordCount?: number;
  charCount?: number;
  lastModified?: Date;
  tags: string[];
}

/**
 * Neural tree item props
 */
export interface NeuralItemProps {
  item: NoteTreeItem;
  level: number;
  selectedId: number | null;
  expandedIds: Set<number>;
  toggleExpand: (id: number) => void;
  onSelect: (id: number) => void;
  onDelete: (id: number, e: React.MouseEvent) => void;
}

/**
 * Tool dock actions
 */
export type ToolDockAction =
  | "toggle_edit"
  | "save"
  | "ai_summarize"
  | "ai_tags"
  | "ai_expand"
  | "delete";

/**
 * Keyboard shortcut configuration
 */
export interface KeyboardShortcut {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  action: ToolDockAction;
  description: string;
}
