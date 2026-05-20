/**
 * AdminAuthGuard — Route protection for /admin/* routes.
 *
 * Requires both:
 *   1. isAuthenticated — user has a valid JWT
 *   2. user.is_admin   — user has admin privileges
 *
 * Redirects to /dashboard if authenticated but not admin.
 * Redirects to /auth/login if not authenticated.
 */
import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

export function AdminAuthGuard() {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  if (!user?.is_admin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
