/**
 * usePreviewSidebar - Right sidebar state
 * Manages file preview sidebar open/close state
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PreviewSidebarState {
  isOpen: boolean;
  activeFileId: number | null;
  open: (fileId?: number) => void;
  close: () => void;
  toggle: () => void;
  setActiveFile: (fileId: number | null) => void;
}

export const usePreviewSidebar = create<PreviewSidebarState>()(
  persist(
    (set) => ({
      isOpen: false,
      activeFileId: null,

      open: (fileId) =>
      set({
        isOpen: true,
        activeFileId: fileId !== undefined ? fileId : null,
      }),

      close: () =>
      set({
        isOpen: false,
        activeFileId: null,
      }),

      toggle: () =>
      set((state) => ({
        isOpen: !state.isOpen,
      })),

      setActiveFile: (fileId) =>
      set({
        activeFileId: fileId,
        isOpen: fileId !== null,
      }),
    }),
    {
      name: 'preview-sidebar-state',
      partialize: (state) => ({
        isOpen: state.isOpen,
      }),
    }
  )
);
