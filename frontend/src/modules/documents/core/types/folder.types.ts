/**
 * Document Folder Types
 * 
 * Types for folder hierarchy and tree operations.
 */

// =============================================================================
// API Response Types
// =============================================================================

export interface FolderSettings {
  icon?: string;
  color?: string;
}

export interface Folder {
  id: number;
  name: string;
  parent_id: number | null;
  rank: string;
  is_system: boolean;
  is_pinned: boolean;
  settings: FolderSettings | null;
}

export interface FolderTreeNode extends Folder {
  children: FolderTreeNode[];
  document_count: number;
}

// =============================================================================
// Request Types
// =============================================================================

export interface CreateFolderRequest {
  name: string;
  parent_id?: number | null;
  settings?: FolderSettings;
}

export interface UpdateFolderRequest {
  name?: string;
  settings?: FolderSettings;
  is_pinned?: boolean;
}

export interface MoveFolderRequest {
  new_parent_id: number | null;
  position: 'before' | 'after' | 'first' | 'last';
  sibling_id?: number;
}

// =============================================================================
// UI State Types
// =============================================================================

export interface FolderDragItem {
  type: 'folder';
  id: number;
  name: string;
  parentId: number | null;
}

export interface FolderDropTarget {
  type: 'folder' | 'root';
  id: number | null;
  position: 'inside' | 'before' | 'after';
}

// =============================================================================
// Icon Mapping
// =============================================================================

export const FOLDER_ICON_MAP: Record<string, string> = {
  'inbox': 'Inbox',
  'file-text': 'FileText',
  'book-open': 'BookOpen',
  'image': 'Image',
  'folder-kanban': 'FolderKanban',
  'download': 'Download',
  'archive': 'Archive',
  'folder': 'Folder',
};

export const DEFAULT_FOLDER_ICON = 'Folder';
