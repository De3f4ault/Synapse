/**
 * useSidebarCollapse - Left sidebar state
 * Manages session sidebar collapse/expand state
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SidebarCollapseState {
  isCollapsed: boolean;
  collapse: () => void;
  expand: () => void;
  toggleSidebar: () => void;
}

export const useSidebarCollapse = create<SidebarCollapseState>()(
  persist(
    (set) => ({
      isCollapsed: false,

      collapse: () => set({ isCollapsed: true }),

              expand: () => set({ isCollapsed: false }),

              toggleSidebar: () =>
              set((state) => ({ isCollapsed: !state.isCollapsed })),
    }),
    {
      name: 'sidebar-collapse-state',
    }
  )
);
