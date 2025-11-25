import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Router } from './router';
import { Toaster } from '@/components/ui/toaster';

/**
 * App Component
 *
 * Root component with providers.
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
        <Router />
        <Toaster />
        </QueryClientProvider>
    );
}

export default App;
