/**
 * parseOutput - Engine for AI Output → RenderBlock[]
 *
 * INVARIANT: Pure function, no side effects.
 * INVARIANT: Belongs to engine layer (parsing), not rendering layer.
 *
 * This transforms raw AI output (string) into structured RenderBlock[].
 * Complex parsing (LaTeX, tables) can be added incrementally.
 */

import {
    RenderBlock,
    createMarkdownBlock,
    createCodeBlock,
    createMermaidBlock,
    resetSequenceId,
} from '@/shared/rendering/schema';

// ==================== TYPES ====================

interface ParseOptions {
    /** Reset sequence counter at start */
    resetSequence?: boolean;
}

// ==================== CODE FENCE REGEX ====================

// Matches code fences: ```language\ncode\n```
const CODE_FENCE_REGEX = /```(\w*)\n([\s\S]*?)```/g;

// ==================== PARSER ====================

/**
 * Parse AI output into RenderBlock[]
 *
 * Current implementation:
 * - Splits on code fences
 * - Creates markdown blocks for text
 * - Creates code blocks for fenced code
 * - Creates mermaid blocks for 'mermaid' language fences
 *
 * Future extensions:
 * - LaTeX detection
 * - Table detection
 * - Expandable sections
 */
export function parseOutput(content: string, options: ParseOptions = {}): RenderBlock[] {
    if (!content || content.trim() === '') {
        return [];
    }

    if (options.resetSequence) {
        resetSequenceId();
    }

    const blocks: RenderBlock[] = [];
    let lastIndex = 0;

    // Find all code fences
    const matches = [...content.matchAll(CODE_FENCE_REGEX)];

    for (const match of matches) {
        const [fullMatch, language, code] = match;
        const matchStart = match.index ?? 0;

        // Add markdown block for content before this code fence
        if (matchStart > lastIndex) {
            const markdownContent = content.slice(lastIndex, matchStart).trim();
            if (markdownContent) {
                blocks.push(createMarkdownBlock(markdownContent));
            }
        }

        // Add block based on language
        const trimmedCode = (code ?? '').trim();
        const normalizedLang = (language || 'text').toLowerCase();

        if (normalizedLang === 'mermaid') {
            blocks.push(createMermaidBlock(trimmedCode));
        } else {
            blocks.push(createCodeBlock(trimmedCode, language || 'text'));
        }

        lastIndex = matchStart + fullMatch.length;
    }

    // Add remaining content as markdown block
    if (lastIndex < content.length) {
        const remainingContent = content.slice(lastIndex).trim();
        if (remainingContent) {
            blocks.push(createMarkdownBlock(remainingContent));
        }
    }

    // If no code fences found, return single markdown block
    if (blocks.length === 0 && content.trim()) {
        blocks.push(createMarkdownBlock(content));
    }

    return blocks;
}

// ==================== STREAMING SUPPORT ====================

/**
 * Append content to existing blocks during streaming
 *
 * Strategy:
 * - If last block is markdown and we're adding markdown, append
 * - Otherwise, add new block
 *
 * This will be enhanced for partial code fence detection.
 */
export function appendToBlocks(
    blocks: RenderBlock[],
    newContent: string
): RenderBlock[] {
    if (!newContent) return blocks;

    // For now, re-parse entire content when streaming completes
    // Future: incremental parsing for streaming tokens
    return blocks;
}

// ==================== UTILITIES ====================

/**
 * Check if content likely contains code fences
 */
export function hasCodeFences(content: string): boolean {
    return CODE_FENCE_REGEX.test(content);
}

/**
 * Extract all code blocks from content
 */
export function extractCodeBlocks(content: string): Array<{ language: string; code: string }> {
    const results: Array<{ language: string; code: string }> = [];
    const matches = [...content.matchAll(CODE_FENCE_REGEX)];

    for (const match of matches) {
        const [, language, code] = match;
        results.push({ language: language || 'text', code: (code ?? '').trim() });
    }

    return results;
}

export default parseOutput;
