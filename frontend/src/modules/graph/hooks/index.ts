/**
 * Graph Hooks - Public API
 */

export {
    useRelatedNotes,
    useBacklinkCount,
    useHasConnections,
    useGraphNode,
    type RelatedNotesResult,
    type UseRelatedNotesOptions,
} from "./useRelatedNotes";

export {
    useWeakConcepts,
    useMasteredConcepts,
    useRecommendedNotes,
    useLearningProgress,
    type WeakConceptsResult,
    type MasteredConceptsResult,
    type RecommendedNotesResult,
    type LearningProgressResult,
    type ConceptStrength,
} from "./useLearning";

export {
    useSourceDocuments,
    useDocumentMentions,
    useDocumentsForWeakConcepts,
    useStudyMaterialsForToday,
    type SourceDocumentsResult,
    type DocumentMentionsResult,
    type StudyMaterialsResult,
} from "./useDocuments";

export {
    useDueConcepts,
    useOverdueNotes,
    useDailyStudyPlan,
    useForgettingCurve,
    useStudyStreak,
    useNextReviewTime,
    type DueItem,
    type DueConceptsResult,
    type DailyStudyPlanResult,
    type ForgettingCurveResult,
    type StudyStreakResult,
} from "./useSpacedRepetition";
