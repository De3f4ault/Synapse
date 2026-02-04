/**
 * Folder Store
 * 
 * Zustand store for folder UI state (expansion, selection, drag, view).
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

// Phase 2B: Smart Views type
export type DocumentsView =
  | { type: 'folder'; folderId: number | null }
  | { type: 'recent' }
  | { type: 'favorites' }
  | { type: 'archived' };

interface FolderUIState {
  // Expanded folders (for tree view)
  expandedIds: Set<number>;
  
  // Currently selected folder
  selectedFolderId: number | null;
  
  // Currently dragging folder
  draggingId: number | null;
  
  // Folder being renamed
  renamingId: number | null;
  
  // Current view mode (Phase 2B: Smart Views)
  currentView: DocumentsView;

  // Phase 4: Multi-selection
  // Ids in format: "doc:123" or "folder:456"
  selectedItemIds: Set<string>;
  // Clipboard (Phase 3.5)
  clipboard: { items: string[]; op: 'copy' | 'cut' } | null;
}

interface FolderUIActions {
  // Expansion
  toggleExpand: (id: number) => void;
  expandFolder: (id: number) => void;
  collapseFolder: (id: number) => void;
  expandAll: (ids: number[]) => void;
  collapseAll: () => void;
  
  // Selection
  selectFolder: (id: number | null) => void;
  
  // Drag state
  setDragging: (id: number | null) => void;
  
  // Rename state
  setRenaming: (id: number | null) => void;
  
  // View state (Phase 2B)
  setView: (view: DocumentsView) => void;

  // Selection (Phase 4)
  toggleSelection: (id: string, multi?: boolean) => void;
  clearSelection: () => void;
  selectAll: (ids: string[]) => void;
  
  // Clipboard
  copyItems: (ids: string[]) => void;
  cutItems: (ids: string[]) => void;
  clearClipboard: () => void;
  
  // Reset
  reset: () => void;
}

type FolderStore = FolderUIState & FolderUIActions;

const initialState: FolderUIState = {
  expandedIds: new Set<number>(),
  selectedFolderId: null,
  draggingId: null,
  renamingId: null,
  currentView: { type: 'folder', folderId: null },
  selectedItemIds: new Set(),
  clipboard: null,
};

export const useFolderStore = create<FolderStore>()(
  immer((set) => ({
    ...initialState,

    toggleExpand: (id) =>
      set((state) => {
        if (state.expandedIds.has(id)) {
          state.expandedIds.delete(id);
        } else {
          state.expandedIds.add(id);
        }
      }),

    expandFolder: (id) =>
      set((state) => {
        state.expandedIds.add(id);
      }),

    collapseFolder: (id) =>
      set((state) => {
        state.expandedIds.delete(id);
      }),

    expandAll: (ids) =>
      set((state) => {
        ids.forEach((id) => state.expandedIds.add(id));
      }),

    collapseAll: () =>
      set((state) => {
        state.expandedIds.clear();
      }),

    selectFolder: (id) =>
      set((state) => {
        state.selectedFolderId = id;
      }),

    setDragging: (id) =>
      set((state) => {
        state.draggingId = id;
      }),

    setRenaming: (id) =>
      set((state) => {
        state.renamingId = id;
      }),

    setView: (view) =>
      set((state) => {
        state.currentView = view;
        // Update selectedFolderId for folder views
        if (view.type === 'folder') {
          state.selectedFolderId = view.folderId;
        } else {
          state.selectedFolderId = null;
        }
        // Clear selection on view change
        state.selectedItemIds.clear();
      }),

    toggleSelection: (id, multi = false) =>
      set((state) => {
        if (multi) {
          if (state.selectedItemIds.has(id)) {
            state.selectedItemIds.delete(id);
          } else {
            state.selectedItemIds.add(id);
          }
        } else {
          // Single select (replace)
          state.selectedItemIds.clear();
          state.selectedItemIds.add(id);
        }
      }),

    clearSelection: () =>
      set((state) => {
        state.selectedItemIds.clear();
      }),

    selectAll: (ids) =>
      set((state) => {
        state.selectedItemIds = new Set(ids);
      }),

    copyItems: (ids) =>
      set((state) => {
        state.clipboard = { items: ids, op: 'copy' };
      }),

    cutItems: (ids) =>
      set((state) => {
        state.clipboard = { items: ids, op: 'cut' };
      }),

    clearClipboard: () =>
      set((state) => {
        state.clipboard = null;
      }),

    reset: () => set(initialState),
  }))
);

// Selectors
export const selectExpandedIds = (state: FolderStore) => state.expandedIds;
export const selectSelectedFolderId = (state: FolderStore) => state.selectedFolderId;
export const selectDraggingId = (state: FolderStore) => state.draggingId;
export const selectCurrentView = (state: FolderStore) => state.currentView;
export const selectIsExpanded = (id: number) => (state: FolderStore) => 
  state.expandedIds.has(id);
export const selectSelectedItems = (state: FolderStore) => state.selectedItemIds;
