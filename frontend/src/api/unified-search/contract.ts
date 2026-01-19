/**
 * Consumer-Side Contract Assertions
 * 
 * TWO-LAYER ARCHITECTURE:
 * 1. Structural Validation - Throws for malformed data (rare, at API boundary)
 * 2. Consumer Eligibility - Pure predicates for filtering (common, in UI)
 * 
 * This prevents "assertion abuse" where expected filtering is logged as errors.
 */

import type { UnifiedSearchResult, SearchSurface, SearchRole } from './types';

// =============================================================================
// CONSUMER ROLE MATRIX (Data-Driven Policy)
// =============================================================================
// This is the single source of truth for which roles each consumer accepts.
// Policy changes happen here, not scattered through code.

export type Consumer = 'chat' | 'dashboard' | 'cmdk';

export const CONSUMER_ROLE_MATRIX: Record<Consumer, SearchRole[]> = {
    chat: ['evidence'],                    // Chat = RAG grounding only
    dashboard: ['diagnostic', 'suggestion'], // Dashboard = intelligence/weak areas
    cmdk: ['navigation', 'diagnostic'],    // CMD+K = navigation + quick diagnostics
};

// =============================================================================
// LAYER 1: STRUCTURAL VALIDATION (Throwing, Rare)
// =============================================================================
// Use ONLY at API boundaries or in tests. Never in UI filters.

/**
 * Contract violations for malformed/invalid data.
 * Should ONLY be thrown for true schema violations.
 */
export class ContractViolationError extends Error {
    constructor(
        public surface: SearchSurface,
        public violation: string,
        public result?: UnifiedSearchResult
    ) {
        super(`[${surface}] Contract violation: ${violation}`);
        this.name = 'ContractViolationError';
    }
}

/**
 * Validates that a result is structurally valid.
 * Call this once per result batch at API boundary, not in filters.
 */
export function validateUnifiedResult(result: UnifiedSearchResult): void {
    // Must have an id
    if (!result.id || !result.id.id) {
        throw new ContractViolationError(
            'validation',
            'Result missing required id.item_id',
            result
        );
    }

    // Must have a role
    if (!result.role) {
        throw new ContractViolationError(
            'validation',
            'Result missing required role',
            result
        );
    }

    // Must have assertion_type
    if (!result.assertion_type) {
        throw new ContractViolationError(
            'validation',
            'Result missing required assertion_type',
            result
        );
    }

    // Evidence MUST link to source
    if (result.role === 'evidence' && !result.id.parent_id && !result.id.root_id) {
        throw new ContractViolationError(
            'validation',
            'Evidence result must have parent_id or root_id',
            result
        );
    }
}

// =============================================================================
// LAYER 2: CONSUMER ELIGIBILITY (Pure Predicates, Common)
// =============================================================================
// Use these for filtering. They are silent, pure, and declarative.

/**
 * Pure predicate: Is this result consumable by CMD+K?
 */
export function isCmdKConsumable(result: UnifiedSearchResult): boolean {
    return CONSUMER_ROLE_MATRIX.cmdk.includes(result.role);
}

/**
 * Pure predicate: Is this result consumable by Dashboard?
 */
export function isDashboardConsumable(result: UnifiedSearchResult): boolean {
    return CONSUMER_ROLE_MATRIX.dashboard.includes(result.role);
}

/**
 * Pure predicate: Is this result consumable by Chat?
 */
export function isChatConsumable(result: UnifiedSearchResult): boolean {
    return CONSUMER_ROLE_MATRIX.chat.includes(result.role);
}

/**
 * Generic: Is this result consumable by a given consumer?
 */
export function isConsumable(result: UnifiedSearchResult, consumer: Consumer): boolean {
    return CONSUMER_ROLE_MATRIX[consumer].includes(result.role);
}

// =============================================================================
// FILTER FUNCTIONS (Pure, Silent)
// =============================================================================

/**
 * Filter results for CMD+K.
 * Pure filter - no throwing, no logging for expected non-matches.
 */
export function filterForCmdK(results: UnifiedSearchResult[]): UnifiedSearchResult[] {
    return results.filter(isCmdKConsumable);
}

/**
 * Filter results for Dashboard.
 * Pure filter - no throwing, no logging for expected non-matches.
 */
export function filterForDashboard(results: UnifiedSearchResult[]): UnifiedSearchResult[] {
    return results.filter(isDashboardConsumable);
}

/**
 * Filter results for Chat.
 * Pure filter - no throwing, no logging for expected non-matches.
 */
export function filterForChat(results: UnifiedSearchResult[]): UnifiedSearchResult[] {
    return results.filter(isChatConsumable);
}

/**
 * Generic filter for any consumer.
 */
export function filterForConsumer(
    results: UnifiedSearchResult[],
    consumer: Consumer
): UnifiedSearchResult[] {
    return results.filter((r) => isConsumable(r, consumer));
}

// =============================================================================
// LEGACY ASSERTIONS (Dev/Test Only)
// =============================================================================
// These are kept for backwards compatibility but should only be used in tests
// or development-only validation paths.

/**
 * @deprecated Use isCmdKConsumable + filterForCmdK instead
 * Kept for test assertions only.
 */
export function assertCmdKResult(result: UnifiedSearchResult): void {
    if (!isCmdKConsumable(result)) {
        throw new ContractViolationError(
            'cmdk',
            `CMD+K cannot consume role: ${result.role}`,
            result
        );
    }
}

/**
 * @deprecated Use isDashboardConsumable + filterForDashboard instead
 * Kept for test assertions only.
 */
export function assertDashboardResult(result: UnifiedSearchResult): void {
    if (!isDashboardConsumable(result)) {
        throw new ContractViolationError(
            'dashboard',
            `Dashboard cannot consume role: ${result.role}`,
            result
        );
    }
}

/**
 * @deprecated Use isChatConsumable + filterForChat instead
 * Kept for test assertions only.
 */
export function assertChatResult(result: UnifiedSearchResult): void {
    if (!isChatConsumable(result)) {
        throw new ContractViolationError(
            'chat',
            `Chat cannot consume role: ${result.role}`,
            result
        );
    }
}

