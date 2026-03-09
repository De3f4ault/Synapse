/**
 * AuthGuard — Centralized Auth Failure Kill Switch
 *
 * Coordinates auth failure handling across all layers (HTTP queries, WebSocket,
 * error hooks). When any layer detects auth is dead (401/403/expired JWT), it
 * calls AuthGuard.handleAuthFailure(). The guard:
 *
 * 1. Debounces — only handles once via `isHandlingAuthFailure` flag
 * 2. Clears authStore — this cascades to WebSocketProvider's useEffect,
 *    which calls manager.disconnect() automatically (Zustand IS the event bus)
 * 3. Stops token refresh — clears any pending refresh timers
 * 4. Shows ONE "Session Expired" toast
 * 5. Redirects to /auth/login ONCE
 *
 * @see implementation_plan.md — Layer 1
 */

import { useAuthStore } from "@/stores/authStore";
import { toast } from "@/components/feedback";
import { getAuthToken } from "@/api/client";
import { stopTokenRefreshCycle } from "@/lib/tokenLifecycle";

let isHandlingAuthFailure = false;

export const AuthGuard = {
  /**
   * Handle an auth failure from any source. Only the first call triggers
   * teardown — subsequent calls are no-ops until reset().
   *
   * @param source - Identifier for debugging (e.g. 'react-query', 'websocket')
   */
  handleAuthFailure(source: string = "unknown") {
    // Prevent stampede — only handle once
    if (isHandlingAuthFailure) return;
    isHandlingAuthFailure = true;

    console.warn(`[AuthGuard] Auth failure detected from: ${source}`);

    // 1. Stop any pending token refresh timer
    stopTokenRefreshCycle();

    // 2. Clear auth state → triggers WebSocketProvider's useEffect
    //    → manager.disconnect() automatically
    const { clearAuth } = useAuthStore.getState();
    clearAuth();

    // 3. Show single toast
    toast.error("Session Expired", {
      description: "Please log in again to continue.",
    });

    // 4. Redirect (with small delay for toast visibility)
    setTimeout(() => {
      window.location.href = "/auth/login";
    }, 1500);
  },

  /**
   * Check if the current token is expired by decoding the JWT exp claim.
   * Zero network calls, O(1). Includes a 30-second buffer to prevent
   * edge cases where the token is valid when checked but expires during
   * the subsequent request.
   */
  isTokenExpired(): boolean {
    const token = getAuthToken();
    if (!token) return true;

    try {
      const payloadBase64 = token.split(".")[1];
      if (!payloadBase64) return true;

      const payload = JSON.parse(atob(payloadBase64));
      if (!payload.exp) return true;

      // 30-second buffer
      return payload.exp * 1000 < Date.now() + 30_000;
    } catch {
      return true; // Malformed token = treat as expired
    }
  },

  /**
   * Reset guard state. Called after successful login to allow
   * future auth failure handling.
   */
  reset() {
    isHandlingAuthFailure = false;
  },

  /**
   * Check if currently handling an auth failure (for testing/debugging).
   */
  get isActive(): boolean {
    return isHandlingAuthFailure;
  },
};
