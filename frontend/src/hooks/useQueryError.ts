import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/components/feedback";

/**
 * useQueryError Hook
 *
 * Global error handler for TanStack Query errors.
 * Automatically shows user-friendly error messages and handles specific error codes.
 *
 * @param error - Error object from query/mutation (can be null/undefined)
 * @param options - Configuration options for error handling
 *
 * @example
 * const { data, error } = useQuery({ ... });
 * useQueryError(error, {
 *   title: 'Failed to load decks',
 *   showToast: true
 * });
 */

interface QueryErrorOptions {
  /** Custom title for error toast */
  title?: string;
  /** Custom description for error toast */
  description?: string;
  /** Whether to show toast notification (default: true) */
  showToast?: boolean;
  /** Whether to redirect on 401 (default: true) */
  redirectOnUnauthorized?: boolean;
  /** Custom error handler for specific error codes */
  onError?: (error: Error, statusCode?: number) => void;
}

interface ApiError extends Error {
  response?: {
    status: number;
    data?: {
      detail?: string;
      message?: string;
    };
  };
  status?: number;
  statusCode?: number;
}

export function useQueryError(
  error: Error | ApiError | null | undefined,
  options: QueryErrorOptions = {},
) {
  const navigate = useNavigate();

  const {
    title = "An error occurred",
    description,
    showToast = true,
    redirectOnUnauthorized = true,
    onError,
  } = options;

  useEffect(() => {
    if (!error) return;

    // Extract status code from various error formats
    const statusCode =
      (error as ApiError).response?.status ||
      (error as ApiError).status ||
      (error as ApiError).statusCode;

    // Get error message from various sources
    const errorMessage =
      description ||
      (error as ApiError).response?.data?.detail ||
      (error as ApiError).response?.data?.message ||
      error.message ||
      "Something went wrong";

    // Call custom error handler if provided
    onError?.(error, statusCode);

    // Handle specific error codes
    switch (statusCode) {
      case 401:
        // Unauthorized - session expired
        if (showToast) {
          toast.error("Session Expired", {
            description: "Please log in again to continue",
            action: redirectOnUnauthorized
              ? {
                  label: "Login",
                  onClick: () => navigate("/auth/login"),
                }
              : undefined,
          });
        }

        if (redirectOnUnauthorized) {
          // Delay redirect to show toast
          setTimeout(() => {
            navigate("/auth/login");
          }, 1500);
        }
        break;

      case 403:
        // Forbidden - access denied
        if (showToast) {
          toast.error("Access Denied", {
            description: "You do not have permission to perform this action",
          });
        }
        break;

      case 404:
        // Not Found - resource doesn't exist
        // Usually handled by empty state, so only show toast if explicitly requested
        if (showToast && (title !== "An error occurred" || description)) {
          toast.error(title, {
            description: errorMessage,
          });
        }
        break;

      case 422:
        // Validation Error
        if (showToast) {
          toast.error("Validation Error", {
            description: errorMessage,
          });
        }
        break;

      case 429:
        // Too Many Requests - rate limited
        if (showToast) {
          toast.warning("Too Many Requests", {
            description: "Please slow down and try again in a moment",
          });
        }
        break;

      case 500:
      case 502:
      case 503:
      case 504:
        // Server Errors
        if (showToast) {
          toast.error("Server Error", {
            description:
              "Something went wrong on our end. Please try again later",
            action: {
              label: "Retry",
              onClick: () => window.location.reload(),
            },
          });
        }
        break;

      default:
        // Generic error
        if (showToast) {
          toast.error(title, {
            description: errorMessage,
          });
        }
        break;
    }
  }, [
    error,
    title,
    description,
    showToast,
    redirectOnUnauthorized,
    navigate,
    onError,
  ]);
}

/**
 * useQueryErrorBoundary Hook
 *
 * Throws errors to be caught by Error Boundary instead of showing toasts.
 * Useful for critical errors that should stop rendering.
 *
 * @param error - Error object from query/mutation
 * @param options - Configuration options
 */
export function useQueryErrorBoundary(
  error: Error | null | undefined,
  options: { throwOn?: number[] } = {},
) {
  const { throwOn = [500, 502, 503, 504] } = options;

  useEffect(() => {
    if (!error) return;

    const statusCode =
      (error as ApiError).response?.status ||
      (error as ApiError).status ||
      (error as ApiError).statusCode;

    // Throw error if status code matches
    if (statusCode && throwOn.includes(statusCode)) {
      throw error;
    }
  }, [error, throwOn]);
}

/**
 * getErrorMessage
 *
 * Utility function to extract user-friendly error message from various error formats.
 */
export function getErrorMessage(error: Error | ApiError | unknown): string {
  if (!error) return "An unknown error occurred";

  if (error instanceof Error) {
    return (
      (error as ApiError).response?.data?.detail ||
      (error as ApiError).response?.data?.message ||
      error.message ||
      "An error occurred"
    );
  }

  if (typeof error === "string") {
    return error;
  }

  return "An unknown error occurred";
}
