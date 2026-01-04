/**
 * Charts Module - Public API
 */

// Components
export {
    PerformanceChart,
    ActivityGraph,
    StudyHeatmap,
    MasteryChart,
} from "./components";

// Hooks
export { useChartsData } from "./hooks";

// State (UI-only)
export {
    useChartsStore,
    useActiveChart,
    useZoomLevel,
    useGranularity,
    useHoveredDataPoint,
    useSelectedDataPoint,
    useShowGrid,
    useShowLegend,
    useChartActions,
    type ChartType,
    type TimeGranularity,
} from "./state";
