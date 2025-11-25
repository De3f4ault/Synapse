// Analytics Module - Public API
// Only export through this barrel file to maintain module isolation

// Components
export { Dashboard } from './components/Dashboard';
export { HeatMap } from './components/HeatMap';
export { MasteryRadar } from './components/MasteryRadar';
export { PerformanceTrends } from './components/PerformanceTrends';
export { WeakAreasChart } from './components/WeakAreasChart';

// Hooks
export {
    useOverview,
    useWeakAreas,
    usePerformanceTrends,
    useHeatmap,
    useTopicMastery,
    useAnalyticsDashboard,
} from './hooks/useAnalytics';
