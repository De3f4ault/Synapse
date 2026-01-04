/**
 * Viewer Store - State for document viewer
 *
 * Owns: HOW documents are viewed (zoom, page, theme, fullscreen)
 * Does NOT own: WHICH document is active (that's core)
 */

import { create } from "zustand";

export type ViewerTheme = "light" | "sepia" | "twilight" | "dark";

interface ViewerState {
    // View state
    isOpen: boolean;
    isFullscreen: boolean;
    showMetadata: boolean;
    theme: ViewerTheme;

    // PDF-specific state
    currentPage: number;
    totalPages: number;
    zoom: number;

    // Actions
    setIsOpen: (isOpen: boolean) => void;
    openViewer: () => void;
    closeViewer: () => void;
    setIsFullscreen: (isFullscreen: boolean) => void;
    toggleFullscreen: () => void;
    setShowMetadata: (show: boolean) => void;
    toggleMetadata: () => void;
    setTheme: (theme: ViewerTheme) => void;
    setCurrentPage: (page: number) => void;
    setTotalPages: (total: number) => void;
    setZoom: (zoom: number) => void;
    zoomIn: () => void;
    zoomOut: () => void;
    resetZoom: () => void;
    reset: () => void;
}

const DEFAULT_ZOOM = 1.0;
const ZOOM_STEP = 0.1;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3.0;

export const useViewerStore = create<ViewerState>((set) => ({
    // Initial state
    isOpen: false,
    isFullscreen: false,
    showMetadata: true,
    theme: (typeof window !== 'undefined'
        ? localStorage.getItem('viewer-theme') as ViewerTheme
        : 'dark') || 'dark',
    currentPage: 1,
    totalPages: 1,
    zoom: DEFAULT_ZOOM,

    // Open/close
    setIsOpen: (isOpen) => set({ isOpen }),
    openViewer: () => set({ isOpen: true }),
    closeViewer: () => set({
        isOpen: false,
        isFullscreen: false,
        currentPage: 1,
        totalPages: 1,
        zoom: DEFAULT_ZOOM,
    }),

    // Fullscreen
    setIsFullscreen: (isFullscreen) => set({ isFullscreen }),
    toggleFullscreen: () => set((state) => ({ isFullscreen: !state.isFullscreen })),

    // Metadata panel
    setShowMetadata: (showMetadata) => set({ showMetadata }),
    toggleMetadata: () => set((state) => ({ showMetadata: !state.showMetadata })),

    // Theme
    setTheme: (theme) => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('viewer-theme', theme);
        }
        set({ theme });
    },

    // Page navigation
    setCurrentPage: (currentPage) => set({ currentPage }),
    setTotalPages: (totalPages) => set({ totalPages }),

    // Zoom
    setZoom: (zoom) => set({ zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom)) }),
    zoomIn: () => set((state) => ({
        zoom: Math.min(MAX_ZOOM, state.zoom + ZOOM_STEP)
    })),
    zoomOut: () => set((state) => ({
        zoom: Math.max(MIN_ZOOM, state.zoom - ZOOM_STEP)
    })),
    resetZoom: () => set({ zoom: DEFAULT_ZOOM }),

    // Full reset
    reset: () => set({
        isOpen: false,
        isFullscreen: false,
        showMetadata: true,
        currentPage: 1,
        totalPages: 1,
        zoom: DEFAULT_ZOOM,
    }),
}));
