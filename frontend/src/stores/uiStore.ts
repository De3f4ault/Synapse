import { create } from 'zustand';

/**
 * UI Store (ENHANCED)
 *
 * Manages transient UI state with new additions:
 * - Command palette state
 * - Global loading with optional message
 * - Breadcrumbs navigation
 * - Search state
 *
 * Does NOT persist to localStorage (transient state only).
 */

interface Breadcrumb {
    label: string;
    href?: string;
}

interface UIState {
    // Sidebar state
    sidebarOpen: boolean;
    sidebarCollapsed: boolean;

    // Modal state
    activeModal: string | null;
    modalData: unknown | null;

    // NEW: Command palette state
    commandPaletteOpen: boolean;

    // NEW: Global loading state
    globalLoading: boolean;
    loadingMessage: string | null;

    // NEW: Breadcrumbs
    breadcrumbs: Breadcrumb[];

    // NEW: Search state
    searchQuery: string;
    searchFilters: Record<string, unknown>;

    // Sidebar actions
    toggleSidebar: () => void;
    setSidebarOpen: (open: boolean) => void;
    toggleSidebarCollapse: () => void;

    // Modal actions
    openModal: (modalId: string, data?: unknown) => void;
    closeModal: () => void;

    // NEW: Command palette actions
    setCommandPaletteOpen: (open: boolean) => void;
    toggleCommandPalette: () => void;

    // NEW: Global loading actions
    setGlobalLoading: (loading: boolean, message?: string) => void;

    // NEW: Breadcrumb actions
    setBreadcrumbs: (breadcrumbs: Breadcrumb[]) => void;
    addBreadcrumb: (breadcrumb: Breadcrumb) => void;
    clearBreadcrumbs: () => void;

    // NEW: Search actions
    setSearchQuery: (query: string) => void;
    setSearchFilters: (filters: Record<string, unknown>) => void;
    clearSearch: () => void;
}

export const useUIStore = create<UIState>((set) => ({
    // Initial state
    sidebarOpen: true,
    sidebarCollapsed: false,
    activeModal: null,
    modalData: null,
    commandPaletteOpen: false,
    globalLoading: false,
    loadingMessage: null,
    breadcrumbs: [],
    searchQuery: '',
    searchFilters: {},

    // Sidebar actions
    toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
                                                    setSidebarOpen: (open) => set({ sidebarOpen: open }),
                                                    toggleSidebarCollapse: () =>
                                                    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

                                                    // Modal actions
                                                    openModal: (modalId, data = null) =>
                                                    set({ activeModal: modalId, modalData: data }),
                                                    closeModal: () => set({ activeModal: null, modalData: null }),

                                                    // Command palette actions
                                                    setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
                                                    toggleCommandPalette: () =>
                                                    set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),

                                                    // Global loading actions
                                                    setGlobalLoading: (loading, message = null) =>
                                                    set({ globalLoading: loading, loadingMessage: message }),

                                                    // Breadcrumb actions
                                                    setBreadcrumbs: (breadcrumbs) => set({ breadcrumbs }),
                                                    addBreadcrumb: (breadcrumb) =>
                                                    set((state) => ({ breadcrumbs: [...state.breadcrumbs, breadcrumb] })),
                                                    clearBreadcrumbs: () => set({ breadcrumbs: [] }),

                                                    // Search actions
                                                    setSearchQuery: (query) => set({ searchQuery: query }),
                                                    setSearchFilters: (filters) => set({ searchFilters: filters }),
                                                    clearSearch: () => set({ searchQuery: '', searchFilters: {} }),
}));
