/**
 * useDocumentSelection — Zustand store for document multi-selection
 *
 * Features from Paperless-ngx BulkEditor:
 * - Toggle single document
 * - Shift+click range selection
 * - Select page / select all / deselect all
 * - Escape key → deselect
 */

import { create } from "zustand";

interface DocumentSelectionState {
  selected: Set<number>;
  lastSelected: number | null;

  /** Toggle a single document */
  toggleSelected: (docId: number) => void;
  /** Shift+click range: select everything between last click and docId */
  selectRange: (docId: number, allDocIds: number[]) => void;
  /** Select all IDs on current page */
  selectPage: (docIds: number[]) => void;
  /** Select all IDs (across pages) */
  selectAll: (docIds: number[]) => void;
  /** Deselect everything */
  selectNone: () => void;
  /** Check if a doc is selected */
  isSelected: (docId: number) => boolean;
}

export const useDocumentSelection = create<DocumentSelectionState>(
  (set, get) => ({
    selected: new Set(),
    lastSelected: null,

    toggleSelected: (docId) =>
      set((state) => {
        const next = new Set(state.selected);
        if (next.has(docId)) {
          next.delete(docId);
        } else {
          next.add(docId);
        }
        return { selected: next, lastSelected: docId };
      }),

    selectRange: (docId, allDocIds) =>
      set((state) => {
        const last = state.lastSelected;
        if (last === null) {
          // No previous selection — just toggle
          const next = new Set(state.selected);
          next.add(docId);
          return { selected: next, lastSelected: docId };
        }

        const startIdx = allDocIds.indexOf(last);
        const endIdx = allDocIds.indexOf(docId);
        if (startIdx === -1 || endIdx === -1) {
          return { lastSelected: docId };
        }

        const lo = Math.min(startIdx, endIdx);
        const hi = Math.max(startIdx, endIdx);
        const next = new Set(state.selected);
        for (let i = lo; i <= hi; i++) {
          const id = allDocIds[i];
          if (id !== undefined) next.add(id);
        }
        return { selected: next, lastSelected: docId };
      }),

    selectPage: (docIds) =>
      set((state) => {
        const next = new Set(state.selected);
        docIds.forEach((id) => next.add(id));
        return { selected: next };
      }),

    selectAll: (docIds) =>
      set(() => ({
        selected: new Set(docIds),
      })),

    selectNone: () =>
      set(() => ({
        selected: new Set(),
        lastSelected: null,
      })),

    isSelected: (docId) => get().selected.has(docId),
  })
);
