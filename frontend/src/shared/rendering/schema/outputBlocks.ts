/**
 * RenderBlock Schema - Output Rendering Contract
 *
 * INVARIANT: Parsing is separate from rendering.
 * Engine produces RenderBlock[], renderers consume them.
 *
 * INVARIANT: sequenceId is monotonic per message.
 * Used for streaming alignment, search navigation, and reconciliation.
 *
 * INVARIANT: Blocks are immutable once committed.
 * Renderers MUST NOT modify blocks.
 *
 * INVARIANT: Renderers understand structure, not meaning.
 * Chat understands meaning (citations, trust, context).
 */

// ==================== SOURCE REFERENCE ====================

export interface SourceRef {
    title: string;
    url?: string;
    snippet?: string;
    relevanceScore?: number;
}

// ==================== RENDER BLOCKS ====================

export interface MarkdownBlock {
    type: 'markdown';
    content: string;
    sequenceId?: number;
}

export interface CodeBlock {
    type: 'code';
    language: string;
    content: string;
    filename?: string;
    sequenceId?: number;
}

export interface LatexBlock {
    type: 'latex';
    content: string;
    inline?: boolean;
    sequenceId?: number;
}

export interface TableBlock {
    type: 'table';
    headers?: string[];
    rows: string[][];
    sequenceId?: number;
}

export interface ExpandableBlock {
    type: 'expandable';
    title: string;
    blocks: RenderBlock[];
    defaultExpanded?: boolean;
    sequenceId?: number;
}

export interface CitationBlock {
    type: 'citation';
    sources: SourceRef[];
    sequenceId?: number;
}

export interface MermaidBlock {
    type: 'mermaid';
    content: string;
    sequenceId?: number;
}

// ==================== ARTIFACT BLOCKS ====================
// INVARIANT: Artifacts are elevated code blocks (>15 lines or React/HTML).
// INVARIANT: Frontend-only MVP - backend persistence in Phase 1B.

/**
 * Artifact type classification.
 * Phase 1: code only. Phase 2+: react, html, mermaid, markdown.
 */
export type ArtifactType = 
    | 'application/vnd.ant.code'
    | 'application/vnd.ant.react'
    | 'text/html'
    | 'text/markdown'
    | 'image/svg+xml'
    | 'application/vnd.ant.mermaid';

/**
 * Artifact block for substantial structured outputs.
 * Renders as an interactive card with preview, download, copy.
 */
export interface ArtifactBlock {
    type: 'artifact';
    artifactId: string;
    artifactType: ArtifactType;
    title: string;
    content: string;
    language?: string;
    filename?: string;
    sequenceId?: number;
}

// ==================== STUDY BLOCKS ====================
// INVARIANT: These are preview-only. No SM-2 state mutation.
// INVARIANT: Saving to deck/quiz is explicit and user-initiated.

/**
 * Inline flashcard card (preview-only).
 */
export interface FlashcardCardPreview {
    front: string;
    back: string;
    tags?: string[];
}

/**
 * Inline flashcard set block for chat preview.
 * Does NOT mutate learning state.
 */
export interface FlashcardSetBlock {
    type: 'flashcard_set';
    title: string;
    cards: FlashcardCardPreview[];
    sequenceId?: number;
}

/**
 * Inline quiz question (preview-only).
 */
export interface QuizQuestionPreview {
    id: string;
    type: 'multiple_choice' | 'true_false' | 'short_answer';
    prompt: string;
    options?: string[];
    correctIndex?: number;
    correctAnswer?: string;
    explanation?: string;
    points?: number;
}

/**
 * Inline quiz block for chat preview.
 * Does NOT persist attempts.
 */
export interface QuizBlock {
    type: 'quiz';
    title: string;
    difficulty?: 'easy' | 'medium' | 'hard';
    questions: QuizQuestionPreview[];
    sequenceId?: number;
}

// ==================== UNION TYPE ====================

