/**
 * Suggestion Types — Advisory Intelligence Layer
 *
 * INVARIANT: Suggestions never change structure. Only the user does.
 * INVARIANT: Suggestions are advisory hints, not commands.
 *
 * Mental model: "I noticed something. Would you like to…?"
 */

// ============================================================================
// Suggestion Types
// ============================================================================

export type SuggestionType = 'START_THREAD' | 'CREATE_BRANCH';

export type SuggestionSource = 'semantic' | 'linguistic' | 'model';

/**
 * A suggestion signal — stateless, derivable, explainable.
 *
 * Signals are computed from conversation state and never persisted.
 * They exist only to advise the user of potential structural changes.
 */
export interface SuggestionSignal {
    /** What action is being suggested */
    type: SuggestionType;

    /**
     * Confidence score 0.0 – 1.0
     * Used for UI weighting, not logic decisions.
     */
    confidence: number;

    /** Human-readable explanation for why this is suggested */
    reason: string;

    /** How this suggestion was derived */
    source: SuggestionSource;

    /** The message this suggestion is anchored to */
    anchorMessageId: number;

    /** Optional: dismissed by user (ephemeral state) */
    dismissed?: boolean;
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createThreadSuggestion(
    anchorMessageId: number,
    confidence: number,
    reason: string = 'This question appears to diverge from the current topic.',
): SuggestionSignal {
    return {
        type: 'START_THREAD',
        confidence: Math.min(1, Math.max(0, confidence)),
        reason,
        source: 'semantic',
        anchorMessageId,
    };
}

export function createBranchSuggestion(
    anchorMessageId: number,
    confidence: number,
    reason: string = 'This sounds like a request for an alternative answer.',
): SuggestionSignal {
    return {
        type: 'CREATE_BRANCH',
        confidence: Math.min(1, Math.max(0, confidence)),
        reason,
        source: 'linguistic',
        anchorMessageId,
    };
}

// ============================================================================
// Type Guards
// ============================================================================

export function isThreadSuggestion(signal: SuggestionSignal): boolean {
    return signal.type === 'START_THREAD';
}

export function isBranchSuggestion(signal: SuggestionSignal): boolean {
    return signal.type === 'CREATE_BRANCH';
}
