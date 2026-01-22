/**
 * Suggestion Engine — Composable, Stateless, Testable
 *
 * Generates suggestion signals from conversation context.
 * No side effects. No persistence. Just observation → signal.
 *
 * INVARIANT: Engine produces signals, never takes action.
 * INVARIANT: All signals are explainable and auditable.
 */

import type { SuggestionSignal } from './types';
import { createThreadSuggestion, createBranchSuggestion } from './types';
import {
    detectSemanticDrift,
    detectCounterfactual,
    getCounterfactualConfidence,
    DRIFT_THRESHOLD_STRONG,
} from './detection';

// ============================================================================
// Types
// ============================================================================

export interface ChatMessageLike {
    id: number;
    role: 'user' | 'assistant' | 'system';
    content: string;
    thread_id?: number | null;
}

export interface SuggestionContext {
    /** Current session ID */
    sessionId: number;

    /** Current thread ID (if in a thread) */
    threadId?: number;

    /** Message history (ordered oldest → newest) */
    messages: ChatMessageLike[];

    /** Embeddings for semantic analysis */
    embeddings?: {
        /** Embedding of conversation/thread root message */
        root?: number[];
        /** Embedding of latest user message */
        latest?: number[];
    };
}

// ============================================================================
// Core Engine
// ============================================================================

/**
 * Generate suggestions from conversation context.
 *
 * This is the main entry point for the suggestion system.
 * Call this after each message to get advisory signals.
 *
 * @param ctx - Current conversation context
 * @returns Array of suggestion signals (may be empty)
 */
export function generateSuggestions(ctx: SuggestionContext): SuggestionSignal[] {
    const suggestions: SuggestionSignal[] = [];

    // Don't suggest if we have very few messages
    if (ctx.messages.length < 2) {
        return suggestions;
    }

    // Find relevant messages
    const lastUser = findLastByRole(ctx.messages, 'user');
    const lastAssistant = findLastByRole(ctx.messages, 'assistant');

    // Strategy 1: Semantic Drift → Suggest Thread
    if (ctx.embeddings?.root && ctx.embeddings?.latest && lastUser) {
        const drift = detectSemanticDrift(
            ctx.embeddings.root,
            ctx.embeddings.latest
        );

        if (drift > DRIFT_THRESHOLD_STRONG) {
            suggestions.push(
                createThreadSuggestion(
                    lastUser.id,
                    Math.min(1, drift), // Cap at 1.0
                    generateDriftReason(drift)
                )
            );
        }
    }

    // Strategy 2: Counterfactual Language → Suggest Branch
    if (lastUser && lastAssistant && detectCounterfactual(lastUser.content)) {
        // Don't suggest branch if we're in a thread (mutual exclusivity)
        if (!ctx.threadId) {
            const confidence = getCounterfactualConfidence(lastUser.content);
            suggestions.push(
                createBranchSuggestion(
                    lastAssistant.id, // Anchor to assistant message
                    confidence,
                    'This sounds like a request for an alternative answer.'
                )
            );
        }
    }

    return suggestions;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Find the last message with a specific role.
 */
function findLastByRole(
    messages: ChatMessageLike[],
    role: 'user' | 'assistant' | 'system'
): ChatMessageLike | undefined {
    for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i];
        if (msg && msg.role === role) {
            return msg;
        }
    }
    return undefined;
}

/**
 * Generate a human-readable reason for drift-based thread suggestion.
 */
function generateDriftReason(drift: number): string {
    if (drift > 0.6) {
        return 'This question is quite different from what we were discussing. Starting a thread would help keep topics organized.';
    }
    if (drift > 0.5) {
        return 'This seems to be a new topic. Would you like to start a focused thread?';
    }
    return 'This question appears to diverge from the current topic. A thread might help.';
}

// ============================================================================
// Filtering & Deduplication
// ============================================================================

/**
 * Filter suggestions based on dismissal state.
 */
export function filterDismissed(
    suggestions: SuggestionSignal[],
    dismissedIds: Set<number>
): SuggestionSignal[] {
    return suggestions.filter((s) => !dismissedIds.has(s.anchorMessageId));
}

/**
 * Get the highest-confidence suggestion of each type.
 */
export function deduplicateSuggestions(
    suggestions: SuggestionSignal[]
): SuggestionSignal[] {
    const best = new Map<string, SuggestionSignal>();

    for (const s of suggestions) {
        const existing = best.get(s.type);
        if (!existing || s.confidence > existing.confidence) {
            best.set(s.type, s);
        }
    }

    return Array.from(best.values());
}
