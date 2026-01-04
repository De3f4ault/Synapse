/**
 * Shared Errors - Public API
 */

export {
    type ErrorSeverity,
    type ErrorDisplay,
    type AppError,
    type CreateErrorOptions,
    createError,
    networkError,
    notFoundError,
    unauthorizedError,
    unknownError,
    isAppError,
    asAppError,
} from "./AppError";
