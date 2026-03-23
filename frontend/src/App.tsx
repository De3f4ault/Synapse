import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Router } from "./router";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { WebSocketProvider } from "@/api/websocket/context/WebSocketProvider";
import { useNotificationEvents } from "@/hooks/useNotificationEvents";
import { AuthGuard } from "@/lib/authGuard";
import { startTokenRefreshCycle } from "@/lib/tokenLifecycle";
import { getAuthToken } from "@/api/client";

/**
 * App Component
 * Root application providers:
 * - React Query (with auth-aware retry logic)
 * - WebSocketProvider
 * - App Router
 * - Global Toaster
 */

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Extract status code from various error shapes
        const status =
          (error as any)?.status ||
          (error as any)?.response?.status ||
          (error as any)?.statusCode;

        // Auth failures are NOT retryable — fire the kill switch
        if (status === 401 || status === 403) {
          AuthGuard.handleAuthFailure("react-query");
          return false;
        }

        // Everything else: retry once
        return failureCount < 1;
      },
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
        <SonnerToaster theme="dark" richColors position="bottom-right" />
      </WebSocketProvider>
    </QueryClientProvider>
  );
}

/**
 * AppContent - Separated to use hooks inside WebSocketProvider context
 *
 * Initializes:
 * - Real-time notification listener
 * - Proactive token refresh cycle (if valid token exists)
 * - AuthGuard reset (for clean state after login redirect)
 */
function AppContent() {
  // Initialize real-time notification listener
  useNotificationEvents();

  // Initialize token refresh cycle on mount (handles page refresh with existing token)
  useEffect(() => {
    // Reset AuthGuard so it can handle future failures
    // (it may have been triggered before the login redirect that brought us here)
    AuthGuard.reset();

    const token = getAuthToken();
    if (token && !AuthGuard.isTokenExpired()) {
      startTokenRefreshCycle(token);
    }
  }, []);

  return <Router />;
}

export default App;
