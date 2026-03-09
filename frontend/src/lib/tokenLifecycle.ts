/**
 * Token Lifecycle Manager — Proactive Token Refresh
 *
 * Manages the JWT token lifecycle by scheduling a refresh before the token
 * expires. Works with the existing `/auth/refresh` endpoint which REQUIRES
 * a valid token (can't refresh after expiry — this is why we refresh
 * proactively rather than reactively).
 *
 * Schedule: refreshes at min(5 min before expiry, 75% of lifetime).
 * On failure: logs warning; the next API call will trigger AuthGuard if
 * the token has truly expired.
 *
 * @see implementation_plan.md — Layer 3
 */

import { AuthenticationService } from "@/api/generated";
import { useAuthStore } from "@/stores/authStore";

let refreshTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Start a proactive token refresh cycle. Decodes the JWT to determine
 * expiry, then schedules a refresh before it dies.
 *
 * Called:
 * - After successful login
 * - After each successful token refresh (chains the cycle)
 * - On app mount with an existing valid token
 *
 * @param token - The current JWT access token
 */
export function startTokenRefreshCycle(token: string): void {
  // Clear any existing timer
  stopTokenRefreshCycle();

  try {
    const payloadBase64 = token.split(".")[1];
    if (!payloadBase64) {
      console.warn("[TokenLifecycle] Cannot decode token — no payload segment");
      return;
    }

    const payload = JSON.parse(atob(payloadBase64));
    if (!payload.exp || !payload.iat) {
      console.warn("[TokenLifecycle] Token missing exp or iat claim");
      return;
    }

    const expiresAt = payload.exp * 1000; // Convert to ms
    const issuedAt = payload.iat * 1000;
    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;
    const tokenLifetime = expiresAt - issuedAt;

    if (timeUntilExpiry <= 0) {
      console.warn("[TokenLifecycle] Token already expired, cannot schedule refresh");
      return;
    }

    // Refresh at the earlier of:
    // - 5 minutes before expiry
    // - 75% of remaining lifetime
    const fiveMinBuffer = 5 * 60 * 1000;
    const refreshDelay = Math.max(
      0,
      Math.min(
        timeUntilExpiry - fiveMinBuffer,   // 5 min before expiry
        tokenLifetime * 0.75               // or at 75% of total lifetime
      )
    );

    if (refreshDelay <= 0) {
      // Token expires too soon to schedule a refresh — try immediately
      console.warn("[TokenLifecycle] Token expires soon, attempting immediate refresh");
      performRefresh();
      return;
    }

    const refreshInMin = Math.round(refreshDelay / 1000 / 60 * 10) / 10;
    const expiresInMin = Math.round(timeUntilExpiry / 1000 / 60 * 10) / 10;
    console.log(
      `[TokenLifecycle] Refresh scheduled in ${refreshInMin}min (token expires in ${expiresInMin}min)`
    );

    refreshTimer = setTimeout(performRefresh, refreshDelay);
  } catch (error) {
    console.error("[TokenLifecycle] Failed to parse token for refresh scheduling:", error);
  }
}

/**
 * Stop any pending token refresh timer.
 * Called on logout and when AuthGuard handles auth failure.
 */
export function stopTokenRefreshCycle(): void {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
    console.log("[TokenLifecycle] Refresh timer cleared");
  }
}

/**
 * Perform the actual token refresh API call.
 * On success: updates authStore and starts the next cycle.
 * On failure: logs the error. The next API call will trigger AuthGuard
 * if the token is truly expired.
 */
async function performRefresh(): Promise<void> {
  try {
    console.log("[TokenLifecycle] Refreshing token...");

    const response = await AuthenticationService.refreshTokenApiV1AuthRefreshPost();
    const newToken = (response as any).data?.access_token || (response as any).access_token;

    if (!newToken) {
      console.error("[TokenLifecycle] Refresh response missing access_token:", response);
      return;
    }

    // Update auth store with new token
    const { setToken } = useAuthStore.getState();
    setToken(newToken);

    console.log("[TokenLifecycle] Token refreshed successfully");

    // Start the next refresh cycle
    startTokenRefreshCycle(newToken);
  } catch (error) {
    console.error("[TokenLifecycle] Token refresh failed:", error);
    // Don't panic — the next API call will trigger AuthGuard if token is dead.
    // This could be a transient network error; the token might still be valid.
  }
}
