/**
 * Flashcards Module - Public API
 * 
 * This is the ONLY allowed import path for flashcards functionality.
 * Deep imports are BANNED per FLASHCARDS_ARCHITECTURE.md.
 * 
 * @example
 * // ✅ Correct
 * import { useDecks, DeckGrid, useStudySession } from '@/pages/flashcards';
 * 
 * // ❌ Banned
 * import { studyStore } from '@/pages/flashcards/study/state/studyStore';
 */

// Core - Types, SM-2 Engine, State
export {
    // Types
    type Deck,
    type Flashcard,
    type LearningState,
    type ReviewRating,
    type ReviewQuality,
    type ReviewProgress,
    type ReviewSubmission,
    type StudySessionState,
    type StudySessionStats,
    type DeckCreateInput,
    type DeckUpdateInput,
    type FlashcardCreateInput,
    type FlashcardUpdateInput,
    type DeckStats,
    type SM2Parameters,
    type SM2Result,
    type DeckSortBy,
    type SortOrder,
    type DeckFilters,
    type CardSortBy,
    type CardFilters,
    // Constants
    RATING_TO_QUALITY,
    QUALITY_TO_RATING,
    RATING_TO_API_QUALITY,
    // Engine
    calculateNextReview,
    getDefaultSM2Parameters,
    extractSM2Parameters,
    calculatePriorityScore,
    sortByPriority,
    determineNewLearningState,
    // State
    useFlashcardStore,
    selectActiveDeckId,
    selectError,
    selectHasActiveDeck,
    // Hooks
    useActiveDeck,
} from './core';

// List - Deck discovery and management
export {
    // Components
    DeckCard,
    DeckGrid,
    DeckTable,
    // Hooks
    useDecks,
    useDeck,
    useCreateDeck,
    useUpdateDeck,
    useDeleteDeck,
    // State
    useDeckListStore,
    selectViewMode,
    selectSortBy,
    selectSortOrder,
    selectSearchQuery,
    selectListError,
    type ViewMode,
} from './list';

// Study - Review session
export {
    // Components
    FlashcardView,
    RatingControls,
    AnswerReveal,
    // Hooks
    useStudySession,
    useStudyShortcuts,
    // State
    useStudyStore,
    selectCurrentCard,
    selectIsFlipped,
    selectProgress,
    selectStudyError,
    selectIsSessionActive,
} from './study';

// Create - Deck/card creation and AI generation
export {
    // Components
    DeckCreator,
    FlashcardEditor,
    // Hooks
    useFlashcardGenerator,
    // Engine
    generateFlashcardsFromTopic,
    validateGeneratorRequest,
    DEFAULT_NUM_CARDS,
    DEFAULT_DIFFICULTY,
    MIN_CARDS,
    MAX_CARDS,
    type GeneratorRequest,
    type GeneratorResponse,
    type GeneratorError,
    type GeneratorDifficulty,
} from './create';

// Shared - Module-specific UI components
export { DarkCard, EmptyState } from './shared';

// Page Components (routing)
export { FlashcardsPage } from './FlashcardsPage';
export { DeckDetailPage } from './DeckDetailPage';
export { ReviewPage } from './ReviewPage';
export { CreateDeckPage } from './CreateDeckPage';
export { CreateCardPage } from './CreateCardPage';
export { EditCardPage } from './EditCardPage';
