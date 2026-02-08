/**
 * Rendering Schema - Public API
 */

export type {
    RenderBlock,
    MarkdownBlock,
    CodeBlock,
    LatexBlock,
    TableBlock,
    ExpandableBlock,
    CitationBlock,
    MermaidBlock,
    FlashcardSetBlock,
    FlashcardCardPreview,
    QuizBlock,
    QuizQuestionPreview,
    SourceRef,
    ArtifactBlock,
    ArtifactType,
} from './outputBlocks';

export {
    isMarkdownBlock,
    isCodeBlock,
    isLatexBlock,
    isTableBlock,
    isExpandableBlock,
    isCitationBlock,
    isMermaidBlock,
    isFlashcardSetBlock,
    isQuizBlock,
    isArtifactBlock,
    createMarkdownBlock,
    createCodeBlock,
    createLatexBlock,
    createTableBlock,
    createCitationBlock,
    createMermaidBlock,
    createFlashcardSetBlock,
    createQuizBlock,
    createArtifactBlock,
    nextSequenceId,
    resetSequenceId,
} from './outputBlocks';

