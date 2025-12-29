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

// ==================== UNION TYPE ====================

export type RenderBlock =
    | MarkdownBlock
    | CodeBlock
    | LatexBlock
    | TableBlock
    | ExpandableBlock
    | CitationBlock;

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
