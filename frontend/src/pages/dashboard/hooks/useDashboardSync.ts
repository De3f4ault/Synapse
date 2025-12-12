// useDashboardSync - Dashboard real-time sync using centralized WebSocket
import { useQueryClient } from '@tanstack/react-query';
import { useWebSocketEvent } from '@/api/websocket/hooks/useWebSocketEvent';

/**
 * Hook to sync dashboard data via WebSocket events
 *
 * Subscribes to all dashboard events and invalidates relevant queries.
 * Replaces the old useRealtimeSync hook which created its own WebSocket.
 *
 * Usage:
 * ```tsx
 * useDashboardSync(); // In DashboardPage component
 * ```
 */
export function useDashboardSync() {
    const queryClient = useQueryClient();

    // Subscribe to card reviewed events
    useWebSocketEvent('dashboard', 'card_reviewed', () => {
        console.log('[Dashboard Sync] Card reviewed - invalidating queries');
        queryClient.invalidateQueries({ queryKey: ['cards', 'due'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
    });

    // Subscribe to cards updated events
    useWebSocketEvent('dashboard', 'cards_updated', () => {
        console.log('[Dashboard Sync] Cards updated - invalidating queries');
        queryClient.invalidateQueries({ queryKey: ['cards', 'due'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
    });

    // Subscribe to review completed events
    useWebSocketEvent('dashboard', 'review_completed', () => {
        console.log('[Dashboard Sync] Review completed - invalidating queries');
        queryClient.invalidateQueries({ queryKey: ['cards', 'due'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
    });

    // Subscribe to note events
    useWebSocketEvent('dashboard', 'note_created', () => {
        console.log('[Dashboard Sync] Note created - invalidating queries');
        queryClient.invalidateQueries({ queryKey: ['notes'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
    });

    useWebSocketEvent('dashboard', 'note_updated', () => {
        console.log('[Dashboard Sync] Note updated - invalidating queries');
        queryClient.invalidateQueries({ queryKey: ['notes'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
    });

    useWebSocketEvent('dashboard', 'notes_updated', () => {
        console.log('[Dashboard Sync] Notes updated - invalidating queries');
        queryClient.invalidateQueries({ queryKey: ['notes'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
    });

    // Subscribe to quiz completed events
    useWebSocketEvent('dashboard', 'quiz_completed', () => {
        console.log('[Dashboard Sync] Quiz completed - invalidating queries');
        queryClient.invalidateQueries({ queryKey: ['quizzes'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
    });

    // Subscribe to study session events
    useWebSocketEvent('dashboard', 'study_session_completed', () => {
        console.log('[Dashboard Sync] Study session completed - invalidating queries');
        queryClient.invalidateQueries({ queryKey: ['study', 'sessions'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
        queryClient.invalidateQueries({ queryKey: ['analytics'] });
    });

    // Subscribe to stats updated events
    useWebSocketEvent('dashboard', 'stats_updated', () => {
        console.log('[Dashboard Sync] Stats updated - invalidating queries');
        queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
        queryClient.invalidateQueries({ queryKey: ['analytics'] });
    });

    // Subscribe to document uploaded events
    useWebSocketEvent('dashboard', 'document_uploaded', () => {
        console.log('[Dashboard Sync] Document uploaded - invalidating queries');
        queryClient.invalidateQueries({ queryKey: ['documents'] });
    });

    // Subscribe to connected event
    useWebSocketEvent('dashboard', 'connected', () => {
        console.log('[Dashboard Sync] WebSocket connected - refreshing all dashboard data');
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    });
}
