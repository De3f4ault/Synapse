/**
 * Shared Async - Async State Type
 *
 * INVARIANT: All async operations conform to this state machine.
 * INVARIANT: UI components consume this, not raw loading/error/data booleans.
 *
 * This unifies LoadingState, ErrorState, EmptyState rendering.
 */

import type { AppError } from "../errors/AppError";

// ============================================================================
// Core Type
// ============================================================================

/**
 * Discriminated union for async operation states.
 * Use this instead of separate `isLoading`, `error`, `data` flags.
 */
export type AsyncState<T> =
    | { status: "idle" }
    | { status: "loading"; previousData?: T }
    | { status: "success"; data: T }
    | { status: "error"; error: AppError; previousData?: T };

// ============================================================================
// Factory Functions
// ============================================================================

export function idle<T>(): AsyncState<T> {
    return { status: "idle" };
}

export function loading<T>(previousData?: T): AsyncState<T> {
    return { status: "loading", previousData };
}

export function success<T>(data: T): AsyncState<T> {
    return { status: "success", data };
}

export function error<T>(err: AppError, previousData?: T): AsyncState<T> {
    return { status: "error", error: err, previousData };
}

// ============================================================================
// Type Guards
// ============================================================================

export function isIdle<T>(state: AsyncState<T>): state is { status: "idle" } {
    return state.status === "idle";
}

export function isLoading<T>(
    state: AsyncState<T>
): state is { status: "loading"; previousData?: T } {
    return state.status === "loading";
}

export function isSuccess<T>(
    state: AsyncState<T>
): state is { status: "success"; data: T } {
    return state.status === "success";
}

export function isError<T>(
    state: AsyncState<T>
): state is { status: "error"; error: AppError; previousData?: T } {
    return state.status === "error";
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Get data from state, falling back to previous data if loading/error.
 */
export function getData<T>(state: AsyncState<T>): T | undefined {
    switch (state.status) {
        case "success":
            return state.data;
        case "loading":
        case "error":
            return state.previousData;
        default:
            return undefined;
    }
}

/**
 * Map the data inside a successful state.
 */
export function mapData<T, U>(
    state: AsyncState<T>,
    fn: (data: T) => U
): AsyncState<U> {
    if (state.status === "success") {
        return success(fn(state.data));
    }
    if (state.status === "loading" && state.previousData !== undefined) {
        return loading(fn(state.previousData));
    }
    if (state.status === "error" && state.previousData !== undefined) {
        return error(state.error, fn(state.previousData));
    }
    return state as AsyncState<U>;
}

/**
 * Combine multiple async states.
 * Returns loading if any are loading, error if any are error, success if all success.
 */
export function combineStates<T extends readonly AsyncState<unknown>[]>(
    ...states: T
): AsyncState<{ [K in keyof T]: T[K] extends AsyncState<infer U> ? U : never }> {
    const hasError = states.find((s) => s.status === "error") as
        | { status: "error"; error: AppError }
        | undefined;
    if (hasError) {
        return error(hasError.error);
    }

    const hasLoading = states.some((s) => s.status === "loading");
    if (hasLoading) {
        return loading();
    }

    const hasIdle = states.some((s) => s.status === "idle");
    if (hasIdle) {
        return idle();
    }

    // All success
    const data = states.map((s) => (s as { data: unknown }).data) as {
        [K in keyof T]: T[K] extends AsyncState<infer U> ? U : never;
    };
    return success(data);
}
