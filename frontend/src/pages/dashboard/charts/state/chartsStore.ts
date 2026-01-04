/**
 * Charts Store - Visualization state (UI-only)
 * 
 * IMPORTANT: Store holds UI state only per calibration.
 * - zoom level
 * - selected data point
 * - hovered series
 * - layout mode
 * 
 * Store does NOT cache data - all data flows through React Query.
 */

import { create } from "zustand";

// ============================================================
// Types
// ============================================================

export type ChartType = "performance" | "activity" | "heatmap";
export type TimeGranularity = "day" | "week" | "month";

interface ChartUIState {
    // Selected chart for focus mode
    activeChart: ChartType | null;

    // Zoom/pan state
    zoomLevel: number; // 1.0 = default
    panOffset: { x: number; y: number };

    // Interaction state
    hoveredDataPoint: { chartId: string; dataKey: string; value: unknown } | null;
    selectedDataPoint: { chartId: string; dataKey: string; value: unknown } | null;

    // Time granularity
    granularity: TimeGranularity;

    // Layout
    showLegend: boolean;
    showGrid: boolean;
}

interface ChartUIActions {
    // Chart selection
    setActiveChart: (chart: ChartType | null) => void;

    // Zoom/pan
    setZoomLevel: (level: number) => void;
    resetZoom: () => void;
    setPanOffset: (offset: { x: number; y: number }) => void;

    // Interaction
    setHoveredDataPoint: (point: ChartUIState["hoveredDataPoint"]) => void;
    setSelectedDataPoint: (point: ChartUIState["selectedDataPoint"]) => void;
    clearSelection: () => void;

    // Granularity
    setGranularity: (granularity: TimeGranularity) => void;

    // Layout
    toggleLegend: () => void;
    toggleGrid: () => void;

    // Reset
    reset: () => void;
}

// ============================================================
// Initial State
// ============================================================

const initialState: ChartUIState = {
    activeChart: null,
    zoomLevel: 1.0,
    panOffset: { x: 0, y: 0 },
    hoveredDataPoint: null,
    selectedDataPoint: null,
    granularity: "day",
    showLegend: true,
    showGrid: true,
};

// ============================================================
// Store
// ============================================================

export const useChartsStore = create<ChartUIState & ChartUIActions>((set) => ({
    ...initialState,

    // Chart selection
    setActiveChart: (chart) => set({ activeChart: chart }),

    // Zoom/pan
    setZoomLevel: (level) => set({ zoomLevel: Math.max(0.5, Math.min(3, level)) }),
    resetZoom: () => set({ zoomLevel: 1.0, panOffset: { x: 0, y: 0 } }),
    setPanOffset: (offset) => set({ panOffset: offset }),

    // Interaction
    setHoveredDataPoint: (point) => set({ hoveredDataPoint: point }),
    setSelectedDataPoint: (point) => set({ selectedDataPoint: point }),
    clearSelection: () => set({ hoveredDataPoint: null, selectedDataPoint: null }),

    // Granularity
    setGranularity: (granularity) => set({ granularity }),

    // Layout
    toggleLegend: () => set((s) => ({ showLegend: !s.showLegend })),
    toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),

    // Reset
    reset: () => set(initialState),
}));

// ============================================================
// Selectors
// ============================================================

export const useActiveChart = () => useChartsStore((s) => s.activeChart);
export const useZoomLevel = () => useChartsStore((s) => s.zoomLevel);
export const useGranularity = () => useChartsStore((s) => s.granularity);
export const useHoveredDataPoint = () => useChartsStore((s) => s.hoveredDataPoint);
export const useSelectedDataPoint = () => useChartsStore((s) => s.selectedDataPoint);
export const useShowGrid = () => useChartsStore((s) => s.showGrid);
export const useShowLegend = () => useChartsStore((s) => s.showLegend);

// Actions - Use getState() to avoid subscription overhead for actions
export const useChartActions = () => {
    const s = useChartsStore.getState();
    return {
        setActiveChart: s.setActiveChart,
        setZoomLevel: s.setZoomLevel,
        resetZoom: s.resetZoom,
        setHoveredDataPoint: s.setHoveredDataPoint,
        setSelectedDataPoint: s.setSelectedDataPoint,
        clearSelection: s.clearSelection,
        setGranularity: s.setGranularity,
        toggleLegend: s.toggleLegend,
        toggleGrid: s.toggleGrid,
        reset: s.reset,
    };
};
