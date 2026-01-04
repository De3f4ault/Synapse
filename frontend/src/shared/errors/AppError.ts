/**
 * Shared Errors - App Error Type
 *
 * INVARIANT: All domain errors extend this base type.
 * INVARIANT: Modules own error SEMANTICS, shared owns ERROR UX.
 *
 * Domain modules define their own error codes.
 * This file defines how errors are structured and displayed.
 */

// ============================================================================
// Severity Levels
// ============================================================================

/**
 * Error severity affects how the error is displayed.
 */
export type ErrorSeverity = "info" | "warning" | "error" | "critical";

/**
 * How the error should be displayed to the user.
 */
export type ErrorDisplay = "toast" | "inline" | "banner" | "fullscreen" | "silent";

// ============================================================================
// App Error Type
// ============================================================================

/**
 * Base error type for all domain errors.
 * Domain modules extend this with their own error codes.
 */
export interface AppError {
    /** Domain-specific error code (e.g., "QUIZ_EXPIRED", "NOTE_NOT_FOUND") */
    readonly code: string;

    /** Human-readable message for developers/logs */
    readonly message: string;

    /** User-friendly message for display */
    readonly userMessage?: string;

    /** Severity level */
    readonly severity: ErrorSeverity;

    /** Recommended display method */
    readonly display: ErrorDisplay;

    /** Can the user retry the operation? */
    readonly recoverable: boolean;

    /** Optional retry action */
    readonly retryAction?: () => void | Promise<void>;

    /** Original error for debugging */
    readonly cause?: unknown;

    /** Timestamp when error occurred */
    readonly timestamp: string;

    /** Additional context */
    readonly context?: Record<string, unknown>;
}

// ============================================================================
// Factory Functions
// ============================================================================

export interface CreateErrorOptions {
    code: string;
    message: string;
    userMessage?: string;
    severity?: ErrorSeverity;
    display?: ErrorDisplay;
    recoverable?: boolean;
    retryAction?: () => void | Promise<void>;
    cause?: unknown;
    context?: Record<string, unknown>;
}

/**
 * Create an AppError with sensible defaults.
 */
export function createError(options: CreateErrorOptions): AppError {
    return {
        code: options.code,
        message: options.message,
        userMessage: options.userMessage ?? options.message,
        severity: options.severity ?? "error",
        display: options.display ?? "toast",
        recoverable: options.recoverable ?? true,
        retryAction: options.retryAction,
        cause: options.cause,
        timestamp: new Date().toISOString(),
        context: options.context,
    };
}

/**
 * Create a network error.
 */
export function networkError(
    message = "Network error. Please check your connection.",
    retryAction?: () => void | Promise<void>
): AppError {
    return createError({
        code: "NETWORK_ERROR",
        message,
        userMessage: message,
        severity: "error",
        display: "toast",
        recoverable: true,
        retryAction,
    });
}

/**
 * Create a not found error.
 */
export function notFoundError(entityType: string, id?: string | number): AppError {
    return createError({
        code: "NOT_FOUND",
        message: `${entityType} not found${id ? `: ${id}` : ""}`,
        userMessage: `The ${entityType.toLowerCase()} you're looking for doesn't exist.`,
        severity: "warning",
        display: "inline",
        recoverable: false,
    });
}

/**
 * Create an unauthorized error.
 */
export function unauthorizedError(message = "Please sign in to continue."): AppError {
    return createError({
        code: "UNAUTHORIZED",
        message,
        userMessage: message,
        severity: "warning",
        display: "banner",
        recoverable: true,
    });
}

/**
 * Create an unknown error (catch-all).
 */
export function unknownError(cause?: unknown): AppError {
    const message =
        cause instanceof Error ? cause.message : "An unexpected error occurred.";
    return createError({
        code: "UNKNOWN_ERROR",
        message,
        userMessage: "Something went wrong. Please try again.",
        severity: "error",
        display: "toast",
        recoverable: true,
        cause,
    });
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if a value is an AppError.
 */
export function isAppError(value: unknown): value is AppError {
    return (
        typeof value === "object" &&
        value !== null &&
        "code" in value &&
        "message" in value &&
        "severity" in value
    );
}

/**
 * Wrap any error as an AppError.
 */
export function asAppError(error: unknown): AppError {
    if (isAppError(error)) {
        return error;
    }
    return unknownError(error);
}
