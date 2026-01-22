/**
 * Suggestions Module - Index Exports
 */

// Types
export type { SuggestionSignal, SuggestionType, SuggestionSource } from './types';
export {
    createThreadSuggestion,
    createBranchSuggestion,
    isThreadSuggestion,
    isBranchSuggestion,
} from './types';

// Detection
export {
    cosineDistance,
    detectSemanticDrift,
    detectCounterfactual,
    isDriftSignificant,
    getCounterfactualConfidence,
    DRIFT_THRESHOLD_MILD,
    DRIFT_THRESHOLD_STRONG,
    COUNTERFACTUAL_PATTERNS,
} from './detection';

// Engine
export type { SuggestionContext, ChatMessageLike } from './suggestionEngine';
export {
    generateSuggestions,
    filterDismissed,
    deduplicateSuggestions,
} from './suggestionEngine';

// Components
export { SuggestionChip, SuggestionChipList } from './components/SuggestionChip';
