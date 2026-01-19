import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Router } from "./router";
import { Toaster } from "@/components/ui/toaster";
import { WebSocketProvider } from "@/api/websocket/context/WebSocketProvider";
import { useNotificationEvents } from "@/hooks/useNotificationEvents";

/**
 * App Component
 * Root application providers:
 * - React Query
 * - WebSocketProvider
 * - App Router
 * - Global Toaster
 */

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WebSocketProvider>
        <AppContent />
        <Toaster />
      </WebSocketProvider>
    </QueryClientProvider>
  );
}

/**
 * AppContent - Separated to use hooks inside WebSocketProvider context
 */
function AppContent() {
  // Initialize real-time notification listener
  useNotificationEvents();

  return <Router />;
}

export default App;
