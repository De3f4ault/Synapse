import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Router } from './router';
import { Toaster } from '@/components/ui/toaster';
import { WebSocketProvider } from '@/api/websocket/context/WebSocketProvider';

/**
 * App Component
 *
 * Root component with providers.
 *
 * UPDATED: Added WebSocketProvider to wrap entire app
 */

// Create QueryClient instance
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
            refetchOnWindowFocus: false,
            staleTime: 5 * 60 * 1000, // 5 minutes
        },
    },
});

function App() {
    return (
        <QueryClientProvider client={queryClient}>
        <WebSocketProvider>
        <Router />
        <Toaster />
        </WebSocketProvider>
        </QueryClientProvider>
    );
}

export default App;
