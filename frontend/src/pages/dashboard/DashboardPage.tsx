import { motion } from 'framer-motion';
import './styles/dashboard.css';
import './styles/graph.css';
import './styles/animations.css';
import { DashboardHeader } from './components/header/DashboardHeader';
import { DashboardContainer } from './components/main-area/DashboardContainer';
import { useDashboardData } from './hooks/useDashboardData';
import { useDashboardSync } from './hooks/useDashboardSync';
import { useWebSocket } from '@/api/websocket/hooks/useWebSocket';
import { LoadingState } from './components/shared/LoadingState';

/**
 * DashboardPage - Main orchestrator for the intelligent dashboard
 *
 * The Central Nervous System (CNS) of Synapse that:
 * - Monitors learning state across all modules
 * - Analyzes context and detects patterns
 * - Presents intelligent recommendations
 * - Shows relationships between all resources
 * - Adapts to user behavior in real-time
 *
 * UPDATED: Now uses centralized WebSocket infrastructure
 * - Removed old useRealtimeSync hook
 * - Added useDashboardSync hook (subscribes to dashboard events)
 * - Uses useWebSocket to get connection state
 */
export function DashboardPage() {
    // Fetch all dashboard data
    const { data, isLoading, error } = useDashboardData();

    // Enable real-time WebSocket sync via centralized manager
    useDashboardSync();

    // Get WebSocket connection state from context
    const { isConnected: wsConnected } = useWebSocket();

    // Loading state
    if (isLoading) {
        return (
            <div className="h-screen flex flex-col">
            <div className="h-16 border-b border-border bg-background" />
            <div className="flex-1 p-6">
            <LoadingState />
            </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="h-screen flex items-center justify-center">
            <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold text-destructive">
            Failed to load dashboard
            </h2>
            <p className="text-muted-foreground">
            {error instanceof Error ? error.message : 'Unknown error occurred'}
            </p>
            </div>
            </div>
        );
    }

    return (
        <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="h-screen flex flex-col bg-background"
        >
        {/* Header with search, notifications, quick actions */}
        <DashboardHeader wsConnected={wsConnected} />

        {/* Main three-column layout */}
        <DashboardContainer data={data} />
        </motion.div>
    );
}
