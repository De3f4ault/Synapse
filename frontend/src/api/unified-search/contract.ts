/**
 * Consumer-Side Contract Assertions
 * 
 * Enforces that consumers receive results matching their expected contract.
 * This prevents silent regressions and documents intent in code.
 */

import type { UnifiedSearchResult, SearchSurface } from './types';

/**
 * Contract violations that consumers should never see.
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
 * Asserts that a result is valid for CMD+K consumption.
 * 
 * CMD+K Rules:
 * - Must be 'navigation' or 'diagnostic' role
 * - Must NOT be 'evidence' (that's for Chat/RAG)
 * - If 'navigation', must be 'factual' assertion type
 */
export function assertCmdKResult(result: UnifiedSearchResult): void {
    // CMD+K must never receive evidence results
    if (result.role === 'evidence') {
        throw new ContractViolationError(
            'cmdk',
            'CMD+K must never receive evidence results',
            result
        );
    }

    // Navigation results must be factual
    if (result.role === 'navigation' && result.assertion_type !== 'factual') {
        console.warn(
            `[cmdk] Navigation result with non-factual assertion: ${result.assertion_type}`,
            result
        );
    }
}

/**
 * Asserts that a result is valid for Dashboard consumption.
 * 
 * Dashboard Rules (STRICT):
 * - MUST be 'diagnostic' role
 * - MUST be 'heuristic' assertion type
 * - MUST come from 'graph' source
 * - Must NOT be 'navigation' or 'evidence'
 * 
 * Dashboard is read-only intelligence. It does not navigate or ground.
 */
export function assertDashboardResult(result: UnifiedSearchResult): void {
    // Dashboard only accepts diagnostic role
    if (result.role !== 'diagnostic') {
        throw new ContractViolationError(
            'dashboard',
            `Dashboard only accepts diagnostic role, got: ${result.role}`,
            result
        );
    }

    // Dashboard only accepts heuristic assertions (computed/inferred, not facts)
    if (result.assertion_type !== 'heuristic') {
        throw new ContractViolationError(
            'dashboard',
            `Dashboard only accepts heuristic assertions, got: ${result.assertion_type}`,
            result
        );
    }

    // Dashboard should only receive graph signals
    if (result.source !== 'graph') {
        console.warn(
            `[dashboard] Expected source=graph, got: ${result.source}`,
            result
        );
    }
}

/**
 * Asserts that a result is valid for Chat consumption.
 * 
 * Chat Rules (STRICTEST):
 * - MUST be 'evidence' role ONLY (for RAG grounding)
 * - MUST be 'inferential' assertion type (retrieved, not authored)
 * - MUST have parent_id or root_id (link to source document)
 * - Must NOT be 'navigation' (that's for CMD+K)
 * - Must NOT be 'diagnostic' (that's for Dashboard)
 * - Must NOT be 'suggestion'
 * 
 * This protects the LLM from contamination.
 * The LLM reasons about evidence credibility, not ranking.
 */
export function assertChatResult(result: UnifiedSearchResult): void {
    // Chat may ONLY consume evidence
    if (result.role !== 'evidence') {
        throw new ContractViolationError(
            'chat',
            `Chat may only consume evidence results, got: ${result.role}`,
            result
        );
    }

    // Chat evidence must be inferential (retrieved, not user-authored facts)
    if (result.assertion_type !== 'inferential') {
        throw new ContractViolationError(
            'chat',
            `Chat evidence must be inferential, got: ${result.assertion_type}`,
            result
        );
    }

    // Evidence MUST link to a source document
    if (!result.id.parent_id && !result.id.root_id) {
        throw new ContractViolationError(
            'chat',
            'Evidence must link to a document (missing parent_id and root_id)',
            result
        );
    }

    // Evidence should come from RAG
    if (result.source !== 'rag') {
        console.warn(
            `[chat] Expected source=rag for evidence, got: ${result.source}`,
            result
        );
    }
}

/**
 * Filter results for CMD+K with contract enforcement.
 * Returns only results that are valid for navigation.
 */
export function filterForCmdK(
    results: UnifiedSearchResult[]
): UnifiedSearchResult[] {
    return results.filter((r) => {
        try {
            assertCmdKResult(r);
            // CMD+K shows navigation (factual) and diagnostic (weak areas)
            return (
                (r.role === 'navigation' && r.assertion_type === 'factual') ||
                r.role === 'diagnostic'
            );
        } catch (e) {
            console.error(e);
            return false;
        }
    });
}

/**
 * Filter results for Dashboard with contract enforcement.
 */
export function filterForDashboard(
    results: UnifiedSearchResult[]
): UnifiedSearchResult[] {
    return results.filter((r) => {
        try {
            assertDashboardResult(r);
            return r.role === 'diagnostic' || r.role === 'suggestion';
        } catch (e) {
            console.error(e);
            return false;
        }
    });
}

/**
 * Filter results for Chat with contract enforcement.
 */
export function filterForChat(
    results: UnifiedSearchResult[]
): UnifiedSearchResult[] {
    return results.filter((r) => {
        try {
            assertChatResult(r);
            return r.role === 'evidence';
        } catch (e) {
            console.error(e);
            return false;
        }
    });
}