export type RenderBlock =
    | MarkdownBlock
    | CodeBlock
    | LatexBlock
    | TableBlock
    | ExpandableBlock
    | CitationBlock
    | MermaidBlock
    | FlashcardSetBlock
    | QuizBlock
    | ArtifactBlock;

// ==================== TYPE GUARDS ====================

export function isMarkdownBlock(block: RenderBlock): block is MarkdownBlock {
    return block.type === 'markdown';
}

export function isCodeBlock(block: RenderBlock): block is CodeBlock {
    return block.type === 'code';
}

export function isLatexBlock(block: RenderBlock): block is LatexBlock {
    return block.type === 'latex';
}

export function isTableBlock(block: RenderBlock): block is TableBlock {
    return block.type === 'table';
}

export function isExpandableBlock(block: RenderBlock): block is ExpandableBlock {
    return block.type === 'expandable';
}

export function isCitationBlock(block: RenderBlock): block is CitationBlock {
    return block.type === 'citation';
}

export function isMermaidBlock(block: RenderBlock): block is MermaidBlock {
    return block.type === 'mermaid';
}

export function isFlashcardSetBlock(block: RenderBlock): block is FlashcardSetBlock {
    return block.type === 'flashcard_set';
}

export function isQuizBlock(block: RenderBlock): block is QuizBlock {
    return block.type === 'quiz';
}

export function isArtifactBlock(block: RenderBlock): block is ArtifactBlock {
    return block.type === 'artifact';
}

// ==================== FACTORY FUNCTIONS ====================

let globalSequenceId = 0;

export function nextSequenceId(): number {
    return ++globalSequenceId;
}

export function resetSequenceId(): void {
    globalSequenceId = 0;
}

export function createMarkdownBlock(content: string): MarkdownBlock {
    return { type: 'markdown', content, sequenceId: nextSequenceId() };
}

export function createCodeBlock(content: string, language: string = 'text', filename?: string): CodeBlock {
    return { type: 'code', language, content, filename, sequenceId: nextSequenceId() };
}

export function createLatexBlock(content: string, inline: boolean = false): LatexBlock {
    return { type: 'latex', content, inline, sequenceId: nextSequenceId() };
}

export function createTableBlock(rows: string[][], headers?: string[]): TableBlock {
    return { type: 'table', rows, headers, sequenceId: nextSequenceId() };
}

export function createCitationBlock(sources: SourceRef[]): CitationBlock {
    return { type: 'citation', sources, sequenceId: nextSequenceId() };
}

export function createMermaidBlock(content: string): MermaidBlock {
    return { type: 'mermaid', content, sequenceId: nextSequenceId() };
}

export function createFlashcardSetBlock(
    title: string,
    cards: FlashcardCardPreview[]
): FlashcardSetBlock {
    return { type: 'flashcard_set', title, cards, sequenceId: nextSequenceId() };
}

export function createQuizBlock(
    title: string,
    questions: QuizQuestionPreview[],
    difficulty?: 'easy' | 'medium' | 'hard'
): QuizBlock {
    return { type: 'quiz', title, questions, difficulty, sequenceId: nextSequenceId() };
}

/**
 * Generate unique artifact ID from title and type.
 */
function generateArtifactSlug(title: string, type: ArtifactType): string {
    const prefix = type.split('/').pop()?.replace('vnd.ant.', '') || 'artifact';
    const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 50);
    const id = Math.random().toString(36).substring(2, 8);
    return `${prefix}-${slug || 'untitled'}-${id}`;
}

export function createArtifactBlock(
    content: string,
    language: string,
    title?: string,
    artifactType?: ArtifactType
): ArtifactBlock {
    const type = artifactType || 'application/vnd.ant.code';
    const displayTitle = title || `${language.toUpperCase()} Code`;
    
    return {
        type: 'artifact',
        artifactId: generateArtifactSlug(displayTitle, type),
        artifactType: type,
        title: displayTitle,
        content,
        language,
        sequenceId: nextSequenceId(),
    };
}
