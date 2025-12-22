import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Router } from "./router";
import { Toaster } from "@/components/ui/toaster";
import { WebSocketProvider } from "@/api/websocket/context/WebSocketProvider";

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
        <Router />
        <Toaster />
      </WebSocketProvider>
    </QueryClientProvider>
  );
}

export default App;
